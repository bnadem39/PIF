import React, { useState } from 'react';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function QuickOrderWidget({ selectedAsset, cashBalance, onExecuteOrder }) {
  const [side, setSide] = useState('BUY'); // 'BUY' ou 'SELL'
  const [orderType, setOrderType] = useState('LIMIT'); // 'MARKET', 'LIMIT', 'STOP'
  const [quantity, setQuantity] = useState('10');
  const [limitPrice, setLimitPrice] = useState(selectedAsset.price.toString());
  const [feedback, setFeedback] = useState(null);

  // Mise à jour du prix limite quand l'actif change
  React.useEffect(() => {
    setLimitPrice(selectedAsset.price.toString());
  }, [selectedAsset]);

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = orderType === 'MARKET' ? selectedAsset.price : (parseFloat(limitPrice) || 0);
  const grossAmount = qtyNum * priceNum;
  const fee = grossAmount * 0.0015; // 0.15% de frais de courtage BVMT
  const totalAmount = side === 'BUY' ? grossAmount + fee : grossAmount - fee;
  const hasEnoughCash = side === 'SELL' || totalAmount <= cashBalance;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (qtyNum <= 0) {
      setFeedback({ type: 'error', message: 'Veuillez saisir une quantité strictement positive.' });
      return;
    }
    if (side === 'BUY' && !hasEnoughCash) {
      setFeedback({ type: 'error', message: 'Fonds insuffisants : contrôle pré-trade rejeté.' });
      return;
    }

    const order = {
      ticker: selectedAsset.ticker,
      side,
      orderType,
      quantity: qtyNum,
      price: priceNum,
      total: totalAmount,
      timestamp: new Date().toISOString()
    };

    if (onExecuteOrder) {
      onExecuteOrder(order);
    }

    setFeedback({
      type: 'success',
      message: `Ordre ${side} ${qtyNum} ${selectedAsset.ticker} exécuté avec succès !`
    });

    setTimeout(() => setFeedback(null), 3500);
  };

  const handlePercentage = (pct) => {
    if (priceNum <= 0) return;
    const maxAffordableQty = Math.floor((cashBalance * (pct / 100)) / (priceNum * 1.0015));
    setQuantity(Math.max(1, maxAffordableQty).toString());
  };

  return (
    <div className="bg-[#0F172A] border-t border-[#1E293B] p-3 text-xs select-none">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center justify-between gap-4">
        {/* Sélecteur Achat / Vente */}
        <div className="flex bg-[#1E293B] p-0.5 rounded border border-[#334155]">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`px-4 py-1.5 rounded font-bold transition-colors ${
              side === 'BUY' ? 'bg-[#10B981] text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ACHAT
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`px-4 py-1.5 rounded font-bold transition-colors ${
              side === 'SELL' ? 'bg-[#EF4444] text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VENTE
          </button>
        </div>

        {/* Type d'ordre */}
        <div className="flex items-center gap-1.5 bg-[#1E293B] p-0.5 rounded border border-[#334155]">
          {['LIMIT', 'MARKET', 'STOP'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                orderType === type ? 'bg-[#38BDF8] text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Inputs : Prix et Quantité */}
        <div className="flex items-center gap-3">
          {orderType !== 'MARKET' && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] text-slate-400 font-semibold uppercase">Prix</label>
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-24 bg-[#1E293B] border border-[#334155] rounded px-2 py-1 font-mono text-slate-100 focus:outline-none focus:border-[#38BDF8]"
              />
              <span className="text-[10px] text-slate-400">{selectedAsset.currency}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] text-slate-400 font-semibold uppercase">Qté</label>
            <input
              type="number"
              step="any"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 bg-[#1E293B] border border-[#334155] rounded px-2 py-1 font-mono text-slate-100 focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          {/* Raccourcis de pourcentage du cash */}
          <div className="flex items-center gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentage(pct)}
                className="bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-[10px] px-1.5 py-1 rounded font-mono border border-[#334155]"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Synthèse du Montant & Bouton de Soumission */}
        <div className="flex items-center gap-4">
          <div className="text-right font-mono text-xs">
            <div className="text-[10px] text-slate-400 uppercase">
              Total estimé (Frais: {fee.toFixed(2)})
            </div>
            <div className={`font-bold ${!hasEnoughCash && side === 'BUY' ? 'text-[#EF4444]' : 'text-slate-100'}`}>
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              {selectedAsset.currency}
            </div>
          </div>

          <button
            type="submit"
            disabled={side === 'BUY' && !hasEnoughCash}
            className={`flex items-center gap-1.5 px-5 py-2 rounded font-bold tracking-wider transition-all uppercase ${
              side === 'BUY'
                ? 'bg-[#10B981] hover:bg-[#059669] text-slate-950 disabled:opacity-40'
                : 'bg-[#EF4444] hover:bg-[#DC2626] text-slate-100'
            }`}
          >
            <Send size={13} />
            Placer {side === 'BUY' ? 'Achat' : 'Vente'}
          </button>
        </div>
      </form>

      {/* Message de notification / contrôle de risque */}
      {feedback && (
        <div
          className={`mt-2 p-2 rounded text-[11px] font-medium flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950 border border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
