import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const TICKER_ITEMS = [
  { symbol: 'BTC/USD', price: '$89,450.00', change: '+3.42%', up: true },
  { symbol: 'ETH/USD', price: '$3,180.20', change: '-1.18%', up: false },
  { symbol: 'EUR/USD', price: '1.0845', change: '+0.22%', up: true },
  { symbol: 'AAPL', price: '$224.80', change: '+1.85%', up: true },
  { symbol: 'TSLA', price: '$268.10', change: '-2.40%', up: false },
  { symbol: 'OR (XAU)', price: '$2,685.50', change: '+0.65%', up: true },
  { symbol: 'TUNINDEX', price: '9,842.15', change: '+0.48%', up: true },
  { symbol: 'BIAT', price: '104.50 TND', change: '+1.12%', up: true },
  { symbol: 'SFBT', price: '12.80 TND', change: '-0.35%', up: false },
  { symbol: 'ATTIJARI', price: '52.00 TND', change: '+0.77%', up: true }
];

export default function Ticker() {
  // Concaténation double pour défilement infini sans coupure
  const displayList = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div 
      className="w-full max-w-full bg-[#05070D]/95 border-y border-[#1E293B]/80 py-2 overflow-hidden select-none relative z-20 backdrop-blur-md"
      aria-label="Ticker boursier en direct"
    >
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#05070D] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#05070D] to-transparent z-10 pointer-events-none" />

      <div className="animate-ticker-marquee flex items-center gap-8">
        {displayList.map((item, index) => {
          const isUp = item.up;
          return (
            <div 
              key={`${item.symbol}-${index}`}
              className="flex items-center gap-2 text-xs font-mono shrink-0 px-2 group cursor-default"
            >
              <span className="font-bold text-slate-300 group-hover:text-white transition-colors">
                {item.symbol}
              </span>
              <span className="text-slate-100 font-semibold">{item.price}</span>
              <span 
                className={`flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  isUp 
                    ? 'text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30' 
                    : 'text-[#FF3D57] bg-[#FF3D57]/10 border border-[#FF3D57]/30'
                }`}
              >
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                <span>{item.change}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
