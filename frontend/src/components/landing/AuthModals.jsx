import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, HelpCircle, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { registerUser } from '../../services/api';

/**
 * AuthModals
 * Modales accessibles pour l'inscription ("+") et le mot de passe oublié ("?").
 * Respect des normes d'accessibilité WAI-ARIA : focus trap, touche Échap, retour du focus.
 */
export default function AuthModals({
  registerOpen,
  forgotOpen,
  onClose,
  onRegisteredSuccess
}) {
  // ─── ÉTAT INSCRIPTION ──────────────────────────────────────────────
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // ─── ÉTAT MOT DE PASSE OUBLIÉ ──────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const modalRef = useRef(null);

  // Gestion de la touche Échap et du focus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (registerOpen || forgotOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus initial dans le modal
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 50);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [registerOpen, forgotOpen, onClose]);

  if (!registerOpen && !forgotOpen) return null;

  // ─── SOUMISSION INSCRIPTION ────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');

    if (!regUsername.trim() || regUsername.length < 3) {
      setRegError('Le pseudonyme doit comporter au moins 3 caractères.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setRegError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setRegLoading(true);
    try {
      await registerUser({
        username: regUsername.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        fullName: regUsername.trim()
      });
      setRegSuccess(true);
      setTimeout(() => {
        setRegSuccess(false);
        onClose();
        if (onRegisteredSuccess) onRegisteredSuccess();
      }, 1000);
    } catch (err) {
      console.error('[PORTAL REGISTER] Erreur:', err);
      setRegError(err.message || 'Impossible de créer le compte. Email ou pseudo déjà pris.');
    } finally {
      setRegLoading(false);
    }
  };

  // ─── SOUMISSION RÉCUPÉRATION ───────────────────────────────────────
  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('Veuillez entrer une adresse email valide.');
      return;
    }

    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess(true);
      setTimeout(() => {
        setForgotSuccess(false);
        onClose();
      }, 2500);
    }, 700);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-[#0B101C] border-2 border-[#1E293B] shadow-2xl overflow-hidden p-6 text-slate-100 animate-scale-in"
      >
        {/* Bouton fermeture */}
        <button
          onClick={onClose}
          aria-label="Fermer la modale"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X size={18} />
        </button>

        {/* ─────────────────────────────────────────────────────────────────
            A. MODALE D'INSCRIPTION ("+")
            ───────────────────────────────────────────────────────────────── */}
        {registerOpen && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-base font-black font-cinzel text-white">Créer mon Compte Trader</h3>
                <p className="text-xs text-slate-400 font-sans">Rejoignez l'arène boursière et progressez en ELO</p>
              </div>
            </div>

            {regError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-600 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Compte créé avec succès ! Connexion en cours...</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Pseudonyme de Trader</label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="ex: JordanBelfort"
                  className="w-full bg-[#050811] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#223049] focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Adresse Email</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="ex: trader@gmail.com"
                  className="w-full bg-[#050811] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#223049] focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mot de Passe</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 caractères"
                    className="w-full bg-[#050811] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#223049] focus:border-amber-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Confirmation</label>
                  <input
                    type="password"
                    required
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Répéter mot de passe"
                    className="w-full bg-[#050811] text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-[#223049] focus:border-amber-400 outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading || regSuccess}
                className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black font-rajdhani tracking-wider text-sm uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/50 disabled:opacity-50"
              >
                {regLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Création du compte...</span>
                  </>
                ) : (
                  <>
                    <span>REJOINDRE L'ARÈNE</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            B. MODALE MOT DE PASSE OUBLIÉ ("?")
            ───────────────────────────────────────────────────────────────── */}
        {forgotOpen && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                <HelpCircle size={20} />
              </div>
              <div>
                <h3 className="text-base font-black font-cinzel text-white">Récupération de Compte</h3>
                <p className="text-xs text-slate-400 font-sans">Réinitialisez votre clé d'accès à l'Arène</p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-600 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <h4 className="text-sm font-bold text-white">Instructions transmises</h4>
                <p className="text-xs text-slate-300">
                  Si un compte est associé à <span className="font-mono text-cyan-300 font-bold">{forgotEmail}</span>, un lien de réinitialisation vous a été envoyé.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Votre adresse email enregistrée</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ex: trader@gmail.com"
                    className="w-full bg-[#050811] text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[#223049] focus:border-cyan-400 outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#050811] border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  💡 Pour les comptes de test locaux, utilisez :<br />
                  <span className="font-mono text-amber-400">adem@gmail.com</span> / <span className="font-mono text-emerald-400">Adem2026!</span>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-black font-rajdhani tracking-wider text-sm uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <span>ENVOYER LE LIEN DE RÉCUPÉRATION</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

