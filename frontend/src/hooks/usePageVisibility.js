import { useState, useEffect } from 'react';

/**
 * usePageVisibility
 * Détecte si l'onglet courant est actif ou masqué en arrière-plan
 * pour suspendre les calculs de particules et les boucles de rendu.
 * 
 * @returns {boolean} - true si la page est visible
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState === 'visible';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

export default usePageVisibility;
