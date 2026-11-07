import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Percent, Shield, Target,
  ArrowUpDown, AlertCircle, CheckCircle, Zap
} from 'lucide-react';

export default function OrderPanel({
  selectedAsset,
  currentPrice = 100,
  availableCash = 100000,
  onSubmitOrder,
  disabled = false,
  isHost = false
}) {
  const [side, setSide] = useState('BUY'); // 'BUY' | 'SELL'
  const [orderType, setOrderType] = useState('MARKET'); // 'MARKET' | 'LIMIT' | 'SL' | 'TP'
  const [limitPrice, setLimitPrice] = useState(currentPrice ? currentPrice.toString() : '100');
  const [quantity, setQuantity] = useState(10);
  const [cashPercent, setCashPercent] = useState(25);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const price = orderType === 'LIMIT' && Number(limitPrice) > 0 ? Number(limitPrice) : (currentPrice || 100);
  const totalCost = useMemo(() => (price * quantity), [price, quantity]);

  const handlePercentChange = (pct) => {
    setCashPercent(pct);
    if (!price || price <= 0) return;
    const alloc = (availableCash * (pct / 100));
    const qty = Math.max(1, Math.floor(alloc / price));
    setQuantity(qty);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled || quantity <= 0) return;

    if (side === 'BUY' && totalCost > availableCash) {
      setFeedback({ type: 'error', text: 'Fonds insuffisants pour cet achat.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const payload = {
        ticker: selectedAsset?.ticker || 'BIAT',
        side,
        orderType,
        price,
        quantity: Number(quantity),
        stopLoss: stopLoss ? Number(stopLoss) : null,
        takeProfit: takeProfit ? Number(takeProfit) : null
      };

      await onSubmitOrder(payload);
      setFeedback({
        type: 'success',
        text: `Ordre ${side} ${quantity} × ${payload.ticker} transmis avec succès`
      });
      setTimeout(() => setFeedback(null), 3500);
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Échec de transmission.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl flex flex-col h-full overflow-hidden select-none">
      {/* Side Selector Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-[#0F172A] border-b border-[#1E293B] gap-1.5">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
            side === 'BUY'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <TrendingUp size={14} /> ACHAT (LONG)
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
            side === 'SELL'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <TrendingDown size={14} /> VENTE (SHORT)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex-1 flex flex-col justify-between gap-4 overflow-y-auto">
        {/* Order Types */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Type d'exécution
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['MARKET', 'LIMIT', 'SL', 'TP'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    orderType === t
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                      : 'border-[#1E293B] bg-[#080C14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Price Input (if LIMIT or SL/TP) */}
          {orderType !== 'MARKET' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Prix Déclencheur / Limite (TND)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
              <span>Quantité (titres)</span>
              <span className="font-mono text-slate-300">{quantity} parts</span>
            </div>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => {
                const q = Math.max(1, parseInt(e.target.value) || 1);
                setQuantity(q);
              }}
              className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Dynamic Percentage Slider (10% - 100%) */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
              <span>Allocation Capital</span>
              <span className="text-sky-400 font-bold">{cashPercent}%</span>
            </div>
            <div className="flex gap-1.5">
              {[10, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentChange(pct)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-mono font-bold border transition-all ${
                    cashPercent === pct
                      ? 'bg-sky-600 text-white border-sky-400'
                      : 'border-[#1E293B] bg-[#080C14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Risk Management: SL & TP */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] font-semibold text-rose-400 flex items-center gap-1 mb-1">
                <Shield size={11} /> Stop-Loss
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="ex: 92.50"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-[#080C14] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                <Target size={11} /> Take-Profit
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="ex: 110.00"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-full bg-[#080C14] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Supervisor Arbitre Notice */}
        {isHost && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-300 text-xs flex flex-col gap-1.5 shadow-md">
            <div className="flex items-center gap-1.5 font-black uppercase text-[10px] text-amber-400">
              <Shield size={14} /> Mode Superviseur / Arbitre
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Vous êtes l'administrateur de cette arène. Pour garantir l'équité compétitive, le trading est réservé aux participants.
            </p>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-600/50 text-rose-300'
          }`}>
            {feedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Cost & Submit Button */}
        <div className="pt-3 border-t border-[#1E293B] space-y-3">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Total estimé :</span>
            <span className="font-bold text-slate-100">{totalCost.toLocaleString('fr-TN', { minimumFractionDigits: 2 })} TND</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>Solde dispo :</span>
            <span>{availableCash.toLocaleString('fr-TN', { minimumFractionDigits: 2 })} TND</span>
          </div>

          <button
            type="submit"
            disabled={disabled || loading || isHost}
            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 ${
              isHost
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
            }`}
          >
            <Zap size={14} />
            {isHost ? 'Trading Réservé aux Participants' : loading ? 'Exécution...' : `${side === 'BUY' ? 'Acheter' : 'Vendre'} ${selectedAsset?.ticker || 'BIAT'}`}
          </button>
        </div>
      </form>
    </div>
  );
}

