// playerLevelFrames.js - Gamified Player Frame Evolution based on Level (separate from competitive ELO rank)

export const LEVEL_FRAMES = [
  {
    id: 'BASIC',
    minLevel: 1,
    maxLevel: 4,
    label: 'Initié',
    borderColor: '#64748b',
    borderClass: 'border-slate-500/80',
    glowStyle: '0 0 8px rgba(100, 116, 139, 0.3)',
    nameClass: 'text-slate-200 font-bold',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-600',
    icon: '🛡️'
  },
  {
    id: 'BRONZE',
    minLevel: 5,
    maxLevel: 9,
    label: 'Bronze',
    borderColor: '#b45309',
    borderClass: 'border-amber-700',
    glowStyle: '0 0 12px rgba(180, 83, 9, 0.45)',
    nameClass: 'text-amber-400 font-bold',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-700',
    icon: '🥉'
  },
  {
    id: 'SILVER',
    minLevel: 10,
    maxLevel: 19,
    label: 'Argent',
    borderColor: '#cbd5e1',
    borderClass: 'border-slate-300',
    glowStyle: '0 0 14px rgba(203, 213, 225, 0.55)',
    nameClass: 'text-slate-100 font-extrabold',
    badgeClass: 'bg-slate-800/90 text-slate-100 border-slate-300',
    icon: '🥈'
  },
  {
    id: 'GOLD',
    minLevel: 20,
    maxLevel: 29,
    label: 'Or Élite',
    borderColor: '#eab308',
    borderClass: 'border-yellow-400 ring-2 ring-yellow-500/40',
    glowStyle: '0 0 18px rgba(234, 179, 8, 0.65)',
    nameClass: 'text-yellow-400 font-black',
    badgeClass: 'bg-yellow-950/80 text-yellow-300 border-yellow-400',
    icon: '🥇'
  },
  {
    id: 'PLATINUM',
    minLevel: 30,
    maxLevel: 39,
    label: 'Platine',
    borderColor: '#22d3ee',
    borderClass: 'border-cyan-400 ring-2 ring-cyan-400/50',
    glowStyle: '0 0 22px rgba(34, 211, 238, 0.75)',
    nameClass: 'text-cyan-300 font-black',
    badgeClass: 'bg-cyan-950/80 text-cyan-200 border-cyan-400',
    icon: '💎'
  },
  {
    id: 'DIAMOND',
    minLevel: 40,
    maxLevel: 49,
    label: 'Diamant Luminous',
    borderColor: '#38bdf8',
    borderClass: 'border-sky-300 ring-2 ring-sky-400/60 shadow-lg',
    glowStyle: '0 0 25px rgba(56, 189, 248, 0.85)',
    nameClass: 'text-sky-200 font-black tracking-wide',
    badgeClass: 'bg-sky-950/90 text-sky-200 border-sky-300',
    icon: '✨'
  },
  {
    id: 'MASTER',
    minLevel: 50,
    maxLevel: 9999,
    label: 'Grand Maître',
    borderColor: '#c084fc',
    borderClass: 'border-purple-400 ring-2 ring-pink-500/60 animate-pulse',
    glowStyle: '0 0 30px rgba(192, 132, 252, 0.9), 0 0 12px rgba(244, 114, 182, 0.7)',
    nameClass: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 font-black',
    badgeClass: 'bg-purple-950/90 text-purple-200 border-purple-400',
    icon: '👑'
  }
];

export function getPlayerLevelFrame(level = 1) {
  const lvl = Math.max(1, parseInt(level, 10) || 1);
  return LEVEL_FRAMES.find(f => lvl >= f.minLevel && lvl <= f.maxLevel) || LEVEL_FRAMES[0];
}

