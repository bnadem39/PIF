import React from 'react';

const LEFT_LINKS = [
  { label: 'ACCUEIL', href: '#hero' },
  { label: 'ARÈNE', href: '#comment-ca-marche' },
  { label: 'CLASSEMENT', href: '#rangs' },
  { label: 'ACTUALITÉS', href: '#presentation' }
];

const RIGHT_LINKS = [
  { label: 'FORMATIONS', href: '#outils' },
  { label: 'AMIS', href: '#ia' },
  { label: 'COMMUNAUTÉ', href: '#presentation' },
  { label: 'AIDE', href: '#footer' }
];

/**
 * NavMenu
 * Groupes de navigation symétriques flanquant le blason central.
 * 
 * @param {'left' | 'right'} side - Groupe gauche ou droit
 * @param {Function} onNavigate - Gestionnaire de clic pour le scroll fluide
 */
export default function NavMenu({ side = 'left', onNavigate, className = '' }) {
  const links = side === 'left' ? LEFT_LINKS : RIGHT_LINKS;

  const handleClick = (e, href) => {
    e.preventDefault();
    const id = href.replace('#', '');
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
    if (onNavigate) onNavigate(id);
  };

  return (
    <nav 
      className={`flex items-center gap-2 sm:gap-3 lg:gap-4 select-none ${className}`}
      aria-label={`Navigation ${side === 'left' ? 'principale' : 'secondaire'}`}
    >
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          onClick={(e) => handleClick(e, link.href)}
          className="group relative px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs lg:text-sm font-black font-rajdhani tracking-wider text-slate-300 hover:text-white transition-all duration-200 transform hover:-translate-y-0.5"
        >
          {/* Cadre métallique au survol avec glow */}
          <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#1a2333]/0 to-[#0e1422]/0 group-hover:from-[#1e293b]/80 group-hover:to-[#0f172a]/90 border border-transparent group-hover:border-amber-400/40 group-hover:shadow-[0_0_12px_rgba(245,194,66,0.25)] transition-all duration-200" />

          {/* Indicateur point néon au bas */}
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-transparent via-[#00E676] to-transparent group-hover:w-4/5 transition-all duration-200" />

          <span className="relative z-10">{link.label}</span>
        </a>
      ))}
    </nav>
  );
}
