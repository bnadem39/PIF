import { useState, useEffect } from 'react';

/**
 * useReducedMotion
 * Détecte si l'utilisateur a activé l'option d'accessibilité de réduction des animations.
 * 
 * @returns {boolean} - true si prefers-reduced-motion est activé
 */
export function useReducedMotion() {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event) => {
      setMatches(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return matches;
}

export default useReducedMotion;

