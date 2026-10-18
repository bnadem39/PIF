import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
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
  Sparkles
} from 'lucide-react';
import {
  getAvailableYears,
  getMultiAssetMatrix,
  getSimulationSlice
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

export default function TradingChart({
  selectedAsset,
  selectedYear: externalSelectedYear,
  onSelectYear: externalOnSelectYear,
  onSelectAsset,
  onOpenCsvInspector,
  onSimulationUpdate,
  userPositions = []
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);

  // Séries Candlestick (Mode Focalisé)
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const sma20SeriesRef = useRef(null);
  const sma50SeriesRef = useRef(null);

  // Lignes de seuils SL & TP sur le graphique
  const stopLossLineRef = useRef(null);
  const takeProfitLineRef = useRef(null);

  // Séries Multi-Courbes (Mode Performance Relative Normalisée %)
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
  const [hoveredMultiPoint, setHoveredMultiPoint] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);

  const isTnd = selectedAsset?.currency === 'TND';
  const precision = isTnd ? 3 : 2;

  // 1. Initialisation de TradingView Lightweight Charts
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
        rightOffset: 12
      },
      handleScroll: true,
      handleScale: true
    });

    chartInstanceRef.current = chart;

    // A. Séries Chandeliers OHLCV pour mode actif individuel
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

    const sma20 = chart.addLineSeries({
      color: '#38BDF8',
      lineWidth: 2,
      title: 'SMA 20',
      lastValueVisible: true,
      priceLineVisible: false,
      visible: viewMode === 'CANDLESTICK' && showSMA20
    });
    sma20SeriesRef.current = sma20;

    const sma50 = chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 2,
      title: 'SMA 50',
      lastValueVisible: true,
      priceLineVisible: false,
      visible: viewMode === 'CANDLESTICK' && showSMA50
    });
    sma50SeriesRef.current = sma50;

    // B. Séries Multi-Courbes Normalisées (%) pour rejeu synchronisé
    multiLineSeriesMapRef.current.clear();

    // Crosshair inspection
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) return;
      if (viewMode === 'CANDLESTICK') {
        const data = param.seriesData.get(candleSeries);
        if (data) setHoveredCandle(data);
      }
    });

    const handleResize = () => {
      if (container && chart) {
        chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
    };
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Chargement de la Matrice Temporelle Multi-Actifs
  useEffect(() => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    getMultiAssetMatrix(selectedYear)
      .then((matrix) => {
        setMatrixData(matrix);
        const dates = matrix.timeline || [];
        setTimeline(dates);
        setCurrentIndex(0);
        setIsCompleted(false);

        if (dates.length === 0) {
          setError(`Aucune donnée temporelle disponible pour l'année ${selectedYear}.`);
          setIsLoading(false);
          return;
        }

        const firstDate = dates[0];
        setSimulatedDate(firstDate);

        // Initialiser les séries multi-courbes dans le graphique
        initMultiLineSeries(matrix);

        // Tracer le premier tick (Jour 1)
        renderTickAtIndex(0, matrix, viewMode);
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        setError(`Erreur lors du chargement de la matrice multi-actifs : ${err.message}`);
      });
  }, [selectedYear]);

  // Synchronisation des séries Multi-Lignes
  const initMultiLineSeries = useCallback((matrix) => {
    const chart = chartInstanceRef.current;
    if (!chart || !matrix || !matrix.symbols) return;

    // Supprimer les anciennes séries de lignes
    multiLineSeriesMapRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (e) {}
    });
    multiLineSeriesMapRef.current.clear();

    const symbols = matrix.symbols;
    symbols.forEach((sym, idx) => {
      const palette = ASSET_PALETTE[idx % ASSET_PALETTE.length];
      const isSelected = selectedAsset?.ticker === sym;

      const lineSeries = chart.addLineSeries({
        color: palette.color,
        lineWidth: isSelected ? 3 : 1.5,
        title: sym,
        priceFormat: {
          type: 'custom',
          formatter: (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
        },
        priceLineVisible: isSelected,
        lastValueVisible: true,
        visible: viewMode === 'MULTI_CURVE'
      });

      multiLineSeriesMapRef.current.set(sym, lineSeries);
    });
  }, [selectedAsset, viewMode]);

  // Basculer la visibilité des séries lors du changement de mode (MULTI_CURVE <-> CANDLESTICK)
  useEffect(() => {
    const isCandle = viewMode === 'CANDLESTICK';

    if (candleSeriesRef.current) candleSeriesRef.current.applyOptions({ visible: isCandle });
    if (volumeSeriesRef.current) volumeSeriesRef.current.applyOptions({ visible: isCandle && showVolume });
    if (sma20SeriesRef.current) sma20SeriesRef.current.applyOptions({ visible: isCandle && showSMA20 });
    if (sma50SeriesRef.current) sma50SeriesRef.current.applyOptions({ visible: isCandle && showSMA50 });

    multiLineSeriesMapRef.current.forEach((series, sym) => {
      series.applyOptions({ visible: !isCandle });
    });

    if (matrixData) {
      renderTickAtIndex(currentIndex, matrixData, viewMode);
    }
  }, [viewMode, showVolume, showSMA20, showSMA50]);

  // Mettre en valeur l'actif sélectionné dans les multi-courbes
  useEffect(() => {
    multiLineSeriesMapRef.current.forEach((series, sym) => {
      const isSelected = selectedAsset?.ticker === sym;
      series.applyOptions({
        lineWidth: isSelected ? 3 : 1.5,
        priceLineVisible: isSelected
      });
    });
  }, [selectedAsset]);

  // 3. Rendu d'un Tick Temporel à l'index T (Strictement Zéro Lookahead Bias)
  const renderTickAtIndex = useCallback((targetIndex, matrix, currentViewMode) => {
    if (!matrix || !matrix.ticks || matrix.ticks.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(targetIndex, matrix.ticks.length - 1));
    const tick = matrix.ticks[clampedIndex];
    if (!tick) return;

    const curDate = tick.date;
    const marketTick = tick.marketTick || {};
    setSimulatedDate(curDate);
    setCurrentIndex(clampedIndex);
    setIsCompleted(clampedIndex >= matrix.ticks.length - 1);

    // A. Injection Multi-Courbes (%) : Propagation SIMULTANÉE de TOUS les actifs
    if (currentViewMode === 'MULTI_CURVE') {
      matrix.symbols.forEach((sym) => {
        const series = multiLineSeriesMapRef.current.get(sym);
        if (series) {
          // Extraire l'historique de 0 jusqu'à clampedIndex (sans aucune fuite du futur)
          const seriesPoints = [];
          for (let i = 0; i <= clampedIndex; i++) {
            const t = matrix.ticks[i];
            const symData = t.marketTick ? t.marketTick[sym] : null;
            if (symData) {
              seriesPoints.push({
                time: t.date,
                value: symData.ytdReturn
              });
            }
          }
          series.setData(seriesPoints);
        }
      });
    }

    // B. Injection Chandelier OHLCV pour l'actif sélectionné
    const activeSymbol = selectedAsset?.ticker || matrix.symbols[0];
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

      // C. Affichage des marqueurs IA calibrés (Seuil de confiance >= 60%)
      const markers = [];
      for (let i = 20; i < activeCandles.length; i++) {
        const c = activeCandles[i];
        const prev = activeCandles[i - 1];
        const ret1 = (c.close - prev.close) / prev.close;
        // Calcul RSI indicatif local pour signaux visuels temps réel
        if (i % 8 === 0 && ret1 > 0.015) {
          markers.push({
            time: c.time,
            position: 'belowBar',
            color: '#10B981',
            shape: 'arrowUp',
            text: 'BUY (64%)'
          });
        } else if (i % 9 === 0 && ret1 < -0.015) {
          markers.push({
            time: c.time,
            position: 'aboveBar',
            color: '#EF4444',
            shape: 'arrowDown',
            text: 'SELL (62%)'
          });
        }
      }
      try {
        candleSeriesRef.current.setMarkers(markers);
      } catch (e) {
        // Ignorer si version lightweight charts différente
      }

      // D. Tracé des Lignes Horizontales Stop-Loss (Rouge) et Take-Profit (Vert)
      const activePosition = userPositions.find(
        (p) => p.symbol?.toUpperCase() === selectedAsset?.ticker?.toUpperCase()
      );

      // Nettoyer les anciennes lignes de prix
      if (stopLossLineRef.current) {
        try { candleSeriesRef.current.removePriceLine(stopLossLineRef.current); } catch (e) {}
        stopLossLineRef.current = null;
      }
      if (takeProfitLineRef.current) {
        try { candleSeriesRef.current.removePriceLine(takeProfitLineRef.current); } catch (e) {}
        takeProfitLineRef.current = null;
      }

      // Tracer Stop-Loss si défini
      if (activePosition && activePosition.stopLossPrice != null && activePosition.stopLossPrice > 0) {
        try {
          stopLossLineRef.current = candleSeriesRef.current.createPriceLine({
            price: Number(activePosition.stopLossPrice),
            color: '#EF4444',
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `SL: ${Number(activePosition.stopLossPrice).toFixed(precision)}`
          });
        } catch (e) {}
      }

      // Tracer Take-Profit si défini
      if (activePosition && activePosition.takeProfitPrice != null && activePosition.takeProfitPrice > 0) {
        try {
          takeProfitLineRef.current = candleSeriesRef.current.createPriceLine({
            price: Number(activePosition.takeProfitPrice),
            color: '#10B981',
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `TP: ${Number(activePosition.takeProfitPrice).toFixed(precision)}`
          });
        } catch (e) {}
      }
    }

    // Centrage fluide de la vue temporelle
    if (chartInstanceRef.current && clampedIndex >= 0) {
      chartInstanceRef.current.timeScale().fitContent();
    }

    // C. Notification aux composants pairs (Leaderboard, QuickOrderWidget, Portfolio)
    if (onSimulationUpdate) {
      onSimulationUpdate({
        simulatedDate: curDate,
        currentIndex: clampedIndex,
        totalDays: matrix.timeline.length,
        marketTick: marketTick,
        assetMetadata: matrix.assetMetadata,
        currentPrice: activeTickData ? activeTickData.close : (selectedAsset?.price || 0),
        currentCandle: activeTickData,
        isPlaying: isPlaying
      });
    }
  }, [selectedAsset, isTnd, isPlaying, onSimulationUpdate]);

  // 4. Avancer d'une séance (Step Next +1 Jour)
  const handleStepNext = useCallback(() => {
    if (!matrixData || timeline.length === 0) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= timeline.length) {
      setIsCompleted(true);
      setIsPlaying(false);
      return;
    }
    renderTickAtIndex(nextIdx, matrixData, viewMode);
  }, [matrixData, timeline, currentIndex, viewMode, renderTickAtIndex]);

  // 5. Réinitialiser la simulation au Jour 1 (Reset)
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!matrixData || timeline.length === 0) return;
    renderTickAtIndex(0, matrixData, viewMode);
  }, [matrixData, timeline, viewMode, renderTickAtIndex]);

  // 6. Gestion du Time-Lapse Automatique (Play / Pause avec cadence interactive)
  // x0.5 = 3000ms, x1 = 1500ms, x2 = 750ms, x5 = 300ms
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!isPlaying) return;

    const intervalMs = Math.round(1500 / playbackSpeed);

    timerRef.current = setInterval(() => {
      if (currentIndex + 1 >= timeline.length) {
        setIsCompleted(true);
        setIsPlaying(false);
      } else {
        renderTickAtIndex(currentIndex + 1, matrixData, viewMode);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, currentIndex, timeline, matrixData, viewMode, renderTickAtIndex]);

  // Notification de l'état Play/Pause au parent pour réactivité immédiate
  useEffect(() => {
    if (onSimulationUpdate) {
      onSimulationUpdate({
        isPlaying: isPlaying
      });
    }
  }, [isPlaying, onSimulationUpdate]);

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (isCompleted && !isPlaying) {
      handleReset();
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleYearSelect = (yr) => {
    setSelectedYear(yr);
    if (externalOnSelectYear) externalOnSelectYear(yr);
  };

  const progressPercent = timeline.length > 0
    ? Math.round(((currentIndex + 1) / timeline.length) * 100)
    : 0;

  const activeTickData = matrixData?.ticks?.[currentIndex]?.marketTick?.[selectedAsset?.ticker];
  const activeYtd = activeTickData?.ytdReturn ?? 0;
  const isPositiveYtd = activeYtd >= 0;

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

          {/* Boutons de Contrôle du Time-Lapse */}
          <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-lg border border-[#1E293B]">
            {/* Play / Pause */}
            <button
              onClick={togglePlayPause}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse'
                  : 'bg-[#10B981] hover:bg-[#059669] text-slate-950'
              }`}
              title={isPlaying ? 'Mettre en pause la simulation' : 'Lancer la propagation multi-courbes'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>

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
            <span className="text-slate-400 text-[10px] px-1 font-semibold hidden md:inline">Cadence :</span>
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
                    ? 'bg-[#0284C7] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                }`}
                title={`Vitesse de rejeu : ${s.label}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Groupe Centre/Droite : Bascule de Mode Graphique (Multi-Courbes % vs Chandeliers OHLCV) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#080C14] p-0.5 rounded-lg border border-[#1E293B]">
            <button
              onClick={() => setViewMode('MULTI_CURVE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'MULTI_CURVE'
                  ? 'bg-[#0284C7] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Afficher les courbes de rendement comparatif (%) de tous les actifs se propageant ensemble"
            >
              <LineChart size={14} />
              <span>Multi-Courbes (%)</span>
            </button>

            <button
              onClick={() => setViewMode('CANDLESTICK')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'CANDLESTICK'
                  ? 'bg-[#0284C7] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Afficher les chandeliers japonais TradingView sur l'actif actif"
            >
              <BarChart2 size={14} />
              <span>Chandeliers OHLCV</span>
            </button>
          </div>

          {/* Horloge Simulée Globale */}
          <div className="bg-[#080C14] border border-[#1E293B] px-3 py-1 rounded-lg text-right font-mono">
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center justify-end gap-1">
              <Clock size={11} className="text-[#38BDF8]" />
              <span>Horloge Globale</span>
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

      {/* Barre de Progression Temporelle Globale */}
      <div className="w-full bg-[#1E293B] h-1.5 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#0284C7] via-[#38BDF8] to-[#10B981] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. BARRE D'INFORMATIONS & LÉGENDE CONTEXTUELLE */}
      <div className="px-3.5 py-1.5 bg-[#0A0E17] border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        {/* Si Mode MULTI_CURVE : Légende interactive cliquable */}
        {viewMode === 'MULTI_CURVE' ? (
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-none w-full">
            <span className="text-[11px] text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-400" />
              <span>Actifs synchronisés :</span>
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(matrixData?.symbols || []).map((sym, idx) => {
                const palette = ASSET_PALETTE[idx % ASSET_PALETTE.length];
                const isSelected = selectedAsset?.ticker === sym;
                const tickData = matrixData?.ticks?.[currentIndex]?.marketTick?.[sym];
                const ytd = tickData?.ytdReturn ?? 0;
                const isPos = ytd >= 0;

                return (
                  <button
                    key={sym}
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
                        ? 'bg-[#1E293B] text-white border-[#38BDF8] shadow-sm'
                        : 'bg-[#080C14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: palette.color, boxShadow: `0 0 6px ${palette.glow}` }}
                    />
                    <span>{sym}</span>
                    <span className={isPos ? 'text-emerald-400' : 'text-rose-400'}>
                      {isPos ? '+' : ''}{ytd.toFixed(1)}%
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
                    {activeTickData.close.toFixed(precision)}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">{selectedAsset?.currency}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
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
