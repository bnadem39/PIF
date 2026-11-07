import React from 'react';
import { ArrowRight, UserPlus, LogIn, Sparkles, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Landing3DMotif from './Landing3DMotif';

export default function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-6 lg:px-12 max-w-7xl mx-auto">
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#0B1120] to-[#080C14] border-2 border-amber-500/30 rounded-3xl p-8 sm:p-12 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Glow de fond */}
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Texte et CTAs */}
        <div className="max-w-2xl relative z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-4">
            <Sparkles size={13} />
            <span>Rejoignez l'Élite Boursière</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Votre prochaine progression commence ici.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-xl leading-relaxed">
            Rejoignez les arènes, développez vos compétences et construisez votre carrière de trader dans un univers multijoueur compétitif.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mt-8">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 flex items-center justify-center gap-2 shadow-2xl shadow-amber-950/60 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Créer mon compte</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold bg-[#1E293B] hover:bg-slate-700 text-white flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
            >
              <LogIn size={15} />
              <span>Se connecter</span>
            </button>
          </div>
        </div>

        {/* Motif 3D compact officiel */}
        <div className="relative z-10 shrink-0">
          <Landing3DMotif compact={true} size={220} />
        </div>
      </div>
    </section>
  );
}

