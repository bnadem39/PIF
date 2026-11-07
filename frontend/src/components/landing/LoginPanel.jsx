import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Plus, HelpCircle, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { loginUser } from '../../services/api';
import CandleColumn from './CandleColumn';

/**
 * LoginPanel
 * Panneau de connexion ornemental inspiré des portails fantasy sombres.
 * Intégration complète avec Spring Boot auth (`/api/v1/auth/login`).
 * 
 * @param {Function} onOpenRegister - Ouvre la modale d'inscription ("+")
 * @param {Function} onOpenForgot - Ouvre la modale mot de passe oublié ("?")
 */
export default function LoginPanel({ onOpenRegister, onOpenForgot, className = '' }) {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation stricte côté client
    if (!identifier.trim()) {
      setErrorMessage('Veuillez saisir votre email ou pseudonyme.');
      return;
    }
    if (!password) {
      setErrorMessage('Veuillez saisir votre mot de passe.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(identifier.trim(), password);
      setIsSuccess(true);
      // Redirection immédiate vers le Lobby après succès
      setTimeout(() => {
        navigate('/lobby');
      }, 700);
    } catch (err) {
      console.error('[PORTAL LOGIN] Erreur:', err);
      setErrorMessage(err.message || 'Identifiants incorrects ou serveur indisponible.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`relative flex items-center justify-center gap-3 sm:gap-5 select-none ${className}`}>
      {/* Mini chandelier animé gauche */}
      <CandleColumn side="left" className="hidden sm:flex" />

      {/* Cadre métallique principal du formulaire */}
      <div className="relative w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px] rounded-2xl bg-gradient-to-b from-[#131b2c] via-[#0b101c] to-[#060911] border border-[#2b3752] p-3.5 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]">
        
        {/* Liseré or supérieur */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent pointer-events-none" />

        {/* Message d'erreur éventuel */}
        {errorMessage && (
          <div 
            className="mb-3 p-2.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-shake"
            role="alert"
          >
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Message de succès */}
        {isSuccess && (
          <div 
            className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in"
            role="status"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="font-bold">Accès autorisé. Entrée dans l'Arène...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {/* Ligne 1 : Champ Identifiant / Email */}
          <div className="relative">
            <label htmlFor="portal-identifier" className="sr-only">
              Email ou Pseudonyme
            </label>
            <div className="relative flex items-center">
              <input
                id="portal-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email ou Pseudonyme (ex: adem@gmail.com)"
                disabled={isLoading || isSuccess}
                className="w-full bg-[#050811] text-slate-100 placeholder-slate-500 text-xs sm:text-sm font-sans px-3.5 py-2.5 rounded-xl border border-[#223049] focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 shadow-inner outline-none transition-all"
              />
            </div>
          </div>

          {/* Ligne 2 : Champ Mot de passe avec toggle affichage */}
          <div className="relative">
            <label htmlFor="portal-password" className="sr-only">
              Mot de Passe
            </label>
            <div className="relative flex items-center">
              <input
                id="portal-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (ex: Adem2026!)"
                disabled={isLoading || isSuccess}
                className="w-full bg-[#050811] text-slate-100 placeholder-slate-500 text-xs sm:text-sm font-sans px-3.5 py-2.5 pr-10 rounded-xl border border-[#223049] focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 shadow-inner outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Ligne 3 : Bouton Principal ENTRER DANS L'ARÈNE + 2 boutons ronds ("+" et "?") */}
          <div className="flex items-center gap-2 pt-1">
            {/* Bouton Principal avec pulse néon */}
            <button
              type="submit"
              disabled={isLoading || isSuccess}
              className="portal-btn-pulse flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black font-rajdhani tracking-wider text-xs sm:text-sm uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,230,118,0.35)]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Bienvenue !</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>ENTRER DANS L'ARÈNE</span>
                </>
              )}
            </button>

            {/* Bouton Rond "+" : Créer un compte trader */}
            <button
              type="button"
              onClick={onOpenRegister}
              title="Créer un nouveau compte trader"
              aria-label="Créer un compte trader"
              className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-b from-[#1a2333] to-[#0e1422] border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(245,194,66,0.35)] flex items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-95"
            >
              <Plus size={19} />
            </button>

            {/* Bouton Rond "?" : Récupération de mot de passe */}
            <button
              type="button"
              onClick={onOpenForgot}
              title="Mot de passe oublié ?"
              aria-label="Mot de passe oublié"
              className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-b from-[#1a2333] to-[#0e1422] border border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)] flex items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-95"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Mini chandelier animé droit */}
      <CandleColumn side="right" className="hidden sm:flex" />
    </div>
  );
}
