import React from 'react';
import { Trophy, ShieldAlert, Github, Twitter, Disc as Discord } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="footer"
      className="relative bg-[#020408] border-t border-[#1E293B] pt-16 pb-12 px-6 lg:px-12 select-none"
      aria-label="Pied de page"
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#1E293B]">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy size={20} />
            </div>
            <div>
              <span className="text-base font-black font-cinzel text-white tracking-wider block">
                PIF TRADING ARENA
              </span>
              <span className="text-xs text-slate-500 font-sans">
                Simulation Boursière E-Sport & Replay Historique Multijoueur
              </span>
            </div>
          </div>

          {/* Liens rapides */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
            <a href="#hero" className="hover:text-amber-400 transition-colors">Portail</a>
            <a href="#presentation" className="hover:text-amber-400 transition-colors">Présentation</a>
            <a href="#comment-ca-marche" className="hover:text-amber-400 transition-colors">Arènes</a>
            <a href="#rangs" className="hover:text-amber-400 transition-colors">Rangs ELO</a>
            <a href="#outils" className="hover:text-amber-400 transition-colors">Outils Pro</a>
            <a href="#ia" className="hover:text-amber-400 transition-colors">Mode PAUSE IA</a>
          </div>
        </div>

        {/* ⚠️ Mention légale pédagogique obligatoire */}
        <div className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/30 flex items-start gap-3.5 text-xs text-slate-300">
          <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Avertissement Légal & Décharge Éducative :</strong> PIF Trading Arena est un environnement de simulation boursière et d’e-sport financier conçu à des fins strictement pédagogiques, analytiques et de divertissement. Aucun argent réel n'est engagé, collecté ou redistribué. Les performances passées rejouées ne préjugent en rien des résultats réels futurs sur les marchés financiers.
          </p>
        </div>

        {/* Copyright & Réseaux */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <span>© {currentYear} PIF Trading Arena · Tous droits réservés.</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="hover:text-white transition-colors cursor-pointer">Conditions d’Utilisation</span>
            <span>·</span>
            <span className="hover:text-white transition-colors cursor-pointer">Confidentialité</span>
            <span>·</span>
            <span className="hover:text-white transition-colors cursor-pointer">Code Source (Adem)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
