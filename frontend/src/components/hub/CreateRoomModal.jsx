import React, { useState } from 'react';
import { Trophy, Calendar, DollarSign, Clock, Zap, X, ArrowRight, Lock } from 'lucide-react';
import { createArenaRoom } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [initialCash, setInitialCash] = useState(100000);
  const [gameDurationMinutes, setGameDurationMinutes] = useState(15);
  const [tickRateMs, setTickRateMs] = useState(1000);
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Le nom de l'arène est obligatoire.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const room = await createArenaRoom({
        name: name.trim(),
        startDate,
        endDate,
        initialCash,
        gameDurationMinutes,
        tickRateMs,
        password: password.trim() || undefined
      });
      if (onRoomCreated) onRoomCreated(room);
      onClose();
      navigate(`/arena/${room.id}`);
    } catch (err) {
      setErrorMsg(err.message || "Échec de création de l'arène.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1120] border-2 border-[#1E293B] rounded-3xl p-6 max-w-xl w-full text-slate-100 flex flex-col gap-5 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="text-base font-black">Créer une Arène Privée</h3>
              <p className="text-xs text-slate-400">Configurez votre salon de match, sécurité et paramètres</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Nom de l'Arène
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Tournoi Élite BVMT 2024"
              className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Historical Replay Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1">
                <Calendar size={13} className="text-sky-400" /> Date Début Replay
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1">
                <Calendar size={13} className="text-sky-400" /> Date Fin Replay
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#080C14] border border-[#1E293B] focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* Starting Cash Presets */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1.5">
              <DollarSign size={13} className="text-emerald-400" /> Capital Initial par Joueur
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[50000, 100000, 250000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setInitialCash(val)}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    initialCash === val
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#080C14] border-[#1E293B] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {(val / 1000).toFixed(0)}k TND
                </button>
              ))}
            </div>
          </div>

          {/* Match Duration & Speed Factor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1">
                <Clock size={13} className="text-yellow-400" /> Durée Match (Chrono Continu)
              </label>
              <select
                value={gameDurationMinutes}
                onChange={(e) => setGameDurationMinutes(Number(e.target.value))}
                className="w-full bg-[#080C14] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={5}>5 minutes (Blitz)</option>
                <option value={10}>10 minutes (Standard)</option>
                <option value={15}>15 minutes (Compétition)</option>
                <option value={30}>30 minutes (Marathon)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-1">
                <Zap size={13} className="text-purple-400" /> Accélération Tick
              </label>
              <select
                value={tickRateMs}
                onChange={(e) => setTickRateMs(Number(e.target.value))}
                className="w-full bg-[#080C14] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={500}>500 ms (Ultra-Rapide)</option>
                <option value={1000}>1 sec = 1 jour (Standard)</option>
                <option value={2000}>2 sec = 1 jour (Stratégique)</option>
                <option value={5000}>5 sec = 1 jour (Détaillé)</option>
              </select>
            </div>
          </div>

          {/* Password Protection (Optionnel) */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1">
                <Lock size={13} className="text-amber-400" /> Mot de Passe de la Salle (Optionnel)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Laissez vide si public</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="ex: BVMT2024 (pour restreindre l'accès)"
              className="w-full bg-[#080C14] border border-[#1E293B] focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                'Génération...'
              ) : (
                <>
                  Lancer l'Arène Privée <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
