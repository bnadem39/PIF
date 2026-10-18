import React, { useState } from 'react';
import {
  Lock,
  UserPlus,
  Mail,
  Key,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { loginUser, registerUser } from '../services/realMarketService';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'LOGIN' }) {
  const [mode, setMode] = useState(initialMode); // 'LOGIN' ou 'REGISTER'

  // Formulaire Connexion
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Formulaire Inscription
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // États UI
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isOpen) return null;

  const handleFillDemoAdmin = () => {
    setLoginEmail('admin@gmail.com');
    setLoginPassword('admin@26');
    setErrorMessage(null);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginEmail || !loginPassword) {
      setErrorMessage("Veuillez renseigner l'email et le mot de passe.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginUser(loginEmail.trim(), loginPassword);
      setIsLoading(false);
      setSuccessMessage("Connexion réussie ! Chargement de votre espace trader...");
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(response);
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || "Identifiants invalides ou erreur serveur.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regEmail || !regPassword) {
      setErrorMessage("L'adresse email et le mot de passe sont obligatoires.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Les deux mots de passe saisis ne sont pas identiques.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerUser(
        regEmail.trim(),
        regPassword,
        regFullName.trim() || 'Nouveau Trader'
      );
      setIsLoading(false);
      setSuccessMessage("Compte créé avec succès ! 100 000,000 TND de liquidités alloués.");
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(response);
        if (onClose) onClose();
      }, 900);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err.message || "Erreur lors de la création du compte.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-sans">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Lueur d'accentuation supérieure */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0284C7] via-[#38BDF8] to-[#10B981]" />

        {/* Bouton de Fermeture si fermeture autorisée */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {/* En-tête de la modale */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-[#0284C7]/20 border border-[#0284C7]/40 text-[#38BDF8]">
              {mode === 'LOGIN' ? <Lock size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-wide">
                {mode === 'LOGIN' ? 'Connexion Salle de Marché' : 'Créer un Compte Trader'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'LOGIN'
                  ? 'Accédez à votre terminal de simulation boursière'
                  : 'Rejoignez la plateforme avec 100 000,000 TND virtuels'}
              </p>
            </div>
          </div>

          {/* Onglets Connexion / Inscription */}
          <div className="flex bg-[#080C14] p-1 rounded-xl border border-[#1E293B] mt-4 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'LOGIN'
                  ? 'bg-[#0284C7] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock size={13} />
              <span>Se Connecter</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                mode === 'REGISTER'
                  ? 'bg-[#0284C7] text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={13} />
              <span>Inscription</span>
            </button>
          </div>
        </div>

        {/* Message d'erreur ou succès */}
        {errorMessage && (
          <div className="mx-6 mb-3 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mb-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. FORMULAIRE DE CONNEXION */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleLoginSubmit} className="p-6 pt-2 space-y-4 font-mono text-xs">
            {/* Champ Email */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px] uppercase">
                Adresse Email
              </label>
              <div className="flex items-center bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2.5 focus-within:border-[#38BDF8] transition-colors">
                <Mail size={15} className="text-slate-400 mr-2.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-transparent text-white w-full outline-none font-medium text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Champ Mot de Passe */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold text-[11px] uppercase">
                  Mot de Passe
                </label>
              </div>
              <div className="flex items-center bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2.5 focus-within:border-[#38BDF8] transition-colors">
                <Key size={15} className="text-slate-400 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-transparent text-white w-full outline-none font-medium text-xs placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-200 transition-colors ml-2"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Raccourci Compte Administrateur */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="w-full py-2 bg-[#1E293B]/60 hover:bg-[#1E293B] border border-[#334155] text-slate-300 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all font-semibold"
              >
                <Sparkles size={13} className="text-amber-400" />
                <span>Remplir avec le compte Admin par défaut (admin@gmail.com)</span>
              </button>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0284C7]/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Authentification en cours...</span>
                </>
              ) : (
                <>
                  <span>Ouvrir la Salle des Marchés</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* 2. FORMULAIRE D'INSCRIPTION */
          <form onSubmit={handleRegisterSubmit} className="p-6 pt-2 space-y-3.5 font-mono text-xs">
            {/* Nom Complet */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px] uppercase">
                Nom & Prénom (Trader)
              </label>
              <div className="flex items-center bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2.5 focus-within:border-[#38BDF8] transition-colors">
                <User size={15} className="text-slate-400 mr-2.5" />
                <input
                  type="text"
                  placeholder="ex: Yassine Mansour"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="bg-transparent text-white w-full outline-none font-medium text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Adresse Email */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px] uppercase">
                Adresse Email
              </label>
              <div className="flex items-center bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2.5 focus-within:border-[#38BDF8] transition-colors">
                <Mail size={15} className="text-slate-400 mr-2.5" />
                <input
                  type="email"
                  required
                  placeholder="votre.email@domain.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="bg-transparent text-white w-full outline-none font-medium text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Mot de Passe */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px] uppercase">
                Mot de Passe (min. 6 car.)
              </label>
              <div className="flex items-center bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2.5 focus-within:border-[#38BDF8] transition-colors">
                <Key size={15} className="text-slate-400 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Au moins 6 caractères"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="bg-transparent text-white w-full outline-none font-medium text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Confirmer Mot de Passe */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 text-[11px] uppercase">
                Confirmer Mot de Passe
              </label>
              <div className="flex items-center bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2.5 focus-within:border-[#38BDF8] transition-colors">
                <Key size={15} className="text-slate-400 mr-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Répétez le mot de passe"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="bg-transparent text-white w-full outline-none font-medium text-xs placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Badge Avantage Solde Initial */}
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-2 text-emerald-300 text-[11px]">
              <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
              <span>Capital initial virtuel crédité : <strong>100 000,000 TND</strong></span>
            </div>

            {/* Bouton de Création */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-slate-950 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#10B981]/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-slate-950" />
                  <span>Création du compte...</span>
                </>
              ) : (
                <>
                  <span>Créer mon Compte Trader</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Pied de Modale */}
        <div className="px-6 py-3.5 bg-[#080C14] border-t border-[#1E293B] text-center text-[11px] text-slate-400 font-mono">
          {mode === 'LOGIN' ? (
            <span>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-[#38BDF8] hover:underline font-bold"
              >
                Inscrivez-vous ici
              </button>
            </span>
          ) : (
            <span>
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-[#38BDF8] hover:underline font-bold"
              >
                Connectez-vous
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
