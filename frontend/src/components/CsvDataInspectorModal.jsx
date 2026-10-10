import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Database,
  Layers,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { getCsvOverview, getRawCsvData, getAvailableYears } from '../services/realMarketService';

export default function CsvDataInspectorModal({
  isOpen,
  onClose,
  initialAsset,
  initialYear,
  assets = [],
  onSelectAssetAndYear
}) {
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(initialAsset?.ticker || 'BIAT');
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(initialYear || 'ALL');
  const [searchDate, setSearchDate] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [rawDataResult, setRawDataResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Synchronisation avec l'actif initial fourni
  useEffect(() => {
    if (initialAsset?.ticker) {
      setSelectedTicker(initialAsset.ticker);
    }
    if (initialYear) {
      setSelectedYear(initialYear);
    }
  }, [initialAsset, initialYear]);

  // Chargement de l'aperçu des fichiers CSV
  useEffect(() => {
    if (!isOpen) return;
    getCsvOverview()
      .then((data) => setCsvFiles(data || []))
      .catch((err) => console.error('Erreur chargement aperçu CSV:', err));
  }, [isOpen]);

  // Chargement des années disponibles quand le ticker change
  useEffect(() => {
    if (!isOpen || !selectedTicker) return;
    getAvailableYears(selectedTicker)
      .then((years) => {
        setAvailableYears(years || []);
        // Si l'année courante n'est pas dans les années disponibles, basculer sur Toutes ou la 1ère
        if (selectedYear !== 'ALL' && years && !years.includes(selectedYear)) {
          setSelectedYear('ALL');
        }
      })
      .catch((err) => console.error('Erreur chargement années:', err));
  }, [isOpen, selectedTicker]);

  // Chargement des données brutes
  useEffect(() => {
    if (!isOpen || !selectedTicker) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getRawCsvData(selectedTicker, selectedYear, page, pageSize, searchDate)
      .then((data) => {
        if (!isMounted) return;
        setRawDataResult(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedTicker, selectedYear, page, pageSize, searchDate]);

  if (!isOpen) return null;

  const currentAssetObj = assets.find((a) => a.ticker === selectedTicker) || {
    ticker: selectedTicker,
    currency: selectedTicker.endsWith('-USD') || selectedTicker === 'IBM' || selectedTicker === 'AAPL' ? 'USD' : 'TND'
  };

  const isTnd = currentAssetObj.currency === 'TND';
  const precision = isTnd ? 3 : 2;
  const stats = rawDataResult?.stats || {};
  const isPositivePerf = stats.changePercent >= 0;

  // Export CSV
  const handleExportCsv = () => {
    if (!rawDataResult?.rows || rawDataResult.rows.length === 0) return;
    const header = 'Date,Open,High,Low,Close,Volume,VariationPercent,Trend\n';
    const csvContent =
      header +
      rawDataResult.rows
        .map(
          (r) =>
            `${r.time},${r.open},${r.high},${r.low},${r.close},${r.volume},${r.changePercent}%,${r.trend}`
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${selectedTicker}_${selectedYear === 'ALL' ? 'HISTORIQUE_COMPLET' : selectedYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyToChart = () => {
    if (onSelectAssetAndYear) {
      onSelectAssetAndYear(currentAssetObj, selectedYear);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-[#0B1120] border border-[#1E293B] rounded-xl shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden text-slate-200 font-sans">
        
        {/* 1. HEADER MODAL */}
        <div className="px-5 py-3.5 bg-[#0F172A] border-b border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0284C7]/20 border border-[#0284C7]/40 rounded-lg text-[#38BDF8]">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-wide">
                  VISUALISEUR DE DONNÉES CSV & ARCHIVES DE MARCHÉ
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  4 FICHIERS CSV DISPONIBLES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Explorez l'intégralité des cotations boursières historiques (BVMT & Cryptos) avec filtrage par année
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToChart}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded text-xs font-semibold shadow transition-colors"
            >
              <BarChart2 size={14} />
              <span>Afficher sur la Courbe</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. BANDEAU DES FICHIERS CSV DÉTECTÉS */}
        <div className="px-5 py-2.5 bg-[#080D1A] border-b border-[#1E293B] flex items-center gap-3 overflow-x-auto text-xs shrink-0 select-none">
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Database size={13} className="text-[#38BDF8]" /> Sources CSV :
          </span>
          {csvFiles.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2.5 py-1 bg-[#0F172A] border border-[#1E293B] rounded-md shrink-0 font-mono"
            >
              <HardDrive size={12} className="text-slate-400" />
              <span className="font-bold text-slate-200">{file.fileName}</span>
              <span className="text-[10px] text-slate-400">({file.fileSizeFormatted})</span>
              <span className="text-[10px] bg-slate-800 text-sky-400 px-1 rounded">
                {file.recordsCount?.toLocaleString()} lignes
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">{file.dateRange}</span>
            </div>
          ))}
        </div>

        {/* 3. BARRE DE CONTRÔLE : SÉLECTION DE L'ACTIF, DE L'ANNÉE & RECHERCHE */}
        <div className="p-4 bg-[#0B132B]/60 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Sélecteur d'Actif */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Actif :</label>
              <select
                value={selectedTicker}
                onChange={(e) => {
                  setSelectedTicker(e.target.value);
                  setPage(0);
                }}
                className="bg-[#0F172A] border border-[#334155] text-white text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:border-[#38BDF8] outline-none"
              >
                <optgroup label="Bourse de Tunis (BVMT)">
                  {assets
                    .filter((a) => a.category === 'BVMT')
                    .map((a) => (
                      <option key={a.ticker} value={a.ticker}>
                        {a.ticker} - {a.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Crypto-Actifs Réels">
                  {assets
                    .filter((a) => a.category === 'CRYPTO')
                    .map((a) => (
                      <option key={a.ticker} value={a.ticker}>
                        {a.ticker} - {a.name}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Actions Internationales">
                  {assets
                    .filter((a) => a.category === 'US_EQUITY' || a.category === 'INDEX')
                    .map((a) => (
                      <option key={a.ticker} value={a.ticker}>
                        {a.ticker} - {a.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Sélecteur d'Année */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Calendar size={13} className="text-[#38BDF8]" />
                Année :
              </label>
              <div className="flex items-center gap-1 bg-[#0F172A] p-0.5 rounded-lg border border-[#334155] overflow-x-auto max-w-md">
                <button
                  onClick={() => {
                    setSelectedYear('ALL');
                    setPage(0);
                  }}
                  className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                    selectedYear === 'ALL'
                      ? 'bg-[#0284C7] text-white font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Toutes
                </button>
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => {
                      setSelectedYear(yr);
                      setPage(0);
                    }}
                    className={`text-xs font-mono px-2 py-1 rounded transition-colors ${
                      selectedYear === yr
                        ? 'bg-[#0284C7] text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Recherche par Date */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  setPage(0);
                }}
                placeholder="Filtrer date (ex: 2021-05)..."
                className="bg-[#0F172A] border border-[#334155] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-[#38BDF8] w-48"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold transition-colors"
            >
              <Download size={14} />
              <span>Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* 4. CARTES KPI RÉSUMÉ DE L'ANNÉE SÉLECTIONNÉE */}
        {stats && stats.count > 0 && (
          <div className="px-5 py-3 bg-[#080D1A] border-b border-[#1E293B] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 shrink-0 font-mono">
            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Séances Cotées</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {stats.count} séances
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                {stats.firstDate} → {stats.lastDate}
              </div>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Ouverture Année</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {stats.firstOpen?.toFixed(precision)} {currentAssetObj.currency}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Premier cours</div>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Clôture Année</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {stats.lastClose?.toFixed(precision)} {currentAssetObj.currency}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Dernier cours</div>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Performance Annuelle</div>
              <div
                className={`text-sm font-extrabold mt-0.5 flex items-center gap-1 ${
                  isPositivePerf ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositivePerf ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isPositivePerf ? '+' : ''}
                {stats.changePercent?.toFixed(2)}%
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Variation nette</div>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Plus Haut Annuel</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                {stats.maxHigh?.toFixed(precision)} {currentAssetObj.currency}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Plafond historique</div>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Plus Bas Annuel</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">
                {stats.minLow?.toFixed(precision)} {currentAssetObj.currency}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Plancher historique</div>
            </div>

            <div className="bg-[#0F172A] p-2.5 rounded-lg border border-[#1E293B]">
              <div className="text-[10px] text-slate-400 uppercase">Volume Échangé</div>
              <div className="text-sm font-bold text-sky-400 mt-0.5 truncate">
                {Number(stats.totalVolume || 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                Moy: {Number(stats.avgVolume || 0).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* 5. TABLEAU DE DONNÉES BRUTES CSV */}
        <div className="flex-1 overflow-auto bg-[#070B14] relative">
          {isLoading && (
            <div className="absolute inset-0 bg-[#070B14]/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={24} className="text-[#38BDF8] animate-spin" />
              <span className="font-mono text-xs text-slate-300">
                Lecture des enregistrements CSV en cours...
              </span>
            </div>
          )}

          {error && (
            <div className="p-8 text-center text-rose-400 text-xs font-mono">
              Erreur lors de la lecture des données CSV : {error}
            </div>
          )}

          {!isLoading && (!rawDataResult?.rows || rawDataResult.rows.length === 0) && (
            <div className="p-12 text-center text-slate-400 text-xs font-mono">
              Aucune donnée trouvée pour {selectedTicker} sur l'année {selectedYear}.
            </div>
          )}

          {rawDataResult?.rows && rawDataResult.rows.length > 0 && (
            <table className="w-full text-left border-collapse text-xs font-mono select-text">
              <thead className="bg-[#0F172A] sticky top-0 z-10 text-[11px] text-slate-400 uppercase border-b border-[#1E293B]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Ouv. (Open)</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-emerald-400">Haut (High)</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-rose-400">Bas (Low)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Clôt. (Close)</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-sky-400">Volume</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Variation</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Tendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/40">
                {rawDataResult.rows.map((row, idx) => {
                  const isUp = row.trend === 'UP';
                  const isDown = row.trend === 'DOWN';
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-[#1E293B]/40 transition-colors"
                    >
                      <td className="py-2 px-4 text-slate-200 font-bold">{row.time}</td>
                      <td className="py-2 px-4 text-right text-slate-300">
                        {Number(row.open).toFixed(precision)}
                      </td>
                      <td className="py-2 px-4 text-right text-emerald-400 font-semibold">
                        {Number(row.high).toFixed(precision)}
                      </td>
                      <td className="py-2 px-4 text-right text-rose-400 font-semibold">
                        {Number(row.low).toFixed(precision)}
                      </td>
                      <td className="py-2 px-4 text-right text-white font-bold">
                        {Number(row.close).toFixed(precision)}
                      </td>
                      <td className="py-2 px-4 text-right text-slate-400">
                        {Number(row.volume).toLocaleString()}
                      </td>
                      <td
                        className={`py-2 px-4 text-right font-bold ${
                          row.changePercent > 0
                            ? 'text-emerald-400'
                            : row.changePercent < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.changePercent > 0 ? '+' : ''}
                        {Number(row.changePercent).toFixed(2)}%
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isUp
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : isDown
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : null}
                          {isUp ? 'HAUSSE' : isDown ? 'BAISSE' : 'STABLE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 6. PIED DE PAGE : PAGINATION ET STATUT */}
        <div className="px-5 py-3 bg-[#0F172A] border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
          <div className="text-slate-400">
            Affichage de {rawDataResult?.rows?.length || 0} lignes sur{' '}
            <strong className="text-white">{rawDataResult?.totalCount || 0}</strong> enregistrements
            {selectedYear !== 'ALL' ? ` (Année ${selectedYear})` : ' (Toutes les années)'}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Lignes / page :</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-white text-xs outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-slate-300">
                Page <strong className="text-white">{page + 1}</strong> sur{' '}
                <strong className="text-white">{rawDataResult?.totalPages || 1}</strong>
              </span>
              <button
                disabled={page >= (rawDataResult?.totalPages || 1) - 1}
                onClick={() => setPage((prev) => prev + 1)}
                className="p-1 rounded bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
