import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { Clock, Loader2, AlertCircle, Calendar, FileSpreadsheet, TrendingUp, TrendingDown } from 'lucide-react';
import { getRealHistory, getAvailableYears } from '../services/realMarketService';

export default function TradingChart({
  selectedAsset,
  selectedYear: externalSelectedYear,
  onSelectYear: externalOnSelectYear,
  onOpenCsvInspector
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const sma20SeriesRef = useRef(null);
  const sma50SeriesRef = useRef(null);

  const [timeframe, setTimeframe] = useState('1d');
  const [selectedYear, setSelectedYear] = useState(externalSelectedYear || 'ALL');
  const [availableYears, setAvailableYears] = useState([]);
  const [yearStats, setYearStats] = useState(null);
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketStats, setMarketStats] = useState(null);

  const isTnd = selectedAsset?.currency === 'TND';
  const precision = isTnd ? 3 : 2;

  // 1. Initialisation du canvas graphique TradingView haute clarté
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
        scaleMargins: { top: 0.08, bottom: 0.22 },
        entireTextOnly: false,
        visible: true,
        alignLabels: true
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 13,
        minBarSpacing: 4,
        rightOffset: 12
      },
      handleScroll: true,
      handleScale: true
    });

    chartInstanceRef.current = chart;

    // Chandeliers japonais haute fidélité
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
      lastValueVisible: true
    });
    candleSeriesRef.current = candleSeries;

    // Histogramme des volumes (calibré sur les 18% inférieurs)
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.82, bottom: 0 },
      lastValueVisible: true
    });
    volumeSeriesRef.current = volumeSeries;

    // Moyenne Mobile Rapide SMA 20 (Cyan)
    const sma20Series = chart.addLineSeries({
      color: '#38BDF8',
      lineWidth: 2,
      title: 'SMA 20',
      lastValueVisible: true,
      priceLineVisible: false
    });
    sma20SeriesRef.current = sma20Series;

    // Moyenne Mobile Lente SMA 50 (Orange / Ambre)
    const sma50Series = chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 2,
      title: 'SMA 50',
      lastValueVisible: true,
      priceLineVisible: false
    });
    sma50SeriesRef.current = sma50Series;

    // Inspection interactive au curseur / Crosshair
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) return;
      const data = param.seriesData.get(candleSeries);
      if (data) {
        setHoveredCandle(data);
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

  // Helper de sanitisation stricte pour TradingView Lightweight Charts
  // Garantit des timestamps strictement ascendants et dédupliqués (time > prev_time)
  const sanitizeSeriesData = (items) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const normalized = items.map((item) => {
      let t = item.time;
      if (typeof t === 'string' && /^\d+$/.test(t)) {
        t = parseInt(t, 10);
      }
      return { ...item, time: t };
    });

    normalized.sort((a, b) => {
      const valA = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const valB = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return valA - valB;
    });

    const deduped = [];
    let prevTimestamp = null;
    let prevClose = null;

    for (const item of normalized) {
      const currentTimestamp = typeof item.time === 'number' ? item.time : new Date(item.time).getTime();
      if (prevTimestamp === null || currentTimestamp > prevTimestamp) {
        let open = item.open;
        let close = item.close;
        let high = item.high;
        let low = item.low;

        // Reconstitution financière de l'Open en cas de Doji plat (Open == Close typique des exports BVMT)
        if (open != null && close != null && Math.abs(open - close) < 0.0001) {
          if (prevClose != null && prevClose > 0) {
            open = Math.max(low, Math.min(high, prevClose));
            if (Math.abs(open - close) < 0.0001 && high > low) {
              const delta = (high - low) * 0.25;
              open = close >= (high + low) / 2 ? Math.max(low, close - delta) : Math.min(high, close + delta);
            }
          } else if (high > low) {
            open = (high + low) / 2;
          }
          high = Math.max(high, Math.max(open, close));
          low = Math.min(low, Math.min(open, close));
        }

        deduped.push({
          ...item,
          open,
          high,
          low,
          close
        });
        prevTimestamp = currentTimestamp;
        if (close != null) prevClose = close;
      }
    }

    return deduped;
  };

  // Synchronisation avec l'année externe si modifiée depuis un autre composant
  useEffect(() => {
    if (externalSelectedYear !== undefined && externalSelectedYear !== selectedYear) {
      setSelectedYear(externalSelectedYear);
    }
  }, [externalSelectedYear]);

  const handleYearChange = (year) => {
    setSelectedYear(year);
    if (externalOnSelectYear) {
      externalOnSelectYear(year);
    }
  };

  // 2. Chargement des données réelles depuis le Backend Spring Boot (filtrage par année ou global)
  useEffect(() => {
    if (!selectedAsset) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getRealHistory(selectedAsset.ticker, timeframe, selectedYear, 10000)
      .then((data) => {
        if (!isMounted) return;
        setIsLoading(false);

        if (data.metadata?.availableYears) {
          setAvailableYears(data.metadata.availableYears);
        }
        if (data.metadata?.yearStats) {
          setYearStats(data.metadata.yearStats);
        } else {
          setYearStats(null);
        }

        const cleanCandles = sanitizeSeriesData(data.candles || []);

        if (cleanCandles.length === 0) {
          setError(`Aucun chandelier disponible pour ${selectedAsset.ticker} sur l'année sélectionnée (${selectedYear}).`);
          return;
        }

        const formattedVolumes = cleanCandles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
        }));

        const cleanSma20 = sanitizeSeriesData(data.sma20 || []);
        const cleanSma50 = sanitizeSeriesData(data.sma50 || []);

        if (candleSeriesRef.current) {
          candleSeriesRef.current.applyOptions({
            priceFormat: {
              type: 'price',
              precision: isTnd ? 3 : 2,
              minMove: isTnd ? 0.001 : 0.01
            }
          });
          candleSeriesRef.current.setData(cleanCandles);
        }

        if (volumeSeriesRef.current) volumeSeriesRef.current.setData(formattedVolumes);
        if (sma20SeriesRef.current) sma20SeriesRef.current.setData(cleanSma20);
        if (sma50SeriesRef.current) sma50SeriesRef.current.setData(cleanSma50);

        const last = cleanCandles[cleanCandles.length - 1];
        setHoveredCandle(last);

        setMarketStats({
          lastPrice: last.close,
          high24h: Math.max(...cleanCandles.slice(-10).map((c) => c.high)),
          low24h: Math.min(...cleanCandles.slice(-10).map((c) => c.low)),
          totalPoints: cleanCandles.length,
          firstDate: cleanCandles[0].time,
          lastDate: last.time,
          source: data.metadata?.source || (selectedAsset?.category === 'BVMT' ? 'BVMT Réel' : 'Alpha Vantage')
        });

        // Cadrage parfait : si une année est choisie, zoomer pour afficher toute l'année
        if (chartInstanceRef.current) {
          if (selectedYear !== 'ALL') {
            chartInstanceRef.current.timeScale().fitContent();
          } else {
            const total = cleanCandles.length;
            const visibleCount = 65;
            chartInstanceRef.current.timeScale().setVisibleLogicalRange({
              from: Math.max(0, total - visibleCount),
              to: total + 6
            });
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoading(false);
        setError(`Erreur lors du chargement des données: ${err.message}`);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAsset, timeframe, selectedYear, isTnd]);

  useEffect(() => {
    if (sma20SeriesRef.current) sma20SeriesRef.current.applyOptions({ visible: showSMA20 });
  }, [showSMA20]);

  useEffect(() => {
    if (sma50SeriesRef.current) sma50SeriesRef.current.applyOptions({ visible: showSMA50 });
  }, [showSMA50]);

  useEffect(() => {
    if (volumeSeriesRef.current) volumeSeriesRef.current.applyOptions({ visible: showVolume });
  }, [showVolume]);

  const isPositive = selectedAsset ? selectedAsset.change24h >= 0 : true;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080C14] overflow-hidden relative">
      {/* 1. Barre d'en-tête professionnelle haute lisibilité */}
      <div className="p-3 border-b border-[#1E293B] bg-[#0A0E17] flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Titre, Nom, Catégorie, Prix et P&L */}
        <div className="flex items-center gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-white tracking-wider">
                {selectedAsset?.ticker}
              </span>
              <span className="text-sm text-slate-300 font-medium">
                {selectedAsset?.name}
              </span>
              <span className="text-[10px] bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 px-2 py-0.5 rounded font-mono font-bold uppercase">
                {selectedAsset?.category || 'MARCHÉ'}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 font-mono">
              <span className="text-2xl font-bold text-white tracking-tight">
                {marketStats?.lastPrice?.toLocaleString(undefined, {
                  minimumFractionDigits: isTnd ? 3 : 2,
                  maximumFractionDigits: isTnd ? 3 : 2
                }) || selectedAsset?.price}{' '}
                <span className="text-sm text-slate-400 font-normal">{selectedAsset?.currency}</span>
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-xs border ${
                  isPositive
                    ? 'bg-[#064E3B] text-[#10B981] border-[#059669]/40'
                    : 'bg-[#4C0519] text-[#EF4444] border-[#BE123C]/40'
                }`}
              >
                {isPositive ? '+' : ''}{selectedAsset?.change24h?.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Statistiques 24H en colonnes épurées */}
          {marketStats && (
            <div className="hidden xl:flex items-center gap-6 border-l border-[#1E293B] pl-5 font-mono">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">24H HAUT</div>
                <div className="text-white font-bold text-sm">
                  {marketStats.high24h?.toFixed(precision)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">24H BAS</div>
                <div className="text-white font-bold text-sm">
                  {marketStats.low24h?.toFixed(precision)}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-semibold">VOL. 24H</div>
                <div className="text-white font-bold text-sm">
                  {selectedAsset?.volume24h || '482.5K TND'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contrôles : Sélecteur d'Année, Périodicité et Indicateurs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* SÉLECTEUR D'ANNÉE INTERACTIF */}
          <div className="flex items-center gap-1.5 bg-[#0F172A] px-2.5 py-1 rounded-lg border border-[#1E293B]">
            <Calendar size={13} className="text-[#38BDF8]" />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Année :</span>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-[#1E293B] text-[#38BDF8] font-mono text-xs font-bold rounded px-2 py-0.5 border border-[#334155] outline-none cursor-pointer focus:border-[#38BDF8]"
            >
              <option value="ALL">Toutes les années (Global)</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {selectedAsset?.category === 'BVMT' ? '(BVMT)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Bouton vers le visualiseur de données CSV complet */}
          {onOpenCsvInspector && (
            <button
              onClick={onOpenCsvInspector}
              title="Ouvrir le tableau complet des données CSV de cet actif"
              className="flex items-center gap-1 px-2.5 py-1 bg-[#0284C7]/20 hover:bg-[#0284C7]/30 text-[#38BDF8] border border-[#0284C7]/50 rounded-lg text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden md:inline">Voir Données CSV</span>
            </button>
          )}

          {/* Sélecteur de Périodicité */}
          <div className="flex bg-[#0F172A] p-0.5 rounded border border-[#1E293B]">
            {[
              { id: '1m', label: '1m' },
              { id: '15m', label: '15m' },
              { id: '1h', label: '1h' },
              { id: '1d', label: '1D' }
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`text-xs font-mono px-3 py-1 rounded transition-colors ${
                  timeframe === tf.id
                    ? 'bg-[#0284C7] text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Boutons d'activation des indicateurs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                showSMA20
                  ? 'bg-[#0284C7] text-white font-bold border-[#0284C7]'
                  : 'bg-[#1E293B] text-slate-400 border-[#334155]'
              }`}
            >
              SMA 20
            </button>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                showSMA50
                  ? 'bg-[#D97706] text-white font-bold border-[#D97706]'
                  : 'bg-[#1E293B] text-slate-400 border-[#334155]'
              }`}
            >
              SMA 50
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`text-xs font-mono px-2 py-1 rounded border transition-colors ${
                showVolume
                  ? 'bg-[#334155] text-white font-bold border-[#475569]'
                  : 'bg-[#1E293B] text-slate-400 border-[#334155]'
              }`}
            >
              VOL
            </button>
          </div>
        </div>
      </div>

      {/* BANDEAU KPI ANNUEL SPÉCIFIQUE (quand une année est choisie) */}
      {selectedYear !== 'ALL' && yearStats && yearStats.count > 0 && (
        <div className="px-4 py-2 bg-gradient-to-r from-[#0369A1]/20 via-[#0F172A] to-[#080C14] border-b border-[#0284C7]/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
          <div className="flex items-center gap-3">
            <span className="bg-[#0284C7] text-white px-2 py-0.5 rounded text-[11px] font-bold">
              ANNÉE {selectedYear}
            </span>
            <span className="text-slate-300 font-semibold">
              {yearStats.count} séances ({yearStats.firstDate} → {yearStats.lastDate})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div>
              <span className="text-slate-400">Ouv. : </span>
              <strong className="text-white">{Number(yearStats.firstOpen).toFixed(precision)}</strong>
            </div>
            <div>
              <span className="text-slate-400">Clôt. : </span>
              <strong className="text-white">{Number(yearStats.lastClose).toFixed(precision)}</strong>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Perf. : </span>
              <strong
                className={`px-1.5 py-0.5 rounded font-bold ${
                  yearStats.changePercent >= 0
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {yearStats.changePercent >= 0 ? '+' : ''}
                {Number(yearStats.changePercent).toFixed(2)}%
              </strong>
            </div>
            <div>
              <span className="text-slate-400">H/B : </span>
              <span className="text-emerald-400 font-bold">{Number(yearStats.maxHigh).toFixed(precision)}</span>
              <span className="text-slate-500"> / </span>
              <span className="text-rose-400 font-bold">{Number(yearStats.minLow).toFixed(precision)}</span>
            </div>
            <div>
              <span className="text-slate-400">Vol. Total : </span>
              <strong className="text-sky-400">{Number(yearStats.totalVolume).toLocaleString()}</strong>
            </div>
            <button
              onClick={() => handleYearChange('ALL')}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Afficher tout l'historique
            </button>
          </div>
        </div>
      )}

      {/* 2. Barre d'inspection OHLC au survol */}
      <div className="px-4 py-1.5 bg-[#080C14] border-b border-[#1E293B] flex flex-wrap items-center gap-5 text-xs font-mono select-none">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Clock size={13} className="text-[#38BDF8]" />
          <span className="text-slate-200">{hoveredCandle?.time || '---'}</span>
        </span>
        <span className="text-slate-400">
          O: <strong className="text-slate-100">{hoveredCandle?.open != null ? hoveredCandle.open.toFixed(precision) : '---'}</strong>
        </span>
        <span className="text-slate-400">
          H: <strong className="text-[#10B981]">{hoveredCandle?.high != null ? hoveredCandle.high.toFixed(precision) : '---'}</strong>
        </span>
        <span className="text-slate-400">
          L: <strong className="text-[#EF4444]">{hoveredCandle?.low != null ? hoveredCandle.low.toFixed(precision) : '---'}</strong>
        </span>
        <span className="text-slate-400">
          C:{' '}
          <strong
            className={
              hoveredCandle?.close >= hoveredCandle?.open
                ? 'text-[#10B981]'
                : 'text-[#EF4444]'
            }
          >
            {hoveredCandle?.close != null ? hoveredCandle.close.toFixed(precision) : '---'}
          </strong>
        </span>
        {hoveredCandle?.volume != null && (
          <span className="text-slate-400">
            VOL: <strong className="text-slate-300">{Number(hoveredCandle.volume).toLocaleString()}</strong>
          </span>
        )}
      </div>

      {/* 3. Spinner de chargement */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#080C14]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="text-[#38BDF8] animate-spin" />
          <div className="font-mono text-xs text-slate-200 font-semibold tracking-wider">
            Chargement des cotations réelles ({selectedAsset?.ticker})...
          </div>
        </div>
      )}

      {/* 4. Affichage d'erreur */}
      {error && (
        <div className="absolute top-20 left-4 right-4 bg-rose-950/90 border border-rose-800 p-3 rounded text-rose-300 text-xs flex items-center gap-2 z-20">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Canvas TradingView */}
      <div className="flex-1 w-full relative min-h-[360px]" ref={chartContainerRef} />
    </div>
  );
}
