import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, ArrowLeft, Award, Shield, Sparkles, CheckCircle2,
  Clock, DollarSign, LogOut, Flame, Palette, User, Mail, ShieldCheck,
  TrendingUp, Activity
} from 'lucide-react';
import PlayerProfileCard from '../components/hub/PlayerProfileCard';
import { getPlayerProfile, logoutUser } from '../services/api';
import { applyThemeSkin } from '../utils/colorPaletteExtractor';

export default function ProfilePage({ currentUser, onOpenAuthModal }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await getPlayerProfile();
      if (data) {
        setProfile(data);
        applyThemeSkin(data.themeAccentColor, data.customBackgroundUrl);
      }
    } catch (e) {
      console.error('[PROFILE] Error loading profile', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#080C14] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. HEADER INDÉPENDANT DU PROFIL */}
      <header className="h-16 shrink-0 bg-[#0B1120]/95 border-b border-[#1E293B] px-6 flex items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] transition-all"
          >
            <ArrowLeft size={15} />
            <span>Retour au Lobby</span>
          </button>
          <div className="h-6 w-px bg-[#1E293B]" />
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md">
              <User size={16} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white">PROFIL TRADER & RÉCOMPENSES</h1>
              <p className="text-[10px] text-slate-400 font-mono">Progression ELO · Statistiques · Personnalisation de Thème</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <button
              onClick={async () => {
                await logoutUser();
                window.location.href = '/';
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080C14] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#1E293B] hover:border-rose-800/60 text-xs font-bold transition-all cursor-pointer"
              title="Se déconnecter"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. CONTENU PRINCIPAL DE LA PAGE PROFIL */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
          {/* CARTE PRINCIPALE : PROGRESSION, ELO, TIER & BOUTON SKIN */}
          <PlayerProfileCard player={profile} onProfileUpdated={loadProfile} />

          {/* GRILLE DES STATISTIQUES AVANCÉES DU JOUEUR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#1E293B] flex flex-col justify-between gap-3 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Matchs Disputés</span>
                <Activity size={16} className="text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white font-mono">{profile?.totalMatches || 0}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Arènes compétitives en direct
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#1E293B] flex flex-col justify-between gap-3 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Victoires & Podium</span>
                <Trophy size={16} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-yellow-400 font-mono">{profile?.wins || 0}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  {profile?.totalMatches > 0
                    ? `Taux de réussite : ${Math.round(((profile?.wins || 0) / profile.totalMatches) * 100)}%`
                    : 'Aucun match terminé'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0B1120] border border-[#1E293B] flex flex-col justify-between gap-3 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Palier Compétitif</span>
                <Award size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400 font-mono uppercase">{profile?.tier || 'BRONZE'}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  {profile?.eloRating >= 1500 ? '✓ Skins personnalisés débloqués' : 'Débloque les skins au rang GOLD (1500 ELO)'}
                </p>
              </div>
            </div>
          </div>

          {/* DÉTAILS DU COMPTE & IDENTITÉ */}
          <div className="p-6 rounded-3xl bg-[#0B1120] border border-[#1E293B] space-y-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck size={16} className="text-sky-400" />
              <span>Identité & Paramètres du Compte</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E293B]">
                <span className="text-slate-500 block mb-1">Identifiant Email</span>
                <span className="text-slate-200 font-bold">{profile?.email || currentUser?.email || 'trader@pif.tn'}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E293B]">
                <span className="text-slate-500 block mb-1">Pseudo Public / Alias</span>
                <span className="text-emerald-400 font-bold">{profile?.username || currentUser?.username || 'Trader'}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E293B]">
                <span className="text-slate-500 block mb-1">Rôle Système</span>
                <span className="text-sky-400 font-bold">{profile?.role || currentUser?.role || 'ROLE_TRADER'}</span>
              </div>
              <div className="p-4 rounded-xl bg-[#080C14] border border-[#1E293B]">
                <span className="text-slate-500 block mb-1">Statut Fond d'écran</span>
                <span className="text-slate-200">
                  {profile?.customBackgroundUrl ? 'Fond personnalisé actif' : 'Arrière-plan par défaut'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

