import React, { useState, useEffect } from 'react';
import { getPlayerLevelFrame } from '../../utils/playerLevelFrames';

const SIZES = {
  xs: 'w-7 h-7 text-xs rounded-lg border',
  sm: 'w-9 h-9 text-xs rounded-xl border-[1.5px]',
  md: 'w-11 h-11 text-sm rounded-2xl border-2',
  lg: 'w-16 h-16 text-xl rounded-2xl border-2',
  xl: 'w-20 h-20 text-2xl rounded-3xl border-2',
  '2xl': 'w-24 h-24 text-3xl rounded-3xl border-[3px]'
};

// Résolution propre de l'URL absolue vers le backend si URL relative
export const resolveAvatarSrc = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const backendBase = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:8080';
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const resolveMediaUrl = resolveAvatarSrc;

export default function PlayerAvatar({
  user,
  size = 'md',
  showFrame = true,
  showBadge = false,
  onClick,
  className = ''
}) {
  const [imageError, setImageError] = useState(false);

  const level = user?.level || 1;
  const frame = getPlayerLevelFrame(level);
  const username = user?.usernameAlias || user?.username || 'Trader';
  const initial = username.charAt(0).toUpperCase();
  const rawAvatarUrl = user?.profileImageUrl || user?.avatarUrl;

  // Réinitialiser l'état d'erreur dès que l'URL change (ex: après téléversement)
  useEffect(() => {
    setImageError(false);
  }, [rawAvatarUrl]);

  const avatarSrc = resolveAvatarSrc(rawAvatarUrl);
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
      } ${className}`}
      title={`${username} (Niveau ${level} · ${frame.label})`}
    >
      {/* Cadre de prestige évolutif selon le niveau */}
      <div
        className={`${sizeClass} ${showFrame ? frame.borderClass : 'border-slate-700'} overflow-hidden flex items-center justify-center font-black transition-all duration-300 relative bg-[#0B1120]`}
        style={
          showFrame
            ? {
                boxShadow: frame.glowStyle,
                borderColor: frame.borderColor
              }
            : {}
        }
      >
        {avatarSrc && !imageError ? (
          <img
            src={avatarSrc}
            alt={username}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white"
            style={{
              backgroundColor: `${frame.borderColor}35`,
              color: frame.borderColor
            }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* Badge de prestige mini en bas à droite */}
      {showBadge && (
        <span
          className="absolute -bottom-1 -right-1 text-[10px] leading-none p-0.5 rounded-full bg-black/90 border border-slate-700 shadow-sm"
          title={`Niveau ${level} - ${frame.label}`}
        >
          {frame.icon}
        </span>
      )}
    </div>
  );
}
