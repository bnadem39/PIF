import React from 'react';

/**
 * Torch
 * Torche néon sous forme de colonne de chandelier japonais ornementale
 * avec socle métallique, flamme animée et lueur radiale.
 * 
 * @param {'bullish' | 'bearish' | 'gold'} variant
 * @param {'left' | 'right'} side
 */
export default function Torch({ variant = 'bullish', side = 'left', className = '' }) {
  const isBullish = variant === 'bullish';
  const isBearish = variant === 'bearish';

  const flameColor = isBullish ? '#00E676' : isBearish ? '#FF3D57' : '#F5C242';
  const glowRgb = isBullish ? '0, 230, 118' : isBearish ? '255, 61, 87' : '245, 194, 66';
  const animationClass = side === 'left' ? 'torch-flame-a' : 'torch-flame-b';

  return (
    <div 
      className={`relative flex flex-col items-center select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Lueur d'ambiance radiale diffuse */}
      <div 
        className="torch-glow absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full pointer-events-none blur-2xl opacity-60"
        style={{
          background: `radial-gradient(circle, rgba(${glowRgb}, 0.5) 0%, rgba(${glowRgb}, 0) 70%)`
        }}
      />

      {/* 2. Flamme néon multi-couches animée (GPU transform & opacity) */}
      <div className="relative mb-1 flex items-center justify-center">
        {/* Flamme externe diffuse */}
        <div 
          className={`${animationClass} w-7 h-14 rounded-full blur-xs`}
          style={{
            background: `radial-gradient(ellipse at bottom, ${flameColor} 0%, rgba(${glowRgb}, 0.6) 50%, transparent 100%)`,
            boxShadow: `0 0 18px rgba(${glowRgb}, 0.8), 0 -4px 12px rgba(${glowRgb}, 0.5)`
          }}
        />

        {/* Flamme interne vive */}
        <div 
          className={`${animationClass} absolute bottom-1 w-3.5 h-8 rounded-full bg-white/90 shadow-sm`}
          style={{
            boxShadow: `0 0 10px #ffffff, 0 0 16px ${flameColor}`
          }}
        />

        {/* Mèche de chandelier / étincelle centrale */}
        <div className="absolute -bottom-1 w-1 h-2.5 bg-amber-400 rounded-full" />
      </div>

      {/* 3. Brasero / coupelle métallique ornementale */}
      <div className="w-10 h-3 rounded-t-sm bg-gradient-to-r from-[#1a2030] via-[#3a4560] to-[#1a2030] border-t border-amber-400/50 shadow-md flex items-center justify-center">
        <div 
          className="w-7 h-1 rounded-full"
          style={{ backgroundColor: flameColor, boxShadow: `0 0 8px ${flameColor}` }}
        />
      </div>

      {/* 4. Corps de colonne (Chandelier japonais métallique avec liseré lumineux) */}
      <div className="relative w-4 h-28 sm:h-36 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border-x border-[#334155]/60 flex flex-col items-center justify-between py-2 shadow-xl">
        {/* Ligne centrale néon du chandelier */}
        <div 
          className="w-0.5 h-full opacity-70"
          style={{
            background: `linear-gradient(to bottom, ${flameColor}, transparent)`,
            boxShadow: `0 0 6px ${flameColor}`
          }}
        />

        {/* Bagues métalliques ornementales */}
        <div className="absolute top-6 w-5 h-1 bg-amber-500/60 rounded-xs shadow-xs" />
        <div className="absolute top-16 w-5 h-1 bg-amber-500/60 rounded-xs shadow-xs" />
      </div>

      {/* 5. Base métallique élargie avec rivets */}
      <div className="w-12 h-4 rounded-b-md bg-gradient-to-r from-[#1a2030] via-[#334155] to-[#1a2030] border-b border-[#475569] shadow-lg flex items-center justify-around px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-600 shadow-inner" />
      </div>
    </div>
  );
}
