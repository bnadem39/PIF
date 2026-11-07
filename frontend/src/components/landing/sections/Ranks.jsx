import React from 'react';
import { Award, Sparkles, Shield, Flame, Crown } from 'lucide-react';

const RANKS = [
  {
    tier: 'BRONZE',
    elo: '0 – 1 199 ELO',
    level: 'Niv. 1 à 4',
    icon: Shield,
    color: '#CD7F32',
    perk: 'Accès aux Arènes Casuals et à l’Académie de base'
  },
  {
    tier: 'SILVER',
    elo: '1 200 – 1 499 ELO',
    level: 'Niv. 5 à 9',
    icon: Award,
    color: '#94A3B8',
    perk: 'Avatar personnalisé et matchmaking compétitif classé'
  },
  {
    tier: 'GOLD',
    elo: '1 500 – 1 799 ELO',
    level: 'Niv. 10 à 14',
    icon: Sparkles,
    color: '#F5C242',
    isHighlight: true,
    perk: '★ Personnalisation du fond d’écran du Lobby et GIF animé débloquée !'
  },
  {
    tier: 'PLATINUM',
    elo: '1 800 – 2 199 ELO',
    level: 'Niv. 15 à 19',
    icon: Flame,
    color: '#22D3EE',
    perk: 'Effets de flou artistique, lueur néon réactive et badges de prestige'
  },
  {
    tier: 'MASTER',
    elo: '2 200+ ELO',
    level: 'Niv. 20+',
    icon: Crown,
    color: '#A855F7',
    perk: 'Titre de Maître Boursier, animations 3D cinématiques et invitations exclusives'
  }
];

export default function Ranks() {
  return (
    <section
      id="rangs"
      className="relative py-24 px-6 lg:px-12 max-w-6xl mx-auto w-full select-none"
      aria-label="Rangs et progression ELO"
    >
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold mb-4">
          <span>PROGRESSION RPG & COMPÉTITION</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-cinzel text-white tracking-wide">
          Gravir les Échelons du Circuit Compétitif
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-300 font-sans leading-relaxed">
          Chaque victoire en arène augmente votre cote ELO et déverrouille de nouveaux privilèges de personnalisation visuelle.
        </p>
      </div>

      {/* Cartes des 5 Rangs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {RANKS.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.tier}
              className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                r.isHighlight
                  ? 'bg-gradient-to-b from-[#1c180b] via-[#10101b] to-[#05070D] border-2 border-amber-400 shadow-[0_0_25px_rgba(245,194,66,0.25)]'
                  : 'bg-gradient-to-b from-[#0F172A] to-[#080C14] border border-[#1E293B] shadow-xl'
              }`}
            >
              {/* Badge "DÉBLOCAGE THÈME" sur le rang Gold */}
              {r.isHighlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black font-mono text-[9px] uppercase shadow-md tracking-wider">
                  CLÉ DE DÉBLOCAGE
                </span>
              )}

              <div>
                <div 
                  className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center border mx-auto"
                  style={{
                    backgroundColor: `${r.color}20`,
                    borderColor: `${r.color}60`,
                    color: r.color
                  }}
                >
                  <Icon size={24} />
                </div>

                <h3 
                  className="text-base font-black font-cinzel text-center tracking-wider mb-1"
                  style={{ color: r.color }}
                >
                  {r.tier}
                </h3>

                <p className="text-center font-mono text-xs text-white font-bold mb-1">
                  {r.elo}
                </p>
                <p className="text-center font-mono text-[10px] text-slate-400 mb-4">
                  {r.level}
                </p>

                <p className="text-[11px] text-slate-300 font-sans leading-relaxed text-center">
                  {r.perk}
                </p>
              </div>

              <div 
                className="mt-4 pt-3 border-t text-center text-[10px] font-mono"
                style={{ borderColor: `${r.color}30`, color: r.color }}
              >
                Matchmaking {r.tier}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bannière explicative Personnalisation Gold */}
      <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <Sparkles size={20} className="text-amber-400 shrink-0" />
          <span className="text-slate-200">
            <strong>Moteur de Thème & Personnalisation :</strong> Débloquez l’importation de photos ou GIFs de fond de Lobby ainsi que les palettes d’extraction automatique de couleurs dès le rang <strong className="text-amber-400">GOLD (Niveau 10)</strong>.
          </span>
        </div>
        <span className="font-mono font-bold text-amber-400 shrink-0">1 500 ELO REQUIS</span>
      </div>
    </section>
  );
}
