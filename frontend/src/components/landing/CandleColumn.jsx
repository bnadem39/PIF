import React from 'react';

/**
 * CandleColumn
 * Mini-chandeliers de trading animés flanquant le panneau de connexion.
 * Représente 3 bougies japonaises superposées avec mèches et étincelles de cours.
 */
export default function CandleColumn({ variant = 'bullish', side = 'left', className = '' }) {
  const isLeft = side === 'left';
  const colorPrimary = isLeft ? '#00E676' : '#FF3D57';
  const colorSecondary = isLeft ? '#F5C242' : '#22D3EE';
  const animClass = isLeft ? 'torch-flame-a' : 'torch-flame-b';

  return (
    <div 
      className={`flex flex-col items-center justify-end select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Mèche supérieure & flamme étincelle */}
      <div className="relative flex flex-col items-center mb-1">
        <div 
          className={`${animClass} w-3 h-5 rounded-full`}
          style={{
            background: `radial-gradient(ellipse at bottom, ${colorPrimary} 0%, rgba(255,255,255,0.8) 60%, transparent 100%)`,
            boxShadow: `0 0 10px ${colorPrimary}`
          }}
        />
        <div className="w-0.5 h-2 bg-amber-400" />
      </div>

      {/* 2. Bougie japonaise principale (Corps chandelier rectangulaire) */}
      <div 
        className="w-3.5 h-10 rounded-xs border border-white/20 relative shadow-md flex items-center justify-center"
        style={{
          backgroundColor: `${colorPrimary}30`,
          borderColor: colorPrimary,
          boxShadow: `0 0 8px ${colorPrimary}50`
        }}
      >
        <div className="w-1 h-6 rounded-full bg-white/40" />
      </div>

      {/* 3. Mèche intermédiaire */}
      <div className="w-0.5 h-2 bg-slate-500" />

      {/* 4. Bougie japonaise secondaire */}
      <div 
        className="w-3 h-6 rounded-xs border border-white/20 relative shadow-sm"
        style={{
          backgroundColor: `${colorSecondary}25`,
          borderColor: colorSecondary
        }}
      />

      {/* 5. Socle métallique miniature avec liseré */}
      <div className="w-6 h-1.5 rounded-t-xs bg-slate-700 border-t border-amber-400/40 mt-1 shadow-sm" />
    </div>
  );
}
