import React from 'react';
import { Cpu, PauseCircle, Activity, BrainCircuit, ShieldAlert, Sparkles } from 'lucide-react';

export default function AiAssistant() {
  return (
    <section
      id="ia"
      className="relative py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full select-none"
      aria-label="Assistant IA et mode pause"
    >
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-bold mb-4">
          <span>IA CONTEXTUELLE & QUANT</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cinzel text-white tracking-wide">
          L'Intelligence Artificielle en Mode PAUSE
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
          Le rythme effréné du marché vous submerge ? Déclenchez le mode PAUSE dans votre salon privé pour figer le temps et auditer vos positions avec l'aide d'un copilote algorithmique.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Colonne 1 : Explication des 2 modes de l'IA */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#080C14] border border-[#1E293B]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-[#00E676] flex items-center justify-center border border-emerald-500/30">
                <Activity size={18} />
              </div>
              <h3 className="text-base font-bold text-white font-rajdhani">
                1. Signaux Légers en Plein Match
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              En cours de simulation, des badges de momentum (RSI suracheté, divergence MACD, croisement haussier) apparaissent discrètement sur votre carnet d'ordres sans encombrer l'écran.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1E1B4B]/30 via-[#0F172A] to-[#080C14] border border-indigo-500/40 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
                <PauseCircle size={18} />
              </div>
              <h3 className="text-base font-bold text-white font-rajdhani">
                2. Audit Approfondi en Mode PAUSE
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Activez la pause : le modèle XGBoost et le LLM financier analysent instantanément votre Value-at-Risk (VaR), votre concentration de portefeuille et vous expliquent la dynamique macroéconomique de la session.
            </p>
          </div>
        </div>

        {/* Colonne 2 : Carte interactive visualisant l'écran d'audit IA */}
        <div className="rounded-3xl bg-[#090D18] border-2 border-indigo-500/30 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* En-tête HUD de l'assistant */}
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <BrainCircuit size={20} className="text-indigo-400" />
              <span className="text-sm font-black font-mono text-white">PIF QUANT ASSISTANT v2.5</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              MODE PAUSE ACTIF
            </span>
          </div>

          {/* Métriques d'analyse */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#050811] border border-slate-800">
              <span className="text-slate-500 block text-[10px]">PROBABILITÉ HAUSSE</span>
              <span className="text-base font-bold text-[#00E676]">74.8% (XGBoost)</span>
            </div>
            <div className="p-3 rounded-xl bg-[#050811] border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RISQUE MAX DRAWDOWN</span>
              <span className="text-base font-bold text-amber-400">1.82% (Faible)</span>
            </div>
          </div>

          {/* Commentaire de l'IA */}
          <div className="p-3.5 rounded-xl bg-[#0B1222] border border-[#1E293B] text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px]">
              <Sparkles size={13} />
              <span>Diagnostic Stratégique Contextuel</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              « Le titre SFBT amorce un rebond sur son support oblique de 12.40 TND. Vos Take-Profit actuels sont cohérents, mais veillez à resserrer votre Trailing Stop avant la publication des résultats trimestriels simulés. »
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
