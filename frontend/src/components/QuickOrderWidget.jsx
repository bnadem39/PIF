import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, ShieldAlert, Shield, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Configuration avancée de gestion des risques (SL, TP, Trailing Stop)
  const [showRiskConfig, setShowRiskConfig] = useState(false);
  const [enableStopLoss, setEnableStopLoss] = useState(false);
  const [slMode, setSlMode] = useState('PERCENT'); // 'PERCENT' | 'PRICE'
  const [slValue, setSlValue] = useState('5'); // 5% ou prix absolu
  const [enableTakeProfit, setEnableTakeProfit] = useState(false);
  const [tpMode, setTpMode] = useState('PERCENT'); // 'PERCENT' | 'PRICE'
  const [tpValue, setTpValue] = useState('10'); // 10% ou prix absolu
  const [enableTrailingStop, setEnableTrailingStop] = useState(false);
  const [tsDistance, setTsDistance] = useState('2.5'); // Distance en dinars ou %

  const isTnd = selectedAsset?.currency === 'TND';
  const precision = isTnd ? 3 : 2;

  const activePrice = currentSimulatedPrice != null && currentSimulatedPrice > 0
    ? currentSimulatedPrice
    : (selectedAsset?.price || 0);

  useEffect(() => {
    setCustomPrice(activePrice ? activePrice.toFixed(precision) : '');
  }, [activePrice, precision]);

  const qtyNum = parseInt(quantity, 10) || 0;
  const execPriceNum = parseFloat(customPrice) || activePrice || 0;

  // Calcul dynamique des seuils absolus SL et TP
  const calculatedSlPrice = enableStopLoss && execPriceNum > 0
    ? (slMode === 'PERCENT'
        ? execPriceNum * (1 - (parseFloat(slValue) || 5) / 100)
        : parseFloat(slValue) || (execPriceNum * 0.95))
    : null;

  const calculatedTpPrice = enableTakeProfit && execPriceNum > 0
    ? (tpMode === 'PERCENT'
        ? execPriceNum * (1 + (parseFloat(tpValue) || 10) / 100)
        : parseFloat(tpValue) || (execPriceNum * 1.10))
    : null;

  const calculatedTsDist = enableTrailingStop && parseFloat(tsDistance) > 0
    ? parseFloat(tsDistance)
    : null;

  // Calculs financiers haute précision
  const grossAmount = qtyNum * execPriceNum;
  const fee = grossAmount * 0.0015; // 0.15% frais
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
        message: `Fonds insuffisants : Requis ${totalBuyRequired.toFixed(3)} TND, Disponible ${cashBalance.toFixed(3)} TND.`
      });
      return;
    }

    if (side === 'SELL' && !isSellSolvent) {
      setFeedback({
        type: 'error',
        message: heldQuantity === 0
          ? `Vente rejetée : Aucune action ${selectedAsset.ticker} détenue en portefeuille.`
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
        simulatedDate: simulatedDate || new Date().toISOString().split('T')[0],
        stopLossPrice: side === 'BUY' ? calculatedSlPrice : null,
        takeProfitPrice: side === 'BUY' ? calculatedTpPrice : null,
        trailingStopDistance: side === 'BUY' ? calculatedTsDist : null
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        {/* Ligne 1 : Contrôles d'Exécution Principaux */}
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <label className="text-slate-400 text-[11px] font-semibold">Cours :</label>
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

          {/* Dépliant Gestion du Risque (SL/TP) */}
          {side === 'BUY' && (
            <button
              type="button"
              onClick={() => setShowRiskConfig(!showRiskConfig)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                enableStopLoss || enableTakeProfit || enableTrailingStop
                  ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40'
                  : 'bg-[#1E293B] text-slate-400 border-[#334155] hover:text-slate-200'
              }`}
            >
              <Shield size={12} className={enableStopLoss || enableTakeProfit ? 'text-indigo-400' : ''} />
              <span>Gestion Risques (SL/TP)</span>
              {showRiskConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {/* Montant Estimé & Frais */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] border-l border-[#1E293B] pl-3">
            <div>
              <span className="text-slate-400">Total : </span>
              <strong className="text-white">
                {(side === 'BUY' ? totalBuyRequired : netSellProceeds).toFixed(precision)} {selectedAsset?.currency}
              </strong>
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
                ? 'bg-[#10B981] hover:bg-[#059669] text-slate-950 font-black'
                : 'bg-[#EF4444] hover:bg-[#DC2626] text-white font-black'
            }`}
          >
            <Send size={13} />
            <span>
              {isSubmitting
                ? 'Exécution...'
                : `${side === 'BUY' ? 'ACHETER' : 'VENDRE'} ${qtyNum} ${selectedAsset?.ticker || ''}`}
            </span>
          </button>
        </div>

        {/* Ligne 2 : Panneau Dépliable de Configuration SL / TP / Trailing Stop */}
        {showRiskConfig && side === 'BUY' && (
          <div className="bg-[#080C14] border border-[#1E293B] rounded-lg p-2.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] animate-fadeIn">
            {/* 1. Stop-Loss (SL) */}
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableStopLoss}
                    onChange={(e) => setEnableStopLoss(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span className="font-bold text-rose-400">Stop-Loss (SL)</span>
                </label>
                <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[9px]">
                  <button
                    type="button"
                    onClick={() => setSlMode('PERCENT')}
                    className={`px-1.5 py-0.2 rounded font-bold ${slMode === 'PERCENT' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlMode('PRICE')}
                    className={`px-1.5 py-0.2 rounded font-bold ${slMode === 'PRICE' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                  >
                    Prix
                  </button>
                </div>
              </div>

              {enableStopLoss && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <input
                    type="number"
                    step={slMode === 'PERCENT' ? '1' : '0.01'}
                    value={slValue}
                    onChange={(e) => setSlValue(e.target.value)}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white font-bold"
                  />
                  <span className="text-slate-400 text-[10px]">
                    Déclenchement @ <strong className="text-rose-400">{calculatedSlPrice?.toFixed(precision)} TND</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 2. Take-Profit (TP) */}
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableTakeProfit}
                    onChange={(e) => setEnableTakeProfit(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span className="font-bold text-emerald-400">Take-Profit (TP)</span>
                </label>
                <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800 text-[9px]">
                  <button
                    type="button"
                    onClick={() => setTpMode('PERCENT')}
                    className={`px-1.5 py-0.2 rounded font-bold ${tpMode === 'PERCENT' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setTpMode('PRICE')}
                    className={`px-1.5 py-0.2 rounded font-bold ${tpMode === 'PRICE' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                  >
                    Prix
                  </button>
                </div>
              </div>

              {enableTakeProfit && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <input
                    type="number"
                    step={tpMode === 'PERCENT' ? '1' : '0.01'}
                    value={tpValue}
                    onChange={(e) => setTpValue(e.target.value)}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white font-bold"
                  />
                  <span className="text-slate-400 text-[10px]">
                    Objectif @ <strong className="text-emerald-400">{calculatedTpPrice?.toFixed(precision)} TND</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 3. Trailing Stop (TS) */}
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTrailingStop}
                  onChange={(e) => setEnableTrailingStop(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <span className="font-bold text-amber-400">Trailing Stop (TS)</span>
              </label>

              {enableTrailingStop && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px]">Distance :</span>
                    <input
                      type="number"
                      step="0.05"
                      value={tsDistance}
                      onChange={(e) => setTsDistance(e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white font-bold"
                    />
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    Seuil glissant dynamique
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
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
              ? `Contrôle Pré-Trade : Cash disponible insuffisant (${totalBuyRequired.toFixed(precision)} TND requis > ${cashBalance.toFixed(precision)} TND dispo).`
              : heldQuantity === 0
              ? `Contrôle Pré-Trade : Vous ne détenez aucune action ${selectedAsset?.ticker}. Vente à découvert interdite.`
              : `Contrôle Pré-Trade : Quantité demandée (${qtyNum}) supérieure à la position détenue (${heldQuantity}).`}
          </span>
        </div>
      )}
    </div>
  );
}
