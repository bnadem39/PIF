import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, Trophy, BrainCircuit, Activity,
  Sliders, Shield, Layers, Box, BarChart2, DollarSign, Clock, RefreshCw,
  Copy, Check, Users, UserPlus, CheckCircle2, AlertCircle, LogOut,
  PieChart, History, Landmark, GraduationCap, FileSpreadsheet, Eye, X, Send,
  Lock, TrendingUp, TrendingDown, StopCircle, ListFilter, Zap, Sigma
} from 'lucide-react';
import {
  getRoomById, startArenaRoom, pauseArenaRoom, resumeArenaRoom,
  placeArenaOrder, getArenaLeaderboard, toggleArenaReady,
  inviteFriendToRoom, getFriends, closeArenaRoom, getMyRoomPortfolio
} from '../../services/api';
import { createArenaWebSocket } from '../../services/websocket';
import { getRealSymbols } from '../../services/realMarketService';

// Module 1: Fused Terminal Arena Pro Components
import ArenaTradingChart from './TradingChart';
import OrderPanel from './OrderPanel';
import ArenaLeaderboard from './Leaderboard';
import OnDemandCopilot from './OnDemandCopilot';
import Room3DTradingFloor from '../Room3DTradingFloor';
import MarketWatch from '../MarketWatch';
import OrderBookTape from '../OrderBookTape';
import TickerTape from '../TickerTape';

// Specialized Modules inside the Room
import PortfolioAnalyticsView from '../PortfolioAnalyticsView';
import BacktestPage from '../../pages/BacktestPage';
import StressTestPage from '../../pages/StressTestPage';
import ActuarialPage from '../../pages/ActuarialPage';
import LearnPage from '../../pages/LearnPage';
import MatchResultModal from './MatchResultModal';
import CsvDataInspectorModal from '../CsvDataInspectorModal';

const ROOM_MODULES = [
  { id: 'ARENA_PRO', label: 'Terminal Arena Pro', icon: Trophy, color: 'text-emerald-400' },
  { id: 'PORTFOLIO', label: 'Portefeuille', icon: PieChart, color: 'text-purple-400' },
  { id: 'BACKTEST', label: 'Backtesting', icon: History, color: 'text-amber-400' },
  { id: 'STRESS', label: 'Stress Testing', icon: Landmark, color: 'text-rose-400' },
  { id: 'ACTUARIAL', label: 'Actuariat', icon: Sigma, color: 'text-sky-400' },
  { id: 'ACADEMY', label: 'Académie', icon: GraduationCap, color: 'text-indigo-400' },
  { id: 'CSV_DATA', label: 'Données CSV', icon: FileSpreadsheet, color: 'text-emerald-300' }
];

