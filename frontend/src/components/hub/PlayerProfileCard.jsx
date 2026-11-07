import React, { useState } from 'react';
import { Award, Sparkles, Palette, Lock } from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import { getPlayerLevelFrame } from '../../utils/playerLevelFrames';
import AppearanceCustomizerModal from './AppearanceCustomizerModal';

const TIER_DATA = {
  BRONZE: { label: 'Bronze', color: 'text-amber-500 bg-amber-950/40 border-amber-600/50', min: 0, next: 1000 },
  SILVER: { label: 'Silver', color: 'text-slate-300 bg-slate-800/60 border-slate-500/50', min: 1000, next: 1500 },
  GOLD: { label: 'Gold', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/50', min: 1500, next: 2000 },
  PLATINUM: { label: 'Platinum', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/50', min: 2000, next: 2500 },
  MASTER: { label: 'Master', color: 'text-purple-400 bg-purple-950/40 border-purple-500/50', min: 2500, next: 9999 }
};

export default function PlayerProfileCard({ player, onProfileUpdated }) {
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);

  const tierKey = (player?.tier || 'BRONZE').toUpperCase();
  const tierConfig = TIER_DATA[tierKey] || TIER_DATA.SILVER;
  const level = player?.level || 1;
  const frame = getPlayerLevelFrame(level);
  const exp = player?.exp || 0;
  const expMax = level * 500;
  const expPct = Math.min(100, Math.round((exp / expMax) * 100));
  const elo = player?.eloRating || 1000;
  const wins = player?.wins || 0;
  const total = player?.totalMatches || 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const canUploadSkin = elo >= 1500 || tierKey === 'GOLD' || tierKey === 'PLATINUM' || tierKey === 'MASTER';

  return (
    <div className="bg-[#0B1120]/80 backdrop-blur-md border border-[#1E293B] rounded-3xl p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between gap-5">
      {/* Decorative radial ambient glow */}
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: player?.themeAccentColor || 'var(--theme-accent, #10b981)' }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4">
          {/* Avatar Évolutif avec Cadre de Niveau */}
          <PlayerAvatar
            user={player}
            size="lg"
            showFrame={true}
            showBadge={true}
          />

          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-black ${frame.nameClass}`}>{player?.username || 'Trader'}</h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tierConfig.color}`}>
                <Award size={12} className="inline mr-1" />
                {tierConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Score Compétitif : <span className="font-bold text-slate-200">{elo} ELO</span> · {frame.label} (Niv. {level})
            </p>
          </div>
        </div>

        {/* Skin Customizer Button */}
        <div>
          {canUploadSkin ? (
            <button
              onClick={() => setIsAppearanceModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 border hover:brightness-110"
              style={{
                backgroundColor: 'var(--theme-accent, #10b981)',
                borderColor: 'var(--theme-border, #10b981)',
                boxShadow: '0 0 14px var(--theme-glow, rgba(16, 185, 129, 0.4))'
              }}
            >
              <Palette size={14} /> Thème, Fond & Avatar
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
              title="Atteignez le rang GOLD (1500+ ELO) pour débloquer la personnalisation avancée"
            >
              <Lock size={13} /> Personnalisation (Débloqué au rang GOLD)
            </div>
          )}
        </div>
      </div>

      {/* Level & EXP Progress Bar */}
      <div className="z-10">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles size={13} className="text-yellow-400" />
            Niveau {level} ({frame.label})
          </span>
          <span className="text-slate-400 text-[11px]">
            {exp} / {expMax} EXP ({expPct}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="h-full rounded-full transition-all duration-700 shadow-sm"
            style={{
              width: `${expPct}%`,
              backgroundColor: frame.borderColor,
              boxShadow: `0 0 10px ${frame.borderColor}`
            }}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#1E293B] z-10 font-mono text-center">
        <div className="p-2.5 rounded-xl bg-[#080C14] border border-[#1E293B]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-bold">Victoires</p>
          <p className="text-base font-black text-emerald-400 mt-0.5">{wins}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#080C14] border border-[#1E293B]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-bold">Parties</p>
          <p className="text-base font-black text-slate-200 mt-0.5">{total}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#080C14] border border-[#1E293B]">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-bold">Ratio Victoire</p>
          <p className="text-base font-black text-sky-400 mt-0.5">{winRate}%</p>
        </div>
      </div>

      {/* Modal d'Apparence & Thème Avancé */}
      <AppearanceCustomizerModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
        player={player}
        onAppearanceUpdated={onProfileUpdated}
      />
    </div>
  );
}
