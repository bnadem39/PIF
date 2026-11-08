import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Award, Crown, User } from 'lucide-react';

export default function ArenaLeaderboard({ entries = [], currentUser, roomName = 'Arène' }) {
  const currentUsername = currentUser?.username || currentUser?.email || '';

  return (
    <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Leaderboard Live
          </h3>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-950/50 text-sky-400 border border-sky-800/40">
          {entries.length} participant{entries.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Rankings List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            En attente des premiers ticks de marché...
          </div>
        ) : (
          entries.map((entry, idx) => {
            const isMe = entry.username === currentUsername;
            const rank = idx + 1;
            const equity = Number(entry.portfolioValue ?? entry.totalEquity ?? 100000);
            // Le DTO envoie pnlPercentage (et non roiPercent) ; repli sur l'ancien calcul (capital 100 000)
            const roi = Number(entry.roiPercent ?? entry.pnlPercentage ?? ((equity - 100000) / 1000));
            const pnl = Number(entry.pnl ?? (1 + roi / 100 > 0 ? equity - equity / (1 + roi / 100) : equity - 100000));
            const isPositive = roi >= 0;

            return (
              <div
                key={entry.username || idx}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                  isMe
                    ? 'bg-sky-950/30 border-sky-500/60 shadow-sm shadow-sky-950/40'
                    : 'bg-[#080C14] border-[#1E293B] hover:border-[#334155]'
                }`}
              >
                {/* Rank & Avatar */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 text-center font-black font-mono text-sm shrink-0">
                    {rank === 1 ? (
                      <span className="text-yellow-400 flex items-center justify-center">
                        <Crown size={16} />
                      </span>
                    ) : rank === 2 ? (
                      <span className="text-slate-300">#2</span>
                    ) : rank === 3 ? (
                      <span className="text-amber-600">#3</span>
                    ) : (
                      <span className="text-slate-500">#{rank}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold truncate max-w-[110px] ${isMe ? 'text-sky-300' : 'text-slate-200'}`}>
                        {entry.username || `Joueur #${idx + 1}`}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-600/30 text-sky-300 border border-sky-500/40">
                          VOUS
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {equity.toLocaleString('fr-TN', { maximumFractionDigits: 0 })} TND
                    </div>
                  </div>
                </div>

                {/* Performance % */}
                <div className="text-right shrink-0 font-mono">
                  <div className={`text-xs font-black flex items-center justify-end gap-1 ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{isPositive ? '+' : ''}{roi.toFixed(2)}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {pnl >= 0 ? '+' : ''}{Number(pnl).toLocaleString('fr-TN', { maximumFractionDigits: 0 })} TND
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

