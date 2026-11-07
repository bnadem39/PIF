import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Plus, Play, Copy, Check, GraduationCap, Sparkles,
  Users, Clock, DollarSign, LogIn, LogOut, Zap, ArrowRight,
  Shield, Layers, Search, Bell, Award, UserCheck, Flame, Compass,
  SlidersHorizontal, CheckCircle2, X, Lock, ChevronUp, ChevronDown, Palette,
  Briefcase, Radio, Eye
} from 'lucide-react';
import PlayerProfileCard from '../components/hub/PlayerProfileCard';
import FriendsSidebar from '../components/hub/FriendsSidebar';
import CreateRoomModal from '../components/hub/CreateRoomModal';
import AcademyView from '../components/lobby/AcademyView';
import PlayerAvatar from '../components/common/PlayerAvatar';
import AppearanceCustomizerModal from '../components/hub/AppearanceCustomizerModal';
import FriendProfileModal from '../components/hub/FriendProfileModal';
import SeasonsDashboardModal from '../components/gamification/SeasonsDashboardModal';
import SkillTreeModal from '../components/gamification/SkillTreeModal';
import TrophyRoomModal from '../components/gamification/TrophyRoomModal';
import CareerDashboardModal from '../components/gamification/CareerDashboardModal';
import CelebrationManager from '../components/gamification/CelebrationManager';
import { getPlayerLevelFrame } from '../utils/playerLevelFrames';
import { getRooms, getPlayerProfile, joinArenaRoom, getPendingInvitations, acceptInvitation, declineInvitation, logoutUser } from '../services/api';
import { applyThemeSkin, getStoredTheme } from '../utils/colorPaletteExtractor';
import { resolveMediaUrl } from '../components/common/PlayerAvatar';

const FILTER_TABS = [
  { id: 'ALL', label: 'Toutes les Arènes' },
  { id: 'WAITING', label: 'En Attente (Lobby)' },
  { id: 'RUNNING', label: 'En Cours (Live)' },
  { id: 'FRIENDS', label: 'Arènes d\'Amis' },
  { id: 'RANKED', label: 'Classées' },
  { id: 'CASUAL', label: 'Casual' }
];