export default function ArenaLayout({ currentUser }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Room & Simulation State
  const [room, setRoom] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentTick, setCurrentTick] = useState(null);
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulatedDate, setSimulatedDate] = useState('2022-01-03');
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('ARENA_PRO');

  // Chrono Immuable Continu (Ne se met JAMAIS en pause, même lors des pauses de courbe)
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  // Instruments & Market State
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState({ ticker: 'BIAT', name: 'Banque Internationale Arabe de Tunisie', price: 95.0 });
  const [selectedYear, setSelectedYear] = useState('2022');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Financial State (isolated to this room match)
  const [userCash, setUserCash] = useState(100000);
  const [userPositions, setUserPositions] = useState([]);
  const [totalEquity, setTotalEquity] = useState(100000);
  const [pnlPercentage, setPnlPercentage] = useState(0.0);

  // Tabs for Fused Terminal Arena Pro
  const [leftTab, setLeftTab] = useState('ORDERS'); // 'ORDERS' | 'WATCHLIST'
  const [bottomTab, setBottomTab] = useState('POSITIONS'); // 'POSITIONS' | 'ORDERBOOK' | 'ORDERS' | '3D_FLOOR'
  const [rightTab, setRightTab] = useState('LEADERBOARD'); // 'LEADERBOARD' | 'ASSETS_LEADERBOARD' | 'COPILOT'

  // Waiting Room Lobby State
  const [isReady, setIsReady] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [friends, setFriends] = useState([]);
  const [invitedMap, setInvitedMap] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [learnFocus, setLearnFocus] = useState(null);

  // 1. Charger les détails de la Room et les actifs BVMT
  const loadRoom = useCallback(async () => {
    try {
      const data = await getRoomById(roomId);
      setRoom(data);
      if (data?.currentSimulatedDate) setSimulatedDate(data.currentSimulatedDate);
      if (data?.status === 'RUNNING') setIsPlaying(true);
      if (data?.initialCash) {
        setUserCash(Number(data.initialCash));
        setTotalEquity(Number(data.initialCash));
      }

      // Initialisation du chrono de match
      if (data?.remainingSeconds != null) {
        setRemainingSeconds(data.remainingSeconds);
      } else if (data?.gameDurationMinutes) {
        setRemainingSeconds(data.gameDurationMinutes * 60);
      }

      // Vérifier le statut "Prêt" de l'utilisateur courant
      if (data?.participants && currentUser) {
        const me = data.participants.find(p => p.userId === currentUser.id || p.username === currentUser.username);
        if (me) setIsReady(!!me.isReady);
      }

      // Récupérer le portefeuille et les positions spécifiques à cette salle
      const roomPort = await getMyRoomPortfolio(roomId).catch(() => null);
      if (roomPort) {
        if (roomPort.cashBalance != null) setUserCash(Number(roomPort.cashBalance));
        if (roomPort.totalPortfolioValue != null) setTotalEquity(Number(roomPort.totalPortfolioValue));
        if (Array.isArray(roomPort.positions) && roomPort.positions.length > 0) {
          setUserPositions(roomPort.positions);
        }
        if (Array.isArray(roomPort.orders) && roomPort.orders.length > 0) {
          setOrdersHistory(roomPort.orders);
        }
      }

      const lb = await getArenaLeaderboard(roomId).catch(() => []);
      if (Array.isArray(lb)) setLeaderboard(lb);
      else if (lb?.rankings) setLeaderboard(lb.rankings);
    } catch (e) {
      console.error('[ARENA] Load error', e);
    } finally {
      setLoading(false);
    }
  }, [roomId, currentUser]);

  useEffect(() => {
    loadRoom();
    getRealSymbols('ALL').then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(d => ({ ...d, initialPrice: d.price || 100 }));
        setAssets(mapped);
        const def = mapped.find(a => a.ticker === 'BIAT') || mapped[0];
        setSelectedAsset(def);
      }
    }).catch(console.error);

    getFriends().then(f => setFriends(Array.isArray(f) ? f : [])).catch(() => { });
  }, [loadRoom]);

  // 2. Gestion du Chronomètre Continu (Non Pausable)
  useEffect(() => {
    if (room?.status !== 'RUNNING' && room?.status !== 'PAUSED') return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev == null) {
          return (room?.gameDurationMinutes || 15) * 60;
        }
        if (prev <= 1) {
          clearInterval(timer);
          handleCloseRoom(true); // Clôture automatique au temps écoulé
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room?.status, room?.gameDurationMinutes]);

  // 3. Connexion WebSocket STOMP à la Room
  useEffect(() => {
    const ws = createArenaWebSocket({
      roomId,
      onTick: (tick) => {
        setCurrentTick(tick);
        if (tick.simulatedDate) setSimulatedDate(tick.simulatedDate);
        if (tick.marketPrices && tick.marketPrices[selectedAsset?.ticker]) {
          const newPrice = Number(tick.marketPrices[selectedAsset.ticker]);
          setSelectedAsset((prev) => ({ ...prev, price: newPrice }));
        }

        // Recalculer l'equity et le PnL en direct avec les positions ouvertes
        setUserPositions((positions) => {
          let posVal = 0;
          const updated = positions.map(pos => {
            const sym = pos.symbol || pos.ticker;
            const livePrice = tick.marketPrices && tick.marketPrices[sym] ? Number(tick.marketPrices[sym]) : (pos.currentPrice || pos.entryPrice);
            const mktVal = livePrice * pos.quantity;
            const cost = (pos.entryPrice || livePrice) * pos.quantity;
            posVal += mktVal;
            return {
              ...pos,
              currentPrice: livePrice,
              unrealizedPnl: mktVal - cost
            };
          });

          const currentTotalEq = userCash + posVal;
          setTotalEquity(currentTotalEq);
          const initial = Number(room?.initialCash || 100000);
          const diff = currentTotalEq - initial;
          setPnlPercentage(initial > 0 ? (diff / initial) * 100 : 0);

          return updated;
        });
      },
      onLeaderboard: (lbData) => {
        if (Array.isArray(lbData)) setLeaderboard(lbData);
        else if (lbData?.rankings) setLeaderboard(lbData.rankings);
      },
      onOrder: (order) => {
        setOrdersHistory((prev) => [order, ...prev.slice(0, 49)]);
      },
      onStatusChange: (statusData) => {
        if (statusData.status) {
          setRoom((prev) => prev ? { ...prev, status: statusData.status } : prev);
          setIsPlaying(statusData.status === 'RUNNING');
          if (statusData.status === 'FINISHED') {
            setShowResult(true);
          }
        }
      }
    });

    return () => ws.disconnect();
  }, [roomId, selectedAsset?.ticker, userCash, room?.initialCash]);

  // 4. Bascule Prêt / Pas Prêt
  const handleToggleReady = async () => {
    try {
      const res = await toggleArenaReady(roomId);
      setIsReady(res.isReady);
      loadRoom();
    } catch (e) {
      alert(`Erreur : ${e.message}`);
    }
  };

  // Play/Pause du graphique (hote uniquement) : pilote la salle, tous les joueurs suivent via le statut WebSocket
  const handleRoomPlayPause = async () => {
    try {
      if (room?.status === 'RUNNING') {
        await pauseArenaRoom(roomId);
        setRoom((r) => r ? { ...r, status: 'PAUSED' } : r);
      } else if (room?.status === 'PAUSED') {
        await resumeArenaRoom(roomId);
        setRoom((r) => r ? { ...r, status: 'RUNNING' } : r);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // 5. Seul et Unique Bouton de Pause/Reprise de la Courbe (Géré au sommet)
  const handleTogglePlay = async () => {
    if (room?.status === 'LOBBY' || room?.status === 'WAITING') {
      try {
        await startArenaRoom(roomId);
        setIsPlaying(true);
        setRoom((r) => r ? { ...r, status: 'RUNNING' } : r);
      } catch (e) {
        alert(e.message);
      }
    } else if (isPlaying) {
      await pauseArenaRoom(roomId);
      setIsPlaying(false);
      setRoom((r) => r ? { ...r, status: 'PAUSED' } : r);
    } else {
      await resumeArenaRoom(roomId);
      setIsPlaying(true);
      setRoom((r) => r ? { ...r, status: 'RUNNING' } : r);
    }
  };

  // 6. Clôturer la Salle (Par l'Admin / Hôte)
  const handleCloseRoom = async (isAuto = false) => {
    if (!isAuto) {
      const confirmClose = window.confirm("Êtes-vous sûr de vouloir clôturer définitivement cette arène ? Le match prendra fin et les scores seront validés.");
      if (!confirmClose) return;
    }
    try {
      await closeArenaRoom(roomId);
      setIsPlaying(false);
      setRoom(prev => prev ? { ...prev, status: 'FINISHED' } : prev);
      setShowResult(true);
      if (!isAuto) {
        alert("La salle a été clôturée avec succès.");
      }
    } catch (e) {
      alert(`Erreur lors de la clôture : ${e.message}`);
    }
  };

  // 7. Exécution d'Ordres
  const handlePlaceOrder = async (orderPayload) => {
    const res = await placeArenaOrder(roomId, orderPayload);
    const cost = orderPayload.price * orderPayload.quantity;
    if (orderPayload.side === 'BUY') {
      setUserCash((c) => Math.max(0, c - cost));
      setUserPositions((prev) => {
        const existing = prev.find((p) => p.symbol === orderPayload.ticker);
        if (existing) {
          return prev.map((p) => p.symbol === orderPayload.ticker
            ? { ...p, quantity: p.quantity + orderPayload.quantity }
            : p
          );
        }
        return [...prev, {
          symbol: orderPayload.ticker,
          quantity: orderPayload.quantity,
          entryPrice: orderPayload.price,
          currentPrice: orderPayload.price
        }];
      });
    } else {
      setUserCash((c) => c + cost);
      setUserPositions((prev) => {
        return prev.map(p => {
          if (p.symbol === orderPayload.ticker) {
            const rem = p.quantity - orderPayload.quantity;
            return rem > 0 ? { ...p, quantity: rem } : null;
          }
          return p;
        }).filter(Boolean);
      });
    }
    return res;
  };

  // 8. Inviter un ami
  const handleInviteFriend = async (friendId) => {
    try {
      await inviteFriendToRoom(roomId, friendId);
      setInvitedMap(prev => ({ ...prev, [friendId]: true }));
      setTimeout(() => {
        setInvitedMap(prev => ({ ...prev, [friendId]: false }));
      }, 5000);
    } catch (e) {
      alert(`Erreur invitation: ${e.message}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Calcul du Leaderboard des Actions selon leur Rendement
  const assetsLeaderboard = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    return assets.map((a) => {
      const sym = a.ticker;
      const currentP = (currentTick?.marketPrices && currentTick.marketPrices[sym])
        ? Number(currentTick.marketPrices[sym])
        : Number(a.price || 100);
      const initP = Number(a.initialPrice || a.price || 100);
      const ret = initP > 0 ? ((currentP - initP) / initP) * 100 : 0;
      return {
        ...a,
        currentPrice: currentP,
        initialPrice: initP,
        performance: ret
      };
    }).sort((x, y) => y.performance - x.performance);
  }, [assets, currentTick]);

  const formatChrono = (secs) => {
    if (secs == null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentPrice = selectedAsset?.price || 100;
  // L'admin / créateur de la salle
  const isHost = room?.createdBy?.id === currentUser?.id ||
    room?.creatorUsername === currentUser?.username ||
    currentUser?.role === 'ROLE_ADMIN' ||
    currentUser?.role === 'ROLE_AGENT';

  // ─────────────────────────────────────────────────────────────────────────────
  // VUE B.1 : SALLE D'ATTENTE (PRE-MATCH LOBBY)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!loading && (room?.status === 'LOBBY' || room?.status === 'WAITING')) {
    return (
      <div className="flex flex-col h-screen w-screen bg-[#080C14] text-slate-100 select-none overflow-y-auto">
        {/* Waiting Room Header */}
        <header className="h-16 bg-[#0B1120] border-b border-[#1E293B] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/lobby')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/50"
            >
              <ArrowLeft size={15} /> Quitter vers le Lobby
            </button>
            <div className="h-6 w-px bg-[#1E293B]" />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/40 font-mono text-xs font-bold">
                {room.id}
              </span>
              <h1 className="text-base font-black text-white">{room.name}</h1>
              {room.isPasswordProtected && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Lock size={11} /> Privée
                </span>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-600/40 font-bold">
                SALLE D'ATTENTE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Lien copié !' : 'Copier le lien'}</span>
            </button>

            <button
              onClick={() => setShowInviteDrawer(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
            >
              <UserPlus size={14} />
              <span>Inviter des Amis</span>
            </button>

            {isHost && (
              <button
                onClick={() => handleCloseRoom(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition-all"
                title="Clôturer définitivement la salle"
              >
                <StopCircle size={14} />
                <span>Fermer la Salle</span>
              </button>
            )}
          </div>
        </header>

        {/* Waiting Room Body */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-6 flex flex-col gap-6">
          {/* Match Configuration Banner */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-5 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Période Historique</span>
              <span className="text-sm font-black text-sky-400 font-mono mt-1 block">
                {room.startDate} → {room.endDate}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Capital Initial</span>
              <span className="text-sm font-black text-emerald-400 font-mono mt-1 block">
                {Number(room.initialCash || 100000).toLocaleString('fr-TN')} TND
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Durée de Session</span>
              <span className="text-sm font-black text-purple-400 font-mono mt-1 block">
                {room.gameDurationMinutes || 15} minutes
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Vitesse Replay</span>
              <span className="text-sm font-black text-amber-400 font-mono mt-1 block">
                {room.tickRateMs ? `${room.tickRateMs} ms/jour` : '1 sec = 1 jour'}
              </span>
            </div>
          </div>

          {/* Connected Participants Section */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-200">
                  Traders Connectés ({room.participants?.length || 1} / {room.maxPlayers || 8})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Statut : En attente du lancement par l'hôte
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(room.participants || []).map((participant, i) => {
                const isUserReady = !!participant.isReady;
                const isCurrent = participant.userId === currentUser?.id || participant.username === currentUser?.username;
                const isParticipantHost = participant.userId === room.createdBy?.id || participant.username === room.creatorUsername;

                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${isUserReady
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                        : 'bg-[#080C14] border-[#1E293B]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                        {participant.username ? participant.username.slice(0, 2).toUpperCase() : 'TR'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-100">
                            {participant.username}
                          </span>
                          {isParticipantHost && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              HÔTE
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-600 text-white">
                              VOUS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>Niv. {participant.level || 1}</span>
                          <span>·</span>
                          <span className="text-amber-400 font-bold">{participant.eloRating || 1000} ELO</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border ${isUserReady
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/60'
                          : 'bg-amber-950/60 text-amber-400 border-amber-500/60'
                        }`}
                    >
                      {isUserReady ? '✓ PRÊT' : '⏳ EN ATTENTE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lobby Action Controls */}
          <div className="flex items-center justify-between bg-[#0B1120] border border-[#1E293B] rounded-2xl p-5 shadow-xl">
            <button
              onClick={handleToggleReady}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 ${isReady
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                }`}
            >
              <CheckCircle2 size={16} />
              <span>{isReady ? 'Annuler mon statut Prêt' : 'Je suis Prêt pour le Match !'}</span>
            </button>

            {isHost ? (
              <button
                onClick={handleTogglePlay}
                className="flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-xl shadow-emerald-950 active:scale-95 transition-all"
              >
                <Play size={16} />
                <span>🚀 Démarrer la Partie (Tous les joueurs)</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-mono">
                Attente que l'hôte lance la partie...
              </span>
            )}
          </div>
        </main>

        {/* Invite Friends Drawer Modal */}
        {showInviteDrawer && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl p-6 max-w-md w-full text-slate-100 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-sky-400" />
                  <h3 className="text-sm font-black uppercase">Inviter des Amis Connectés</h3>
                </div>
                <button onClick={() => setShowInviteDrawer(false)} className="text-slate-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              {friends.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-mono">
                  Aucun ami dans votre liste. Ajoutez des amis depuis le lobby pour les inviter.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {friends.map((f) => {
                    const isInvited = !!invitedMap[f.friendId];
                    return (
                      <div key={f.friendId} className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-[#1E293B]">
                        <div>
                          <p className="text-xs font-black text-slate-100">{f.friendUsername}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{f.friendElo} ELO · {f.friendTier}</p>
                        </div>
                        <button
                          onClick={() => handleInviteFriend(f.friendId)}
                          disabled={isInvited}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isInvited
                              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50'
                              : 'bg-sky-600 hover:bg-sky-500 text-white'
                            }`}
                        >
                          <Send size={12} />
                          <span>{isInvited ? 'Envoyé ✓' : 'Inviter'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VUE B.2 : IN-MATCH ROOM WORKSPACE (TERMINAL ARENA PRO FUSIONNÉ)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen bg-[#080C14] text-[#F8FAFC] overflow-hidden font-sans select-none">
      {/* 1. ROOM TOP HUD BAR */}
      <header className="h-12 bg-[#0F172A] border-b border-[#1E293B] px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-700/50"
          >
            <ArrowLeft size={14} /> Lobby
          </button>
          <div className="h-5 w-px bg-[#334155]" />
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/40 text-[10px] font-mono font-bold">
              {room?.id || roomId}
            </span>
            <span className="text-xs font-black text-slate-100 hidden sm:inline">{room?.name || 'Arène de Trading'}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${room?.status === 'RUNNING'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/50'
                : room?.status === 'PAUSED'
                  ? 'bg-amber-950/60 text-amber-400 border-amber-600/50'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
              {room?.status === 'RUNNING' ? '● EN DIRECT' : room?.status === 'PAUSED' ? '❚❚ COURBE PAUSE' : 'TERMINÉE'}
            </span>
          </div>
        </div>

        {/* Center: Chrono Continu Immuable & Seul Bouton de Contrôle Courbe */}
        <div className="flex items-center gap-3">
          {/* Chrono Immuable non-pausable */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono text-xs font-black shadow-sm ${(remainingSeconds ?? 999) < 120
              ? 'bg-rose-950/60 border-rose-600 text-rose-400 animate-pulse'
              : 'bg-[#080C14] border-[#1E293B] text-amber-400'
            }`}>
            <Clock size={13} />
            <span>⏱️ {formatChrono(remainingSeconds)} Restant</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#080C14] border border-[#1E293B] font-mono text-xs text-sky-400">
            <span>Séance : {simulatedDate}</span>
          </div>

          {/* Bouton Admin Clôturer Salle */}
          {isHost && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleCloseRoom(false)}
                disabled={room?.status === 'FINISHED'}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 transition-all disabled:opacity-50"
                title="Clôturer définitivement la salle"
              >
                <StopCircle size={12} />
                <span className="hidden lg:inline">Clôturer Salle</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Cash, Equity & PnL Summary */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-400">Cash: <span className="text-slate-200 font-bold">{Math.round(userCash).toLocaleString('fr-TN')} TND</span></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Equity: <span className="text-white font-bold">{Math.round(totalEquity).toLocaleString('fr-TN')} TND</span></span>
          </div>
          <span className={`px-2 py-0.5 rounded font-bold border ${pnlPercentage >= 0 ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40' : 'bg-rose-950/60 text-rose-400 border-rose-600/40'}`}>
            {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
          </span>
          <span className="hidden xl:inline text-[10px] text-emerald-400 font-bold">● 60 FPS</span>
        </div>
      </header>

      {/* 2. DEDICATED ROOM TAB NAVIGATION BAR */}
      <nav className="h-10 bg-[#0B1120] border-b border-[#1E293B] px-3 flex items-center gap-1 overflow-x-auto shrink-0 select-none">
        {ROOM_MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => {
                if (mod.id === 'CSV_DATA') setIsCsvModalOpen(true);
                else setActiveModule(mod.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${isActive
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
            >
              <Icon size={14} className={isActive ? mod.color : 'text-slate-500'} />
              <span>{mod.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. DEDICATED ROOM WORKSPACE AREA */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* ── FUSION TERMINAL ARENA PRO (MODULE UNIQUE & COMPLET) ────────────────────────── */}
        <div className={`flex-1 flex min-h-0 overflow-hidden ${activeModule === 'ARENA_PRO' ? '' : 'hidden'}`}>
          {/* Colonne Gauche FUSIONNÉE : Bascule Ordres / Watchlist Marché (~340px) */}
          <div className="w-[340px] border-r border-[#1E293B] flex flex-col shrink-0 bg-[#0B1120]">
            {/* Onglets Volet Gauche */}
            <div className="grid grid-cols-2 p-1.5 bg-[#0F172A] border-b border-[#1E293B] gap-1 text-xs">
              <button
                onClick={() => setLeftTab('ORDERS')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold transition-all ${leftTab === 'ORDERS'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
              >
                <Zap size={13} />
                <span>Ticket d'Ordre</span>
              </button>
              <button
                onClick={() => setLeftTab('WATCHLIST')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold transition-all ${leftTab === 'WATCHLIST'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
              >
                <ListFilter size={13} />
                <span>Watchlist ({assets.length})</span>
              </button>
            </div>

            {/* Contenu Volet Gauche */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {leftTab === 'ORDERS' ? (
                <OrderPanel
                  selectedAsset={selectedAsset}
                  currentPrice={currentPrice}
                  availableCash={userCash}
                  onSubmitOrder={handlePlaceOrder}
                  disabled={room?.status === 'WAITING' || room?.status === 'FINISHED'}
                  isHost={isHost}
                />
              ) : (
                <MarketWatch
                  assets={assets}
                  selectedAsset={selectedAsset}
                  onSelectAsset={(a) => {
                    setSelectedAsset(a);
                    setLeftTab('ORDERS'); // Prépare automatiquement le ticket d'ordre sur l'actif cliqué
                  }}
                  isLoading={false}
                  assetSignals={{}}
                />
              )}
            </div>
          </div>

          {/* Colonne Centrale : Ticker Tape + Graphique Chandelier 60 FPS + Bottom Dock Multitâche */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-[#1E293B]">
            {/* Défilement Ticker Tape des cours en tête */}
            <div className="shrink-0 border-b border-[#1E293B] bg-[#080C14]">
              <TickerTape simulatedDate={simulatedDate} />
            </div>

            {/* Graphique Chandelier Live avec contrôle de pause initial */}
            <div className="flex-1 min-h-0 relative">
              <ArenaTradingChart
                selectedAsset={selectedAsset}
                selectedYear={selectedYear}
                onSelectAsset={(a) => setSelectedAsset(a)}
                onSelectYear={setSelectedYear}
                userPositions={userPositions}
                roomRunning={room?.status === 'RUNNING'}
                serverDate={currentTick?.simulatedDate}
                onRoomTogglePlay={isHost ? handleRoomPlayPause : undefined}
                onOpenCsvInspector={() => setIsCsvModalOpen(true)}
                onSimulationUpdate={(simState) => {
                  if (simState?.isPlaying != null) setIsPlaying(simState.isPlaying);
                  if (simState?.simulatedDate) setSimulatedDate(simState.simulatedDate);
                }}
              />
            </div>

            {/* Bottom Dock Multitâche FUSIONNÉ (Positions, Carnet L2, Flux Ordres, 3D Floor) */}
            <div className="h-[215px] bg-[#0B1120] border-t border-[#1E293B] flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F172A] border-b border-[#1E293B]">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setBottomTab('POSITIONS')}
                    className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all ${bottomTab === 'POSITIONS' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Positions Ouvertes ({userPositions.length})
                  </button>
                  <button
                    onClick={() => setBottomTab('ORDERBOOK')}
                    className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all ${bottomTab === 'ORDERBOOK' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Carnet d'Ordres L2
                  </button>
                  <button
                    onClick={() => setBottomTab('ORDERS')}
                    className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all ${bottomTab === 'ORDERS' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    Flux Ordres Match ({ordersHistory.length})
                  </button>
                  <button
                    onClick={() => setBottomTab('3D_FLOOR')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all ${bottomTab === '3D_FLOOR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                  >
                    <Box size={13} /> Arène 3D Floor
                  </button>
                </div>

                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  P&L Latent : <span className={`font-bold ${pnlPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(totalEquity - (Number(room?.initialCash) || 100000)).toFixed(2)} TND
                  </span>
                </span>
              </div>

              <div className="flex-1 overflow-auto p-2">
                {bottomTab === 'POSITIONS' ? (
                  userPositions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                      Aucune position ouverte. Utilisez le ticket d'ordre à gauche pour exécuter une transaction.
                    </div>
                  ) : (
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#1E293B] text-left">
                          <th className="p-2">Symbole</th>
                          <th className="p-2">Quantité</th>
                          <th className="p-2">Prix d'entrée</th>
                          <th className="p-2">Cours Actuel</th>
                          <th className="p-2">PnL Latent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPositions.map((pos, i) => {
                          const mktVal = pos.quantity * (pos.currentPrice || currentPrice);
                          const cost = pos.quantity * (pos.entryPrice || currentPrice);
                          const pnl = mktVal - cost;
                          return (
                            <tr key={i} className="border-b border-[#1E293B]/40 hover:bg-slate-800/20">
                              <td className="p-2 font-bold text-slate-200">{pos.symbol}</td>
                              <td className="p-2">{pos.quantity}</td>
                              <td className="p-2">{Number(pos.entryPrice || currentPrice).toFixed(3)}</td>
                              <td className="p-2 text-sky-400">{Number(pos.currentPrice || currentPrice).toFixed(3)}</td>
                              <td className={`p-2 font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} TND
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : bottomTab === 'ORDERBOOK' ? (
                  <div className="h-full">
                    <OrderBookTape selectedAsset={selectedAsset} price={currentPrice} />
                  </div>
                ) : bottomTab === 'ORDERS' ? (
                  ordersHistory.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                      Aucun ordre exécuté dans l'arène pour l'instant.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {ordersHistory.map((o, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#080C14] border border-[#1E293B] text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${o.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>{o.side}</span>
                            <span className="text-slate-200">{o.quantity} × {o.ticker || o.symbol}</span>
                          </div>
                          <div className="text-slate-400">{Number(o.price || 0).toFixed(3)} TND · {o.username || 'Trader'}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="h-full">
                    <Room3DTradingFloor participants={leaderboard} tick={currentTick} activeSymbol={selectedAsset?.ticker || 'TUNINDEX'} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colonne Droite : Leaderboard Traders, Actions & Bureau IA FinGPT (~360px) */}
          <div className="w-[360px] flex flex-col shrink-0 bg-[#0B1120]">
            <div className="grid grid-cols-3 p-1.5 bg-[#0F172A] border-b border-[#1E293B] gap-1 text-[11px]">
              <button
                onClick={() => setRightTab('LEADERBOARD')}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold transition-all ${rightTab === 'LEADERBOARD' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
                title="Classement en direct des participants de la room"
              >
                <Trophy size={13} />
                <span>Traders</span>
              </button>
              <button
                onClick={() => setRightTab('ASSETS_LEADERBOARD')}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold transition-all ${rightTab === 'ASSETS_LEADERBOARD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
                title="Classement des actions BVMT par rendement"
              >
                <TrendingUp size={13} />
                <span>Actions</span>
              </button>
              <button
                onClick={() => setRightTab('COPILOT')}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold transition-all ${rightTab === 'COPILOT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]'
                  }`}
                title="Bureau IA FinGPT (accessible lors des pauses de courbe)"
              >
                <BrainCircuit size={13} />
                <span>FinGPT</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {rightTab === 'LEADERBOARD' ? (
                <ArenaLeaderboard entries={leaderboard} currentUser={currentUser} roomName={room?.name} />
              ) : rightTab === 'ASSETS_LEADERBOARD' ? (
                /* LEADERBOARD DES ACTIONS SELON LE RENDEMENT */
                <div className="p-3 space-y-2 select-none">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E293B] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Action</span>
                    <span>Cours · Rendement</span>
                  </div>
                  <div className="space-y-1.5">
                    {assetsLeaderboard.map((ast, idx) => {
                      const isSelected = selectedAsset?.ticker === ast.ticker;
                      const isPos = ast.performance >= 0;
                      return (
                        <div
                          key={ast.ticker}
                          onClick={() => setSelectedAsset(ast)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                              ? 'bg-sky-950/40 border-sky-500/60 shadow-md'
                              : 'bg-[#080C14] border-[#1E293B] hover:border-slate-700 hover:bg-slate-800/40'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500 w-4">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs text-slate-100">{ast.ticker}</span>
                                {idx === 0 && <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">TOP</span>}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{ast.name}</p>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-slate-200">
                              {Number(ast.currentPrice).toFixed(2)} TND
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 border ${isPos
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40'
                                : 'bg-rose-950/60 text-rose-400 border-rose-600/40'
                              }`}>
                              {isPos ? '+' : ''}{ast.performance.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <OnDemandCopilot
                  isPlaying={isPlaying}
                  simulatedDate={simulatedDate}
                  portfolio={{ cash: userCash, totalValue: totalEquity, positions: userPositions }}
                  selectedAsset={selectedAsset}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── MODULE 2: PORTFOLIO & RISK ANALYTICS (DÉDIÉ EXCLUSIVEMENT À CETTE ROOM) ────────────────────────────── */}
        <div className={`flex-1 overflow-y-auto p-4 ${activeModule === 'PORTFOLIO' ? '' : 'hidden'}`}>
          <PortfolioAnalyticsView
            simulatedDate={simulatedDate}
            selectedAsset={selectedAsset}
            onNavigateToTrading={() => setActiveModule('ARENA_PRO')}
            allSymbols={assets.map(a => a.ticker)}
            roomPortfolio={{
              initialCash: Number(room?.initialCash) || 100000,
              cashBalance: userCash,
              totalPortfolioValue: totalEquity,
              positions: userPositions,
              transactions: ordersHistory
            }}
          />
        </div>

        {/* ── MODULE 3: BACKTESTING STRATEGY ENGINE ──────────────────────────── */}
        <div className={`flex-1 overflow-y-auto p-4 ${activeModule === 'BACKTEST' ? '' : 'hidden'}`}>
          <BacktestPage currentUser={currentUser} />
        </div>

        {/* ── MODULE 4: STRESS TESTING & RISK CRISIS ─────────────────────────── */}
        <div className={`flex-1 overflow-y-auto p-4 ${activeModule === 'STRESS' ? '' : 'hidden'}`}>
          <StressTestPage currentUser={currentUser} />
        </div>

        {/* ── MODULE: ACTUARIAT (risque et prévision des actifs) ─────────────── */}
        <div className={`flex-1 overflow-y-auto p-4 ${activeModule === 'ACTUARIAL' ? '' : 'hidden'}`}>
          <ActuarialPage simulatedDate={simulatedDate} />
        </div>

        {/* ── MODULE 5: ACADEMIC ACADEMY & TRAINING ──────────────────────────── */}
        <div className={`flex-1 overflow-y-auto p-4 ${activeModule === 'ACADEMY' ? '' : 'hidden'}`}>
          <LearnPage currentUser={currentUser} focus={learnFocus} />
        </div>
      </div>

      {/* ── MODULE 6: CSV DATA INSPECTOR MODAL ──────────────────────────────── */}
      <CsvDataInspectorModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        initialAsset={selectedAsset}
        initialYear={selectedYear}
        assets={assets}
        onSelectAssetAndYear={(asset, year) => {
          setSelectedAsset(asset);
          setSelectedYear(year);
        }}
      />

      {showResult && (
        <MatchResultModal
          roomId={roomId}
          onClose={() => setShowResult(false)}
          onOpenCourse={(course) => {
            setLearnFocus({ ...course, at: Date.now() });
            setActiveModule('ACADEMY');
            setShowResult(false);
          }}
        />
      )}
    </div>
  );
}
