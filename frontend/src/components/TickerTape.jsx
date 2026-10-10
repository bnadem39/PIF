import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getRealIndices } from '../services/realMarketService';

export default function TickerTape() {
  const [indices, setIndices] = useState([
    { symbol: 'S&P 500', name: 'US Index', value: 5780.40, change: 17.80, changePercent: 0.31, currency: 'USD' },
    { symbol: 'TUNINDEX', name: 'Bourse de Tunis', value: 9845.20, change: 41.35, changePercent: 0.42, currency: 'PTS' },
    { symbol: 'BTC/USD', name: 'Bitcoin Real', value: 64500.00, change: 1360.00, changePercent: 2.15, currency: 'USD' },
    { symbol: 'EUR/TND', name: 'Euro / Dinar', value: 3.3420, change: -0.0018, changePercent: -0.05, currency: 'TND' },
    { symbol: 'USD/TND', name: 'Dollar / Dinar', value: 3.0850, change: 0.0035, changePercent: 0.11, currency: 'TND' }
  ]);

  useEffect(() => {
    getRealIndices().then(data => {
      if (data && data.length > 0) setIndices(data);
    }).catch(err => console.warn('Indices fallback:', err));
  }, []);

  return (
    <div className="bg-[#0F172A] border-b border-[#1E293B] text-xs h-9 flex items-center px-4 overflow-x-auto no-scrollbar select-none">
      <div className="flex items-center gap-2 pr-4 border-r border-[#334155] text-[#38BDF8] font-semibold shrink-0">
        <Activity size={14} className="animate-pulse" />
        <span className="tracking-wider uppercase text-[10px]">Alpha Vantage &amp; Marchés</span>
      </div>

      <div className="flex items-center gap-6 pl-4 whitespace-nowrap">
        {indices.map((index) => {
          const isPositive = index.changePercent >= 0;
          return (
            <div key={index.symbol} className="flex items-center gap-2 hover:bg-[#1E293B] px-2 py-0.5 rounded cursor-pointer transition-colors">
              <span className="font-semibold text-[#F8FAFC]">{index.symbol}</span>
              <span className="font-mono text-slate-300">
                {Number(index.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
              </span>
              <span
                className={`flex items-center font-mono font-medium ${
                  isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}
              >
                {isPositive ? <TrendingUp size={11} className="mr-0.5" /> : <TrendingDown size={11} className="mr-0.5" />}
                {isPositive ? '+' : ''}{Number(index.changePercent).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
