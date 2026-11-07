import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Eye, Trophy, Users, Clock, DollarSign, ArrowLeft,
  Activity, Shield, Zap, TrendingUp, Maximize2, Sparkles, Layers, RefreshCw
} from 'lucide-react';
import PlayerAvatar from '../components/common/PlayerAvatar';
import TradingChart from '../components/TradingChart';
import Room3DTradingFloor from '../components/Room3DTradingFloor';
import { getRoomById, joinSpectatorRoom, leaveSpectatorRoom } from '../services/api';
import { Client } from '@stomp/stompjs';

export default function SpectatorArenaPage({ currentUser }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [view3D, setView3D] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState('TUNINDEX');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const stompClientRef = useRef(null);

  // Initial load & spectator registration
  useEffect(() => {
    let mounted = true;

    async function initSpectator() {
      try {
        const session = await joinSpectatorRoom(roomId);
        if (mounted && session?.room) {
          setRoom(session.room);
          setParticipants(session.room.participants || []);
          setSpectatorCount(session.totalSpectators || 1);
        }
      } catch (err) {
        if (mounted) {
          setErrorMsg(err.message || 'Impossible de rejoindre le mode spectateur.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSpectator();

    return () => {
      mounted = false;
      leaveSpectatorRoom(roomId).catch(() => {});
    };
  }, [roomId]);

  // WebSocket connection for real-time spectator sync
  useEffect(() => {
    if (!roomId) return;

    const wsUrl = `ws://${window.location.hostname}:8080/ws`;
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        // 1. Spectator count updates
        client.subscribe(`/topic/room/${roomId}/spectators`, (msg) => {
          try {
            setSpectatorCount(Number(msg.body) || 1);
          } catch (_) {}
        });

        // 2. Leaderboard updates
        client.subscribe(`/topic/room/${roomId}/leaderboard`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.participants) {
              setParticipants(data.participants);
            }
          } catch (_) {}
        });

        // 3. Orders activity feed
        client.subscribe(`/topic/room/${roomId}/orders`, (msg) => {
          try {
            const order = JSON.parse(msg.body);
            setRecentEvents((prev) => [
              {
                id: Date.now(),
                type: 'ORDER',
                text: `${order.userName || 'Trader'} a exécuté ${order.side} ${order.quantity}x ${order.ticker} @ ${order.price} TND`,
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              },
              ...prev.slice(0, 19)
            ]);
          } catch (_) {}
        });

        // 4. Celebration broadcast
        client.subscribe(`/topic/room/${roomId}/celebration`, (msg) => {
          try {
            const celeb = JSON.parse(msg.body);
            setRecentEvents((prev) => [
              {
                id: Date.now(),
                type: 'CELEBRATION',
                text: `🏆 VICTOIRE D'ARÈNE : ${celeb.winner} remporte le match avec ${Number(celeb.equity).toLocaleString('fr-TN')} TND !`,
                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              },
              ...prev.slice(0, 19)
            ]);
          } catch (_) {}
        });
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [roomId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#080C14] text-slate-100 gap-4">
        <RefreshCw size={36} className="animate-spin text-sky-400" />
        <h2 className="text-base font-bold text-slate-300">Connexion au flux de diffusion spectateur...</h2>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#080C14] text-slate-100 p-6 text-center gap-4">
        <Shield size={48} className="text-rose-400" />
        <h2 className="text-xl font-black text-rose-300">Accès Spectateur Refusé</h2>
        <p className="text-xs text-slate-400 max-w-md">{errorMsg}</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Retour au Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#080C14] text-slate-100 select-none overflow-hidden font-sans">
      {/* ─────────────────────────────────────────────────────────────────────────────
          TOP BROADCAST BAR : MATCH HUD & SPECTATOR STATUS
          ───────────────────────────────────────────────────────────────────────────── */}
      <header className="h-16 shrink-0 bg-[#0B1120]/90 border-b border-[#1E293B] px-6 flex items-center justify-between gap-4 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-white transition-all"
            title="Quitter le mode spectateur"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600/20 border border-rose-500/40 text-[10px] font-black uppercase text-rose-400 tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> En Direct · Spectateur
              </span>
              <h1 className="text-base font-black text-white tracking-wide">{room?.name || 'Arène de Compétition'}</h1>
              <span className="text-xs font-mono text-sky-400 font-bold px-2 py-0.5 rounded-md bg-sky-950/40 border border-sky-800/60">
                {roomId}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Date simulée : <span className="text-emerald-400 font-bold">{room?.currentSimulatedDate || room?.startDate}</span> · Durée : {room?.gameDurationMinutes || 15} min
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080C14] border border-[#1E293B] text-xs font-mono text-slate-300">
            <Users size={14} className="text-sky-400" />
            <span>{participants.length} / {room?.maxPlayers || 8} Joueurs</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080C14] border border-emerald-500/30 text-xs font-mono text-emerald-300">
            <Eye size={14} className="text-emerald-400 animate-pulse" />
            <span className="font-bold">{spectatorCount} Spectateur{spectatorCount > 1 ? 's' : ''}</span>
          </div>

          <button
            onClick={() => setView3D(!view3D)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              view3D
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-950'
                : 'bg-[#080C14] text-slate-300 hover:text-white border-[#1E293B]'
            }`}
          >
            <Layers size={14} /> {view3D ? 'Vue Graphique' : 'Vue 3D Floor'}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MAIN BROADCAST ARENA (3-COLUMN LAYOUT)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT COLUMN: PLAYER ROSTER & RANKINGS */}
        <aside className="w-72 shrink-0 border-r border-[#1E293B] bg-[#080C14]/90 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-400" /> Classement en Direct
            </span>
            <span className="text-[10px] font-mono text-slate-500">Valorisation</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {participants.map((p, idx) => {
              const rank = idx + 1;
              const isLead = rank === 1;
              const pnl = Number(p.pnlPercentage || 0);

              return (
                <div
                  key={p.userId || idx}
                  className={`p-3 rounded-2xl border transition-all flex flex-col gap-2 ${
                    isLead
                      ? 'bg-gradient-to-r from-amber-500/10 via-[#0B1120] to-[#0B1120] border-amber-500/50 shadow-md shadow-amber-950/30'
                      : 'bg-[#0B1120]/80 border-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        isLead ? 'bg-amber-500 text-black' : rank === 2 ? 'bg-slate-300 text-black' : rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rank}
                      </span>
                      <PlayerAvatar user={p} size="sm" showFrame={true} />
                      <div>
                        <h4 className="text-xs font-black text-white">{p.username}</h4>
                        <span className="text-[10px] font-mono text-slate-400">Niv. {p.level || 1} · {p.tier || 'BRONZE'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-slate-100">
                        {Number(p.totalEquity || p.cash || 100000).toLocaleString('fr-TN')} TND
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: LIVE MARKET TICKER & CHART OR 3D ARENA */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#060910] relative">
          {view3D ? (
            <div className="flex-1 relative">
              <Room3DTradingFloor participants={participants} activeSymbol={activeSymbol} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-sky-400" /> Flux de Cotation Synchrone (Lecture Seule)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {['TUNINDEX', 'BIAT', 'SFBT', 'BT', 'BTC-USD'].map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setActiveSymbol(sym)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all border ${
                        activeSymbol === sym
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                          : 'bg-[#0B1120] text-slate-400 hover:text-slate-200 border-[#1E293B]'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 rounded-2xl border border-[#1E293B] overflow-hidden bg-[#0B1120]/60">
                <TradingChart symbol={activeSymbol} readOnly={true} />
              </div>
            </div>
          )}

          {/* Bottom Broadcast Banner */}
          <div className="h-10 shrink-0 bg-[#0B1120] border-t border-[#1E293B] px-6 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <Shield size={13} className="text-emerald-400" /> Mode Spectateur Actif · Aucune prise de position permise
            </span>
            <span className="text-slate-500">Moteur de replay BVMT certifié 2022-2023</span>
          </div>
        </main>

        {/* RIGHT COLUMN: LIVE ESPORTS ACTIVITY FEED */}
        <aside className="w-80 shrink-0 border-l border-[#1E293B] bg-[#080C14]/90 p-4 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400 animate-pulse" /> Activité du Match
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">TEMPS RÉEL</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center gap-2">
                <Activity size={24} className="opacity-40" />
                <span>En attente des premiers ordres de marché des traders...</span>
              </div>
            ) : (
              recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                    ev.type === 'CELEBRATION'
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                      : 'bg-[#0B1120] border-[#1E293B] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>{ev.type}</span>
                    <span>{ev.time}</span>
                  </div>
                  <p className="text-[11px] leading-snug">{ev.text}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

