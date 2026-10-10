import React, { useState, useEffect } from 'react';
import { Wallet, DollarSign, TrendingUp, Radio, ShieldCheck } from 'lucide-react';

export default function AccountSummaryFooter({ cashBalance, portfolioValue, dailyPnL, dailyPnLPercent }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isPnLPositive = dailyPnL >= 0;

  return (
    <footer className="h-10 bg-[#0B0F19] border-t border-[#1E293B] px-4 flex items-center justify-between text-xs font-mono select-none">
      {/* Statistiques Financières du Compte */}
      <div className="flex items-center gap-6">
        {/* Solde Cash */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Wallet size={14} className="text-[#38BDF8]" />
          <span className="text-slate-400 text-[10px] uppercase">Cash Dispo:</span>
          <span className="font-bold text-slate-100">
            {cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND
          </span>
        </div>

        {/* Valeur Totale Portefeuille */}
        <div className="flex items-center gap-1.5 text-slate-300 border-l border-[#1E293B] pl-4">
          <DollarSign size={14} className="text-emerald-400" />
          <span className="text-slate-400 text-[10px] uppercase">Valeur Totale:</span>
          <span className="font-bold text-slate-100">
            {portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND
          </span>
        </div>

        {/* P&L du Jour */}
        <div className="flex items-center gap-1.5 border-l border-[#1E293B] pl-4">
          <TrendingUp size={14} className={isPnLPositive ? 'text-[#10B981]' : 'text-[#EF4444]'} />
          <span className="text-slate-400 text-[10px] uppercase">P&L Jour:</span>
          <span className={`font-bold ${isPnLPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {isPnLPositive ? '+' : ''}{dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TND
            {' '}({isPnLPositive ? '+' : ''}{dailyPnLPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Statut Système & Horloge */}
      <div className="flex items-center gap-5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 bg-[#0F172A] border border-[#1E293B] px-2 py-0.5 rounded">
          <Radio size={12} className="text-[#10B981] animate-pulse" />
          <span className="text-slate-300 font-medium">WS Live: STOMP Connected</span>
        </div>

        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-[#38BDF8]" />
          <span>Pré-Trade Risk: ACTIF</span>
        </div>

        <div className="text-slate-300 font-semibold border-l border-[#1E293B] pl-4">
          {time}
        </div>
      </div>
    </footer>
  );
}