export default function GamifiedHubPage({ currentUser, onOpenAuthModal, onLogout, initialTab = 'ARENAS' }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => {
    const st = getStoredTheme();
    return {
      customBackgroundUrl: st.backgroundUrl,
      backgroundDarkness: st.darkness,
      backgroundBlur: st.blur,
      backgroundPosition: st.position,
      themeMode: st.themeMode,
      themeAccentColor: st.accentColor,
      themeSecondaryColor: st.secondaryColor
    };
  });
  const [rooms, setRooms] = useState([]);
  const [activeTab, setActiveTab] = useState(initialTab); // 'ARENAS' | 'ACADEMY'
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [isSeasonsOpen, setIsSeasonsOpen] = useState(false);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [isTrophyRoomOpen, setIsTrophyRoomOpen] = useState(false);
  const [isCareerOpen, setIsCareerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [passwordModalRoom, setPasswordModalRoom] = useState(null);
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [liveTheme, setLiveTheme] = useState(null);
  const mainScrollRef = useRef(null);

  const activeBgUrl = liveTheme?.backgroundUrl !== undefined ? liveTheme.backgroundUrl : profile?.customBackgroundUrl;
  const activeDarkness = liveTheme?.darkness !== undefined ? liveTheme.darkness : (profile?.backgroundDarkness ?? 60);
  const activeBlur = liveTheme?.blur !== undefined ? liveTheme.blur : (profile?.backgroundBlur ?? 0);
  const activePosition = liveTheme?.position || profile?.backgroundPosition || 'center';

  const loadData = useCallback(async () => {
    try {
      const [roomsList, userProfile, notifs] = await Promise.all([
        getRooms().catch(() => []),
        getPlayerProfile().catch(() => null),
        getPendingInvitations().catch(() => [])
      ]);
      setRooms(Array.isArray(roomsList) ? roomsList : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      if (userProfile) {
        setProfile(userProfile);
        applyThemeSkin({
          accentColor: userProfile.themeAccentColor,
          secondaryColor: userProfile.themeSecondaryColor,
          backgroundUrl: userProfile.customBackgroundUrl,
          darkness: userProfile.backgroundDarkness,
          blur: userProfile.backgroundBlur,
          position: userProfile.backgroundPosition,
          themeMode: userProfile.themeMode
        });
      }
    } catch (e) {
      console.error('[HUB] Error loading data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 8000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (!quickCode.trim()) return;
    const code = quickCode.trim().toUpperCase();
    navigate(`/arena/${code}`);
  };

  const handleCopyLink = (roomId, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/arena/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleJoin = async (targetRoom, providedPassword = null) => {
    setJoinError('');
    const roomId = typeof targetRoom === 'string' ? targetRoom : targetRoom.id;
    const roomObj = typeof targetRoom === 'object' ? targetRoom : rooms.find(r => r.id === targetRoom);

    // Si la salle est protégée et qu'aucun mot de passe n'a été fourni
    if (roomObj?.isPasswordProtected && !providedPassword) {
      setPasswordModalRoom(roomObj);
      setRoomPasswordInput('');
      setPasswordError('');
      return;
    }

    try {
      await joinArenaRoom(roomId, providedPassword);
      setPasswordModalRoom(null);
      navigate(`/arena/${roomId}`);
    } catch (err) {
      if (passwordModalRoom) {
        setPasswordError(`Mot de passe incorrect : ${err.message}`);
      } else {
        setJoinError(`Impossible de rejoindre ${roomId} : ${err.message}`);
        setTimeout(() => setJoinError(''), 4000);
      }
    }
  };

  const handleAcceptInvite = async (invId, roomId) => {
    try {
      await acceptInvitation(invId);
      setIsNotifOpen(false);
      navigate(`/arena/${roomId}`);
    } catch (e) {
      navigate(`/arena/${roomId}`);
    }
  };

  const handleDeclineInvite = async (invId) => {
    try {
      await declineInvitation(invId);
      loadData();
    } catch (e) { }
  };

  // Filtrage des arènes selon l'onglet et le champ de recherche
  const userElo = profile?.eloRating || currentUser?.eloRating || 1000;
  const filteredRooms = rooms.filter((r) => {
    // Filtre texte (nom ou code PIF-XXXX)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchId = (r.id || '').toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }

    // Filtre statut / catégorie
    if (filterType === 'WAITING') return r.status === 'LOBBY' || r.status === 'WAITING';
    if (filterType === 'RUNNING') return r.status === 'RUNNING' || r.status === 'PAUSED';
    if (filterType === 'RANKED') return r.requiredTier && r.requiredTier !== 'ALL';
    if (filterType === 'CASUAL') return !r.requiredTier || r.requiredTier === 'ALL';
    if (filterType === 'FRIENDS') return true;
    return true;
  });

  return (
    <div className="flex flex-col h-screen w-full relative text-slate-100 font-sans select-none overflow-hidden bg-[#080C14]">
      {/* ─────────────────────────────────────────────────────────────────────────────
          LAYER 0 : DEDICATED CUSTOM BACKGROUND, BLUR, DARKNESS & NEON AMBIENCE
          Placed at z-0, in front of container background, behind z-10 interactive content
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {activeBgUrl ? (
          <img
            src={resolveMediaUrl(activeBgUrl)}
            alt="Fond d'écran du Lobby"
            className="absolute inset-0 w-full h-full object-cover transition-all duration-700 pointer-events-none select-none"
            style={{
              objectPosition: activePosition || 'center',
              filter: activeBlur > 0 ? `blur(${activeBlur}px)` : 'none',
              transform: activeBlur > 0 ? 'scale(1.05)' : 'none'
            }}
            onError={(e) => {
              console.warn('[LOBBY BG] Failed to load background image:', activeBgUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        {/* Configurable Darkness Overlay */}
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            backgroundColor: `rgba(8, 12, 20, ${(activeDarkness ?? 60) / 100})`
          }}
        />

        {/* Dynamic Radial Neon Ambient Glow */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[130px] opacity-25 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: 'var(--theme-accent, #10b981)' }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CONTENT WRAPPER: relative z-10
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col h-full w-full min-h-0">

        {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION A.1 : GLOBAL HEADER (RESPONSIVE ESPORTS HUD)
          ───────────────────────────────────────────────────────────────────────────── */}
        <header className="h-16 shrink-0 bg-[#0B1120]/90 border-b border-[#1E293B] px-4 lg:px-6 flex items-center justify-between gap-3 backdrop-blur-xl sticky top-0 z-40 shadow-xl">
          {/* SECTION GAUCHE : LOGO COMPACT, TITRE & SOUS-TITRE ALIGNÉS SANS CHEVAUCHEMENT */}
          <div className="flex items-center gap-3 shrink-0 min-w-max">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950/30">
              <Trophy size={19} />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <h1 className="text-sm lg:text-base font-black tracking-wider text-white leading-none">
                  PIF TRADING ARENA
                </h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 leading-none">
                  PROD
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight mt-1 leading-none">
                Simulation Boursière E-Sport · Replay BVMT
              </p>
            </div>
          </div>

          {/* SECTION CENTRALE : BARRE DE NAVIGATION UNIFIÉE (6 ONGLETS & HUBS) */}
          <nav className="hidden md:flex items-center gap-1 bg-[#080C14]/90 p-1 rounded-2xl border border-[#1E293B]/80 shadow-inner shrink-0">
            <button
              onClick={() => setActiveTab('ARENAS')}
              className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'ARENAS'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
            >
              <Compass size={14} className={activeTab === 'ARENAS' ? 'text-white' : 'text-sky-400'} />
              <span>Arènes</span>
            </button>

            <button
              onClick={() => setActiveTab('ACADEMY')}
              className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === 'ACADEMY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
            >
              <GraduationCap size={14} className={activeTab === 'ACADEMY' ? 'text-white' : 'text-indigo-400'} />
              <span>Académie</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            <button
              onClick={() => setIsSeasonsOpen(true)}
              className="h-8 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Saisons Compétitives & Classements"
            >
              <Trophy size={14} className="text-amber-400" />
              <span>Saison</span>
            </button>

            <button
              onClick={() => setIsSkillTreeOpen(true)}
              className="h-8 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Arbre de Compétences RPG du Trader"
            >
              <Zap size={14} className="text-cyan-400" />
              <span>Compétences</span>
            </button>

            <button
              onClick={() => setIsTrophyRoomOpen(true)}
              className="h-8 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Salle des Trophées & Succès Débloqués"
            >
              <Award size={14} className="text-purple-400" />
              <span>Trophées</span>
            </button>

            <button
              onClick={() => setIsCareerOpen(true)}
              className="h-8 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Progression de Carrière Trader & Titres"
            >
              <Briefcase size={14} className="text-emerald-400" />
              <span>Carrière</span>
            </button>
          </nav>

          {/* SECTION DROITE : RECHERCHE CODE, AMIS, NOTIFS, THEME, PROFIL & CREATION */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Room Code Input */}
            <form onSubmit={handleQuickJoin} className="hidden 2xl:flex items-center">
              <input
                type="text"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                placeholder="Code (ex: PIF-7842)..."
                className="bg-[#080C14] border border-[#1E293B] focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none w-28 transition-all"
              />
              <button
                type="submit"
                className="ml-1 px-2.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-[11px] font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer"
              >
                Rejoindre
              </button>
            </form>

            {/* Notifications Center Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell size={15} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0B1120] border-2 border-[#1E293B] rounded-2xl p-4 shadow-2xl z-50 animate-fade-in text-xs">
                  <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-3">
                    <span className="font-bold uppercase tracking-wider text-slate-200">Invitations en attente</span>
                    <span className="text-[10px] text-slate-400 font-mono">{notifications.length} inv.</span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-slate-500 text-center py-4 font-mono">Aucune notification en attente</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-[#080C14] border border-[#1E293B] space-y-2">
                          <p className="text-slate-300">
                            <span className="text-emerald-400 font-bold">{n.senderUsername}</span> vous invite dans <span className="font-mono text-sky-400 font-bold">{n.roomName}</span> ({n.roomId})
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAcceptInvite(n.id, n.roomId)}
                              className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
                            >
                              Rejoindre
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(n.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px]"
                            >
                              Refuser
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Friends Sidebar Toggle */}
            <button
              onClick={() => setIsFriendsOpen(!isFriendsOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isFriendsOpen
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50'
                : 'bg-[#080C14] hover:bg-slate-800 border-[#1E293B] text-slate-300'
                }`}
              title="Liste d'Amis"
            >
              <Users size={14} />
              <span className="hidden sm:inline">Amis</span>
            </button>

            {/* Theme & Appearance Customizer Button */}
            <button
              onClick={() => setIsAppearanceOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] hover:border-slate-600 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
              title="Thème, fond d'écran et photo de profil"
            >
              <Palette size={14} className="text-amber-400" />
              <span className="hidden md:inline">Thème</span>
            </button>

            {/* User Profile Badge (Level, Frame, ELO, Avatar) */}
            {profile && (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] hover:border-slate-600 transition-all text-left group shadow-sm cursor-pointer"
                title="Accéder à mon Profil complet"
              >
                <PlayerAvatar
                  user={profile}
                  size="sm"
                  showFrame={true}
                  showBadge={true}
                />
                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black group-hover:brightness-125 transition-colors ${getPlayerLevelFrame(profile.level).nameClass}`}>
                      {profile.username}
                    </span>
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {profile.tier || 'SILVER'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <span>Niv. {profile.level || 1}</span>
                    <span>·</span>
                    <span className="text-amber-400 font-bold">{profile.eloRating || 1000} ELO</span>
                  </div>
                </div>
              </button>
            )}

            {/* Create Room Button with Gold Esports Accent */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-950/40 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <Plus size={14} className="text-slate-950 stroke-[3]" />
              <span className="hidden sm:inline">Créer Arène</span>
            </button>

            {/* Logout / Login Toggle */}
            {currentUser ? (
              <button
                onClick={async () => {
                  if (onLogout) {
                    await onLogout();
                  } else {
                    await logoutUser();
                    window.location.href = '/';
                  }
                }}
                className="p-2 rounded-xl bg-[#080C14] hover:bg-rose-950/40 border border-[#1E293B] text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut size={15} />
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md transition-all cursor-pointer"
              >
                <LogIn size={14} /> Connexion
              </button>
            )}
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────────────────────
          MAIN CONTENT AREA (LOBBY + OPTIONAL FRIENDS SIDEBAR)
          ───────────────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Main Feed Column */}
          <main ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full scroll-smooth">
            {joinError && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-bold animate-shake">
                {joinError}
              </div>
            )}

            {/* TAB 1: ACADEMIC ACADEMY VIEW */}
            {activeTab === 'ACADEMY' ? (
              <AcademyView currentUser={currentUser} />
            ) : (
              /* TAB 2: AVAILABLE ARENAS / ROOM BROWSER */
              <section className="flex flex-col gap-5">
                {/* Filter Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-4">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {FILTER_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterType(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterType === tab.id
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                          : 'border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Field */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher par nom ou code..."
                      className="bg-[#0B1120] border border-[#1E293B] focus:border-emerald-500 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-full sm:w-64 transition-all"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────────────
                  SECTION A.3 : ROOM CARDS GRID
                  ───────────────────────────────────────────────────────────────────── */}
                {filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-[#0B1120] border border-[#1E293B] text-slate-500 gap-3 text-center shadow-xl">
                    <Trophy size={48} className="opacity-20 text-emerald-400" />
                    <h3 className="text-base font-bold text-slate-300">Aucune arène ne correspond aux critères</h3>
                    <p className="text-xs max-w-sm">
                      Soyez l'hôte de la prochaine compétition ! Créez une salle privée et invitez vos amis.
                    </p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                    >
                      <Plus size={14} /> Créer ma première salle
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredRooms.map((room) => {
                      const isRunning = room.status === 'RUNNING' || room.status === 'PAUSED';
                      const isCopied = copiedId === room.id;
                      const minElo = room.minElo ?? 0;
                      const maxElo = room.maxElo ?? 3000;
                      const isEligible = userElo >= (minElo - 200) && userElo <= (maxElo + 200);

                      return (
                        <div
                          key={room.id}
                          className="bg-[#0B1120]/80 backdrop-blur-md border rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all shadow-xl group hover:scale-[1.01]"
                          style={{
                            borderColor: 'var(--theme-border, #1E293B)',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
                          }}
                        >
                          <div>
                            {/* Card Header: Creator Avatar, Room ID, Name & Status */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2.5">
                                {(() => {
                                  const creatorUser = (room.creatorUsername || room.createdBy) ? {
                                    username: room.creatorUsername || (typeof room.createdBy === 'object' ? room.createdBy.username : room.createdBy),
                                    profileImageUrl: room.creatorProfileImageUrl || (typeof room.createdBy === 'object' ? room.createdBy.profileImageUrl : null),
                                    level: room.creatorLevel || (typeof room.createdBy === 'object' ? room.createdBy.level : 1),
                                    tier: room.creatorTier || (typeof room.createdBy === 'object' ? room.createdBy.tier : 'BRONZE')
                                  } : null;
                                  if (!creatorUser) return null;
                                  return (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedFriend(creatorUser);
                                      }}
                                      className="mt-0.5 cursor-pointer shrink-0"
                                      title={`Créé par ${creatorUser.username || 'Trader'} (cliquer pour voir le profil)`}
                                    >
                                      <PlayerAvatar user={creatorUser} size="sm" showFrame={true} />
                                    </div>
                                  );
                                })()}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className="px-2.5 py-0.5 rounded-lg border text-[10px] font-mono font-bold"
                                      style={{
                                        backgroundColor: 'var(--theme-bg-subtle, rgba(16, 185, 129, 0.12))',
                                        color: 'var(--theme-accent, #10b981)',
                                        borderColor: 'var(--theme-border, rgba(16, 185, 129, 0.35))'
                                      }}
                                    >
                                      {room.id}
                                    </span>
                                    {room.isPasswordProtected && (
                                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                                        <Lock size={10} /> Privée
                                      </span>
                                    )}
                                    <h3 className="text-base font-black text-slate-100 group-hover:text-emerald-300 transition-colors">
                                      {room.name}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-slate-400 font-mono mt-1">
                                    {room.startDate} → {room.endDate}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${isRunning
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/60'
                                  : 'bg-sky-950/60 text-sky-400 border-sky-600/60'
                                  }`}
                              >
                                {room.status === 'LOBBY' ? 'SALLE D\'ATTENTE' : room.status}
                              </span>
                            </div>

                            {/* Room Simulation Badges */}
                            <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-mono">
                              <div className="p-2 rounded-xl bg-[#080C14]/90 border border-[#1E293B]/70 flex items-center gap-2">
                                <DollarSign size={13} className="text-emerald-400 shrink-0" />
                                <span className="text-slate-300">
                                  {Number(room.initialCash || 100000).toLocaleString('fr-TN')} TND
                                </span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#080C14]/90 border border-[#1E293B]/70 flex items-center gap-2">
                                <Clock size={13} className="text-sky-400 shrink-0" />
                                <span className="text-slate-300">{room.gameDurationMinutes || 15} min</span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#080C14]/90 border border-[#1E293B]/70 flex items-center gap-2">
                                <Zap size={13} className="text-amber-400 shrink-0" />
                                <span className="text-slate-300">{room.tickRateMs ? `${room.tickRateMs} ms/j` : '1s / jour'}</span>
                              </div>
                              <div className="p-2 rounded-xl bg-[#080C14]/90 border border-[#1E293B]/70 flex items-center gap-2">
                                <Users size={13} className="text-purple-400 shrink-0" />
                                <span className="text-slate-300">
                                  {room.participantCount || 1} / {room.maxPlayers || 8} joueurs
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Actions: Join, Spectate & Copy Link */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B]">
                            <button
                              onClick={() => handleJoin(room)}
                              disabled={!isEligible}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black transition-all active:scale-95 ${isEligible
                                ? 'text-white shadow-lg hover:brightness-110'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                }`}
                              style={
                                isEligible
                                  ? {
                                    backgroundColor: 'var(--theme-accent, #10b981)',
                                    boxShadow: '0 0 16px var(--theme-glow, rgba(16, 185, 129, 0.4))'
                                  }
                                  : {}
                              }
                            >
                              <span>{isRunning ? 'Entrer dans l\'Arène' : 'Rejoindre la Salle'}</span>
                              <ArrowRight size={14} />
                            </button>

                            {/* Spectator Mode Quick Button for live rooms */}
                            {isRunning && (
                              <button
                                onClick={() => navigate(`/spectator/${room.id}`)}
                                className="px-3 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                                title="Regarder le match en direct (Mode Spectateur Esports)"
                              >
                                <Eye size={14} className="text-purple-400" />
                                <span className="hidden sm:inline">Spectateur</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => handleCopyLink(room.id, e)}
                              className="p-2.5 rounded-xl bg-[#080C14] hover:bg-slate-800 text-slate-400 hover:text-white border border-[#1E293B] transition-colors"
                              title="Copier le lien d'invitation"
                            >
                              {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </main>

          {/* ─────────────────────────────────────────────────────────────────────────────
            SECTION A.5 : FRIENDS SIDEBAR DRAWER
            ───────────────────────────────────────────────────────────────────────────── */}
          {isFriendsOpen && (
            <div className="border-l border-[#1E293B] h-full animate-fade-in shrink-0">
              <FriendsSidebar
                activeRoomId={null}
                onSelectFriend={(f) => setSelectedFriend(f)}
              />
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL MOT DE PASSE POUR SALLE PRIVÉE
          ───────────────────────────────────────────────────────────────────────────── */}
        {passwordModalRoom && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0B1120] border-2 border-amber-500/50 rounded-3xl p-6 max-w-sm w-full text-slate-100 flex flex-col gap-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Salle Protégée</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{passwordModalRoom.name} ({passwordModalRoom.id})</p>
                  </div>
                </div>
                <button onClick={() => setPasswordModalRoom(null)} className="text-slate-400 hover:text-white p-1">
                  <X size={16} />
                </button>
              </div>

              {passwordError && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
                  {passwordError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleJoin(passwordModalRoom, roomPasswordInput);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Mot de passe d'accès
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={roomPasswordInput}
                    onChange={(e) => setRoomPasswordInput(e.target.value)}
                    placeholder="Entrez le mot de passe..."
                    className="w-full bg-[#080C14] border border-[#1E293B] focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalRoom(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-lg shadow-amber-950"
                  >
                    Déverrouiller
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contrôleur Flottant de Défilement Rapide (Haut / Bas) */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 bg-[#0B1120]/95 p-1.5 rounded-2xl border-2 border-[#1E293B] shadow-2xl backdrop-blur-md">
          <button
            onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-2.5 rounded-xl bg-[#080C14] hover:bg-emerald-600 text-slate-300 hover:text-white transition-all shadow-md group border border-[#1E293B]"
            title="Remonter tout en haut"
          >
            <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
          <button
            onClick={() => mainScrollRef.current?.scrollTo({ top: mainScrollRef.current.scrollHeight, behavior: 'smooth' })}
            className="p-2.5 rounded-xl bg-[#080C14] hover:bg-sky-600 text-slate-300 hover:text-white transition-all shadow-md group border border-[#1E293B]"
            title="Descendre voir les arènes en bas"
          >
            <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION A.4 : CREATE ROOM MODAL
          ───────────────────────────────────────────────────────────────────────────── */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={(room) => {
          setIsCreateModalOpen(false);
          loadData();
          navigate(`/arena/${room.id}`);
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION A.6 : ADVANCED APPEARANCE & THEME CUSTOMIZER MODAL
          ───────────────────────────────────────────────────────────────────────────── */}
      <AppearanceCustomizerModal
        isOpen={isAppearanceOpen}
        onClose={() => {
          setIsAppearanceOpen(false);
          setLiveTheme(null);
        }}
        player={profile}
        onAppearanceUpdated={(updatedData) => {
          if (updatedData) {
            setProfile((prev) => ({
              ...(prev || {}),
              ...updatedData
            }));
            setLiveTheme(updatedData);
          }
          loadData();
        }}
        onLiveThemeChange={setLiveTheme}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION A.7 : PUBLIC FRIEND PROFILE MODAL
          ───────────────────────────────────────────────────────────────────────────── */}
      <FriendProfileModal
        isOpen={!!selectedFriend}
        onClose={() => setSelectedFriend(null)}
        friend={selectedFriend}
        onInviteToRoom={(friendId) => {
          // Invite callback
        }}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          GAMIFICATION ECOSYSTEM MODALS & 3D CELEBRATIONS
          ───────────────────────────────────────────────────────────────────────────── */}
      <SeasonsDashboardModal
        isOpen={isSeasonsOpen}
        onClose={() => setIsSeasonsOpen(false)}
        currentUser={profile || currentUser}
      />

      <SkillTreeModal
        isOpen={isSkillTreeOpen}
        onClose={() => setIsSkillTreeOpen(false)}
        currentUser={profile || currentUser}
        onSkillUnlocked={() => loadData()}
      />

      <TrophyRoomModal
        isOpen={isTrophyRoomOpen}
        onClose={() => setIsTrophyRoomOpen(false)}
        currentUser={profile || currentUser}
      />

      <CareerDashboardModal
        isOpen={isCareerOpen}
        onClose={() => setIsCareerOpen(false)}
        currentUser={profile || currentUser}
        onCareerUpdated={() => loadData()}
      />

      <CelebrationManager currentUser={profile || currentUser} />
    </div>
  );
}
