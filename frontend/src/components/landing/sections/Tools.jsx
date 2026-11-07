import React from 'react';
import { ShieldAlert, Target, GitCompare, Layers } from 'lucide-react';

const TOOLS = [
  {
    title: 'Stop-Loss Garanti (SL)',
    subtitle: 'PROTECTION STRICTE DU CAPITAL',
    icon: ShieldAlert,
    accent: '#FF3D57',
    desc: 'Coupe automatiquement votre position dès que le cours franchit un seuil de perte prédéterminé, préservant votre P&L des baisses brutales.',
    svgDiagram: (
      <svg className="w-full h-16" viewBox="0 0 200 60" fill="none">
        <path d="M 10 20 L 50 15 L 90 28 L 130 45 L 170 52" stroke="#94A3B8" strokeWidth="2" />
        <line x1="0" y1="45" x2="200" y2="45" stroke="#FF3D57" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="130" cy="45" r="4" fill="#FF3D57" />
        <text x="140" y="42" fill="#FF3D57" fontSize="9" fontFamily="monospace">DÉCLENCHÉ (SL)</text>
      </svg>
    )
  },
  {
    title: 'Take-Profit Stratégique (TP)',
    subtitle: 'VERROUILLAGE DYNAMIQUE DES GAINS',
    icon: Target,
    accent: '#00E676',
    desc: 'Prend vos bénéfices dès que l’objectif de cours est touché. Assure la cristallisation de vos gains avant tout retournement défavorable.',
    svgDiagram: (
      <svg className="w-full h-16" viewBox="0 0 200 60" fill="none">
        <path d="M 10 50 L 60 40 L 110 32 L 150 15 L 180 12" stroke="#94A3B8" strokeWidth="2" />
        <line x1="0" y1="15" x2="200" y2="15" stroke="#00E676" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="150" cy="15" r="4" fill="#00E676" />
        <text x="140" y="27" fill="#00E676" fontSize="9" fontFamily="monospace">PROFIT VERROUILLÉ</text>
      </svg>
    )
  },
  {
    title: 'Trailing Stop Suiveur',
    subtitle: 'ADAPTATION EN TEMPS RÉEL',
    icon: GitCompare,
    accent: '#22D3EE',
    desc: 'Un Stop-Loss mobile qui suit la hausse du prix à un écart fixe. Si le marché monte, votre seuil de protection monte automatiquement.',
    svgDiagram: (
      <svg className="w-full h-16" viewBox="0 0 200 60" fill="none">
        <path d="M 10 45 L 50 35 L 90 22 L 130 14 L 170 26" stroke="#94A3B8" strokeWidth="2" />
        <path d="M 10 55 L 50 45 L 90 32 L 130 24 L 170 24" stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="170" cy="24" r="4" fill="#22D3EE" />
        <text x="110" y="38" fill="#22D3EE" fontSize="9" fontFamily="monospace">STOP SUIVEUR</text>
      </svg>
    )
  },
  {
    title: 'Ordres Liés OCO (One-Cancels-Other)',
    subtitle: 'STRATÉGIE DE BREAKOUT DOUBLE',
    icon: Layers,
    accent: '#F5C242',
    desc: 'Couple simultanément un ordre d’achat au-dessus du marché et un ordre de vente en-dessous. L’exécution de l’un annule instantanément l’autre.',
    svgDiagram: (
      <svg className="w-full h-16" viewBox="0 0 200 60" fill="none">
        <line x1="0" y1="15" x2="200" y2="15" stroke="#00E676" strokeWidth="1.2" strokeDasharray="3 3" />
        <line x1="0" y1="45" x2="200" y2="45" stroke="#FF3D57" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M 10 30 L 60 28 L 110 32 L 150 15" stroke="#94A3B8" strokeWidth="2" />
        <circle cx="150" cy="15" r="4" fill="#F5C242" />
        <text x="140" y="55" fill="#64748B" fontSize="8" fontFamily="monospace">ORDRE 2 ANNULÉ ✕</text>
      </svg>
    )
  }
];

export default function Tools() {
  return (
    <section
      id="outils"
      className="relative py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full select-none"
      aria-label="Outils de trading professionnels"
    >
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold mb-4">
          <span>TERMINAL DE TRADING PRO</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cinzel text-white tracking-wide">
          Des Outils d'Exécution de Salle de Marché
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
          Ne laissez rien au hasard : automatisez vos scénarios d’arbitrage avec la rigueur d'un trader institutionnel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.title}
              className="rounded-2xl bg-gradient-to-b from-[#0F172A] to-[#080C14] border border-[#1E293B] p-6 flex flex-col justify-between shadow-xl hover:border-slate-500 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${tool.accent}15`,
                      borderColor: `${tool.accent}40`,
                      color: tool.accent
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span 
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: tool.accent,
                      backgroundColor: `${tool.accent}10`,
                      borderColor: `${tool.accent}30`
                    }}
                  >
                    {tool.subtitle}
                  </span>
                </div>

                <h3 className="text-base font-black font-rajdhani text-white mb-2">
                  {tool.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed mb-4">
                  {tool.desc}
                </p>
              </div>

              {/* Schéma graphique vectoriel explicatif */}
              <div className="p-3 rounded-xl bg-[#050811] border border-slate-800/80">
                {tool.svgDiagram}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

