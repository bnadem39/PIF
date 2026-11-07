import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Lock, CheckCircle2, Star, ShieldAlert, TrendingUp,
  PieChart, Cpu, Compass, X, AlertCircle, ArrowRight, Award, Sparkles, BookOpen,
  Play, RefreshCw, Check
} from 'lucide-react';
import { getSkillTree, startSkill, improveSkillMastery } from '../../services/api';
import { subscribeToTopic } from '../../services/websocket';

const BRANCH_META = {
  TECHNICAL_ANALYSIS: { label: 'Analyse Technique', color: '#0284c7', icon: TrendingUp },
  RISK_MANAGEMENT: { label: 'Gestion des Risques', color: '#10b981', icon: ShieldAlert },
  PORTFOLIO_MANAGEMENT: { label: 'Gestion de Portefeuille', color: '#8b5cf6', icon: PieChart },
  MARKET_ANALYSIS: { label: 'Analyse de Marché', color: '#f59e0b', icon: Compass },
  ADVANCED_STRATEGIES: { label: 'Stratégies Quantitatives & IA', color: '#ec4899', icon: Cpu }
};

const STATUS_CONFIG = {
  LOCKED: {
    label: 'VERROUILLÉE',
    badgeClass: 'bg-slate-800/80 text-slate-400 border-slate-700',
    icon: Lock,
    borderGlow: 'border-slate-800'
  },
  AVAILABLE: {
    label: 'DISPONIBLE',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40 animate-pulse',
    icon: Play,
    borderGlow: 'border-sky-500/60 shadow-sky-950/40'
  },
  IN_PROGRESS: {
    label: 'EN COURS',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Zap,
    borderGlow: 'border-amber-500/60 shadow-amber-950/40'
  },
  COMPLETED: {
    label: 'VALIDÉE',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    icon: CheckCircle2,
    borderGlow: 'border-emerald-500/50 shadow-emerald-950/30'
  },
  MASTERED: {
    label: 'MAÎTRISÉE ⭐',
    badgeClass: 'bg-amber-400/25 text-amber-300 border-amber-400/60 font-black',
    icon: Star,
    borderGlow: 'border-amber-400 shadow-amber-500/20'
  }
};

