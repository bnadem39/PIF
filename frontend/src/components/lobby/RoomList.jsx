import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Clock, Play, Lock, ChevronRight, ShieldAlert, Award } from 'lucide-react';

const TIER_CONFIG = {
  BRONZE: { label: 'Bronze', color: 'text-amber-500 bg-amber-950/40 border-amber-600/50', minElo: 0, maxElo: 999 },
  SILVER: { label: 'Silver', color: 'text-slate-300 bg-slate-800/60 border-slate-500/50', minElo: 1000, maxElo: 1499 },
  GOLD: { label: 'Gold', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/50', minElo: 1500, maxElo: 1999 },
  MASTER: { label: 'Master', color: 'text-purple-400 bg-purple-950/40 border-purple-500/50', minElo: 2000, maxElo: 9999 }
};

const STATUS_CONFIG = {
  WAITING: { label: 'En attente', color: 'text-sky-400 bg-sky-950/50 border-sky-600/50' },
  RUNNING: { label: 'En cours', color: 'text-emerald-400 bg-emerald-950/50 border-emerald-600/50' },
  PAUSED: { label: 'En pause', color: 'text-amber-400 bg-amber-950/50 border-amber-600/50' },
  FINISHED: { label: 'Terminée', color: 'text-slate-400 bg-slate-900 border-slate-700' }
};

export default function RoomList({ rooms = [], currentUser, onJoin, selectedTier, onSelectTier }) {
  const navigate = useNavigate();
  const userElo = currentUser?.eloRating || 1000;
  const userTier = currentUser?.tier || 'Silver';

  const isEligible = (room) => {
    const min = room.minElo ?? 0;
    const max = room.maxElo ?? 3000;
    return userElo >= (min - 200) && userElo <= (max + 200);
  };

  const filteredRooms = rooms.filter((r) => {
    if (!selectedTier || selectedTier === 'ALL') return true;
    return (r.requiredTier || '').toUpperCase() === selectedTier.toUpperCase();
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => onSelectTier('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
            selectedTier === 'ALL'
              ? 'bg-sky-600/20 text-sky-300 border-sky-500'
              : 'border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
          }`}
        >
          Toutes ({rooms.length})
        </button>
        {Object.entries(TIER_CONFIG).map(([key, cfg]) => {
          const count = rooms.filter((r) => (r.requiredTier || '').toUpperCase() === key).length;
          return (
            <button
              key={key}
              onClick={() => onSelectTier(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                selectedTier === key
                  ? cfg.color
                  : 'border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
              }`}
            >
              <Award size={13} />
              <span>{cfg.label}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-[#0B1120] border border-[#1E293B] text-slate-500 gap-3">
          <Trophy size={42} className="opacity-30" />
          <p className="text-sm font-semibold">Aucune arène active dans cette tranche pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const tier = TIER_CONFIG[room.requiredTier?.toUpperCase()] || TIER_CONFIG.SILVER;
            const status = STATUS_CONFIG[room.status] || STATUS_CONFIG.WAITING;
            const eligible = isEligible(room);
            const isFull = (room.participantCount || 0) >= (room.maxPlayers || 8);
            const canEnter = room.status === 'RUNNING' || room.status === 'PAUSED';

            return (
              <div
                key={room.id}
                className="bg-[#0B1120] border border-[#1E293B] hover:border-[#334155] rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all shadow-lg hover:shadow-sky-950/20 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {room.startDate} → {room.endDate}
                      </p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
                    <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${tier.color}`}>
                      <Award size={12} /> {tier.label} ({room.minElo ?? tier.minElo} - {room.maxElo ?? tier.maxElo} ELO)
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Users size={12} /> {room.participantCount || 0}/{room.maxPlayers || 8}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Clock size={12} /> {room.tickIntervalSeconds || Math.round((room.tickRateMs || 1000) / 1000)}s/j
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#1E293B] pt-4 mt-2">
                  <div className="font-mono text-xs text-slate-400">
                    Capital : <span className="text-sky-400 font-bold">{Number(room.initialCash || room.startCapital || 100000).toLocaleString('fr-TN')} TND</span>
                  </div>

                  <div>
                    {canEnter ? (
                      <button
                        onClick={() => navigate(`/arena/${room.id}`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                      >
                        <Play size={14} /> Entrer
                      </button>
                    ) : room.status === 'WAITING' ? (
                      eligible && !isFull ? (
                        <button
                          onClick={() => onJoin(room.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all"
                        >
                          <ChevronRight size={14} /> Rejoindre
                        </button>
                      ) : (
                        <button
                          disabled
                          title={!eligible ? 'Écart ELO supérieur à ±200 pts' : 'Arène complète'}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                        >
                          <Lock size={13} /> {!eligible ? 'ELO non éligible' : 'Complet'}
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => navigate(`/arena/${room.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:text-slate-200 transition-all"
                      >
                        Résultats
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

