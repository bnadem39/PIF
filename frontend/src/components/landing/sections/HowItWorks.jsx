import React from 'react';
import { KeyRound, Swords, Trophy, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: KeyRound,
    title: 'Crée ou Rejoins avec un Code PIF-XXXX',
    badge: 'ACCÈS INSTANTANÉ',
    desc: 'Générez un salon avec vos paramètres (période historique 2021-2024, vitesse d’accélération du temps de 1x à 10x, capital initial) ou rejoignez vos amis en tapant leur code secret.',
    accent: '#22D3EE'
  },
  {
    number: '02',
    icon: Swords,
    title: 'Affronte les Traders sur le Flux Synchronisé',
    badge: 'COMBAT DE STRATÉGIES',
    desc: 'Le marché défile en direct pour tous les participants. Prenez des positions Long ou Short, positionnez vos Stop-Loss et arbitrez en temps réel sans connaître l’issue future.',
    accent: '#00E676'
  },
  {
    number: '03',
    icon: Trophy,
    title: 'Gagne de l’ELO et Domine les Saisons',
    badge: 'RANGS & PRESTIGE',
    desc: 'À la fin de la session, le classement final est calculé. Le vainqueur empoche des points ELO, débloque des succès RPG et gravit les échelons de Bronze à Master.',
    accent: '#F5C242'
  }
];

export default function HowItWorks() {
  return (
    <section
      id="comment-ca-marche"
      className="relative py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full select-none"
      aria-label="Comment fonctionne l'arène"
    >
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold mb-4">
          <span>CYCLE DE JEU EN 3 ÉTAPES</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cinzel text-white tracking-wide">
          Comment Dérouler une Partie d'Arène
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
          En moins de deux minutes, passez de l’accueil du jeu au cœur de la tempête boursière.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="relative rounded-2xl bg-gradient-to-b from-[#0F172A] via-[#0B101C] to-[#05070D] border border-[#1E293B] p-6 flex flex-col justify-between shadow-2xl hover:border-slate-500 transition-all duration-300 group"
            >
              {/* Badge numéro & tag */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span 
                    className="text-3xl font-black font-mono tracking-tighter"
                    style={{ color: `${step.accent}80` }}
                  >
                    {step.number}
                  </span>
                  <span 
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: step.accent,
                      backgroundColor: `${step.accent}15`,
                      borderColor: `${step.accent}30`
                    }}
                  >
                    {step.badge}
                  </span>
                </div>

                <div 
                  className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center border transition-all duration-300 group-hover:scale-105"
                  style={{
                    backgroundColor: `${step.accent}15`,
                    borderColor: `${step.accent}40`,
                    color: step.accent
                  }}
                >
                  <Icon size={22} />
                </div>

                <h3 className="text-base font-black font-rajdhani text-white mb-2 leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Exemple visuel de code PIF ou indicateur de progression */}
              <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Phase {idx + 1}/3</span>
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  Prêt <ArrowRight size={12} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

