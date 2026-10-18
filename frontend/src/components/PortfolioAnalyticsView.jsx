import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Layers,
  Award,
  ShieldAlert,
  Sparkles,
  BrainCircuit,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import {
  getPortfolioSummary,
  getTransactionsHistory,
  getAccountPerformance,
  resetAccountPortfolio,
  explainPortfolioAudit
} from '../services/realMarketService';

export default function PortfolioAnalyticsView({
  simulatedDate,
  selectedAsset,
  onNavigateToTrading
}) {
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // État de l'Audit Stratégique IA à la demande (LLM / FinGPT)
  const [auditData, setAuditData] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState(null);

  const currentPrice = selectedAsset?.price || 0;
  const currentSymbol = selectedAsset?.ticker || '';

  const handleAuditPortfolio = async () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setAuditError(null);

    try {
      const payload = {
        simulated_date: simulatedDate || '2022-01-03',
        cash_disponible: portfolio?.cashBalance != null ? Number(portfolio.cashBalance) : 100000.0,
        valeur_totale: portfolio?.totalPortfolioValue != null ? Number(portfolio.totalPortfolioValue) : 100000.0,
        pnl_jour: portfolio?.totalUnrealizedPnl != null ? Number(portfolio.totalUnrealizedPnl) : 0.0,
        positions: (portfolio?.positions || []).map((pos) => ({
          symbol: pos.symbol,
          shares: pos.quantity,
          current_price: pos.currentPrice,
          avg_buy_price: pos.averageCostPrice,
          unrealized_pnl: pos.unrealizedPnl
        }))
      };

      const result = await explainPortfolioAudit(payload);
      setAuditData(result);
    } catch (err) {
      console.error("Erreur audit IA du portefeuille:", err);
      setAuditError(err.message || "Impossible de contacter l'auditeur IA local.");
    } finally {
      setIsAuditing(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [port, txs, perf] = await Promise.all([
        getPortfolioSummary(simulatedDate, currentSymbol, currentPrice),
        getTransactionsHistory(),
        getAccountPerformance(currentSymbol, currentPrice)
      ]);
      setPortfolio(port);
      setTransactions(txs || []);
      setPerformance(perf);
    } catch (err) {
      console.error('Erreur chargement données portefeuille:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [simulatedDate, currentSymbol, currentPrice]);

  const handleReset = async () => {
    if (!window.confirm("Voulez-vous vraiment réinitialiser votre portefeuille ?\nToutes les positions et transactions seront effacées et votre capital sera restauré à 100 000,000 TND.")) {
      return;
    }
    try {
      await resetAccountPortfolio();
      setActionMessage({ type: 'success', text: "Portefeuille réinitialisé avec succès : 100 000,000 TND de liquidités." });
      await refreshData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({ type: 'error', text: `Erreur réinitialisation: ${err.message}` });
    }
  };

  const cashBalance = portfolio?.cashBalance ?? 100000;
  const totalValue = portfolio?.totalPortfolioValue ?? cashBalance;
  const positionsMarketValue = portfolio?.positionsMarketValue ?? 0;
  const totalUnrealizedPnl = portfolio?.totalUnrealizedPnl ?? 0;
  const totalUnrealizedPnlPercent = portfolio?.totalUnrealizedPnlPercent ?? 0;
  const totalRealizedPnl = portfolio?.totalRealizedPnl ?? 0;

  const isUnrealizedPos = totalUnrealizedPnl >= 0;
  const isRealizedPos = totalRealizedPnl >= 0;

  const winRate = performance?.winRatePercent ?? 0;
  const maxDrawdown = performance?.maxDrawdownPercent ?? 0;
  const totalTrades = performance?.totalTrades ?? 0;
  const winningTrades = performance?.winningTrades ?? 0;
  const losingTrades = performance?.losingTrades ?? 0;

  const equityPoints = performance?.equityCurve || [];

  return (
    <div className="flex-1 overflow-y-auto bg-[#080C14] p-4 text-[#F8FAFC] select-none font-sans">
      {/* 1. BANDEAU DE TITRE ET ACTION RESET */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-wide">
              Espace Portefeuille & Tableau de Bord Risque
            </h1>
            <span className="bg-[#0284C7]/20 text-[#38BDF8] border border-[#0284C7]/40 text-[11px] font-mono px-2 py-0.5 rounded font-bold">
              PostgreSQL • BigDecimal(15,3)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Date simulée active : <strong className="text-sky-400">{simulatedDate || 'Initiale'}</strong> • Taux de frais courtage : 0.15%
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded-lg text-xs font-semibold transition-all"
          >
            <Activity size={14} className="text-[#38BDF8]" />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <RotateCcw size={14} />
            <span>Réinitialiser (100 000 TND)</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`mb-4 p-3 rounded-lg border text-xs flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* 2. WIDGETS DE STATUT FINANCIER HAUTE PRÉCISION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 font-mono">
        {/* Widget 1 : Solde Cash Disponible */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="uppercase font-semibold">Cash Disponible</span>
            <Wallet size={16} className="text-[#38BDF8]" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {Number(cashBalance).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs text-slate-400 font-normal">TND</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Fonds bloqués : 0.000 TND
          </div>
        </div>

        {/* Widget 2 : Valeur Totale Portefeuille */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="uppercase font-semibold">Valeur Liquidative</span>
            <Layers size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {Number(totalValue).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs text-slate-400 font-normal">TND</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Titres : {Number(positionsMarketValue).toFixed(3)} TND ({portfolio?.positionsCount || 0} lignes)
          </div>
        </div>

        {/* Widget 3 : P&L Latent Global */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="uppercase font-semibold">P&L Latent Global</span>
            {isUnrealizedPos ? (
              <TrendingUp size={16} className="text-emerald-400" />
            ) : (
              <TrendingDown size={16} className="text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold tracking-tight ${
              isUnrealizedPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isUnrealizedPos ? '+' : ''}
            {Number(totalUnrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs font-normal">TND</span>
          </div>
          <div className="text-[10px] font-semibold mt-1">
            <span
              className={`px-1.5 py-0.5 rounded ${
                isUnrealizedPos ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
              }`}
            >
              {isUnrealizedPos ? '+' : ''}
              {Number(totalUnrealizedPnlPercent).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Widget 4 : Performance & P&L Réalisé */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-3.5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="uppercase font-semibold">P&L Réalisé Cumulé</span>
            <Award size={16} className="text-amber-400" />
          </div>
          <div
            className={`text-xl font-bold tracking-tight ${
              isRealizedPos ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isRealizedPos ? '+' : ''}
            {Number(totalRealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}{' '}
            <span className="text-xs font-normal">TND</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Win Rate : <strong className="text-sky-400">{Number(winRate).toFixed(1)}%</strong> ({winningTrades}V / {losingTrades}D)
          </div>
        </div>
      </div>

      {/* 3. DIAGNOSTIC STRATÉGIQUE IA DU PORTEFEUILLE (LLM À LA DEMANDE) */}
      <div className="bg-[#0F172A] border border-indigo-500/30 rounded-xl p-4 mb-5 shadow-lg relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Diagnostic Stratégique IA du Portefeuille
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  FinGPT Copilot • À la demande
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Audit unitaire et confidentiel : diversification, P&L latent et préconisations de gestion des risques.
              </p>
            </div>
          </div>

          <button
            onClick={handleAuditPortfolio}
            disabled={isAuditing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
              isAuditing
                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800 cursor-not-allowed opacity-80'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            {isAuditing ? (
              <>
                <RefreshCw size={14} className="animate-spin text-cyan-400" />
                <span>Analyse des positions et ratios en cours...</span>
              </>
            ) : (
              <>
                <Lightbulb size={14} className="text-amber-300" />
                <span>Demander l'analyse de mon portefeuille</span>
              </>
            )}
          </button>
        </div>

        {/* Indicateur de chargement actif */}
        {isAuditing && (
          <div className="bg-slate-900/80 border border-indigo-500/30 rounded-lg p-3 text-xs text-indigo-300 flex items-center gap-2 font-mono animate-pulse">
            <Sparkles size={14} className="text-cyan-400" />
            <span>Le Copilot analyse vos positions et consulte les ratios de risque...</span>
          </div>
        )}

        {/* Message d'erreur */}
        {auditError && (
          <div className="bg-rose-950/80 border border-rose-800/80 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2 font-mono">
            <AlertCircle size={15} />
            <span>{auditError}</span>
          </div>
        )}

        {/* Résultat de l'Audit IA */}
        {auditData && !isAuditing && (
          <div className="mt-3 space-y-3 font-sans">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-md border ${
                auditData.risk_level === 'LOW'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : auditData.risk_level === 'HIGH' || auditData.risk_level === 'VERY HIGH'
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                  : 'bg-amber-950/80 text-amber-400 border-amber-800'
              }`}>
                Niveau de Risque : {auditData.risk_level}
              </span>

              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-900 text-sky-400 border border-slate-700">
                Arbitrage Conseillé : {auditData.arbitrage_advice}
              </span>

              {auditData.key_ratios && (
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                  Cash : {auditData.key_ratios.cash_ratio_pct}% • Lignes : {auditData.key_ratios.positions_count}
                </span>
              )}

              <span className="text-[10px] font-mono text-slate-500 ml-auto">
                Latence : {auditData.latency_ms}ms • Date : {auditData.simulated_date}
              </span>
            </div>

            <div className="bg-[#080C14] border border-slate-800 p-3.5 rounded-lg text-xs text-slate-200 leading-relaxed whitespace-pre-line font-mono">
              {auditData.explanation}
            </div>

            {auditData.sources && auditData.sources.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono flex-wrap">
                <span className="text-slate-500">Références :</span>
                {auditData.sources.map((src, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. COURBE D'ÉQUITÉ & SYNTHÈSE DU RISQUE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Graphique Courbe d'Équité */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-[#1E293B] p-4 rounded-xl flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#38BDF8]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Courbe d'Équité (Equity Curve)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Capital Initial : 100 000.000 TND
            </span>
          </div>

          {/* Visualisation SVG Haute Définition */}
          <div className="flex-1 min-h-[170px] bg-[#080C14] border border-[#1E293B] rounded-lg p-3 flex flex-col justify-end relative overflow-hidden">
            {equityPoints.length > 1 ? (
              <svg className="w-full h-36 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Calcul des coordonnées normalisées */}
                {(() => {
                  const vals = equityPoints.map((p) => p.value);
                  const min = Math.min(...vals) * 0.98;
                  const max = Math.max(...vals) * 1.02;
                  const range = max - min || 1;

                  const points = equityPoints.map((p, idx) => {
                    const x = (idx / (equityPoints.length - 1)) * 100;
                    const y = 100 - ((p.value - min) / range) * 100;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  });

                  const linePath = `M ${points.join(' L ')}`;
                  const areaPath = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;

                  return (
                    <>
                      <path d={areaPath} fill="url(#equityGrad)" />
                      <path d={linePath} fill="none" stroke="#38BDF8" strokeWidth="2.5" />
                    </>
                  );
                })()}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 font-mono text-xs">
                Aucune transaction clôturée pour tracer la courbe d'équité.
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 border-t border-[#1E293B] pt-1">
              <span>Départ : 100 000 TND</span>
              <span>Actuel : {Number(totalValue).toFixed(2)} TND</span>
            </div>
          </div>
        </div>

        {/* Métriques Statistiques de Gestion du Risque */}
        <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={16} className="text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Indicateurs Clés de Risque
              </h2>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#080C14] border border-[#1E293B] p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">Taux de Réussite (Win Rate)</span>
                <span className="font-bold text-sky-400 text-sm">{Number(winRate).toFixed(1)}%</span>
              </div>

              <div className="bg-[#080C14] border border-[#1E293B] p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">Max Drawdown</span>
                <span className="font-bold text-rose-400 text-sm">-{Number(maxDrawdown).toFixed(2)}%</span>
              </div>

              <div className="bg-[#080C14] border border-[#1E293B] p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">Total Ventes Exécutées</span>
                <span className="font-bold text-slate-200">{totalTrades}</span>
              </div>

              <div className="bg-[#080C14] border border-[#1E293B] p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-slate-400">Ratio Gain / Perte</span>
                <span className="font-bold text-emerald-400">{winningTrades}</span>
                <span className="text-slate-500">/</span>
                <span className="font-bold text-rose-400">{losingTrades}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-4 border-t border-[#1E293B] pt-2">
            Zéro risque de découvert : contrôles de solvabilité pré-trade actifs sur Spring Boot.
          </div>
        </div>
      </div>

      {/* 4. TABLEAU DES POSITIONS OUVERTES */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden mb-5">
        <div className="px-4 py-3 bg-[#0A0E17] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[#38BDF8]" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Positions Ouvertes en Portefeuille ({portfolio?.positions?.length || 0})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Formule PRU : Σ(Qi × Pi) / ΣQi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#080C14] text-slate-400 uppercase text-[10px] border-b border-[#1E293B]">
              <tr>
                <th className="py-2.5 px-3">Actif</th>
                <th className="py-2.5 px-3 text-right">Quantité</th>
                <th className="py-2.5 px-3 text-right">PRU (Coût Moyen)</th>
                <th className="py-2.5 px-3 text-right">Cours Simulé</th>
                <th className="py-2.5 px-3 text-right">Valeur Marché</th>
                <th className="py-2.5 px-3 text-right">P&L Latent (TND)</th>
                <th className="py-2.5 px-3 text-right">P&L Latent (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {portfolio?.positions && portfolio.positions.length > 0 ? (
                portfolio.positions.map((pos) => {
                  const isPos = pos.unrealizedPnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[#1E293B]/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[#38BDF8]">{pos.symbol}</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{pos.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-300">{Number(pos.averageCostPrice).toFixed(3)} TND</td>
                      <td className="py-2.5 px-3 text-right text-white font-bold">{Number(pos.currentPrice).toFixed(3)} TND</td>
                      <td className="py-2.5 px-3 text-right text-slate-200">{Number(pos.marketValue).toFixed(3)} TND</td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          isPos ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isPos ? '+' : ''}{Number(pos.unrealizedPnl).toFixed(3)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          isPos ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isPos ? '+' : ''}{Number(pos.unrealizedPnlPercent).toFixed(2)}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500 font-mono text-xs">
                    Aucune position ouverte actuellement. Passez un ordre d'achat dans le terminal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. JOURNAL DES TRANSACTIONS (AUDIT TRAIL) */}
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#0A0E17] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-amber-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Journal d'Audit des Transactions ({transactions.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Horodatage selon la date de simulation
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#080C14] text-slate-400 uppercase text-[10px] border-b border-[#1E293B] sticky top-0">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Date Simulée</th>
                <th className="py-2.5 px-3">Actif</th>
                <th className="py-2.5 px-3">Sens</th>
                <th className="py-2.5 px-3 text-right">Quantité</th>
                <th className="py-2.5 px-3 text-right">Cours Exécution</th>
                <th className="py-2.5 px-3 text-right">Frais (0.15%)</th>
                <th className="py-2.5 px-3 text-right">P&L Réalisé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {transactions && transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isBuy = tx.type === 'BUY';
                  const isPnlPos = tx.realizedPnl >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-[#1E293B]/40 transition-colors">
                      <td className="py-2 px-3 text-slate-500">#{tx.id}</td>
                      <td className="py-2 px-3 text-slate-300 font-semibold">{tx.simulatedDate}</td>
                      <td className="py-2 px-3 font-bold text-[#38BDF8]">{tx.symbol}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isBuy
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {isBuy ? 'ACHAT' : 'VENTE'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-200">{tx.quantity}</td>
                      <td className="py-2 px-3 text-right text-white font-bold">{Number(tx.executionPrice).toFixed(3)} TND</td>
                      <td className="py-2 px-3 text-right text-amber-400">{Number(tx.fees).toFixed(3)} TND</td>
                      <td
                        className={`py-2 px-3 text-right font-bold ${
                          isBuy
                            ? 'text-slate-500'
                            : isPnlPos
                            ? 'text-[#10B981]'
                            : 'text-[#EF4444]'
                        }`}
                      >
                        {isBuy ? '---' : `${isPnlPos ? '+' : ''}${Number(tx.realizedPnl).toFixed(3)} TND`}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-slate-500 font-mono text-xs">
                    Aucune transaction enregistrée. Les ordres exécutés apparaîtront ici avec horodatage d'audit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
