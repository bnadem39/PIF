import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Circle, Trophy, Check, Send } from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import { getPlayerLevelFrame } from '../../utils/playerLevelFrames';
import { getFriends, addFriendByUsername, searchPlayers } from '../../services/api';

const TIER_COLORS = {
  BRONZE: 'text-amber-500 border-amber-600/40 bg-amber-950/20',
  SILVER: 'text-slate-300 border-slate-500/40 bg-slate-800/40',
  GOLD: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20',
  PLATINUM: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20',
  MASTER: 'text-purple-400 border-purple-500/40 bg-purple-950/20'
};

export default function FriendsSidebar({ activeRoomId, onInviteFriend, onSelectFriend }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [invitedMap, setInvitedMap] = useState({});

  const refreshFriends = async () => {
    try {
      const list = await getFriends();
      setFriends(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Erreur chargement amis:', e);
    }
  };

  useEffect(() => {
    refreshFriends();
    const interval = setInterval(refreshFriends, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (!val || val.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchPlayers(val);
      setSearchResults(Array.isArray(res) ? res : []);
    } catch (e) {
      setSearchResults([]);
    }
  };

  const handleAdd = async (username) => {
    try {
      setAddMsg('');
      await addFriendByUsername(username);
      setAddMsg(`✓ ${username} ajouté en ami !`);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      refreshFriends();
      setTimeout(() => setAddMsg(''), 3000);
    } catch (e) {
      setAddMsg(`Erreur : ${e.message}`);
      setTimeout(() => setAddMsg(''), 3000);
    }
  };

  const handleInvite = (friendId, friendUsername) => {
    if (onInviteFriend && activeRoomId) {
      onInviteFriend(friendId);
      setInvitedMap(prev => ({ ...prev, [friendId]: true }));
      setTimeout(() => {
        setInvitedMap(prev => ({ ...prev, [friendId]: false }));
      }, 5000);
    }
  };

  return (
    <div className="w-80 bg-[#0B1120] border-l border-[#1E293B] flex flex-col h-full shrink-0 select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
          <Users size={17} className="text-emerald-400" />
          <span>Amis Connectés ({friends.length})</span>
        </div>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Barre de recherche d'amis */}
      <div className="p-3 border-b border-[#1E293B] bg-[#080C14]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher un trader par pseudo..."
            className="w-full bg-[#0B1120] border border-[#1E293B] focus:border-emerald-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>

        {addMsg && (
          <p className="text-[11px] font-bold mt-2 text-emerald-400 animate-fade-in">{addMsg}</p>
        )}
      </div>

      {/* Contenu de la liste d'amis */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isSearching && searchResults.length > 0 ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Résultats de recherche</p>
            <div className="space-y-1.5">
              {searchResults.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs hover:border-[#334155] transition-all"
                >
                  <div
                    onClick={() => onSelectFriend && onSelectFriend(p)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                  >
                    <PlayerAvatar user={p} size="sm" showFrame={true} />
                    <div>
                      <p className="font-bold text-slate-200">{p.username}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Niv. {p.level || 1} · {p.eloRating || 1000} ELO</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(p.username)}
                    className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 transition-all"
                    title="Ajouter en ami"
                  >
                    <UserPlus size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-500 gap-2">
            <Users size={32} className="opacity-30" />
            <p className="text-xs font-semibold">Aucun ami ajouté pour l'instant.</p>
            <p className="text-[11px]">Utilisez la barre de recherche ci-dessus pour inviter des traders !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => {
              const tier = (f.tier || 'BRONZE').toUpperCase();
              const tierClass = TIER_COLORS[tier] || TIER_COLORS.SILVER;
              const isInvited = invitedMap[f.friendId];
              const frame = getPlayerLevelFrame(f.level || 1);

              return (
                <div
                  key={f.id}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-[#080C14] border border-[#1E293B] hover:border-[#334155] transition-all"
                >
                  <div
                    onClick={() => onSelectFriend && onSelectFriend({ ...f, id: f.friendId || f.id })}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 mr-2 hover:opacity-90 transition-opacity"
                    title="Cliquer pour voir le profil du joueur"
                  >
                    <div className="relative">
                      <PlayerAvatar user={f} size="sm" showFrame={true} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0B1120]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-xs ${frame.nameClass}`}>{f.username}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${tierClass}`}>
                          {tier}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Niveau {f.level || 1} · <span className="text-slate-300 font-bold">{f.eloRating || 1000} ELO</span>
                      </p>
                    </div>
                  </div>

                  {activeRoomId && (
                    <button
                      onClick={() => handleInvite(f.friendId, f.username)}
                      disabled={isInvited}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        isInvited
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40'
                      }`}
                      title="Inviter dans la salle"
                    >
                      {isInvited ? <Check size={12} /> : <Send size={12} />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
