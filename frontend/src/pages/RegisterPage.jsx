import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { registerUser } from '../services/api';

export default function RegisterPage({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (username.trim().length < 3) {
      setErrorMsg('Le pseudonyme doit comporter au moins 3 caractères.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    if (!acceptTerms) {
      setErrorMsg('Vous devez accepter le règlement de simulation de trading.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await registerUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        fullName: fullName.trim() || username.trim(),
        password
      });

      if (onRegisterSuccess) {
        onRegisterSuccess(data);
      }
      navigate('/lobby', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Échec de l'inscription. Vérifiez vos informations.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080C14] text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
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
          to="/login"
          className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          Déjà un compte ? Connexion →
        </Link>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

        <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl p-8 max-w-lg w-full shadow-2xl relative z-10 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
              <Sparkles size={24} />
            </div>
            <h2 className="text-xl font-black text-white mt-2">Créer un Compte Trader</h2>
            <p className="text-xs text-slate-400 font-mono">
              Rejoignez l'arène boursière e-sport avec 100 000 TND de capital virtuel
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Pseudonyme (Unique) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex: TraderPro"
                    className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all pl-10"
                  />
                  <User size={15} className="absolute left-3.5 top-3 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nom Complet (Optionnel)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Flen Ben Foulen"
                  className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Adresse Email *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@exemple.com"
                  className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all pl-10"
                />
                <Mail size={15} className="absolute left-3.5 top-3 text-slate-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Mot de Passe (min 6 car.) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all pl-10 pr-9"
                  />
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Confirmer le Mot de Passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all pl-10"
                  />
                  <Lock size={15} className="absolute left-3.5 top-3 text-slate-500" />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>
                J'accepte les conditions de compétition sportive et le règlement de simulation d'ordres BVMT.
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Créer mon Compte & Recevoir 100k TND</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 pt-2 border-t border-[#1E293B]">
            Vous possédez déjà un compte ?{' '}
            <Link to="/login" className="text-emerald-400 hover:underline font-bold">
              Se connecter au salon
            </Link>
          </p>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-600 border-t border-[#1E293B]">
        PIF Trading Arena · Inscription Trader Individuelle Sécurisée
      </footer>
    </div>
  );
}

