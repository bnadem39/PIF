import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { getWallet } from '../services/api';

const tnd = (v) => `${Number(v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} TND`;

/**
 * Portefeuille global du joueur : solde commun à toutes les salles, et dette éventuelle.
 * refreshKey : changer sa valeur recharge le solde (après une création de salle, un match…).
 */
export default function WalletBadge({ refreshKey = 0, className = '' }) {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getWallet()
      .then((w) => { if (!cancelled) setWallet(w); })
      .catch(() => { if (!cancelled) setWallet(null); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!wallet) return null;
  const debt = Number(wallet.debt || 0);

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#1E293B] bg-[#0B1120] text-xs shrink-0 ${className}`}
      title={`Portefeuille global : il sert à payer le prix d'entrée des salles, et reçoit ton capital à la fin de chaque match. Crédit encore disponible : ${tnd(wallet.creditAvailable)}.`}
    >
      <Wallet size={14} className="text-emerald-400" />
      <span className="font-mono font-bold text-slate-100">{tnd(wallet.balance)}</span>
      {debt > 0 && <span className="font-mono text-rose-300">· dette {tnd(debt)}</span>}
    </div>
  );
}
