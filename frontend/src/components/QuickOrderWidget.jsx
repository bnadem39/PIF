import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert } from 'lucide-react';
import { executeTradeOrder } from '../services/realMarketService';

export default function QuickOrderWidget({
  selectedAsset,
  cashBalance = 100000,
  simulatedDate = '',
  currentSimulatedPrice,
  userPositions = [],
  onOrderExecuted
}) {
  const [side, setSide] = useState('BUY'); // 'BUY' ou 'SELL'
  const [quantity, setQuantity] = useState('10');
  const [customPrice, setCustomPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const isTnd = selectedAsset?.currency === 'TND';
  const precision = isTnd ? 3 : 2;

  // Le cours d'exécution par défaut est le cours simulé courant à T_courant
  const activePrice = currentSimulatedPrice != null && currentSimulatedPrice > 0
    ? currentSimulatedPrice
    : (selectedAsset?.price || 0);

  useEffect(() => {
    setCustomPrice(activePrice ? activePrice.toFixed(precision) : '');
  }, [activePrice, precision]);

  const qtyNum = parseInt(quantity, 10) || 0;
  const execPriceNum = parseFloat(customPrice) || activePrice || 0;

  // Calculs financiers haute précision
  const grossAmount = qtyNum * execPriceNum;
  const fee = grossAmount * 0.0015; // Frais de courtage institutionnels 0.15%
  const totalBuyRequired = grossAmount + fee;
  const netSellProceeds = grossAmount - fee;

  // Contrôles Pré-Trade de Solvabilité
  const positionHeld = userPositions.find(
    (p) => p.symbol?.toUpperCase() === selectedAsset?.ticker?.toUpperCase()
  );
  const heldQuantity = positionHeld ? positionHeld.quantity : 0;

  const isBuySolvent = side === 'BUY' && totalBuyRequired <= cashBalance && totalBuyRequired > 0;
  const isSellSolvent = side === 'SELL' && heldQuantity >= qtyNum && qtyNum > 0;
  const isFormValid = side === 'BUY' ? isBuySolvent : isSellSolvent;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;

    if (qtyNum <= 0) {
      setFeedback({ type: 'error', message: 'Veuillez saisir une quantité entière strictement positive.' });
      return;
    }

    if (side === 'BUY' && !isBuySolvent) {
      setFeedback({
        type: 'error',
        message: `Fonds insuffisants : Requis ${totalBuyRequired.toFixed(3)} TND (incluant ${fee.toFixed(3)} TND de frais), Disponible ${cashBalance.toFixed(3)} TND.`
      });
      return;
    }

    if (side === 'SELL' && !isSellSolvent) {
      setFeedback({
        type: 'error',
        message: heldQuantity === 0
          ? `Vente rejetée : Aucune action ${selectedAsset.ticker} détenue en portefeuille (Vente à découvert interdite).`
          : `Vente rejetée : Quantité voulue (${qtyNum}) > Quantité détenue (${heldQuantity}).`
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const orderPayload = {
        symbol: selectedAsset.ticker,
        type: side,
        quantity: qtyNum,
        executionPrice: execPriceNum,
        simulatedDate: simulatedDate || new Date().toISOString().split('T')[0]
      };

      const result = await executeTradeOrder(orderPayload);
      setIsSubmitting(false);

      setFeedback({
        type: 'success',
        message: result.message || `Ordre ${side} ${qtyNum} ${selectedAsset.ticker} exécuté avec succès !`
      });

      if (onOrderExecuted) {
        onOrderExecuted(result);
      }

      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setIsSubmitting(false);
      setFeedback({
        type: 'error',
        message: `Échec d'exécution : ${err.message}`
      });
    }
  };

  const handlePercentage = (pct) => {
    if (side === 'BUY') {
      if (execPriceNum <= 0) return;
      const budget = cashBalance * (pct / 100);
      const maxQty = Math.floor(budget / (execPriceNum * 1.0015));
      setQuantity(Math.max(1, maxQty).toString());
    } else {
      if (heldQuantity <= 0) return;
      const maxQty = Math.floor(heldQuantity * (pct / 100));
      setQuantity(Math.max(1, maxQty).toString());
    }
  };

  return (
    <div className="bg-[#0F172A] border-t border-[#1E293B] p-3 text-xs select-none font-mono">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center justify-between gap-3">
        {/* Sélecteur Achat / Vente */}
        <div className="flex bg-[#080C14] p-0.5 rounded-lg border border-[#1E293B]">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`px-4 py-1.5 rounded-md font-bold transition-all ${
              side === 'BUY'
                ? 'bg-[#10B981] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ACHAT
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`px-4 py-1.5 rounded-md font-bold transition-all ${
              side === 'SELL'
                ? 'bg-[#EF4444] text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            VENTE
          </button>
        </div>

        {/* Quantité & Raccourcis % */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-[11px] font-semibold">Qté :</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 bg-[#080C14] border border-[#334155] rounded px-2.5 py-1 text-white font-bold outline-none focus:border-[#38BDF8]"
          />
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentage(pct)}
                className="bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-[10px] px-1.5 py-1 rounded transition-colors font-bold"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Cours d'exécution simulé */}
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-[11px] font-semibold">Cours Simulé :</label>
          <div className="flex items-center bg-[#080C14] border border-[#334155] rounded px-2 py-1">
            <input
              type="number"
              step="0.001"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              className="w-24 bg-transparent text-white font-bold outline-none"
            />
            <span className="text-[11px] text-slate-400">{selectedAsset?.currency || 'TND'}</span>
          </div>
        </div>

        {/* Montant Estimé & Frais */}
        <div className="hidden xl:flex items-center gap-4 text-[11px] border-l border-[#1E293B] pl-4">
          <div>
            <span className="text-slate-400">Total {side === 'BUY' ? 'Débit' : 'Net'} : </span>
            <strong className="text-white">
              {(side === 'BUY' ? totalBuyRequired : netSellProceeds).toFixed(precision)} {selectedAsset?.currency}
            </strong>
          </div>
          <div>
            <span className="text-slate-400">Frais (0.15%) : </span>
            <span className="text-amber-400 font-bold">{fee.toFixed(precision)}</span>
          </div>
          {side === 'SELL' && (
            <div>
              <span className="text-slate-400">Détenu : </span>
              <strong className={heldQuantity > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {heldQuantity} titres
              </strong>
            </div>
          )}
        </div>

        {/* Bouton de Soumission d'Ordre */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={`px-5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-md ${
            !isFormValid
              ? 'bg-[#1E293B] text-slate-500 border border-[#334155] cursor-not-allowed opacity-60'
              : side === 'BUY'
              ? 'bg-[#10B981] hover:bg-[#059669] text-slate-950'
              : 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
          }`}
          title={
            !isFormValid
              ? side === 'BUY'
                ? 'Solde disponible insuffisant'
                : 'Position insuffisante ou nulle (Vente à découvert interdite)'
              : 'Transmettre l’ordre transactionnel'
          }
        >
          <Send size={13} />
          <span>
            {isSubmitting
              ? 'Exécution...'
              : `${side === 'BUY' ? 'ACHETER' : 'VENDRE'} ${qtyNum} ${selectedAsset?.ticker || ''}`}
          </span>
        </button>
      </form>

      {/* Bannière de Contrôle Pré-Trade ou Feedback */}
      {feedback && (
        <div
          className={`mt-2 p-2 rounded flex items-center gap-2 text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950 border border-rose-800 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Avertissement Pré-Trade temps réel si non solvable */}
      {!feedback && !isFormValid && (
        <div className="mt-2 text-[11px] text-amber-400 flex items-center gap-1.5">
          <ShieldAlert size={13} className="shrink-0" />
          <span>
            {side === 'BUY'
              ? `Contrôle Pré-Trade : Cash insuffisant pour cet achat (${totalBuyRequired.toFixed(precision)} TND requis > ${cashBalance.toFixed(precision)} TND dispo).`
              : heldQuantity === 0
              ? `Contrôle Pré-Trade : Vous ne détenez aucune action ${selectedAsset?.ticker}. Vente à découvert interdite.`
              : `Contrôle Pré-Trade : Quantité demandée (${qtyNum}) supérieure à la position détenue (${heldQuantity}).`}
          </span>
        </div>
      )}
    </div>
  );
}
