import React, { useState, useEffect } from 'react';
import {
  Trophy, Calendar, Users, Award, ShieldAlert, Sparkles,
  TrendingUp, Clock, ChevronRight, X, Star, Crown, CheckCircle2, History
} from 'lucide-react';
import PlayerAvatar from '../common/PlayerAvatar';
import { getActiveSeason, getAllSeasons } from '../../services/api';

export default function SeasonsDashboardModal({ isOpen, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState('CURRENT'); // 'CURRENT' | 'REWARDS' | 'HISTORY'
  const [seasonData, setSeasonData] = useState(null);
  const [allSeasons, setAllSeasons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const [active, list] = await Promise.all([
          getActiveSeason().catch(() => null),
          getAllSeasons().catch(() => [])
        ]);
        if (mounted) {
          setSeasonData(active);
          setAllSeasons(Array.isArray(list) ? list : []);
        }
      } catch (_) {}
      finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const myPart = seasonData?.myParticipation;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#0B1120] border-2 border-amber-500/50 rounded-3xl max-w-4xl w-full text-slate-100 flex flex-col shadow-2xl shadow-amber-950/40 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] p-5 shrink-0 bg-[#0B1120]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Saisons Compétitives de Trading</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-400">
                  {seasonData?.status || 'ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Classement officiel saisonnier, rigueur de risque et trophées prestigieux</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#080C14] p-1 rounded-xl border border-[#1E293B]">
              <button
                onClick={() => setActiveTab('CURRENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'CURRENT' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Saison en Cours
              </button>
              <button
                onClick={() => setActiveTab('REWARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'REWARDS' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Paliers de Récompenses
              </button>
              <button
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'HISTORY' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Archives
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 min-h-0">
          {activeTab === 'CURRENT' && (
            <>
              {/* Season Hero Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#0E1726] to-[#080C14] border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black">
                    Saison Officielle BVMT
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">{seasonData?.name || 'Saison des Champions'}</h2>
                  <p className="text-xs text-slate-300 max-w-lg mt-1 leading-relaxed">
                    {seasonData?.description || 'Affrontez les meilleurs traders du marché, gérez vos drawdowns et décrochez le trophée saisonnier.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="p-3 rounded-xl bg-[#080C14]/90 border border-amber-500/30 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">FIN DE SAISON</span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {seasonData?.endDate ? new Date(seasonData.endDate).toLocaleDateString('fr-FR') : '31/12/2026'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#080C14]/90 border border-amber-500/30 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">PARTICIPANTS</span>
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {seasonData?.participantCount || 0} Traders
                    </span>
                  </div>
                </div>
              </div>

              {/* Player Personal Season Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#080C14] border border-[#1E293B]">
                  <span className="text-[10px] font-mono text-slate-500 block">POINTS DE SAISON</span>
                  <span className="text-lg font-mono font-black text-amber-400">{myPart?.seasonPoints || 0} PTS</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#080C14] border border-[#1E293B]">
                  <span className="text-[10px] font-mono text-slate-500 block">RANG ACTUEL</span>
                  <span className="text-lg font-mono font-black text-emerald-400">
                    {myPart?.rankPosition ? `#${myPart.rankPosition}` : 'Non Classé'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#080C14] border border-[#1E293B]">
                  <span className="text-[10px] font-mono text-slate-500 block">MATCHS JOUÉS / WINS</span>
                  <span className="text-lg font-mono font-black text-sky-400">
                    {myPart?.matchesPlayed || 0} / {myPart?.wins || 0}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#080C14] border border-[#1E293B]">
                  <span className="text-[10px] font-mono text-slate-500 block">DRAWDOWN MAX</span>
                  <span className="text-lg font-mono font-black text-purple-400">
                    {Number(myPart?.maxDrawdown || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Leaderboard Table */}
              <div className="rounded-2xl border border-[#1E293B] bg-[#080C14] overflow-hidden">
                <div className="p-3.5 border-b border-[#1E293B] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Crown size={15} className="text-amber-400" /> Leaderboard Officiel (Top 50)
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">Mise à jour en temps réel après chaque match</span>
                </div>

                <div className="divide-y divide-[#1E293B]/60">
                  {!seasonData?.leaderboard || seasonData.leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Aucun participant classé pour le moment. Disputez votre premier match pour figurer au classement !
                    </div>
                  ) : (
                    seasonData.leaderboard.map((row) => (
                      <div key={row.userId} className="p-3 flex items-center justify-between hover:bg-slate-850/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            row.rankPosition === 1 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/50' :
                            row.rankPosition === 2 ? 'bg-slate-300 text-black' :
                            row.rankPosition === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {row.rankPosition}
                          </span>
                          <PlayerAvatar user={row} size="sm" showFrame={true} />
                          <div>
                            <span className="text-xs font-bold text-white block">{row.username}</span>
                            <span className="text-[10px] font-mono text-slate-400">Niveau {row.level} · {row.tier}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 font-mono text-xs text-right">
                          <div>
                            <span className="text-[10px] text-slate-500 block">VICTOIRES</span>
                            <span className="text-slate-300">{row.wins} / {row.matchesPlayed} ({row.winRate || 0}%)</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">POINTS</span>
                            <span className="text-amber-400 font-black text-sm">{row.seasonPoints} PTS</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'REWARDS' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200">Paliers & Récompenses Saisonnières</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 to-[#080C14] border-2 border-amber-500/50 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <Crown size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">1ère Place</span>
                    <h4 className="text-sm font-black text-white">Trophée Mythique 3D & Titre Champion</h4>
                    <p className="text-xs text-slate-400 mt-1">Célébration cinématique 3D personnalisée, titre exclusif "Champion BVMT 2026", cadre d'or animé et 5 000 EXP.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#080C14] border border-amber-500/30 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 shrink-0">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">Podium (Top 3)</span>
                    <h4 className="text-sm font-black text-white">Cadre d'Avatar Or Évolutif</h4>
                    <p className="text-xs text-slate-400 mt-1">Lueur dorée prestigieuse visible par tous les joueurs dans le lobby et les arènes + 2 500 EXP.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#080C14] border border-slate-700 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-sky-400 shrink-0">
                    <Award size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-sky-400 font-bold">Top 10 Élite</span>
                    <h4 className="text-sm font-black text-white">Insigne Élite Argent</h4>
                    <p className="text-xs text-slate-400 mt-1">Insigne officiel sur la fiche de joueur et 1 000 EXP de progression de carrière.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#080C14] border border-slate-700 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Participation Certifiée</span>
                    <h4 className="text-sm font-black text-white">Badge Saisonnier Classé</h4>
                    <p className="text-xs text-slate-400 mt-1">Attribué à tous les traders ayant disputé au moins 3 matchs avec succès.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-200">Archives des Saisons Antérieures</h3>
              {allSeasons.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-[#080C14] rounded-2xl border border-[#1E293B]">
                  Aucune saison archivée pour l'instant. La Saison 1 est actuellement en cours.
                </div>
              ) : (
                allSeasons.map((s) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-[#080C14] border border-[#1E293B] flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Statut : <span className="font-mono text-amber-400">{s.status}</span> · Clôturée
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{s.participantCount || 0} Participants</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

