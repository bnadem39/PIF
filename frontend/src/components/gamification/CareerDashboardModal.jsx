import React, { useState, useEffect } from 'react';
import {
  Briefcase, Award, TrendingUp, CheckCircle2, ChevronRight,
  Shield, Star, Zap, X, AlertCircle, Sparkles, Clock, Crown
} from 'lucide-react';
import { getCareerDashboard, evaluateCareer } from '../../services/api';

export default function CareerDashboardModal({ isOpen, onClose, currentUser, onCareerUpdated }) {
  const [career, setCareer] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCareer = async () => {
    try {
      const data = await getCareerDashboard();
      if (data) setCareer(data);
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCareer();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setEvalResult(null);
    try {
      const res = await evaluateCareer();
      if (res?.promoted) {
        setEvalResult({ success: true, text: `Félicitations ! Vous êtes promu au rang de ${res.career?.currentTitle} !` });
        setCareer(res.career);
        if (onCareerUpdated) onCareerUpdated();
      } else {
        setEvalResult({ success: false, text: 'Conditions de promotion non encore atteintes. Continuez vos matchs et cours !' });
      }
    } catch (err) {
      setEvalResult({ success: false, text: err.message || 'Erreur lors de l\'évaluation de carrière.' });
    } finally {
      setIsEvaluating(false);
    }
  };

  const currentStage = career?.currentStage;
  const nextStage = career?.nextStage;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#0B1120] border-2 border-emerald-500/50 rounded-3xl max-w-4xl w-full text-slate-100 flex flex-col shadow-2xl shadow-emerald-950/40 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] p-5 shrink-0 bg-[#0B1120]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Briefcase size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Carrière Professionnelle de Trader</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                  Palier {career?.currentStageOrder || 1} / 9
                </span>
              </div>
              <p className="text-xs text-slate-400">Ascension institutionnelle basée sur l'expérience, le savoir, les victoires et la maîtrise</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 min-h-0">
          {evalResult && (
            <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
              evalResult.success
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {evalResult.success ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-amber-400" />}
              <span>{evalResult.text}</span>
            </div>
          )}

          {/* Current Stage Hero Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0E1726] to-[#080C14] border border-emerald-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-black">
                TITRE ACTUEL DE CARRIÈRE
              </span>
              <h2 className="text-2xl font-black text-white mt-0.5">{career?.currentTitle || 'Novice des Marchés'}</h2>
              <p className="text-xs text-slate-300 max-w-lg mt-1">
                {currentStage?.cosmeticRewardTitle ? `Récompense cosmétique débloquée : ${currentStage.cosmeticRewardTitle}` : 'Votre parcours vers les sommets du trading institutionnel a débuté.'}
              </p>
            </div>

            <button
              onClick={handleEvaluate}
              disabled={isEvaluating || !nextStage}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/40 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles size={14} /> Évaluer Ma Promotion
            </button>
          </div>

          {/* Next Stage Requirements */}
          {nextStage ? (
            <div className="p-4 rounded-2xl bg-[#080C14] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">PROCHAIN PALIER</span>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    {nextStage.title} (Palier {nextStage.stageOrder})
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {career?.progressToNextStagePercentage || 0}% complété
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${career?.progressToNextStagePercentage || 0}%` }}
                />
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-[#0B1120] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">NIVEAU MINIMUM</span>
                  <span className="text-slate-200 font-bold">Niv. {nextStage.requiredLevel}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1120] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">EXP NÉCESSAIRE</span>
                  <span className="text-slate-200 font-bold">{nextStage.requiredExp} EXP</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1120] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">VICTOIRES MINIMUM</span>
                  <span className="text-slate-200 font-bold">{nextStage.requiredWins} Wins</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0B1120] border border-[#1E293B]">
                  <span className="text-[10px] text-slate-500 block">COMPÉTENCES</span>
                  <span className="text-slate-200 font-bold">{nextStage.requiredSkillsCount} Validées</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
              <Crown size={16} className="text-amber-400" />
              <span>Vous avez atteint le rang suprême de Légende Vivante du Trading !</span>
            </div>
          )}

          {/* 9 Stages Roadmap */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Échelons de l'Ordre Financier (9 Paliers)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {career?.allStages?.map((stage) => {
                const isCurrent = career?.currentStageOrder === stage.stageOrder;
                const isPassed = (career?.currentStageOrder || 1) > stage.stageOrder;

                return (
                  <div
                    key={stage.stageOrder}
                    className={`p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/30 border-emerald-500/80 shadow-md shadow-emerald-950/30'
                        : isPassed
                        ? 'bg-[#080C14] border-slate-700/80'
                        : 'bg-[#080C14]/40 border-slate-800/60 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-slate-400">Palier {stage.stageOrder}</span>
                      {isPassed && <CheckCircle2 size={13} className="text-emerald-400" />}
                      {isCurrent && <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-black">ACTUEL</span>}
                    </div>
                    <h5 className="text-xs font-black text-white">{stage.title}</h5>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">Niveau {stage.requiredLevel} · {stage.requiredExp} EXP</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Promotion History */}
          {career?.history && career.history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#1E293B]">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" /> Historique des Promotions
              </h4>
              <div className="space-y-2">
                {career.history.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#080C14] border border-[#1E293B] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{h.title}</span>
                      <span className="text-[11px] text-slate-400">{h.details}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {h.promotedAt ? new Date(h.promotedAt).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

