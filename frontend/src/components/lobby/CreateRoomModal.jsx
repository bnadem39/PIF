import React, { useState } from 'react';
import { Plus, X, Calendar, DollarSign, Gauge, ShieldAlert, Sparkles } from 'lucide-react';
import { createArenaRoom } from '../../services/api';

const TIER_DEFAULTS = {
  BRONZE: { minElo: 0, maxElo: 999 },
  SILVER: { minElo: 1000, maxElo: 1499 },
  GOLD: { minElo: 1500, maxElo: 1999 },
  MASTER: { minElo: 2000, maxElo: 2800 }
};

export default function CreateRoomModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: 'Arena Tunindex 2022-2024',
    startDate: '2022-01-03',
    endDate: '2023-12-29',
    initialCash: 100000,
    tickRateMs: 1000,
    requiredTier: 'SILVER',
    minElo: 1000,
    maxElo: 1499,
    maxPlayers: 8
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTierChange = (tier) => {
    const range = TIER_DEFAULTS[tier] || TIER_DEFAULTS.SILVER;
    setForm((prev) => ({
      ...prev,
      requiredTier: tier,
      minElo: range.minElo,
      maxElo: range.maxElo
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        initialCash: Number(form.initialCash),
        tickRateMs: Number(form.tickRateMs),
        minElo: Number(form.minElo),
        maxElo: Number(form.maxElo),
        requiredTier: form.requiredTier,
        maxPlayers: Number(form.maxPlayers)
      };

      const room = await createArenaRoom(payload);
      if (onCreated) onCreated(room);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de la room.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0F172A]/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-600/20 text-sky-400 rounded-lg border border-sky-500/30">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Créer une Arène Multijoueur</h2>
              <p className="text-xs text-slate-400">Assistant Master Trader / Agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-700/50 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nom de l'Arène</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono transition-all"
              placeholder="ex: Arène Elite BVMT 2023"
            />
          </div>

          {/* Historical Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar size={13} className="text-sky-400" /> Date Début
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar size={13} className="text-sky-400" /> Date Fin
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Capital & Tick Speed */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-400" /> Capital Initial (TND)
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={form.initialCash}
                onChange={(e) => setForm({ ...form, initialCash: e.target.value })}
                className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Gauge size={13} className="text-amber-400" /> Cadence Tick (ms/jour)
              </label>
              <select
                value={form.tickRateMs}
                onChange={(e) => setForm({ ...form, tickRateMs: Number(e.target.value) })}
                className="w-full bg-[#080C14] border border-[#334155] rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value={500}>500 ms (Ultra rapide)</option>
                <option value={1000}>1 000 ms (Standard 1s)</option>
                <option value={2000}>2 000 ms (2s / séance)</option>
                <option value={5000}>5 000 ms (5s / séance)</option>
              </select>
            </div>
          </div>

          {/* Tier & ELO Gatekeeper */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Niveau ELO Requis (Gatekeeper)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['BRONZE', 'SILVER', 'GOLD', 'MASTER'].map((tier) => (
                <button
                  type="button"
                  key={tier}
                  onClick={() => handleTierChange(tier)}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    form.requiredTier === tier
                      ? 'bg-sky-600 text-white border-sky-400 shadow'
                      : 'border-[#334155] bg-[#080C14] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-400">Min ELO : </span>
                <span className="text-sky-300 font-bold">{form.minElo}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Max ELO : </span>
                <span className="text-sky-300 font-bold">{form.maxElo}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-transparent hover:border-[#334155] transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md disabled:opacity-50"
            >
              <Plus size={14} /> {loading ? 'Création...' : 'Lancer l\'Arène'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

