import React, { useState } from 'react';
import {
  BrainCircuit, Sparkles, Loader2, Play, Pause, AlertCircle,
  TrendingUp, TrendingDown, ArrowRight, ShieldCheck
} from 'lucide-react';
import { triggerMarketPauseAudit } from '../../services/api';
import SimpleMarkdown from '../SimpleMarkdown';

export default function OnDemandCopilot({
  isPlaying,
  simulatedDate,
  portfolio,
  marketSnapshot = [],
  selectedAsset
}) {
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState(null);

  const handleRunAudit = async () => {
    if (isPlaying) return; // Strictly blocked during active playback
    setLoading(true);
    setError(null);

    try {
      const payload = {
        simulated_date: simulatedDate,
        portfolio: {
          cash: portfolio?.cash ?? 100000,
          total_value: portfolio?.totalValue ?? 100000,
          positions: portfolio?.positions ?? []
        },
        market_snapshot: marketSnapshot.length > 0 ? marketSnapshot : [
          { ticker: selectedAsset?.ticker || 'BIAT', price: selectedAsset?.price || 100, change: 0.5, xgboost_signal: 1 }
        ]
      };

      const res = await triggerMarketPauseAudit(payload);
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Audit IA indisponible (Vérifiez FastAPI / LM Studio / Ollama).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Desk IA Copilot (FinGPT / Qwen)
          </h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isPlaying
            ? 'bg-slate-900 border-slate-700 text-slate-500'
            : 'bg-emerald-950/50 border-emerald-600/50 text-emerald-400 animate-pulse'
        }`}>
          {isPlaying ? 'VEILLE (PLAY ACTIF)' : 'PRÊT POUR AUDIT'}
        </span>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-4 flex flex-col justify-between gap-4 overflow-y-auto">
        {/* State Information */}
        {isPlaying ? (
          <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E293B] flex flex-col items-center justify-center text-center gap-2 text-slate-400">
            <Pause size={24} className="text-amber-400 opacity-60" />
            <p className="text-xs font-medium">
              Simulation en cours de lecture.
            </p>
            <p className="text-[11px] text-slate-500">
              Mettez la session en <span className="text-amber-300 font-bold">PAUSE</span> pour débloquer l'audit stratégique approfondi de votre portefeuille.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Glowing Trigger Button */}
            <button
              onClick={handleRunAudit}
              disabled={loading}
              className="relative group w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 text-white bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 transition-all shadow-lg shadow-cyan-950/50 ring-2 ring-cyan-400/30 hover:ring-cyan-300 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-cyan-200" />
                  <span>Audit des risques en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-cyan-200 animate-bounce" />
                  <span>Lancer l'Audit Stratégique Desk</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Audit Results */}
            {auditResult && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {/* Market Summary */}
                <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#1E293B] space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                    <span>Synthèse Marché (RAG Macro)</span>
                    <span className="text-slate-400 font-mono text-[10px]">{simulatedDate}</span>
                  </div>
                  <SimpleMarkdown text={auditResult.market_summary} className="text-xs text-slate-300 leading-relaxed font-sans" />
                </div>

                {/* Portfolio Impact */}
                {auditResult.portfolio_impact && (
                  <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#1E293B] space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Impact sur le Portefeuille & Risque
                    </div>
                    <SimpleMarkdown text={auditResult.portfolio_impact} className="text-xs text-slate-300 leading-relaxed font-sans" />
                  </div>
                )}

                {/* Opportunities List */}
                {auditResult.opportunities && auditResult.opportunities.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Recommandations Quant XGBoost
                    </span>
                    {auditResult.opportunities.map((opp, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#080C14] border border-[#1E293B] flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            opp.action === 'BUY'
                              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                              : opp.action === 'TRIM'
                              ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {opp.action}
                          </span>
                          <span className="text-xs font-bold text-slate-200">{opp.ticker}</span>
                        </div>
                        <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                          {opp.confidence_pct}% conf.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-[#1E293B] text-[10px] text-slate-500 font-mono flex items-center justify-between">
          <span>Modèle : FinGPT / Qwen-2.5</span>
          <span>Seuil XGB : P &ge; 60%</span>
        </div>
      </div>
    </div>
  );
}

