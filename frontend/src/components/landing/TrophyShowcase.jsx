import React, { useState } from 'react';
import { Trophy, Award, Sparkles, CheckCircle2, Star, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TROPHIES = [
  {
    id: 'ach_first_arena',
    title: 'Baptême de l\'Arène',
    category: 'Arène Multijoueur',
    rarity: 'COMMON',
    rarityLabel: 'Commun',
    rarityColor: '#94a3b8',
    description: 'Participez à votre tout premier match de trading multijoueur sur la BVMT.',
    expReward: 100,
    unlocked: true,
    progress: '1 / 1 Match'
  },
  {
    id: 'ach_risk_master',
    title: 'Maître du Risque',
    category: 'Discipline de Trading',
    rarity: 'RARE',
    rarityLabel: 'Rare',
    rarityColor: '#0284c7',
    description: 'Exécutez 10 ordres consécutifs avec un Stop-Loss strict sans dépassement de drawdown.',
    expReward: 350,
    unlocked: true,
    progress: '10 / 10 Ordres'
  },
  {
    id: 'ach_strategy_expert',
    title: 'Stratège des Marchés',
    category: 'Performance',
    rarity: 'EPIC',
    rarityLabel: 'Épique',
    rarityColor: '#8b5cf6',
    description: 'Terminez dans le Top 3 d\'un tournoi avec un rendement positif supérieur à +15%.',
    expReward: 750,
    unlocked: true,
    progress: 'Top 1 Réalisé'
  },
  {
    id: 'ach_season_champion',
    title: 'Champion de Saison BVMT',
    category: 'Compétition E-Sport',
    rarity: 'LEGENDARY',
    rarityLabel: 'Légendaire',
    rarityColor: '#f59e0b',
    description: 'Atteignez le rang Diamant ou Master lors d\'une saison officielle de trading.',
    expReward: 2000,
    unlocked: true,
    progress: 'Saison 1 Éligible'
  },
  {
    id: 'ach_skill_master',
    title: 'Grand Maître de l\'Académie',
    category: 'Maîtrise Complète',
    rarity: 'MYTHIC',
    rarityLabel: 'Mythique',
    rarityColor: '#ec4899',
    description: 'Complétez et maîtrisez l\'intégralité des 5 branches de l\'arbre de compétences.',
    expReward: 5000,
    unlocked: false,
    progress: '4 / 5 Branches'
  }
];

export default function TrophyShowcase() {
  const navigate = useNavigate();
  const [hoveredTrophy, setHoveredTrophy] = useState(null);

  return (
    <section id="trophies" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#1E293B] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <Trophy size={13} />
            <span>Salle des Trophées</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Trophées & Exploits Validés
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Chaque étape majeure de votre apprentissage et de vos victoires est récompensée par des trophées certifiés et des célébrations 3D cinématiques.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white transition-all shadow-lg shadow-purple-950/40 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <span>Voir Tous les Trophées</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Cartes de Trophées */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {TROPHIES.map((trophy) => {
          const isHovered = hoveredTrophy === trophy.id;
          return (
            <div
              key={trophy.id}
              onMouseEnter={() => setHoveredTrophy(trophy.id)}
              onMouseLeave={() => setHoveredTrophy(null)}
              className={`bg-[#0B1120] border-2 rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 relative overflow-hidden ${
                isHovered
                  ? '-translate-y-2 shadow-2xl'
                  : 'hover:border-slate-700 shadow-xl'
              }`}
              style={{
                borderColor: isHovered ? trophy.rarityColor : '#1E293B',
                boxShadow: isHovered ? `0 12px 35px ${trophy.rarityColor}35` : undefined
              }}
            >
              {/* Badge Rareté & EXP */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                  style={{
                    color: trophy.rarityColor,
                    borderColor: `${trophy.rarityColor}40`,
                    backgroundColor: `${trophy.rarityColor}15`
                  }}
                >
                  {trophy.rarityLabel}
                </span>

                <span className="font-bold text-amber-400 flex items-center gap-1">
                  +{trophy.expReward} EXP
                </span>
              </div>

              {/* Emblème visuel du trophée */}
              <div className="flex flex-col items-center py-2">
                <div
                  className="w-16 h-16 rounded-2xl border flex items-center justify-center transition-transform duration-300"
                  style={{
                    borderColor: `${trophy.rarityColor}60`,
                    backgroundColor: `${trophy.rarityColor}15`,
                    color: trophy.rarityColor,
                    transform: isHovered ? 'scale(1.1) rotate(4deg)' : 'scale(1)'
                  }}
                >
                  <Trophy size={28} />
                </div>
              </div>

              {/* Contenu textuel */}
              <div>
                <h4 className="text-sm font-black text-white text-center">
                  {trophy.title}
                </h4>
                <p className="text-[11px] text-slate-400 text-center leading-relaxed mt-1">
                  {trophy.description}
                </p>
              </div>

              {/* Statut de validation */}
              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">{trophy.progress}</span>
                {trophy.unlocked ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Débloqué
                  </span>
                ) : (
                  <span className="text-slate-500 font-bold">En cours</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

