import React, { useState, useEffect } from 'react';
import {
  Trophy, Award, X, Sparkles, Activity, Shield, TrendingUp, CheckCircle,
  Clock, UserPlus, Flame
} from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import { getPlayerLevelFrame } from '../../utils/playerLevelFrames';
import { getPublicPlayerProfile } from '../../services/api';

export default function FriendProfileModal({ isOpen, onClose, friend, onInviteToRoom }) {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    if (!isOpen || !friend) {
      setProfile(null);
      return;
    }
    const fetchPublic = async () => {
      setIsLoading(true);
      try {
        if (friend.id) {
          const data = await getPublicPlayerProfile(friend.id);
          setProfile(data || friend);
        } else {
          setProfile(friend);
        }
      } catch (err) {
        // Fallback sur les données d'ami transmises
        setProfile(friend);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublic();
  }, [isOpen, friend]);

  if (!isOpen || !friend) return null;

  const current = profile || friend;
  const level = current.level || 1;
  const frame = getPlayerLevelFrame(level);
  const elo = current.eloRating || 1000;
  const tier = (current.tier || 'BRONZE').toUpperCase();
  const wins = current.wins || 0;
  const total = current.totalMatches || 0;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const exp = current.exp || 0;
  const expMax = level * 500;
  const expPct = Math.min(100, Math.round((exp / expMax) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl p-6 max-w-lg w-full text-slate-100 flex flex-col gap-5 shadow-2xl animate-fade-in relative">
        {/* Glow décoratif */}
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: frame.borderColor }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 z-10">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-yellow-400" />
            <h3 className="text-sm font-black text-white">Profil Compétitif du Trader</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Identification du Joueur avec Cadre de Niveau Évolutif */}
        <div className="flex items-center gap-4 z-10">
          <PlayerAvatar
            user={current}
            size="xl"
            showFrame={true}
            showBadge={true}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-black ${frame.nameClass}`}>
                {current.username || current.name || 'Trader'}
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${frame.badgeClass}`}>
                {frame.icon} {frame.label}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono mt-1">
              Rang Compétitif : <span className="text-yellow-400 font-bold">{tier}</span> · <span className="font-bold text-slate-200">{elo} ELO</span>
            </p>

            {/* Statut En Ligne */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-400">Joueur En Ligne</span>
            </div>
          </div>
        </div>

        {/* Barre de Progression EXP & Niveau */}
        <div className="z-10 p-3 rounded-2xl bg-[#080C14] border border-[#1E293B] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-yellow-400" />
              Niveau {level} ({frame.label})
            </span>
            <span className="text-slate-400 text-[11px]">
              {exp} / {expMax} EXP ({expPct}%)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${expPct}%`,
                backgroundColor: frame.borderColor,
                boxShadow: `0 0 10px ${frame.borderColor}`
              }}
            />
          </div>
        </div>

        {/* Statistiques Compétitives Authentiques */}
        <div className="grid grid-cols-3 gap-3 z-10 text-center font-mono">
          <div className="p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]">
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Victoires</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{wins}</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]">
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Matchs</p>
            <p className="text-lg font-black text-slate-200 mt-0.5">{total}</p>
          </div>
          <div className="p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]">
            <p className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Win Rate</p>
            <p className="text-lg font-black text-sky-400 mt-0.5">{winRate}%</p>
          </div>
        </div>

        {/* Actions sur l'Ami */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1E293B] z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Fermer
          </button>

          {onInviteToRoom && (
            <button
              type="button"
              onClick={() => {
                onInviteToRoom(current.id);
                setInviteSent(true);
                setTimeout(() => setInviteSent(false), 2000);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-all"
            >
              {inviteSent ? (
                <>
                  <CheckCircle size={14} /> Invitation Envoyée !
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Inviter dans mon Arène
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

