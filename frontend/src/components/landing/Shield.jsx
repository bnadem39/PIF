import React from 'react';

/**
 * Shield
 * Blason / Bouclier métallique central chevauchant l'ouverture de l'arche.
 * Flanqué de deux flèches croisées : Haussière verte (↗) et Baissière rouge (↘).
 * Emblème central : Taureau de Wall Street / Chandelier stylisé doré.
 */
export default function Shield({ className = '' }) {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      aria-label="Blason PIF Trading Arena"
    >
      {/* ─────────────────────────────────────────────────────────────────────────
          1. FLÈCHES CROISÉES DERRIÈRE LE BLASON
          Flèche verte haussière (↗) inclinée à 45°
          Flèche rouge baissière (↘) inclinée à -45°
          ───────────────────────────────────────────────────────────────────────── */}
      <svg
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 sm:w-56 sm:h-56 pointer-events-none drop-shadow-2xl overflow-visible"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="bullGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bearGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dégradés métalliques des hampes de flèches */}
          <linearGradient id="bullArrowGrad" x1="20" y1="180" x2="180" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#007E33" />
            <stop offset="70%" stopColor="#00E676" />
            <stop offset="100%" stopColor="#B9F6CA" />
          </linearGradient>

          <linearGradient id="bearArrowGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8A80" />
            <stop offset="30%" stopColor="#FF3D57" />
            <stop offset="100%" stopColor="#B71C1C" />
          </linearGradient>
        </defs>

        {/* Flèche Haussière ↗ (Bas-gauche vers Haut-droit) */}
        <g filter="url(#bullGlow)">
          {/* Hampe */}
          <line
            x1="32"
            y1="168"
            x2="162"
            y2="38"
            stroke="url(#bullArrowGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Empennage bas-gauche */}
          <path
            d="M26 160 L38 174 M22 168 L32 178"
            stroke="#00E676"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pointe de flèche haut-droit */}
          <polygon
            points="174,26 142,35 165,58"
            fill="#00E676"
            stroke="#B9F6CA"
            strokeWidth="1.5"
          />
        </g>

        {/* Flèche Baissière ↘ (Haut-gauche vers Bas-droit) */}
        <g filter="url(#bearGlow)">
          {/* Hampe */}
          <line
            x1="38"
            y1="38"
            x2="168"
            y2="168"
            stroke="url(#bearArrowGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Empennage haut-gauche */}
          <path
            d="M32 26 L22 36 M38 32 L28 42"
            stroke="#FF3D57"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pointe de flèche bas-droit */}
          <polygon
            points="174,174 165,142 142,165"
            fill="#FF3D57"
            stroke="#FF8A80"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. BOUCLIER / BLASON MÉTALLIQUE PRINCIPAL (SVG multicouche texturé)
          ───────────────────────────────────────────────────────────────────────── */}
      <svg
        className="relative z-10 w-24 h-28 sm:w-32 sm:h-36 drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dégradé bordure or métallique */}
          <linearGradient id="shieldGoldBorder" x1="0" y1="0" x2="100" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5C242" />
            <stop offset="25%" stopColor="#FFF3B0" />
            <stop offset="50%" stopColor="#C99420" />
            <stop offset="75%" stopColor="#FFE082" />
            <stop offset="100%" stopColor="#8D6305" />
          </linearGradient>

          {/* Dégradé corps de blindage acier sombre */}
          <linearGradient id="shieldBodyMetal" x1="50" y1="5" x2="50" y2="115" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="45%" stopColor="#0B1120" />
            <stop offset="85%" stopColor="#080C14" />
            <stop offset="100%" stopColor="#020408" />
          </linearGradient>

          {/* Dégradé intérieur biseauté */}
          <linearGradient id="shieldInnerBevel" x1="15" y1="15" x2="85" y2="105" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(245, 194, 66, 0.45)" />
            <stop offset="50%" stopColor="rgba(15, 23, 42, 0.9)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.95)" />
          </linearGradient>
        </defs>

        {/* Forme extérieure du bouclier gothique / médiéval */}
        <path
          d="M 50 6
             C 65 6, 85 12, 92 20
             C 92 48, 88 84, 50 114
             C 12 84, 8 48, 8 20
             C 15 12, 35 6, 50 6 Z"
          fill="url(#shieldBodyMetal)"
          stroke="url(#shieldGoldBorder)"
          strokeWidth="3"
        />

        {/* Liseré interne en relief */}
        <path
          d="M 50 12
             C 63 12, 79 17, 85 24
             C 85 48, 81 78, 50 104
             C 19 78, 15 48, 15 24
             C 21 17, 37 12, 50 12 Z"
          fill="url(#shieldInnerBevel)"
          stroke="rgba(245, 194, 66, 0.3)"
          strokeWidth="1.2"
        />

        {/* Rivets métalliques aux coins du blason */}
        <circle cx="16" cy="24" r="1.5" fill="#FFE082" stroke="#5D4037" strokeWidth="0.5" />
        <circle cx="84" cy="24" r="1.5" fill="#FFE082" stroke="#5D4037" strokeWidth="0.5" />
        <circle cx="50" cy="10" r="1.5" fill="#FFE082" stroke="#5D4037" strokeWidth="0.5" />
        <circle cx="50" cy="106" r="1.5" fill="#FFE082" stroke="#5D4037" strokeWidth="0.5" />

        {/* ─────────────────────────────────────────────────────────────────────
            EMBLÈME CENTRAL : TAUREAU BOURSIER & CHANDELIER STYLISÉ
            ───────────────────────────────────────────────────────────────────── */}
        <g id="emblem" transform="translate(26, 32)">
          {/* Tête de taureau stylisée en or & cyan */}
          {/* Cornes haussières orientées vers le haut */}
          <path
            d="M 6 12 C 3 4, 10 -2, 16 2 C 18 5, 18 10, 16 14 Z"
            fill="url(#shieldGoldBorder)"
          />
          <path
            d="M 42 12 C 45 4, 38 -2, 32 2 C 30 5, 30 10, 32 14 Z"
            fill="url(#shieldGoldBorder)"
          />

          {/* Front et museau métallique puissant */}
          <path
            d="M 16 10 L 32 10 L 30 24 L 24 32 L 18 24 Z"
            fill="#1E293B"
            stroke="#F5C242"
            strokeWidth="1.5"
          />

          {/* Yeux néon déterminés */}
          <circle cx="20" cy="18" r="1.8" fill="#00E676" />
          <circle cx="28" cy="18" r="1.8" fill="#00E676" />

          {/* Chandelier japonais d'or au cœur du front */}
          <line x1="24" y1="8" x2="24" y2="22" stroke="#F5C242" strokeWidth="1.2" />
          <rect x="22" y="11" width="4" height="8" rx="0.8" fill="#F5C242" stroke="#FFE082" strokeWidth="0.6" />
        </g>
      </svg>
    </div>
  );
}
