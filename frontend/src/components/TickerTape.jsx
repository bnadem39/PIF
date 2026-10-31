import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { getRealIndices } from '../services/realMarketService';

/**
 * Bandeau de marché à la date simulée : indice BVMT équipondéré calculé par PIF, crypto-actifs et étendue
 * du marché (titres en hausse / en baisse), tous issus des historiques locaux.
 */
export default function TickerTape({ simulatedDate }) {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      getRealIndices(simulatedDate)
        .then((data) => { if (!cancelled) setOverview(data); })
        .catch((err) => console.warn('Vue de marché indisponible :', err.message));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [simulatedDate]);

  const breadth = overview?.breadth;
  return (
    <div className="bg-[#0F172A] border-b border-[#1E293B] text-xs h-9 flex items-center px-4 overflow-x-auto no-scrollbar select-none">
      <div className="flex items-center gap-2 pr-4 border-r border-[#334155] text-[#38BDF8] font-semibold shrink-0">
        <Activity size={14} />
        <span className="tracking-wider uppercase text-[10px]">Marché au {overview?.date || simulatedDate || '…'}</span>
      </div>

      <div className="flex items-center gap-6 pl-4 whitespace-nowrap">
        {(overview?.tiles || []).map((tile) => {
          const isPositive = tile.changePercent >= 0;
          return (
            <div key={tile.symbol} title={tile.name} className="flex items-center gap-2 px-2 py-0.5 rounded">
              <span className="font-semibold text-[#F8FAFC]">{tile.symbol}</span>
              <span className="font-mono text-slate-300">
                {Number(tile.value).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center font-mono font-medium ${isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {isPositive ? <TrendingUp size={11} className="mr-0.5" /> : <TrendingDown size={11} className="mr-0.5" />}
                {isPositive ? '+' : ''}{Number(tile.changePercent).toFixed(2)}%
              </span>
            </div>
          );
        })}
        {breadth && breadth.advancers + breadth.decliners + breadth.unchanged > 0 && (
          <div className="flex items-center gap-2 px-2 py-0.5 text-slate-400" title="Actions BVMT ayant coté ce jour">
            <span className="font-semibold text-[#F8FAFC]">BVMT</span>
            <span className="font-mono text-[#10B981]">▲ {breadth.advancers}</span>
            <span className="font-mono text-[#EF4444]">▼ {breadth.decliners}</span>
            <span className="font-mono">= {breadth.unchanged}</span>
            {breadth.topGainer && (
              <span className="font-mono">· meilleure : {breadth.topGainer} {breadth.topGainerPct > 0 ? '+' : ''}{breadth.topGainerPct}%</span>
            )}
            {breadth.topLoser && (
              <span className="font-mono">· pire : {breadth.topLoser} {breadth.topLoserPct}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
