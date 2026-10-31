import React, { useState, useEffect } from 'react';
import { Layers, ArrowDownUp } from 'lucide-react';
import { getRealOrderBook } from '../services/realMarketService';

export default function OrderBookTape({ selectedAsset, price }) {
  const [activeTab, setActiveTab] = useState('BOOK'); // 'BOOK' ou 'TRADES'
  const [orderBook, setOrderBook] = useState(null);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (!selectedAsset) return;

    let isMounted = true;
    getRealOrderBook(selectedAsset.ticker, price).then((book) => {
      if (!isMounted) return;
      setOrderBook(book);

      const isCrypto = selectedAsset.category === 'CRYPTO';
      const initialTrades = [];
      const now = new Date();
      for (let i = 0; i < 15; i++) {
        const time = new Date(now.getTime() - i * 3500);
        const side = i % 2 === 0 ? 'BUY' : 'SELL';
        const delta = (i % 3 === 0 ? 0.05 : -0.05) * (isCrypto ? 10.0 : 0.05);
        initialTrades.push({
          id: `tr-${selectedAsset.ticker}-${i}`,
          time: time.toTimeString().split(' ')[0],
          price: parseFloat((Number(price || selectedAsset.price) + delta).toFixed(isCrypto ? 2 : 3)),
          size: isCrypto ? parseFloat((0.25 + i * 0.1).toFixed(3)) : (100 + i * 50),
          side
        });
      }
      setTrades(initialTrades);
    }).catch(err => console.warn('Orderbook fallback:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedAsset, price]);

  if (!orderBook) return null;

  return (
    <aside className="w-80 bg-[#0F172A] border-l border-[#1E293B] flex flex-col h-full select-none">
      {/* Sélecteur d'onglets */}
      <div className="flex border-b border-[#1E293B] bg-[#0B0F19]">
        <button
          onClick={() => setActiveTab('BOOK')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'BOOK'
              ? 'text-[#38BDF8] border-b-2 border-[#38BDF8] bg-[#0F172A]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={13} /> Carnet d'Ordres
        </button>
        <button
          onClick={() => setActiveTab('TRADES')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'TRADES'
              ? 'text-[#38BDF8] border-b-2 border-[#38BDF8] bg-[#0F172A]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownUp size={13} /> Derniers Trades
        </button>
      </div>

      {activeTab === 'BOOK' ? (
        <div className="flex-1 flex flex-col p-2 text-[11px] font-mono overflow-hidden">
          <div className="grid grid-cols-3 text-slate-400 font-semibold px-2 py-1 text-[10px] uppercase">
            <span>Prix ({selectedAsset.currency})</span>
            <span className="text-right">Taille</span>
            <span className="text-right">Total</span>
          </div>

          <div className="flex-1 flex flex-col justify-end space-y-0.5 overflow-hidden">
            {orderBook.asks.slice(-7).map((ask, idx) => (
              <div
                key={`ask-${idx}`}
                className="relative grid grid-cols-3 px-2 py-0.5 hover:bg-[#1E293B] rounded cursor-pointer"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500/10 rounded-r pointer-events-none"
                  style={{ width: `${ask.depthPercent}%` }}
                />
                <span className="text-[#EF4444] font-medium z-10">{ask.price}</span>
                <span className="text-right text-slate-300 z-10">{ask.size}</span>
                <span className="text-right text-slate-400 z-10">{ask.total}</span>
              </div>
            ))}
          </div>

          <div className="my-2 py-1.5 px-3 bg-[#1E293B] border-y border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">
                {Number(selectedAsset.price).toLocaleString(undefined, {
                  minimumFractionDigits: selectedAsset.currency === 'TND' ? 3 : 2
                })}
              </span>
              <span className="text-[10px] text-slate-400">{selectedAsset.currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Spread: <strong className="text-slate-200">{orderBook.spread}</strong> ({orderBook.spreadPercent}%)
            </div>
          </div>

          <div className="flex-1 space-y-0.5 overflow-hidden">
            {orderBook.bids.slice(0, 7).map((bid, idx) => (
              <div
                key={`bid-${idx}`}
                className="relative grid grid-cols-3 px-2 py-0.5 hover:bg-[#1E293B] rounded cursor-pointer"
              >
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 rounded-r pointer-events-none"
                  style={{ width: `${bid.depthPercent}%` }}
                />
                <span className="text-[#10B981] font-medium z-10">{bid.price}</span>
                <span className="text-right text-slate-300 z-10">{bid.size}</span>
                <span className="text-right text-slate-400 z-10">{bid.total}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-2 text-[11px] font-mono overflow-y-auto">
          <div className="grid grid-cols-3 text-slate-400 font-semibold px-2 py-1 text-[10px] uppercase border-b border-[#1E293B]">
            <span>Prix ({selectedAsset.currency})</span>
            <span className="text-right">Taille</span>
            <span className="text-right">Heure</span>
          </div>

          <div className="divide-y divide-[#1E293B]/50 mt-1">
            {trades.map((trade) => {
              const isBuy = trade.side === 'BUY';
              return (
                <div key={trade.id} className="grid grid-cols-3 px-2 py-1 hover:bg-[#1E293B] transition-colors">
                  <span className={`font-semibold ${isBuy ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {trade.price}
                  </span>
                  <span className="text-right text-slate-300">{trade.size}</span>
                  <span className="text-right text-slate-400">{trade.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="px-3 py-2 border-t border-[#1E293B] text-[10px] text-slate-500 leading-snug">
        Carnet et trades simulés autour du cours de la date simulée : la BVMT ne publie pas l'historique du carnet d'ordres.
      </p>
    </aside>
  );
}
