import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const SECTION_IDS = [
  'hero',
  'presentation',
  'comment-ca-marche',
  'rangs',
  'outils',
  'ia',
  'footer'
];

/**
 * ScrollControls
 * Deux boutons fixes en bas à droite (▲ Haut et ▼ Bas) pour navigation fluide sans détournement de scroll.
 * Respecte les standards d'accessibilité (dimensions ≥ 44×44 px, aria-labels explicites).
 */
export default function ScrollControls({ activeSection = 'hero' }) {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      // ▲ "Haut" visible si scrollY > 300px
      setShowTop(scrollY > 300);

      // ▼ "Bas" masqué si tout en bas de page (à 60px de la fin)
      setShowBottom(scrollY < maxScroll - 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToNext = () => {
    const currentIndex = SECTION_IDS.indexOf(activeSection);
    const nextIndex = currentIndex !== -1 && currentIndex < SECTION_IDS.length - 1
      ? currentIndex + 1
      : SECTION_IDS.length - 1;

    const targetId = SECTION_IDS[nextIndex];
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-40 flex flex-col gap-2.5 select-none"
      aria-label="Contrôles de défilement de la page"
    >
      {/* Bouton ▲ "Haut" (visible si scrollY > 300px) */}
      {showTop && (
        <button
          onClick={scrollToTop}
          aria-label="Retourner en haut de la page"
          title="Haut de page"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#0B101C]/90 hover:bg-[#152033] border border-[#2b3752] text-slate-300 hover:text-white shadow-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
        >
          <ArrowUp size={19} className="text-amber-400" />
        </button>
      )}

      {/* Bouton ▼ "Bas" (va à la section suivante, masqué tout en bas) */}
      {showBottom && (
        <button
          onClick={scrollToNext}
          aria-label="Faire défiler vers la section suivante"
          title="Section suivante"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#0B101C]/90 hover:bg-[#152033] border border-[#2b3752] text-slate-300 hover:text-white shadow-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        >
          <ArrowDown size={19} className="text-[#00E676]" />
        </button>
      )}
    </div>
  );
}

