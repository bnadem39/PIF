import React from 'react';
import { Flame, Trophy, Crown, ArrowRight, Clock, Star, Award, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SEASON_LEADERBOARD = [
  { rank: 1, name: 'adem', tier: 'DIAMOND', elo: 1958, winRate: '86%', pnl: '+32.4%' },
  { rank: 2, name: 'khalil_quant', tier: 'GOLD', elo: 1840, winRate: '78%', pnl: '+24.1%' },
  { rank: 3, name: 'sarah_trader', tier: 'GOLD', elo: 1720, winRate: '71%', pnl: '+18.9%' }
];

export default function TradingSeasonPreview() {
  const navigate = useNavigate();

  return (
    <section id="seasons" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#1E293B] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <Flame size={13} />
            <span>Compétition E-Sport BVMT</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Saisons Compétitives & Classement
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Participez aux saisons régulières. Cumulez des victoires, grimpez le classement ELO national des traders et décrochez les récompenses exclusives du Champion Pass.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 transition-all shadow-lg shadow-rose-950/40 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <span>Consulter la Saison 1</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Carte Saison & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1 & 2 : Bannière Saison */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#0F172A] via-[#0B1120] to-[#080C14] border-2 border-rose-500/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-6 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                <Flame size={14} />
                Saison 1 Officielle
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                L'Envol des Champions BVMT
              </h3>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono shrink-0">
              <Clock size={14} className="text-amber-400" />
              <span>Fin de saison dans 18 jours</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            Les arènes classées sont ouvertes 24h/24. Chaque victoire contre des traders de niveau supérieur propulse votre cote ELO vers le rang Master.
          </p>

          {/* Récompenses de Saison */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#1E293B]">
            <div className="p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]">
              <span className="text-[10px] text-slate-400 font-mono block">Cagnotte Virtuelle</span>
              <span className="text-sm font-black text-emerald-400 font-mono">500 000 TND</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]">
              <span className="text-[10px] text-slate-400 font-mono block">Récompense Top 1</span>
              <span className="text-sm font-black text-amber-400 font-mono">Trophée Or Légendaire</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]">
              <span className="text-[10px] text-slate-400 font-mono block">Champion Pass</span>
              <span className="text-sm font-black text-purple-400 font-mono">Skin Néon Inclus</span>
            </div>
          </div>
        </div>

        {/* Colonne 3 : Top 3 Leaderboard */}
        <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl p-6 flex flex-col justify-between gap-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Crown size={15} className="text-amber-400" />
              Top Traders Nationaux
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE ELO</span>
          </div>

          <div className="space-y-3">
            {SEASON_LEADERBOARD.map((trader) => (
              <div
                key={trader.rank}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#080C14] border border-[#1E293B] hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs font-mono ${
                      trader.rank === 1
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : trader.rank === 2
                        ? 'bg-slate-300/20 text-slate-300 border border-slate-300/40'
                        : 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                    }`}
                  >
                    #{trader.rank}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{trader.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{trader.tier} · Winrate {trader.winRate}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-amber-400 font-mono block">{trader.elo} ELO</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{trader.pnl}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all text-center cursor-pointer"
          >
            Voir le Classement Complet →
          </button>
        </div>
      </div>
    </section>
  );
}

