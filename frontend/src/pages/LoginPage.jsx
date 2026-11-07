import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { loginUser } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Veuillez saisir votre email/pseudonyme et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await loginUser(identifier.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
      navigate('/lobby', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Identifiants invalides. Vérifiez vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (email, pass) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full bg-[#080C14] text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Bar with Brand Link */}
      <header className="p-6 flex items-center justify-between border-b border-[#1E293B] bg-[#0B1120]/50 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-all">
            <Trophy size={19} />
          </div>
          <div>
            <span className="text-sm font-black tracking-wider text-white">PIF TRADING ARENA</span>
            <p className="text-[10px] text-slate-400 font-mono">Retour à l'accueil</p>
          </div>
        </Link>
        <Link
          to="/register"
          className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          Créer un compte →
        </Link>
      </header>

      {/* Main Center Form Card */}
      <main className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

        <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
              <Trophy size={24} />
            </div>
            <h2 className="text-xl font-black text-white mt-2">Accès Salon Trader</h2>
            <p className="text-xs text-slate-400 font-mono">
              Connectez-vous pour retrouver votre profil et vos arènes
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Email ou Pseudonyme
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ex: adem@gmail.com ou adem"
                  className="w-full bg-[#080C14] border border-[#1E293B] focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all pl-10"
                />
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Mot de Passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080C14] border border-[#1E293B] focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all pl-10 pr-10"
                />
                <Lock size={15} className="absolute left-3.5 top-3 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Se souvenir de moi</span>
              </label>
              <span className="text-slate-500 hover:text-slate-400 cursor-pointer text-[11px]">
                Mot de passe oublié ?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrer dans l'Arène</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pre-fill Pill */}
          <div className="pt-4 border-t border-[#1E293B] flex flex-col gap-2">
            <span className="text-[11px] font-mono text-slate-500 text-center">
              Comptes de test préconfigurés :
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('adem@gmail.com', 'Adem2026!')}
                className="flex-1 p-2 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] text-[11px] text-slate-300 font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Charger Adem (Niveau 25 - Diamond)"
              >
                <UserCheck size={13} className="text-amber-400" />
                <span>Adem (Niv. 25)</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin@pif.com', 'Admin2026!')}
                className="flex-1 p-2 rounded-xl bg-[#080C14] hover:bg-slate-800 border border-[#1E293B] text-[11px] text-slate-300 font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Charger Administrateur"
              >
                <Lock size={13} className="text-emerald-400" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400">
            Nouveau sur la plateforme ?{' '}
            <Link to="/register" className="text-amber-400 hover:underline font-bold">
              Créer mon compte trader
            </Link>
          </p>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-600 border-t border-[#1E293B]">
        PIF Trading Arena · Authentification Sécurisée JWT
      </footer>
    </div>
  );
}

