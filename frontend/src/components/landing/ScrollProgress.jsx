import React, { useState, useEffect } from 'react';

/**
 * ScrollProgress
 * Barre de progression de lecture fine (2.5px) fixée au sommet du viewport.
 * Dynamiquement liée aux variables CSS (--accent).
 */
export default function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (height > 0) {
        setScrollProgress((winScroll / height) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[2.5px] z-50 pointer-events-none bg-slate-900/40"
      aria-hidden="true"
    >
      <div 
        className="h-full bg-gradient-to-r from-emerald-500 via-[#00E676] to-[#22D3EE] transition-all duration-75 shadow-[0_0_8px_rgba(0,230,118,0.7)]"
        style={{
          width: `${scrollProgress}%`,
          backgroundColor: 'var(--accent, #00E676)'
        }}
      />
    </div>
  );
}
