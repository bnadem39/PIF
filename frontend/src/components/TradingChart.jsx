import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineType,
  LastPriceAnimationMode
} from 'lightweight-charts';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  BarChart2,
  LineChart,
  Eye,
  Sparkles,
  Activity
} from 'lucide-react';
import {
  getAvailableYears,
  getMultiAssetMatrix
} from '../services/realMarketService';

const ASSET_PALETTE = [
  { color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.4)' }, // Sky Blue
  { color: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' }, // Emerald
  { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' }, // Amber / Gold
  { color: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)' }, // Purple
  { color: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)' }, // Pink
  { color: '#14B8A6', glow: 'rgba(20, 184, 166, 0.4)' }, // Teal
  { color: '#F97316', glow: 'rgba(249, 115, 22, 0.4)' }, // Orange
  { color: '#6366F1', glow: 'rgba(99, 102, 241, 0.4)' }, // Indigo
  { color: '#84CC16', glow: 'rgba(132, 204, 22, 0.4)' }, // Lime
  { color: '#D946EF', glow: 'rgba(217, 70, 239, 0.4)' }, // Fuchsia
  { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.4)' },  // Cyan
  { color: '#E11D48', glow: 'rgba(225, 29, 72, 0.4)' },  // Rose
  { color: '#EAB308', glow: 'rgba(234, 179, 8, 0.4)' },  // Yellow
  { color: '#22C55E', glow: 'rgba(34, 197, 94, 0.4)' }   // Light Green
];

/**
 * Fonction d'easing quadratique adouci (easeOutQuad)
 * Assure une transition organique, fluide et sans téléportation brutale.
 */
function easeOutQuad(t) {
  return t * (2 - t);
}

export default function TradingChart({
  selectedAsset,
  selectedYear: externalSelectedYear,
  onSelectYear: externalOnSelectYear,
  onSelectAsset,
  onOpenCsvInspector,
  onSimulationUpdate,
  userPositions = [],
  hidePlayPause = false
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Séries Candlestick & Overlays (Mode Focalisé)
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const sma20SeriesRef = useRef(null);
  const sma50SeriesRef = useRef(null);

  // Lignes de seuils Stop-Loss & Take-Profit
  const stopLossLineRef = useRef(null);
  const takeProfitLineRef = useRef(null);

  // Séries Multi-Courbes Normalisées (%)
  const multiLineSeriesMapRef = useRef(new Map());

  // Mode d'affichage graphique : 'MULTI_CURVE' ou 'CANDLESTICK'
  const [viewMode, setViewMode] = useState('MULTI_CURVE');

  const [selectedYear, setSelectedYear] = useState(externalSelectedYear || '2022');
  const [availableYears, setAvailableYears] = useState(['2022', '2021', '2020', '2019', '2018']);

  // Données de la Matrice Temporelle Multi-Actifs Synchronisée
  const [matrixData, setMatrixData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 1, 2, 5
  const [simulatedDate, setSimulatedDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // Indicateurs & Overlays
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Valeur live interpolée pour le badge néon de tête de courbe
  const [liveInterpolatedPrice, setLiveInterpolatedPrice] = useState(null);

  // ==========================================================================
  // REFS D'ANIMATION 60 FPS & PERFORMANCE STRICTE SANS FUITE MÉMOIRE
  // ==========================================================================
  const rafIdRef = useRef(null);
  const isPlayingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const matrixDataRef = useRef(null);
  const viewModeRef = useRef(viewMode);
  const playbackSpeedRef = useRef(playbackSpeed);
  const selectedAssetRef = useRef(selectedAsset);
  const lastRenderedIndexRef = useRef(-1);
  const activeCandlesRef = useRef([]);
  const lastThrottledNotificationRef = useRef(0);

  // Synchronisation continue des refs avec les états récents
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { matrixDataRef.current = matrixData; }, [matrixData]);
  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { selectedAssetRef.current = selectedAsset; }, [selectedAsset]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const isTnd = selectedAsset?.currency === 'TND';
  const precision = isTnd ? 3 : 2;

  // ==========================================================================
  // 1. INITIALISATION DE TRADINGVIEW LIGHTWEIGHT CHARTS AVEC TRANSITIONS DOUCES
  // ==========================================================================
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#080C14' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)', style: 1 }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#38BDF8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0F172A',
          labelVisible: true
        },
        horzLine: {
          color: '#38BDF8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0F172A',
          labelVisible: true
        }
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: { top: 0.08, bottom: 0.15 },
        entireTextOnly: false,
        visible: true,
        alignLabels: true
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 12,
        minBarSpacing: 3,
        rightOffset: 12,
        shiftVisibleRangeOnNewBar: true
      },
      handleScroll: true,
      handleScale: true
    });

    chartInstanceRef.current = chart;

    // A. Séries Chandeliers OHLCV avec animation continue du dernier prix
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
      priceLineVisible: true,
      priceLineWidth: 1,
      priceLineStyle: 2,
      lastValueVisible: true,
      lastPriceAnimation: LastPriceAnimationMode.Continuous,
      visible: viewMode === 'CANDLESTICK'
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.82, bottom: 0 },
      lastValueVisible: true,
      visible: viewMode === 'CANDLESTICK'
    });
    volumeSeriesRef.current = volumeSeries;

    // B. Moyennes Mobiles avec Spline Lissée (LineType.Curved)
    const sma20 = chart.addLineSeries({
      color: '#38BDF8',
      lineWidth: 2,
      lineType: LineType.Curved,
      title: 'SMA 20',
      lastValueVisible: true,
      priceLineVisible: false,
      visible: viewMode === 'CANDLESTICK' && showSMA20
    });
    sma20SeriesRef.current = sma20;

    const sma50 = chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 2,
      lineType: LineType.Curved,
      title: 'SMA 50',
      lastValueVisible: true,
      priceLineVisible: false,
      visible: viewMode === 'CANDLESTICK' && showSMA50
    });
    sma50SeriesRef.current = sma50;

    // Crosshair inspection
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) return;
      if (viewModeRef.current === 'CANDLESTICK') {
        const data = param.seriesData.get(candleSeries);
        if (data) setHoveredCandle(data);
      }
    });

    const handleResize = () => {
      if (container && chart && container.clientWidth > 0 && container.clientHeight > 0) {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
        chart.timeScale().fitContent();
      }
    };
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // ==========================================================================
  // 2. SYNCHRONISATION DES SÉRIES MULTI-COURBES (%) AVEC SPLINE LISSÉE
  // ==========================================================================
  const initMultiLineSeries = useCallback((matrix) => {
    const chart = chartInstanceRef.current;
    if (!chart || !matrix || !matrix.symbols) return;

    multiLineSeriesMapRef.current.forEach((series) => {
      try { chart.removeSeries(series); } catch (e) {}
    });
    multiLineSeriesMapRef.current.clear();

    const symbols = matrix.symbols;
    symbols.forEach((sym, idx) => {
      const palette = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      const isSelected = selectedAssetRef.current?.ticker === sym;

      const lineSeries = chart.addLineSeries({
        color: palette.color,
        lineWidth: isSelected ? 3 : 1.5,
        lineType: LineType.Curved, // Courbe spline fluide et naturelle
        title: sym,
        priceFormat: {
          type: 'custom',
          formatter: (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
        },
        priceLineVisible: isSelected,
        lastValueVisible: true,
        lastPriceAnimation: LastPriceAnimationMode.Continuous, // Micro-pulsation lumineuse de la tête de tracé
        visible: viewModeRef.current === 'MULTI_CURVE'
      });

      multiLineSeriesMapRef.current.set(sym, lineSeries);
    });
  }, []);

  // ==========================================================================
  // 3. CHARGEMENT DE LA MATRICE MULTI-ACTIFS
  // ==========================================================================
  useEffect(() => {
    stopAnimation();
    setIsLoading(true);
    setError(null);

    getMultiAssetMatrix(selectedYear)
      .then((matrix) => {
        setMatrixData(matrix);
        matrixDataRef.current = matrix;
        const dates = matrix.timeline || [];
        setTimeline(dates);
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        setIsCompleted(false);

        if (dates.length === 0) {
          setError(`Aucune donnée temporelle disponible pour l'année ${selectedYear}.`);
          setIsLoading(false);
          return;
        }

        const firstDate = dates[0];
        setSimulatedDate(firstDate);

        initMultiLineSeries(matrix);
        lastRenderedIndexRef.current = -1;
        renderStaticTick(0, matrix, viewModeRef.current);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        setError(`Erreur lors du chargement de la matrice multi-actifs : ${err.message}`);
      });
  }, [selectedYear]);

  // Basculer la visibilité des séries lors du changement de mode (MULTI_CURVE <-> CANDLESTICK)
  useEffect(() => {
    lastRenderedIndexRef.current = -1;
    const isCandle = viewMode === 'CANDLESTICK';

    if (candleSeriesRef.current) candleSeriesRef.current.applyOptions({ visible: isCandle });
    if (volumeSeriesRef.current) volumeSeriesRef.current.applyOptions({ visible: isCandle && showVolume });
    if (sma20SeriesRef.current) sma20SeriesRef.current.applyOptions({ visible: isCandle && showSMA20 });
    if (sma50SeriesRef.current) sma50SeriesRef.current.applyOptions({ visible: isCandle && showSMA50 });

    multiLineSeriesMapRef.current.forEach((series) => {
      series.applyOptions({ visible: !isCandle });
    });

    if (matrixData) {
      renderStaticTick(currentIndex, matrixData, viewMode);
    }
  }, [viewMode, showVolume, showSMA20, showSMA50]);

  // Mettre en valeur l'actif sélectionné
  useEffect(() => {
    multiLineSeriesMapRef.current.forEach((series, sym) => {
      const isSelected = selectedAsset?.ticker === sym;
      series.applyOptions({
        lineWidth: isSelected ? 3 : 1.5,
        priceLineVisible: isSelected
      });
    });
  }, [selectedAsset]);

  // ==========================================================================
  // 4. TRACÉ STATIQUE (INITIALISATION, RESET, SCRUBBING MANUEL)
  // ==========================================================================
  const renderStaticTick = useCallback((targetIndex, matrix, currentViewMode) => {
    if (!matrix || !matrix.ticks || matrix.ticks.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(targetIndex, matrix.ticks.length - 1));
    const tick = matrix.ticks[clampedIndex];
    if (!tick) return;

    const curDate = tick.date;
    const marketTick = tick.marketTick || {};
    setSimulatedDate(curDate);
    setCurrentIndex(clampedIndex);
    currentIndexRef.current = clampedIndex;
    setIsCompleted(clampedIndex >= matrix.ticks.length - 1);

    // Multi-Courbes (%)
    if (currentViewMode === 'MULTI_CURVE') {
      matrix.symbols.forEach((sym) => {
        const series = multiLineSeriesMapRef.current.get(sym);
        if (series) {
          const seriesPoints = [];
          for (let i = 0; i <= clampedIndex; i++) {
            const t = matrix.ticks[i];
            const symData = t.marketTick ? t.marketTick[sym] : null;
            if (symData && symData.ytdReturn != null) {
              seriesPoints.push({ time: t.date, value: symData.ytdReturn });
            }
          }
          series.setData(seriesPoints);
        }
      });
    }

    // Candlestick OHLCV
    const activeSymbol = selectedAssetRef.current?.ticker || matrix.symbols[0];
    const activeTickData = marketTick[activeSymbol];

    if (currentViewMode === 'CANDLESTICK' && candleSeriesRef.current) {
      const activeCandles = [];
      for (let i = 0; i <= clampedIndex; i++) {
        const t = matrix.ticks[i];
        const symData = t.marketTick ? t.marketTick[activeSymbol] : null;
        if (symData) {
          activeCandles.push({
            time: t.date,
            open: symData.open,
            high: symData.high,
            low: symData.low,
            close: symData.close,
            volume: symData.volume
          });
        }
      }
      activeCandlesRef.current = activeCandles;

      candleSeriesRef.current.applyOptions({
        priceFormat: {
          type: 'price',
          precision: isTnd ? 3 : 2,
          minMove: isTnd ? 0.001 : 0.01
        }
      });
      candleSeriesRef.current.setData(activeCandles);

      if (volumeSeriesRef.current) {
        const volData = activeCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
        }));
        volumeSeriesRef.current.setData(volData);
      }

      // SMA 20 et SMA 50
      if (sma20SeriesRef.current) {
        const sma20Pts = [];
        for (let i = 19; i < activeCandles.length; i++) {
          let sum = 0;
          for (let j = 0; j < 20; j++) sum += activeCandles[i - j].close;
          sma20Pts.push({ time: activeCandles[i].time, value: Math.round((sum / 20.0) * 1000) / 1000 });
        }
        sma20SeriesRef.current.setData(sma20Pts);
      }

      if (sma50SeriesRef.current) {
        const sma50Pts = [];
        for (let i = 49; i < activeCandles.length; i++) {
          let sum = 0;
          for (let j = 0; j < 50; j++) sum += activeCandles[i - j].close;
          sma50Pts.push({ time: activeCandles[i].time, value: Math.round((sum / 50.0) * 1000) / 1000 });
        }
        sma50SeriesRef.current.setData(sma50Pts);
      }

      const lastCandle = activeCandles.length > 0 ? activeCandles[activeCandles.length - 1] : null;
      setHoveredCandle(lastCandle);
      updateMarkersAndPriceLines(activeCandles);
    }

    lastRenderedIndexRef.current = clampedIndex;

    // Recalage de la vue sans convulsion
    if (chartInstanceRef.current && clampedIndex >= 0) {
      chartInstanceRef.current.timeScale().fitContent();
    }

    if (onSimulationUpdate) {
      onSimulationUpdate({
        simulatedDate: curDate,
        currentIndex: clampedIndex,
        totalDays: matrix.timeline.length,
        marketTick: marketTick,
        assetMetadata: matrix.assetMetadata,
        currentPrice: activeTickData ? activeTickData.close : (selectedAssetRef.current?.price || 0),
        currentCandle: activeTickData,
        isPlaying: isPlayingRef.current
      });
    }
  }, [isTnd, onSimulationUpdate]);

  // Mise à jour des marqueurs et des seuils Stop-Loss / Take-Profit
  const updateMarkersAndPriceLines = (activeCandles) => {
    if (!candleSeriesRef.current) return;

    const markers = [];
    for (let i = 20; i < activeCandles.length; i++) {
      const c = activeCandles[i];
      const prev = activeCandles[i - 1];
      const ret1 = (c.close - prev.close) / prev.close;
      if (i % 8 === 0 && ret1 > 0.015) {
        markers.push({ time: c.time, position: 'belowBar', color: '#10B981', shape: 'arrowUp', text: 'BUY (64%)' });
      } else if (i % 9 === 0 && ret1 < -0.015) {
        markers.push({ time: c.time, position: 'aboveBar', color: '#EF4444', shape: 'arrowDown', text: 'SELL (62%)' });
      }
    }
    try { candleSeriesRef.current.setMarkers(markers); } catch (e) {}

    const activePosition = userPositions.find(
      (p) => p.symbol?.toUpperCase() === selectedAssetRef.current?.ticker?.toUpperCase()
    );

    if (stopLossLineRef.current) {
      try { candleSeriesRef.current.removePriceLine(stopLossLineRef.current); } catch (e) {}
      stopLossLineRef.current = null;
    }
    if (takeProfitLineRef.current) {
      try { candleSeriesRef.current.removePriceLine(takeProfitLineRef.current); } catch (e) {}
      takeProfitLineRef.current = null;
    }

    if (activePosition && activePosition.stopLossPrice != null && activePosition.stopLossPrice > 0) {
      try {
        stopLossLineRef.current = candleSeriesRef.current.createPriceLine({
          price: Number(activePosition.stopLossPrice),
          color: '#EF4444',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `SL: ${Number(activePosition.stopLossPrice).toFixed(precision)}`
        });
      } catch (e) {}
    }

    if (activePosition && activePosition.takeProfitPrice != null && activePosition.takeProfitPrice > 0) {
      try {
        takeProfitLineRef.current = candleSeriesRef.current.createPriceLine({
          price: Number(activePosition.takeProfitPrice),
          color: '#10B981',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `TP: ${Number(activePosition.takeProfitPrice).toFixed(precision)}`
        });
      } catch (e) {}
    }
  };

  // ==========================================================================
  // 5. MOTEUR D'INTERPOLATION FLUIDE 60 FPS (REQUEST ANIMATION FRAME EASING)
  // ==========================================================================
  const startInterpolatedPropagation = useCallback(() => {
    const matrix = matrixDataRef.current;
    if (!matrix || !matrix.ticks || matrix.ticks.length === 0) return;

    let stepStartTime = performance.now();

    const animateFrame = (now) => {
      if (!isPlayingRef.current) return;

      const currentIdx = currentIndexRef.current;
      const nextIdx = currentIdx + 1;

      // Arrêt propre en fin d'année
      if (nextIdx >= matrix.ticks.length) {
        setIsCompleted(true);
        setIsPlaying(false);
        isPlayingRef.current = false;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        return;
      }

      // Durée dynamique selon la cadence (x0.5 = 1600ms, x1 = 800ms, x2 = 400ms, x5 = 160ms)
      const stepDurationMs = Math.max(90, Math.round(800 / playbackSpeedRef.current));
      const elapsed = now - stepStartTime;
      const rawProgress = Math.min(1, elapsed / stepDurationMs);
      const alpha = easeOutQuad(rawProgress);

      const prevTick = matrix.ticks[currentIdx];
      const targetTick = matrix.ticks[nextIdx];
      const targetDate = targetTick.date;
      const mode = viewModeRef.current;
      const activeSym = selectedAssetRef.current?.ticker || matrix.symbols[0];

      // A. Interpolation 60 FPS Multi-Courbes (%)
      if (mode === 'MULTI_CURVE') {
        matrix.symbols.forEach((sym) => {
          const series = multiLineSeriesMapRef.current.get(sym);
          if (!series) return;
          const prevVal = prevTick.marketTick?.[sym]?.ytdReturn ?? 0;
          const targetVal = targetTick.marketTick?.[sym]?.ytdReturn ?? prevVal;
          const curVal = prevVal + (targetVal - prevVal) * alpha;

          series.update({
            time: targetDate,
            value: curVal
          });

          if (sym === activeSym) {
            setLiveInterpolatedPrice(curVal);
          }
        });
      }

      // B. Interpolation 60 FPS Chandelier en Formation (Candle In-Progress)
      if (mode === 'CANDLESTICK' && candleSeriesRef.current) {
        const prevSymData = prevTick.marketTick?.[activeSym] || {};
        const targetSymData = targetTick.marketTick?.[activeSym] || {};

        const open = targetSymData.open ?? (prevSymData.close ?? targetSymData.close ?? 0);
        const targetClose = targetSymData.close ?? open;
        const targetHigh = targetSymData.high ?? Math.max(open, targetClose);
        const targetLow = targetSymData.low ?? Math.min(open, targetClose);
        const targetVol = targetSymData.volume ?? 0;

        // Trajectoire continue du cours : ouverture -> formation mèche -> clôture
        const interClose = open + (targetClose - open) * alpha;
        const interHigh = Math.max(open, interClose, open + (targetHigh - open) * Math.min(1, alpha * 1.3));
        const interLow = Math.min(open, interClose, open + (targetLow - open) * Math.min(1, alpha * 1.3));
        const interVol = Math.round(targetVol * alpha);

        candleSeriesRef.current.update({
          time: targetDate,
          open,
          high: interHigh,
          low: interLow,
          close: interClose
        });

        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.update({
            time: targetDate,
            value: interVol,
            color: interClose >= open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
          });
        }

        // Dynamisation en continu des SMA
        const finalized = activeCandlesRef.current;
        if (sma20SeriesRef.current && finalized.length >= 19) {
          let sum = interClose;
          for (let j = 0; j < 19; j++) sum += finalized[finalized.length - 1 - j].close;
          sma20SeriesRef.current.update({
            time: targetDate,
            value: Math.round((sum / 20.0) * 1000) / 1000
          });
        }
        if (sma50SeriesRef.current && finalized.length >= 49) {
          let sum = interClose;
          for (let j = 0; j < 49; j++) sum += finalized[finalized.length - 1 - j].close;
          sma50SeriesRef.current.update({
            time: targetDate,
            value: Math.round((sum / 50.0) * 1000) / 1000
          });
        }

        setLiveInterpolatedPrice(interClose);
      }

      // C. Défilement continu et doux de l'échelle de temps (Smooth Auto-Scroll)
      if (chartInstanceRef.current) {
        chartInstanceRef.current.timeScale().scrollToPosition(6, false);
      }

      // D. Notification découplée vers l'arbre React parent (évite de saturer l'UI à 60 FPS)
      if (now - lastThrottledNotificationRef.current > 75 || rawProgress >= 1) {
        lastThrottledNotificationRef.current = now;
        setSimulatedDate(targetDate);
        if (onSimulationUpdate) {
          const activeTick = targetTick.marketTick?.[activeSym];
          onSimulationUpdate({
            simulatedDate: targetDate,
            currentIndex: nextIdx,
            totalDays: matrix.timeline.length,
            marketTick: targetTick.marketTick,
            assetMetadata: matrix.assetMetadata,
            currentPrice: activeTick ? activeTick.close : (selectedAssetRef.current?.price || 0),
            currentCandle: activeTick,
            isPlaying: true
          });
        }
      }

      // E. Passage au pas suivant ou continuation du tick en cours
      if (rawProgress < 1) {
        rafIdRef.current = requestAnimationFrame(animateFrame);
      } else {
        // Clôture définitive du tick
        currentIndexRef.current = nextIdx;
        setCurrentIndex(nextIdx);
        lastRenderedIndexRef.current = nextIdx;

        if (mode === 'CANDLESTICK') {
          const symData = targetTick.marketTick?.[activeSym];
          if (symData) {
            activeCandlesRef.current.push({
              time: targetDate,
              open: symData.open,
              high: symData.high,
              low: symData.low,
              close: symData.close,
              volume: symData.volume
            });
            updateMarkersAndPriceLines(activeCandlesRef.current);
          }
        }

        // Enchaînement immédiat du pas suivant
        stepStartTime = performance.now();
        if (isPlayingRef.current) {
          rafIdRef.current = requestAnimationFrame(animateFrame);
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(animateFrame);
  }, [onSimulationUpdate]);

  // Arrêt net de la boucle d'animation
  const stopAnimation = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (onSimulationUpdate) {
      onSimulationUpdate({ isPlaying: false });
    }
  }, [onSimulationUpdate]);

  // Déclenchement / Pause
  const togglePlayPause = () => {
    if (isCompleted && !isPlaying) {
      handleReset();
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (onSimulationUpdate) {
        onSimulationUpdate({ isPlaying: true });
      }
      startInterpolatedPropagation();
      return;
    }

    if (isPlaying) {
      stopAnimation();
    } else {
      setIsPlaying(true);
      isPlayingRef.current = true;
      if (onSimulationUpdate) {
        onSimulationUpdate({ isPlaying: true });
      }
      startInterpolatedPropagation();
    }
  };

  // Avancer d'une seule séance (+1 Jour) avec transition douce
  const handleStepNext = useCallback(() => {
    stopAnimation();
    if (!matrixData || timeline.length === 0) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= timeline.length) {
      setIsCompleted(true);
      return;
    }
    renderStaticTick(nextIdx, matrixData, viewMode);
  }, [matrixData, timeline, currentIndex, viewMode, renderStaticTick, stopAnimation]);

  // Réinitialiser la simulation au Jour 1
  const handleReset = useCallback(() => {
    stopAnimation();
    if (!matrixData || timeline.length === 0) return;
    lastRenderedIndexRef.current = -1;
    renderStaticTick(0, matrixData, viewMode);
  }, [matrixData, timeline, viewMode, renderStaticTick, stopAnimation]);

  const handleYearSelect = (yr) => {
    stopAnimation();
    setSelectedYear(yr);
    if (externalOnSelectYear) externalOnSelectYear(yr);
  };

  const progressPercent = timeline.length > 0
    ? Math.round(((currentIndex + 1) / timeline.length) * 100)
    : 0;

  const activeTickData = matrixData?.ticks?.[currentIndex]?.marketTick?.[selectedAsset?.ticker];
  const activeYtd = activeTickData?.ytdReturn ?? 0;
  const isPositiveYtd = (liveInterpolatedPrice != null && viewMode === 'MULTI_CURVE')
    ? liveInterpolatedPrice >= 0
    : activeYtd >= 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080C14] overflow-hidden relative select-none font-sans">
      {/* 1. BANDEAU DE CONTRÔLE SUPÉRIEUR DU MOTEUR MULTI-ACTIFS */}
      <div className="bg-[#0F172A] border-b border-[#1E293B] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Groupe Gauche : Sélecteur d'Année, Bouton Play/Pause, Step, Reset & Speed */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur d'Année */}
          <div className="flex items-center gap-1.5 bg-[#080C14] px-2.5 py-1 rounded-lg border border-[#1E293B]">
            <Calendar size={13} className="text-[#38BDF8]" />
            <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Année :</span>
            <select
              value={selectedYear}
              onChange={(e) => handleYearSelect(e.target.value)}
              className="bg-[#1E293B] text-[#38BDF8] font-mono text-xs font-bold rounded px-2 py-0.5 border border-[#334155] outline-none cursor-pointer focus:border-[#38BDF8]"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Boutons de Contrôle du Time-Lapse avec Indicateur 60 FPS */}
          <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-lg border border-[#1E293B]">
            {/* Play / Pause - Masqué en mode Room pour n'avoir strictement qu'un seul bouton maître */}
            {!hidePlayPause && (
              <button
                onClick={togglePlayPause}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    : 'bg-[#10B981] hover:bg-[#059669] text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                }`}
                title={isPlaying ? 'Mettre en pause l\'interpolation' : 'Lancer la propagation lissée 60 FPS'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>
            )}

            {/* Step Next (+1 jour) */}
            <button
              onClick={handleStepNext}
              disabled={isPlaying || isCompleted}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#1E293B] hover:bg-[#334155] text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              title="Avancer d'une séance simultanément pour tous les actifs"
            >
              <SkipForward size={14} />
              <span className="hidden sm:inline">+1 Jour</span>
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-[#1E293B] hover:bg-[#334155] text-slate-400 hover:text-slate-200 transition-all"
              title="Réinitialiser au 1er janvier"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Cadence Interactive */}
          <div className="flex items-center gap-0.5 bg-[#080C14] p-1 rounded-lg border border-[#1E293B] font-mono text-[11px]">
            <span className="text-slate-400 text-[10px] px-1 font-semibold hidden md:inline">Vitesse :</span>
            {[
              { speed: 0.5, label: 'x0.5' },
              { speed: 1, label: 'x1' },
              { speed: 2, label: 'x2' },
              { speed: 5, label: 'x5' }
            ].map((s) => (
              <button
                key={s.speed}
                onClick={() => setPlaybackSpeed(s.speed)}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  playbackSpeed === s.speed
                    ? 'bg-[#0284C7] text-white shadow-[0_0_8px_rgba(2,132,199,0.5)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                }`}
                title={`Vitesse de propagation lissée : ${s.label}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Badge Indicateur 60 FPS Actif */}
          {isPlaying && (
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800 text-[10px] font-mono text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span>INTERPOLATION 60 FPS</span>
            </div>
          )}
        </div>

        {/* Groupe Centre/Droite : Bascule de Mode Graphique & Horloge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#080C14] p-0.5 rounded-lg border border-[#1E293B]">
            <button
              onClick={() => setViewMode('MULTI_CURVE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'MULTI_CURVE'
                  ? 'bg-[#0284C7] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Afficher les courbes de rendement comparatif (%) avec interpolation spline"
            >
              <LineChart size={14} />
              <span>Comparer (Multi-Courbes)</span>
            </button>

            <button
              onClick={() => setViewMode('CANDLESTICK')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'CANDLESTICK'
                  ? 'bg-[#0284C7] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Afficher les chandeliers japonais TradingView animés à 60 FPS"
            >
              <BarChart2 size={14} />
              <span>Chandeliers OHLCV</span>
            </button>
          </div>

          {/* Horloge Simulée Globale */}
          <div className="bg-[#080C14] border border-[#1E293B] px-3 py-1 rounded-lg text-right font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-end gap-1">
              <Clock size={11} className="text-[#38BDF8]" />
              <span>Séance active</span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {simulatedDate || '---'}{' '}
              <span className="text-xs text-sky-400 font-semibold">
                ({currentIndex + 1}/{timeline.length || 0})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de Progression Temporelle Globale Interactive (Scrubber fluide) */}
      <div
        className="w-full bg-[#1E293B] h-2 relative cursor-pointer group hover:h-2.5 transition-all select-none"
        title="Cliquer ou faire glisser pour naviguer instantanément dans la chronologie"
        onClick={(e) => {
          if (!timeline.length || !matrixData) return;
          stopAnimation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          const targetIdx = Math.round(ratio * (timeline.length - 1));
          lastRenderedIndexRef.current = -1;
          renderStaticTick(targetIdx, matrixData, viewMode);
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-[#0284C7] via-[#38BDF8] to-[#10B981] transition-[width] duration-75 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* 2. BARRE D'INFORMATIONS & LÉGENDE CONTEXTUELLE */}
      <div className="px-3.5 py-1.5 bg-[#0A0E17] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        {/* Si Mode MULTI_CURVE : Légende interactive cliquable */}
        {viewMode === 'MULTI_CURVE' ? (
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none w-full">
            <span className="text-[11px] text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>Actifs comparés ensemble :</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(matrixData?.symbols || []).map((sym, idx) => {
                const palette = ASSET_PALETTE[idx % ASSET_PALETTE.length];
                const isSelected = selectedAsset?.ticker === sym;
                const tickData = matrixData?.ticks?.[currentIndex]?.marketTick?.[sym];
                const ytd = (isSelected && liveInterpolatedPrice != null && isPlaying)
                  ? liveInterpolatedPrice
                  : (tickData?.ytdReturn ?? 0);
                const isPos = ytd >= 0;

                return (
                  <button
                    key={sym}
                    title={`Cliquer pour afficher ${sym} dans le graphique`}
                    onClick={() => {
                      if (onSelectAsset) {
                        const meta = matrixData?.assetMetadata?.[sym] || {};
                        onSelectAsset({
                          ticker: sym,
                          name: meta.name || sym,
                          category: meta.category || 'BVMT',
                          currency: meta.currency || 'TND',
                          price: tickData?.close || meta.initialPrice || 0
                        });
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#1E293B] text-white border-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                        : 'bg-[#080C14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: palette.color, boxShadow: `0 0 6px ${palette.glow}` }}
                    />
                    <span>{sym}</span>
                    <span className={isPos ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                      {isPos ? '+' : ''}{ytd.toFixed(2)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Si Mode CANDLESTICK : Détails de l'actif actif */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-base text-white">{selectedAsset?.ticker}</span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">{selectedAsset?.name}</span>
              {activeTickData && (
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-white">
                    {((liveInterpolatedPrice != null && isPlaying) ? liveInterpolatedPrice : activeTickData.close).toFixed(precision)}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">{selectedAsset?.currency}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                      isPositiveYtd
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}
                  >
                    {isPositiveYtd ? '+' : ''}{activeYtd.toFixed(2)}% YTD
                  </span>
                </div>
              )}
            </div>

            {/* Filtres graphiques SMA / Vol */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSMA20(!showSMA20)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  showSMA20 ? 'bg-[#0284C7] text-white border-[#0284C7]' : 'bg-[#1E293B] text-slate-400 border-[#334155]'
                }`}
              >
                SMA 20
              </button>
              <button
                onClick={() => setShowSMA50(!showSMA50)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  showSMA50 ? 'bg-amber-600 text-white border-amber-600' : 'bg-[#1E293B] text-slate-400 border-[#334155]'
                }`}
              >
                SMA 50
              </button>
              <button
                onClick={() => setShowVolume(!showVolume)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                  showVolume ? 'bg-slate-700 text-white border-slate-600' : 'bg-[#1E293B] text-slate-400 border-[#334155]'
                }`}
              >
                VOL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. CANVAS TRADINGVIEW LIGHTWEIGHT CHARTS (AVEC GESTION MULTI-COURBES & CHANDELIERS) */}
      <div className="flex-1 w-full relative min-h-[350px]" ref={chartContainerRef} />

      {/* Spinner de chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#080C14]/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2 font-mono">
          <Loader2 size={32} className="text-[#38BDF8] animate-spin" />
          <span className="text-xs text-slate-200 font-bold tracking-wider">
            Alignement temporel et calcul des rendements ({selectedYear})...
          </span>
        </div>
      )}

      {/* Message de fin d'année */}
      {isCompleted && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0F172A]/90 border border-emerald-600 text-emerald-300 px-4 py-2 rounded-xl text-xs font-mono shadow-xl flex items-center gap-2 z-20 backdrop-blur-sm">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span>Année {selectedYear} rejouée avec succès ({timeline.length} séances synchronisées).</span>
          <button
            onClick={handleReset}
            className="ml-2 underline font-bold hover:text-white"
          >
            Rejouer
          </button>
        </div>
      )}

      {/* Message d'erreur éventuel */}
      {error && (
        <div className="absolute top-16 left-4 right-4 bg-rose-950/90 border border-rose-800 p-3 rounded-lg text-rose-300 text-xs flex items-center gap-2 z-20 font-mono">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
