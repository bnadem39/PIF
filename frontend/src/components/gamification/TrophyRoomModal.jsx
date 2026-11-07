import React, { useState, useEffect } from 'react';
import {
  Trophy, Award, Star, ShieldCheck, Zap, Lock,
  CheckCircle2, Pin, PinOff, Filter, X, Sparkles
} from 'lucide-react';
import { getAchievements, togglePinAchievement } from '../../services/api';

const RARITY_BADGES = {
  COMMON: { label: 'Commune', border: 'border-slate-600', text: 'text-slate-300', bg: 'bg-slate-800' },
  UNCOMMON: { label: 'Atypique', border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-950/40' },
  RARE: { label: 'Rare', border: 'border-sky-500/50', text: 'text-sky-400', bg: 'bg-sky-950/40' },
  EPIC: { label: 'Épique', border: 'border-purple-500/50', text: 'text-purple-400', bg: 'bg-purple-950/40' },
  LEGENDARY: { label: 'Légendaire', border: 'border-amber-500/60', text: 'text-amber-400', bg: 'bg-amber-950/40' },
  MYTHIC: { label: 'Mythique', border: 'border-pink-500/70', text: 'text-pink-400', bg: 'bg-pink-950/40' }
};

const CATEGORIES = [
  { id: 'ALL', label: 'Tous' },
  { id: 'TRADING', label: 'Trading' },
  { id: 'RISK_MANAGEMENT', label: 'Gestion des Risques' },
  { id: 'COMPETITIVE', label: 'Compétition' },
  { id: 'EDUCATIONAL', label: 'Éducation' },
  { id: 'CAREER', label: 'Carrière' },
  { id: 'SOCIAL', label: 'Social & Amis' }
];

export default function TrophyRoomModal({ isOpen, onClose, currentUser }) {
  const [achievements, setAchievements] = useState([]);
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [selectedRarity, setSelectedRarity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadAchievements = async () => {
    try {
      const data = await getAchievements();
      if (Array.isArray(data)) {
        setAchievements(data);
      }
    } catch (_) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAchievements();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePin = async (achId) => {
    try {
      await togglePinAchievement(achId);
      await loadAchievements();
    } catch (_) {}
  };

  const filtered = achievements.filter((a) => {
    if (selectedCat !== 'ALL' && a.category !== selectedCat) return false;
    if (selectedRarity !== 'ALL' && a.rarity !== selectedRarity) return false;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalExp = achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + (a.expReward || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#0B1120] border-2 border-purple-500/50 rounded-3xl max-w-4xl w-full text-slate-100 flex flex-col shadow-2xl shadow-purple-950/40 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] p-5 shrink-0 bg-[#0B1120]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Galerie des Trophées & Succès</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-mono font-bold text-purple-300">
                  {unlockedCount} / {achievements.length} Débloqués
                </span>
              </div>
              <p className="text-xs text-slate-400">Accomplissements vérifiés par le moteur autoritaire · Épinglez vos trophées préférés sur votre profil public</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="px-6 py-3 bg-[#080C14] border-b border-[#1E293B] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Progression globale :</span>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-purple-400 font-bold">
              {achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0}%
            </span>
          </div>

          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Sparkles size={14} />
            <span>+{totalExp} EXP Gagnés</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-2.5 border-b border-[#1E293B] bg-[#0B1120]/60 flex items-center gap-2 overflow-x-auto shrink-0 custom-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                selectedCat === c.id
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'border-[#1E293B] text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Trophy Cards Grid */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ach) => {
              const badge = RARITY_BADGES[ach.rarity] || RARITY_BADGES.COMMON;
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative ${
                    ach.unlocked
                      ? 'bg-[#080C14] hover:border-slate-600 shadow-lg'
                      : 'bg-[#080C14]/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  {/* Top: Rarity & Pin toggle */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${badge.border} ${badge.text} ${badge.bg}`}>
                      {badge.label}
                    </span>

                    {ach.unlocked && (
                      <button
                        onClick={() => handleTogglePin(ach.id)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          ach.isPinned
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'
                        }`}
                        title={ach.isPinned ? 'Trophée épinglé sur mon profil public' : 'Épingler sur mon profil'}
                      >
                        <Pin size={12} className={ach.isPinned ? 'fill-amber-400' : ''} />
                      </button>
                    )}
                  </div>

                  {/* Center info */}
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                      <Trophy size={14} className={ach.unlocked ? badge.text : 'text-slate-600'} />
                      {ach.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{ach.description}</p>
                  </div>

                  {/* Progress Bar & Reward */}
                  <div className="space-y-1.5 pt-2 border-t border-[#1E293B]">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">
                        {ach.unlocked ? 'Complété' : `${ach.currentProgress || 0} / ${ach.targetCount || 1}`}
                      </span>
                      <span className="text-amber-400 font-bold">+{ach.expReward} EXP</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ach.unlocked ? 'bg-emerald-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${ach.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

