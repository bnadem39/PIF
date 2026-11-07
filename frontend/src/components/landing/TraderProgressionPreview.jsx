import React, { useState } from 'react';
import { Award, Shield, Star, Lock, CheckCircle2, ChevronRight, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CAREER_TIERS = [
  {
    level: 1,
    title: 'Beginner Trader',
    tier: 'BRONZE',
    tierColor: '#94a3b8',
    expRequired: '0 EXP',
    perk: 'Avatar Standard & Accès aux Arènes Casual',
    unlockedAt: 'Niveau 1',
    isUnlocked: true
  },
  {
    level: 3,
    title: 'Junior Trader',
    tier: 'SILVER',
    tierColor: '#cbd5e1',
    expRequired: '1 500 EXP',
    perk: 'Importation Photo de Profil Personnalisée',
    unlockedAt: 'Niveau 3',
    isUnlocked: true
  },
  {
    level: 5,
    title: 'Financial Analyst',
    tier: 'GOLD',
    tierColor: '#f59e0b',
    expRequired: '5 000 EXP',
    perk: 'Cadre Doré Évolutif & Signaux Techniques IA',
    unlockedAt: 'Niveau 5',
    isUnlocked: true
  },
  {
    level: 10,
    title: 'Professional Trader',
    tier: 'PLATINUM',
    tierColor: '#06b6d4',
    expRequired: '12 000 EXP',
    perk: 'Importation Fonds d\'Écran du Lobby & GIFs Animés',
    unlockedAt: 'Niveau 10',
    isUnlocked: true
  },
  {
    level: 15,
    title: 'Portfolio Manager',
    tier: 'DIAMOND',
    tierColor: '#38bdf8',
    expRequired: '25 000 EXP',
    perk: 'Effets Visuels Avancés (Flou Artistique & Néons)',
    unlockedAt: 'Niveau 15',
    isUnlocked: false
  },
  {
    level: 25,
    title: 'Trading Legend',
    tier: 'MASTER',
    tierColor: '#a855f7',
    expRequired: '50 000 EXP',
    perk: 'Cadre Cosmique Animé, Titre Légendaire & Hall of Fame',
    unlockedAt: 'Niveau 25',
    isUnlocked: false
  }
];

export default function TraderProgressionPreview() {
  const navigate = useNavigate();
  const [activeTier, setActiveTier] = useState(CAREER_TIERS[3]); // Professional Trader par défaut

  return (
    <section id="progression" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#1E293B] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <Award size={13} />
            <span>Système RPG de Carrière</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Progression & Rangs du Trader
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Gagnez de l'EXP à chaque match, perfectionnez vos compétences et débloquez des privilèges de personnalisation visuelle exclusifs au fur et à mesure de votre montée de niveau.
          </p>
        </div>

        <button
          onClick={() => navigate('/register')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-lg shadow-amber-950/40 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <span>Créer mon Compte Trader</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Frise Chronologique de Carrière */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {CAREER_TIERS.map((tier, idx) => {
          const isSelected = activeTier.title === tier.title;
          return (
            <button
              key={tier.title}
              onClick={() => setActiveTier(tier)}
              className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-[#0F172A] border-amber-500/80 shadow-xl shadow-amber-950/40 scale-[1.02]'
                  : 'bg-[#0B1120] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                  Lv. {tier.level}
                </span>
                {tier.isUnlocked ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <Lock size={14} className="text-slate-600" />
                )}
              </div>

              <div>
                <h4 className="text-xs font-black text-white leading-tight">
                  {tier.title}
                </h4>
                <span
                  className="text-[10px] font-mono font-bold uppercase mt-1 block"
                  style={{ color: tier.tierColor }}
                >
                  {tier.tier}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Focus Détail du Palier Sélectionné */}
      <div className="bg-[#0B1120] border-2 border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow de fond */}
        <div
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-20"
          style={{ backgroundColor: activeTier.tierColor }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative z-10">
          {/* Badge & Titre */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-black text-2xl shadow-xl shrink-0"
              style={{
                borderColor: activeTier.tierColor,
                backgroundColor: `${activeTier.tierColor}15`,
                color: activeTier.tierColor
              }}
            >
              {activeTier.level}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">Palier Carrière</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase"
                  style={{ backgroundColor: `${activeTier.tierColor}20`, color: activeTier.tierColor }}
                >
                  {activeTier.tier}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                {activeTier.title}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Condition : {activeTier.expRequired}
              </p>
            </div>
          </div>

          {/* Déblocage Exclusif */}
          <div className="p-4 rounded-2xl bg-[#080C14] border border-[#1E293B]">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5 mb-1">
              <Sparkles size={12} />
              Privilège Débloqué
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-200">
              {activeTier.perk}
            </p>
          </div>

          {/* Progression EXP Simulée */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Progression vers le palier :</span>
              <span className="font-bold text-emerald-400">75%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-700"
                style={{ width: '75%' }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono text-right">
              Arènes jouées : +150 EXP / Match · Top 3 : +350 EXP
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

