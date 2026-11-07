import React, { useState } from 'react';
import { Trophy, Users, Clock, Zap, ArrowRight, Shield, Play, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEMO_ARENAS = [
  {
    id: 'PIF-7842',
    name: 'Tournoi Élite Tunindex 2024',
    period: '01/01/2022 → 31/12/2023',
    initialCash: '100 000 TND',
    duration: '15 min (Compétition)',
    tickRate: '1 sec = 1 jour',
    players: '7 / 8 Joueurs',
    status: 'RUNNING',
    statusLabel: 'En Cours (Live)',
    statusColor: 'emerald',
    tier: 'DIAMOND',
    topTrader: 'Sami_BVMT (+18.4%)'
  },
  {
    id: 'PIF-3624',
    name: 'Arène Scalping SFBT & BIAT',
    period: '01/06/2023 → 31/12/2023',
    initialCash: '50 000 TND',
    duration: '10 min (Blitz)',
    tickRate: '500 ms = 1 jour',
    players: '4 / 8 Joueurs',
    status: 'LOBBY',
    statusLabel: 'Salle d\'Attente',
    statusColor: 'sky',
    tier: 'GOLD',
    topTrader: 'En attente du départ...'
  },
  {
    id: 'PIF-9410',
    name: 'Défi Risque & Crash 2022',
    period: '01/01/2022 → 30/06/2022',
    initialCash: '250 000 TND',
    duration: '20 min (Master)',
    tickRate: '1 sec = 1 jour',
    players: '6 / 8 Joueurs',
    status: 'RUNNING',
    statusLabel: 'En Cours (Live)',
    statusColor: 'emerald',
    tier: 'MASTER',
    topTrader: 'Yassine_Quant (+12.1%)'
  }
];

export default function TradingArenaPreview() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section id="arenas" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
      {/* Header de Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#1E293B] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <Trophy size={13} />
            <span>Multijoueur Temps Réel</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Arènes Compétitives BVMT
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-2 max-w-xl">
            Rejoignez des salons de trading multijoueur synchronisés. Même historique, mêmes cours réels de la Bourse de Tunis, décisions d'ordres indépendantes.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-slate-950 transition-all shadow-lg shadow-emerald-950/40 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <span>Accéder au Lobby des Salles</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Cartes d'arènes démonstration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEMO_ARENAS.map((arena) => {
          const isHovered = hoveredCard === arena.id;
          return (
            <div
              key={arena.id}
              onMouseEnter={() => setHoveredCard(arena.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`relative bg-[#0B1120] border-2 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between gap-6 ${
                isHovered
                  ? 'border-emerald-500/80 -translate-y-1.5 shadow-2xl shadow-emerald-950/50'
                  : 'border-[#1E293B] hover:border-slate-700 shadow-xl'
              }`}
            >
              {/* Entête de carte */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-[#080C14] px-2.5 py-1 rounded-lg border border-[#1E293B]">
                    {arena.id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      arena.status === 'RUNNING'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${arena.status === 'RUNNING' ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} />
                    {arena.statusLabel}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-wide">
                  {arena.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Replay : {arena.period}
                </p>
              </div>

              {/* Paramètres de match */}
              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#080C14] border border-[#1E293B]/70 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Capital</span>
                  <span className="font-bold text-emerald-400 font-mono">{arena.initialCash}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Durée</span>
                  <span className="font-bold text-slate-200 font-mono">{arena.duration}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Vitesse</span>
                  <span className="font-bold text-amber-400 font-mono">{arena.tickRate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Participants</span>
                  <span className="font-bold text-sky-400 font-mono">{arena.players}</span>
                </div>
              </div>

              {/* Leader en direct */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[11px] text-slate-400">Leader actuel :</span>
                <span className="font-bold font-mono text-emerald-400">{arena.topTrader}</span>
              </div>

              {/* Bouton d'action */}
              <button
                onClick={() => navigate('/login')}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isHovered
                    ? 'bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950 shadow-md shadow-emerald-950'
                    : 'bg-[#1E293B] hover:bg-slate-700 text-white'
                }`}
              >
                <span>Rejoindre l'Arène</span>
                <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

