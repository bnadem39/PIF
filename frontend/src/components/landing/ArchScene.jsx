import React from 'react';

/**
 * ArchScene
 * Grande ouverture panoramique en forme d'arche encadrant une skyline financière nocturne,
 * un graphique chandelier géant lumineux en arrière-plan, de la brume et une lueur d'aube.
 * Conçu entièrement en SVG vectoriel et dégradés CSS légers (zéro asset lourd externe).
 */
export default function ArchScene({ children, className = '' }) {
  return (
    <div 
      className={`relative w-full max-w-4xl mx-auto flex flex-col items-center select-none ${className}`}
      aria-label="Portail de jeu PIF Trading Arena"
    >
      {/* ─────────────────────────────────────────────────────────────────────────
          1. ENCADREMENT EXTÉRIEUR DE L'ARCHE (Bordures métalliques sculptées)
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-[94vw] sm:max-w-4xl h-[220px] sm:h-[300px] md:h-[370px] rounded-t-[100px] sm:rounded-t-[180px] md:rounded-t-[220px] border-4 border-[#1E293B] shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(0,0,0,0.8)] overflow-hidden bg-[#030508]">
        
        {/* Arc métallique biseauté supérieur avec liseré or */}
        <div className="absolute inset-0 rounded-t-[96px] sm:rounded-t-[176px] md:rounded-t-[216px] border-t-2 border-x-2 border-amber-500/30 pointer-events-none z-20" />
        <div className="absolute inset-0 rounded-t-[92px] sm:rounded-t-[172px] md:rounded-t-[212px] border-t border-x border-cyan-500/20 pointer-events-none z-20" />

        {/* ─────────────────────────────────────────────────────────────────────────
            2. SCÈNE PANORAMIQUE VECTORIELLE : SKYLINE & CHANDELIERS GÉANTS
            ───────────────────────────────────────────────────────────────────────── */}
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Lueur d'aube lointaine sur l'horizon financier */}
            <radialGradient id="horizonGlow" cx="50%" cy="85%" r="65%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#0B132B" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#05070D" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#020307" stopOpacity="1" />
            </radialGradient>

            {/* Dégradé des chandeliers lumineux en arrière-plan */}
            <linearGradient id="bullCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#00E676" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="bearCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF3D57" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#FF3D57" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="goldHorizon" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#F5C242" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#F5C242" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Ciel nocturne profond */}
          <rect width="800" height="400" fill="url(#horizonGlow)" />
          <rect y="220" width="800" height="180" fill="url(#goldHorizon)" />

          {/* Grille boursière en perspective futuriste */}
          <g stroke="rgba(34, 211, 238, 0.08)" strokeWidth="1">
            <line x1="0" y1="100" x2="800" y2="100" />
            <line x1="0" y1="170" x2="800" y2="170" />
            <line x1="0" y1="240" x2="800" y2="240" />
            <line x1="0" y1="310" x2="800" y2="310" />

            <line x1="100" y1="0" x2="100" y2="400" />
            <line x1="200" y1="0" x2="200" y2="400" />
            <line x1="300" y1="0" x2="300" y2="400" />
            <line x1="400" y1="0" x2="400" y2="400" />
            <line x1="500" y1="0" x2="500" y2="400" />
            <line x1="600" y1="0" x2="600" y2="400" />
            <line x1="700" y1="0" x2="700" y2="400" />
          </g>

          {/* ─────────────────────────────────────────────────────────────────
              CHANDELIERS JAPONAIS GÉANTS SPECTACULAIRES EN ARRIÈRE-PLAN
              ───────────────────────────────────────────────────────────────── */}
          <g id="giantCandlesticks" opacity="0.65">
            {/* Chandelier 1 : Haussier vert gauche */}
            <line x1="140" y1="90" x2="140" y2="280" stroke="#00E676" strokeWidth="2" opacity="0.6" />
            <rect x="126" y="130" width="28" height="90" rx="3" fill="url(#bullCandleGrad)" stroke="#00E676" strokeWidth="1.2" />

            {/* Chandelier 2 : Baissier rouge intermédiaire */}
            <line x1="260" y1="110" x2="260" y2="300" stroke="#FF3D57" strokeWidth="2" opacity="0.6" />
            <rect x="246" y="150" width="28" height="110" rx="3" fill="url(#bearCandleGrad)" stroke="#FF3D57" strokeWidth="1.2" />

            {/* Chandelier 3 : GÉANT CENTRAL HAUSSIER (Point culminant) */}
            <line x1="400" y1="40" x2="400" y2="320" stroke="#00E676" strokeWidth="3" opacity="0.8" />
            <rect x="382" y="80" width="36" height="170" rx="4" fill="url(#bullCandleGrad)" stroke="#00E676" strokeWidth="1.8" filter="drop-shadow(0 0 12px rgba(0,230,118,0.4))" />

            {/* Chandelier 4 : Baissier rouge droit */}
            <line x1="540" y1="100" x2="540" y2="290" stroke="#FF3D57" strokeWidth="2" opacity="0.6" />
            <rect x="526" y="140" width="28" height="95" rx="3" fill="url(#bearCandleGrad)" stroke="#FF3D57" strokeWidth="1.2" />

            {/* Chandelier 5 : Haussier vert droit extrême */}
            <line x1="660" y1="80" x2="660" y2="260" stroke="#00E676" strokeWidth="2" opacity="0.6" />
            <rect x="646" y="110" width="28" height="110" rx="3" fill="url(#bullCandleGrad)" stroke="#00E676" strokeWidth="1.2" />
          </g>

          {/* Courbe de tendance néon dorée reliant les sommets */}
          <path
            d="M 140 130 Q 260 210, 400 80 T 660 110"
            fill="none"
            stroke="#F5C242"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.7"
          />

          {/* ─────────────────────────────────────────────────────────────────
              SILHOUETTES DE LA SKYLINE FINANCIÈRE (Bourse, tours, gratte-ciels)
              ───────────────────────────────────────────────────────────────── */}
          <g id="skylineSilhouette" fill="#04060A">
            {/* Tour gauche avec antenne */}
            <rect x="40" y="240" width="45" height="160" />
            <line x1="62" y1="205" x2="62" y2="240" stroke="#00E676" strokeWidth="2" />
            <circle cx="62" cy="205" r="2" fill="#00E676" />

            <rect x="95" y="270" width="35" height="130" />
            <rect x="180" y="250" width="55" height="150" />
            
            {/* Tour centrale imposante (Bourse des Valeurs) */}
            <polygon points="340,400 340,240 370,220 430,220 460,240 460,400" />
            <rect x="385" y="195" width="30" height="25" />
            <line x1="400" y1="165" x2="400" y2="195" stroke="#F5C242" strokeWidth="2.5" />
            <circle cx="400" cy="165" r="3" fill="#F5C242" />

            {/* Tours droites */}
            <rect x="480" y="260" width="45" height="140" />
            <rect x="580" y="235" width="50" height="165" />
            <line x1="605" y1="210" x2="605" y2="235" stroke="#FF3D57" strokeWidth="2" />
            <circle cx="605" cy="210" r="2" fill="#FF3D57" />

            <rect x="690" y="280" width="60" height="120" />
          </g>

          {/* Fenêtres lumineuses éparses sur les buildings (activité de nuit) */}
          <g fill="#F5C242" opacity="0.5">
            <rect x="48" y="260" width="3" height="4" />
            <rect x="58" y="275" width="3" height="4" />
            <rect x="195" y="270" width="4" height="4" />
            <rect x="210" y="295" width="4" height="4" />
            <rect x="365" y="260" width="4" height="5" fill="#00E676" />
            <rect x="425" y="260" width="4" height="5" fill="#00E676" />
            <rect x="395" y="280" width="10" height="6" />
            <rect x="595" y="255" width="4" height="4" fill="#FF3D57" />
          </g>

          {/* Brume d'horizon montante au bas de la scène */}
          <rect y="320" width="800" height="80" fill="url(#horizonGlow)" opacity="0.8" />
        </svg>

        {/* 3. Brume et vignettage au bas de l'arche pour fondu parfait avec le bouclier */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#05070D] via-[#05070D]/80 to-transparent pointer-events-none z-10" />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          4. ÉLÉMENTS EN CHEVAUCHEMENT (Blason & composants injectés)
          ───────────────────────────────────────────────────────────────────────── */}
      {children}
    </div>
  );
}
