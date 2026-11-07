import React, { useState } from 'react';
import { GraduationCap, Zap, Shield, TrendingUp, BarChart3, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SKILL_BRANCHES = [
  {
    id: 'TECH_ANALYSIS',
    name: 'Analyse Technique',
    icon: TrendingUp,
    color: '#06b6d4',
    skills: [
      { id: 't1', name: 'Moyennes Mobiles (SMA/EMA)', level: 1, status: 'MASTERED', progress: 100 },
      { id: 't2', name: 'RSI & Stochastique Reversals', level: 3, status: 'UNLOCKED', progress: 65 },
      { id: 't3', name: 'Bandes de Bollinger & Volatilité', level: 7, status: 'LOCKED', progress: 0 }
    ]
  },
  {
    id: 'RISK_MGMT',
    name: 'Gestion du Risque',
    icon: Shield,
    color: '#10b981',
    skills: [
      { id: 'r1', name: 'Dimensionnement de Position (1%)', level: 1, status: 'MASTERED', progress: 100 },
      { id: 'r2', name: 'Stop-Loss Garanti & Trailing', level: 4, status: 'UNLOCKED', progress: 80 },
      { id: 'r3', name: 'Value at Risk (VaR) & Max Drawdown', level: 10, status: 'LOCKED', progress: 0 }
    ]
  },
  {
    id: 'PORTFOLIO',
    name: 'Gestion de Portefeuille',
    icon: BarChart3,
    color: '#f59e0b',
    skills: [
      { id: 'p1', name: 'Diversification Sectorielle BVMT', level: 2, status: 'MASTERED', progress: 100 },
      { id: 'p2', name: 'Matrices de Corrélation d\'Actifs', level: 5, status: 'UNLOCKED', progress: 40 },
      { id: 'p3', name: 'Rebalancement Automatique de Portefeuille', level: 12, status: 'LOCKED', progress: 0 }
    ]
  },
  {
    id: 'MARKET_ANALYSIS',
    name: 'Analyse des Marchés',
    icon: Zap,
    color: '#8b5cf6',
    skills: [
      { id: 'm1', name: 'Publication des Résultats Semestriels', level: 2, status: 'MASTERED', progress: 100 },
      { id: 'm2', name: 'Carnet d\'Ordres & Profondeur BVMT', level: 6, status: 'UNLOCKED', progress: 50 },
      { id: 'm3', name: 'Analyse Macroéconomique & Taux BCT', level: 14, status: 'LOCKED', progress: 0 }
    ]
  },
  {
    id: 'ADVANCED_STRAT',
    name: 'Stratégies Avancées',
    icon: GraduationCap,
    color: '#ec4899',
    skills: [
      { id: 'a1', name: 'Trading de Breakout & Faux Signaux', level: 5, status: 'UNLOCKED', progress: 90 },
      { id: 'a2', name: 'Arbitrage Statistique d\'Indices', level: 10, status: 'LOCKED', progress: 0 },
      { id: 'a3', name: 'Couverture de Portefeuille Multi-Actifs', level: 16, status: 'LOCKED', progress: 0 }
    ]
  }
];

export default function SkillTreePreview() {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState(SKILL_BRANCHES[0].skills[1]);

  return (
    <section id="skills" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#1E293B] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <GraduationCap size={13} />
            <span>Arbre de Compétences RPG</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Académie & Compétences Financières
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Développez vos capacités d'analyse en complétant des cours interactifs et en validant des ordres réels dans les arènes. Déblocage automatique basé sur vos exploits.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 transition-all shadow-lg shadow-cyan-950/40 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <span>Consulter l'Académie</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Grille des 5 Branches de l'Arbre */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {SKILL_BRANCHES.map((branch) => {
          const Icon = branch.icon;
          return (
            <div
              key={branch.id}
              className="bg-[#0B1120] border-2 border-[#1E293B] hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between gap-5 shadow-xl transition-all"
            >
              {/* Branch Header */}
              <div className="flex items-center gap-2.5 border-b border-[#1E293B] pb-3">
                <div
                  className="p-2 rounded-xl border"
                  style={{
                    backgroundColor: `${branch.color}15`,
                    borderColor: `${branch.color}40`,
                    color: branch.color
                  }}
                >
                  <Icon size={16} />
                </div>
                <h3 className="text-xs font-black text-white leading-tight">
                  {branch.name}
                </h3>
              </div>

              {/* Connected Nodes */}
              <div className="space-y-3 relative">
                {branch.skills.map((skill, index) => {
                  const isSelected = selectedSkill.name === skill.name;
                  const isMastered = skill.status === 'MASTERED';
                  const isUnlocked = skill.status === 'UNLOCKED';

                  return (
                    <div
                      key={skill.id}
                      onClick={() => setSelectedSkill(skill)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-[#0F172A] border-cyan-400 shadow-md'
                          : isMastered
                          ? 'bg-[#080C14] border-emerald-500/40 hover:border-emerald-500/70'
                          : isUnlocked
                          ? 'bg-[#080C14] border-cyan-500/30 hover:border-cyan-500/60'
                          : 'bg-[#080C14]/60 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 text-[11px] leading-tight">
                          {skill.name}
                        </span>
                        {isMastered ? (
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 ml-1" />
                        ) : isUnlocked ? (
                          <Zap size={13} className="text-cyan-400 shrink-0 ml-1" />
                        ) : (
                          <Lock size={13} className="text-slate-600 shrink-0 ml-1" />
                        )}
                      </div>

                      {/* Mini Bar */}
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${skill.progress}%`,
                            backgroundColor: isMastered ? '#10b981' : branch.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

