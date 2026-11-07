import { useState, useEffect } from 'react';

/**
 * useScrollSpy
 * Détecte la section active visible à l'écran via IntersectionObserver.
 * 
 * @param {string[]} sectionIds - Liste ordonnée des identifiants des sections (sans '#')
 * @param {number} offset - Décalage relatif en pourcentage de la hauteur du viewport
 * @returns {string} - Identifiant de la section active courante
 */
export function useScrollSpy(sectionIds = [], offset = 0.3) {
  const [activeId, setActiveId] = useState(sectionIds[0] || 'hero');

  useEffect(() => {
    if (!sectionIds || sectionIds.length === 0) return;

    // Détection de positionnement par IntersectionObserver
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const rootMarginTop = -Math.round(window.innerHeight * offset);
    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: `${rootMarginTop}px 0px -40% 0px`,
      threshold: 0.1
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds, offset]);

  return activeId;
}

export default useScrollSpy;