export default function SkillTreeModal({ isOpen, onClose, currentUser, onSkillUnlocked }) {
  const [skills, setSkills] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadSkills = useCallback(async () => {
    try {
      const data = await getSkillTree();
      if (Array.isArray(data)) {
        setSkills(data);
        if (!selectedSkill && data.length > 0) {
          setSelectedSkill(data[0]);
        } else if (selectedSkill) {
          const updated = data.find((s) => s.id === selectedSkill.id);
          if (updated) setSelectedSkill(updated);
        }
      }
    } catch (_) {}
  }, [selectedSkill]);

  useEffect(() => {
    if (isOpen) {
      loadSkills();
    }
  }, [isOpen, loadSkills]);

  // Écoute temps réel des événements de progression de compétences via WebSocket
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const username = currentUser?.usernameAlias || currentUser?.username || currentUser?.email?.split('@')[0];
    if (!username) return;

    const sub = subscribeToTopic(`/topic/user/${username}/skills`, (event) => {
      loadSkills();
      if (event?.skillName) {
        setFeedbackMsg(`Compétence mise à jour : ${event.skillName} (${event.status})`);
      }
    });

    return () => {
      if (sub && sub.unsubscribe) sub.unsubscribe();
    };
  }, [isOpen, currentUser, loadSkills]);

  if (!isOpen) return null;

  const filteredSkills = selectedBranch === 'ALL'
    ? skills
    : skills.filter((s) => s.branch === selectedBranch);

  const handleStartSkill = async (skillId) => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    setErrorMsg(null);
    try {
      await startSkill(skillId);
      setFeedbackMsg("Apprentissage démarré ! Complétez le module de formation pour la valider.");
      await loadSkills();
      if (onSkillUnlocked) onSkillUnlocked();
    } catch (err) {
      setErrorMsg(err.message || 'Impossible de démarrer cette compétence.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMasteryUpgrade = async (skillId, tier) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await improveSkillMastery(skillId, tier);
      setFeedbackMsg(`Palier de maîtrise élevé à "${tier}" !`);
      await loadSkills();
      if (onSkillUnlocked) onSkillUnlocked();
    } catch (err) {
      setErrorMsg(err.message || 'Erreur amélioration maîtrise.');
    } finally {
      setIsProcessing(false);
    }
  };

  const completedCount = skills.filter((s) => s.status === 'COMPLETED' || s.status === 'MASTERED').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#0B1120] border-2 border-sky-500/50 rounded-3xl max-w-5xl w-full text-slate-100 flex flex-col shadow-2xl shadow-sky-950/40 max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] p-5 shrink-0 bg-[#0B1120]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400">
              <Zap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Arbre de Compétences Automatisé</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-[10px] font-mono font-bold text-sky-300">
                  {completedCount} / {skills.length} Validées
                </span>
              </div>
              <p className="text-xs text-slate-400">Progression événementielle automatique : vos succès et formations valident directement vos compétences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages de feedback */}
        {feedbackMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} /> {feedbackMsg}
            </span>
            <button onClick={() => setFeedbackMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <AlertCircle size={15} /> {errorMsg}
            </span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Branch Filter Tabs */}
        <div className="flex items-center gap-1.5 p-4 border-b border-[#1E293B] overflow-x-auto shrink-0 bg-[#080C14]">
          <button
            onClick={() => setSelectedBranch('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedBranch === 'ALL'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B]'
            }`}
          >
            Toutes ({skills.length})
          </button>
          {Object.entries(BRANCH_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const count = skills.filter((s) => s.branch === key).length;
            const isSelected = selectedBranch === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedBranch(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-[#0B1120] border border-[#1E293B]'
                }`}
                style={isSelected ? { backgroundColor: meta.color } : {}}
              >
                <Icon size={14} />
                <span>{meta.label}</span>
                <span className="text-[10px] font-mono opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Main Content : Skills Grid (Left) & Node Details (Right) */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Skills Grid */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredSkills.map((skill) => {
              const statusCfg = STATUS_CONFIG[skill.status] || STATUS_CONFIG.LOCKED;
              const StatusIcon = statusCfg.icon;
              const isSelected = selectedSkill?.id === skill.id;
              const branchInfo = BRANCH_META[skill.branch] || BRANCH_META.TECHNICAL_ANALYSIS;
              const BranchIcon = branchInfo.icon;

              return (
                <div
                  key={skill.id}
                  onClick={() => setSelectedSkill(skill)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                    isSelected
                      ? 'border-sky-400 bg-[#10192e] shadow-xl shadow-sky-950/40 scale-[1.01]'
                      : 'border-[#1E293B] bg-[#080C14]/90 hover:border-slate-700 hover:bg-[#0B1120]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-2 rounded-xl text-white"
                        style={{ backgroundColor: `${branchInfo.color}35`, color: branchInfo.color }}
                      >
                        <BranchIcon size={16} />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 font-bold block uppercase">
                          {branchInfo.label}
                        </span>
                        <h4 className="text-xs font-black text-white leading-tight">
                          {skill.name}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${statusCfg.badgeClass}`}
                    >
                      <StatusIcon size={10} /> {statusCfg.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-[#1E293B] pt-2 text-slate-400">
                    <span>Niveau requis : {skill.requiredLevel}</span>
                    <span className="text-amber-400 font-bold">+{skill.expReward} EXP</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Drawer: Selected Skill Details & Automatic Progression Criteria */}
          {selectedSkill && (
            <aside className="w-84 border-l border-[#1E293B] p-5 flex flex-col justify-between bg-[#080C14] shrink-0 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                        STATUS_CONFIG[selectedSkill.status]?.badgeClass
                      }`}
                    >
                      {React.createElement(STATUS_CONFIG[selectedSkill.status]?.icon || Lock, { size: 11 })}
                      {STATUS_CONFIG[selectedSkill.status]?.label}
                    </span>
                    {selectedSkill.masteryTier && selectedSkill.masteryTier !== 'NONE' && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {selectedSkill.masteryTier}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                    {BRANCH_META[selectedSkill.branch]?.label}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">{selectedSkill.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Difficulté: {selectedSkill.difficulty}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      +{selectedSkill.expReward} EXP
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0B1120] border border-[#1E293B] text-xs text-slate-300 leading-relaxed">
                  {selectedSkill.description}
                </div>

                {/* Exigences et Prérequis Événementiels */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Critères de Validation Automatique
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {/* Niveau Requis */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B1120] border border-[#1E293B]">
                      <span>Niveau de Joueur requis :</span>
                      <span className={`font-mono font-bold ${
                        (currentUser?.level || 1) >= selectedSkill.requiredLevel ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(currentUser?.level || 1) >= selectedSkill.requiredLevel ? '✓' : '✗'} Niv. {selectedSkill.requiredLevel} ({currentUser?.level || 1})
                      </span>
                    </div>

                    {/* Compétence Prérequise */}
                    {selectedSkill.prerequisiteSkillId && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B1120] border border-[#1E293B]">
                        <span>Prérequis validé :</span>
                        <span className="font-mono text-sky-400 text-[11px]">
                          {selectedSkill.prerequisiteSkillId}
                        </span>
                      </div>
                    )}

                    {/* Cours Académique Associé */}
                    {selectedSkill.associatedCourseId && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B1120] border border-[#1E293B]">
                        <span>Module Académie :</span>
                        <span className="font-mono text-amber-300 text-[11px] font-bold">
                          {selectedSkill.associatedCourseId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Perfectionnement de Maîtrise Optionnel */}
                {(selectedSkill.status === 'COMPLETED' || selectedSkill.status === 'MASTERED') && (
                  <div className="space-y-2 pt-2 border-t border-[#1E293B]">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Perfectionnement de Maîtrise
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                      {['INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((tier) => (
                        <button
                          key={tier}
                          onClick={() => handleMasteryUpgrade(selectedSkill.id, tier)}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedSkill.masteryTier === tier
                              ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                              : 'bg-[#0B1120] text-slate-400 hover:text-white border-[#1E293B]'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Dynamique : Aucune validation manuelle forcée */}
              <div className="pt-4 border-t border-[#1E293B]">
                {selectedSkill.status === 'COMPLETED' || selectedSkill.status === 'MASTERED' ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 size={16} /> Compétence Validée Automatiquement
                  </div>
                ) : selectedSkill.status === 'AVAILABLE' ? (
                  <button
                    onClick={() => handleStartSkill(selectedSkill.id)}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl text-xs font-black text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/40 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play size={14} /> Démarrer l'Apprentissage
                  </button>
                ) : selectedSkill.status === 'IN_PROGRESS' ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
                    <BookOpen size={15} /> En cours d'apprentissage
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 font-bold text-xs">
                    <Lock size={15} /> Prérequis non atteints
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
