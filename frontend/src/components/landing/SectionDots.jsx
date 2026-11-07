import React from 'react';

const SECTIONS = [
  { id: 'hero', label: 'Portail' },
  { id: 'presentation', label: 'Présentation' },
  { id: 'comment-ca-marche', label: 'Comment ça marche' },
  { id: 'rangs', label: 'Rangs ELO' },
  { id: 'outils', label: 'Outils Pro' },
  { id: 'ia', label: 'Assistant IA' },
  { id: 'footer', label: 'Informations' }
];

/**
 * SectionDots
 * Barre latérale de points de navigation (sur le bord gauche de l'écran),
 * indiquant en surbrillance la section active et permettant de s'y déplacer en 1 clic.
 */
export default function SectionDots({ activeSection = 'hero' }) {
  const handleDotClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="hidden lg:flex fixed left-5 top-1/2 -translate-y-1/2 z-40 flex-col gap-3.5 select-none"
      aria-label="Navigation par sections"
    >
      {SECTIONS.map((sec) => {
        const isActive = activeSection === sec.id;
        return (
          <button
            key={sec.id}
            onClick={() => handleDotClick(sec.id)}
            aria-label={`Aller à la section ${sec.label}`}
            className="group relative flex items-center cursor-pointer focus:outline-none"
          >
            {/* Point indicateur */}
            <span
              className={`block rounded-full transition-all duration-300 ${
                isActive
                  ? 'w-3 h-3 bg-gradient-to-r from-amber-400 to-[#00E676] ring-4 ring-emerald-500/20 shadow-[0_0_12px_rgba(0,230,118,0.8)]'
                  : 'w-2 h-2 bg-slate-600 group-hover:bg-slate-400 group-hover:scale-125'
              }`}
            />

            {/* Bulle d'infobulle au survol (Tooltip) */}
            <span className="absolute left-6 px-2.5 py-1 rounded-lg bg-[#0B101C] border border-[#2b3752] text-[11px] font-bold text-slate-200 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg">
              {sec.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

