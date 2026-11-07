// colorPaletteExtractor.js - Dynamic Palette Extraction & Skin Engine for Images & Animated GIFs

export function hexToRgb(hex) {
  let c = (hex || '#10b981').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.padStart(2, '0');
  }).join('');
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Extrait la couleur vibrante dominante et une palette complète de 4 à 6 nuances
 * à partir d'une photo ou d'un GIF animé (Data URL ou URL web)
 */
export async function extractColorPalette(imageUrl) {
  return new Promise((resolve) => {
    const fallback = {
      dominant: '#10b981',
      secondary: '#06b6d4',
      palette: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899']
    };

    if (!imageUrl) {
      resolve(fallback);
      return;
    }

    const img = new Image();
    // Ne pas définir crossOrigin sur les data URLs ou blob URLs pour éviter le blocage canvas
    if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
      img.crossOrigin = 'Anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        const candidates = [];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue; // Ignorer les pixels transparents

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const brightness = (r + g + b) / 3;

          // Filtrer les gris et les extrêmes (trop sombre ou trop brûlé)
          if (brightness > 35 && brightness < 235 && delta > 25) {
            const saturation = delta / (max || 1);
            // Score de vivacité néon
            const score = (saturation * 3.5) + (delta > 60 ? 1.5 : 0) + (brightness > 60 && brightness < 195 ? 1.2 : 0);
            candidates.push({ r, g, b, score });
          }
        }

        if (candidates.length === 0) {
          resolve(fallback);
          return;
        }

        // Trier par score de vivacité décroissant
        candidates.sort((a, b) => b.score - a.score);

        // Sélectionner jusqu'à 5 couleurs distinctes (distance minimale dans l'espace RGB)
        const distinct = [];
        for (const cand of candidates) {
          const isFarEnough = distinct.every(d => colorDistance(d, cand) > 55);
          if (isFarEnough) {
            distinct.push(cand);
            if (distinct.length >= 5) break;
          }
        }

        const dominantHex = rgbToHex(candidates[0].r, candidates[0].g, candidates[0].b);
        const secondaryHex = distinct.length > 1
          ? rgbToHex(distinct[1].r, distinct[1].g, distinct[1].b)
          : '#06b6d4';
        const paletteHex = distinct.map(c => rgbToHex(c.r, c.g, c.b));

        // Compléter la palette si moins de 3 couleurs
        if (paletteHex.length < 3) {
          if (!paletteHex.includes(dominantHex)) paletteHex.unshift(dominantHex);
          fallback.palette.forEach(f => {
            if (paletteHex.length < 5 && !paletteHex.includes(f)) paletteHex.push(f);
          });
        }

        resolve({
          dominant: dominantHex,
          secondary: secondaryHex,
          palette: paletteHex
        });
      } catch (e) {
        console.warn('[PaletteExtractor] Erreur extraction canvas:', e);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      console.warn('[PaletteExtractor] Impossible de charger l\'image pour extraction');
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}

/**
 * Extrait la couleur d'accent la plus vive
 */
export async function extractVibrantAccent(imageUrl) {
  const result = await extractColorPalette(imageUrl);
  return result.dominant;
}

/**
 * Charge la configuration de thème stockée localement
 */
export function getStoredTheme() {
  try {
    const raw = localStorage.getItem('pif_custom_theme');
    if (raw) return JSON.parse(raw);
  } catch (_) { }
  return {
    accentColor: '#10b981',
    secondaryColor: '#06b6d4',
    backgroundUrl: null,
    darkness: 60,
    blur: 0,
    position: 'center',
    themeMode: 'AUTOMATIC'
  };
}

/**
 * Applique l'ensemble complet des variables CSS et configure l'environnement visuel
 */
export function applyThemeSkin(configOrAccent = '#10b981', legacyBackgroundUrl = null) {
  let accentColor = '#10b981';
  let secondaryColor = '#06b6d4';
  let backgroundUrl = null;
  let darkness = 60;
  let blur = 0;
  let position = 'center';
  let themeMode = 'AUTOMATIC';

  if (typeof configOrAccent === 'object' && configOrAccent !== null) {
    accentColor = configOrAccent.accentColor || configOrAccent.themeAccentColor || '#10b981';
    secondaryColor = configOrAccent.secondaryColor || configOrAccent.themeSecondaryColor || '#06b6d4';
    backgroundUrl = configOrAccent.backgroundUrl ?? configOrAccent.customBackgroundUrl ?? null;
    darkness = configOrAccent.darkness ?? configOrAccent.backgroundDarkness ?? 60;
    blur = configOrAccent.blur ?? configOrAccent.backgroundBlur ?? 0;
    position = configOrAccent.position || configOrAccent.backgroundPosition || 'center';
    themeMode = configOrAccent.themeMode || 'AUTOMATIC';
  } else {
    accentColor = configOrAccent || '#10b981';
    backgroundUrl = legacyBackgroundUrl || null;
  }

  const root = document.documentElement;
  const rgbPrimary = hexToRgb(accentColor);
  const rgbSecondary = hexToRgb(secondaryColor);

  // Variables CSS fondamentales du thème
  root.style.setProperty('--theme-primary', accentColor);
  root.style.setProperty('--theme-secondary', secondaryColor);
  root.style.setProperty('--theme-accent', accentColor);
  root.style.setProperty('--theme-glow', `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.40)`);
  root.style.setProperty('--theme-border', `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.35)`);
  root.style.setProperty('--theme-bg-subtle', `rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.12)`);
  root.style.setProperty('--theme-surface', `rgba(11, 17, 32, 0.82)`);
  root.style.setProperty('--theme-surface-hover', `rgba(30, 41, 59, 0.75)`);
  root.style.setProperty('--theme-button', accentColor);
  root.style.setProperty('--theme-text', '#F8FAFC');
  root.style.setProperty('--theme-text-muted', '#94A3B8');
  root.style.setProperty('--theme-bg-darkness', `${darkness / 100}`);
  root.style.setProperty('--theme-bg-blur', `${blur}px`);
  root.style.setProperty('--theme-bg-position', position);

  // Ne pas tenter de mettre une image en variable CSS si elle fait plusieurs mégaoctets
  if (backgroundUrl && backgroundUrl.length < 50000) {
    root.style.setProperty('--theme-bg-image', `url("${backgroundUrl}")`);
  } else {
    root.style.removeProperty('--theme-bg-image');
  }

  // Sauvegarde synchrone dans localStorage (sans faire exploser le quota avec un base64 de 4 Mo)
  try {
    const bgToStore = (backgroundUrl && backgroundUrl.length < 50000) ? backgroundUrl : null;
    localStorage.setItem('pif_custom_theme', JSON.stringify({
      accentColor,
      secondaryColor,
      backgroundUrl: bgToStore,
      darkness,
      blur,
      position,
      themeMode
    }));
  } catch (_) { }
}
