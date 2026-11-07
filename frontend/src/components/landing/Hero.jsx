import React, { useState } from 'react';
import { Trophy, Menu, X } from 'lucide-react';
import ArchScene from './ArchScene';
import Shield from './Shield';
import Torch from './Torch';
import NavMenu from './NavMenu';
import LoginPanel from './LoginPanel';
import Ticker from './Ticker';
import Particles from './Particles';

/**
 * Hero
 * Écran d'accueil portail gaming symétrique 100vh inspiré des portails fantasy sombres
 * et entièrement transposé dans l'univers boursier multijoueur de PIF Trading Arena.
 */
export default function Hero({ onOpenRegister, onOpenForgot }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNav = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      id="hero"
      className="relative w-full min-h-screen lg:h-screen flex flex-col justify-between overflow-hidden bg-[#05070D] portal-vignette select-none"
      aria-label="Portail d'accueil PIF Trading Arena"
    >
      {/* 1. Particules boursières d'ambiance en arrière-plan */}
      <Particles count={32} />

      {/* 2. Glow néon radial supérieur adaptatif */}
      <div 
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[340px] sm:w-[700px] h-[300px] sm:h-[350px] rounded-full blur-[100px] sm:blur-[140px] opacity-25 pointer-events-none transition-all duration-700 overflow-hidden"
        style={{ backgroundColor: 'var(--accent, #00E676)' }}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          3. BANDEAU TITRE ORNEMENTAL SUPÉRIEUR (Cadre métallique et liseré or)
          ───────────────────────────────────────────────────────────────────── */}
      <header className="relative z-30 pt-3 sm:pt-4 px-4 flex flex-col items-center shrink-0">
        <div className="relative inline-flex flex-col items-center max-w-[92vw] px-4 sm:px-10 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-b from-[#1a2336] via-[#0d1424] to-[#070b14] border border-amber-400/40 shadow-[0_0_25px_rgba(245,194,66,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] text-center">
          {/* Liserés or d'angle */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400" />

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Trophy size={18} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,194,66,0.6)] shrink-0" />
            <h1 className="text-sm sm:text-xl lg:text-2xl font-black font-cinzel tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-amber-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">
              PIF TRADING ARENA
            </h1>
          </div>

          <p className="text-[9px] sm:text-xs font-rajdhani font-semibold tracking-wide text-slate-300 mt-0.5 truncate max-w-full">
            Affronte des traders. Rejoue l'histoire des marchés.
          </p>
        </div>

        {/* Bouton burger pour mobile (< 768px) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="md:hidden absolute right-4 top-4 p-2 rounded-xl bg-[#0B101C] border border-[#2b3752] text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-20 z-40 bg-[#0B101C]/95 border-b border-[#1E293B] p-6 backdrop-blur-xl animate-fade-in flex flex-col gap-3">
          <div className="text-xs font-mono font-bold text-amber-400 mb-2">NAVIGATION PORTAIL</div>
          <button onClick={() => handleMobileNav('hero')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">ACCUEIL</button>
          <button onClick={() => handleMobileNav('presentation')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">PRÉSENTATION</button>
          <button onClick={() => handleMobileNav('comment-ca-marche')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">ARÈNE (COMMENT ÇA MARCHE)</button>
          <button onClick={() => handleMobileNav('rangs')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">RANGS ELO & PRESTIGE</button>
          <button onClick={() => handleMobileNav('outils')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">OUTILS PRO SL/TP</button>
          <button onClick={() => handleMobileNav('ia')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">ASSISTANT IA PAUSE</button>
          <button onClick={() => handleMobileNav('footer')} className="text-left text-sm font-bold text-slate-200 hover:text-emerald-400 py-1">AIDE & INFORMATIONS</button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────
          4. CŒUR DE SCÈNE : ARCHE PANORAMIQUE + TORCHES FLANQUÉES
          ───────────────────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex-1 flex flex-col justify-center items-center px-4 max-w-6xl mx-auto w-full py-1">
        
        {/* Scène d'arche avec torches néon à gauche et à droite */}
        <div className="relative w-full flex items-center justify-center">
          
          {/* Torche néon gauche (Bullish vert néon) */}
          <Torch 
            variant="bullish" 
            side="left" 
            className="hidden sm:flex absolute left-2 lg:left-6 -top-2 z-30" 
          />

          {/* Arche panoramique centrale */}
          <div className="w-full flex justify-center">
            <ArchScene className="animate-scene-intro" />
          </div>

          {/* Torche néon droite (Bearish rouge néon) */}
          <Torch 
            variant="bearish" 
            side="right" 
            className="hidden sm:flex absolute right-2 lg:right-6 -top-2 z-30" 
          />
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            5. NIVEAU INTERMÉDIAIRE : MENUS SYMÉTRIQUES ET BLASON CHEVAUCHANT
            ───────────────────────────────────────────────────────────────── */}
        <div className="relative z-30 w-full flex items-center justify-center -mt-16 sm:-mt-20 lg:-mt-24 mb-3">
          
          {/* Menu gauche (ACCUEIL, ARÈNE, CLASSEMENT, ACTUALITÉS) */}
          <div className="hidden md:flex flex-1 justify-end pr-4 lg:pr-8">
            <NavMenu side="left" />
          </div>

          {/* Blason métallique central chevauchant le bas de l'arche */}
          <div className="shrink-0 transform hover:scale-105 transition-transform duration-300">
            <Shield />
          </div>

          {/* Menu droit (FORMATIONS, AMIS, COMMUNAUTÉ, AIDE) */}
          <div className="hidden md:flex flex-1 justify-start pl-4 lg:pr-8">
            <NavMenu side="right" />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            6. PANNEAU DE CONNEXION ORNEMENTAL SOUS LE BLASON
            ───────────────────────────────────────────────────────────────── */}
        <div className="relative z-30 w-full flex justify-center">
          <LoginPanel 
            onOpenRegister={onOpenRegister}
            onOpenForgot={onOpenForgot}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          7. TICKER BOURSIER DÉFILANT AU BAS DU HÉRO
          ───────────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 w-full max-w-full overflow-hidden relative z-30">
        <Ticker />
      </div>
    </section>
  );
}
