import React from 'react';
import { Trophy, Shield, Sparkles } from 'lucide-react';

export default function BootstrapLoader({ message = "Initialisation de l'Arène Boursière..." }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080C14] text-slate-100 select-none overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute w-[400px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      {/* Center Shield / Trophy Brand Icon */}
      <div className="relative flex flex-col items-center gap-6 z-10 animate-fade-in">
        <div className="relative">
          {/* Animated Ring */}
          <div className="w-24 h-24 rounded-3xl border-2 border-amber-500/30 flex items-center justify-center bg-gradient-to-br from-[#0B1120] to-[#1E293B] shadow-2xl shadow-amber-950/40 relative">
            <Trophy size={42} className="text-amber-400 animate-bounce duration-1000" />
            <div className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 text-black shadow-lg">
              <Sparkles size={12} />
            </div>
          </div>
          {/* Rotating halo */}
          <div className="absolute inset-0 rounded-3xl border border-amber-400/40 animate-ping opacity-30 pointer-events-none" />
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-widest text-white">
              PIF TRADING ARENA
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              PROD
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-tight mt-1">
            Simulation Boursière E-Sport · Replay BVMT Synchronisé
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="flex flex-col items-center gap-2 w-64 mt-2">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-400 rounded-full animate-pulse w-3/4" />
          </div>
          <p className="text-[11px] font-mono text-slate-400 animate-pulse">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

