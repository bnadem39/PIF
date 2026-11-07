import React from 'react';
import { ShieldCheck, History, Radio, Users, CheckCircle } from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Salons Multijoueurs Compétitifs',
    desc: 'Créez des salons privés ou participez aux ligues classées. Affrontez jusqu’à 8 traders simultanément dans des arènes à enjeux ELO.',
    accent: '#00E676'
  },
  {
    icon: History,
    title: 'Rejeu Historique Fidèle (2021–2024)',
    desc: 'Revivez les grands mouvements boursiers réels (BVMT et actifs internationaux). Les données tick-par-tick sont strictement synchronisées.',
    accent: '#F5C242'
  },
  {
    icon: Radio,
    title: 'Flux Synchrone WebSocket STOMP',
    desc: 'Chaque participant reçoit les mêmes cotations à la milliseconde près. Aucune asymétrie d’information ni avantage de connectivité.',
    accent: '#22D3EE'
  },
  {
    icon: ShieldCheck,
    title: 'Équité Absolue des Conditions',
    desc: 'Capital virtuel de départ identique, carnet d’ordres équitable et calcul rigoureux de la performance par ratios de Sharpe et P&L net.',
    accent: '#FF3D57'
  }
];

export default function Presentation() {
  return (
    <section 
      id="presentation"
      className="relative py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full select-none"
      aria-label="Présentation du jeu"
    >
      {/* En-tête de section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold mb-4">
          <span>PORTAIL E-SPORT BOURSIER</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cinzel text-white tracking-wide">
          L'Arène où l'Histoire des Marchés Décide de votre Destin
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
          PIF Trading Arena réinvente l’apprentissage financier : vous n’êtes plus seul face à un graphique statique. 
          Vous plongez dans des sessions intenses où votre stratégie, votre maîtrise du risque et votre rapidité d'exécution 
          sont confrontées à d’autres traders en direct.
        </p>
      </div>

      {/* Grille des 4 Caractéristiques majeures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FEATURES.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="group relative rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#080C14] border border-[#1E293B] p-6 hover:border-slate-500 transition-all duration-300 hover:-translate-y-1 shadow-xl"
            >
              {/* Liseré lumineux supérieur au survol */}
              <div 
                className="absolute top-0 inset-x-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, transparent, ${feat.accent}, transparent)` }}
              />

              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundColor: `${feat.accent}15`,
                    borderColor: `${feat.accent}40`,
                    color: feat.accent
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black font-rajdhani tracking-wide text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

