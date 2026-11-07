import React, { useState } from 'react';
import {
  GraduationCap, ShieldAlert, TrendingUp, Cpu, Target,
  CheckCircle2, ArrowRight, Zap, BookOpen, AlertTriangle, Sparkles, Check
} from 'lucide-react';
import { completeAcademyCourse } from '../../services/api';

const MODULES = [
  {
    id: 'risk-management',
    title: 'Gestion des Risques & Ordres Avancés',
    icon: ShieldAlert,
    badge: 'Fondamental',
    color: 'from-emerald-500/20 to-emerald-950/20 border-emerald-500/30 text-emerald-400',
    description: 'Protégez votre capital avec les mécanismes Stop-Loss, Take-Profit, Trailing Stop et OCO.',
    topics: [
      {
        name: 'Stop-Loss (SL)',
        rule: 'Ordre de protection automatique limitant la perte max par trade à 1-2% du capital.',
        formula: 'Prix SL = Prix d\'entrée × (1 - Risque%)'
      },
      {
        name: 'Take-Profit (TP)',
        rule: 'Verrouillage automatique des gains à un objectif prédéterminé avec un ratio Risque/Rendement >= 1:2.',
        formula: 'Ratio R/R = (Prix TP - Entrée) / (Entrée - SL)'
      },
      {
        name: 'Trailing Stop dynamique',
        rule: 'Suit la hausse du cours à une distance fixe (ex: 2 ATR) pour sécuriser les profits sans couper la tendance.',
        formula: 'Nouveau SL = max(SL précédent, Prix max atteint - Distance)'
      },
      {
        name: 'Ordre OCO (One-Cancels-the-Other)',
        rule: 'Combine un TP et un SL : l\'exécution de l\'un annule instantanément l\'autre côté broker.'
      }
    ]
  },
  {
    id: 'technical-indicators',
    title: 'Indicateurs Techniques Clés',
    icon: TrendingUp,
    badge: 'Analyse Chartiste',
    color: 'from-sky-500/20 to-sky-950/20 border-sky-500/30 text-sky-400',
    description: 'Comprendre et combiner RSI, ATR, SMA 20/50 pour détecter surachats, surventes et momentum.',
    topics: [
      {
        name: 'Relative Strength Index (RSI 14)',
        rule: 'Oscillateur de momentum borné [0, 100]. Zone < 30 = Survente (rebond haussier potentiel) ; Zone > 70 = Surachat.',
        formula: 'RSI = 100 - (100 / (1 + RS))'
      },
      {
        name: 'Average True Range (ATR 14)',
        rule: 'Mesure de la volatilité absolue indépendamment de la direction. Idéal pour calibrer la taille des positions et les mèches de SL.',
        formula: 'ATR = Moyenne mobile lissée du True Range (TR)'
      },
      {
        name: 'Moyennes Mobiles (SMA 20 & SMA 50)',
        rule: 'Golden Cross (SMA 20 croise au-dessus de SMA 50) = signal de tendance haussière confirmée.',
        formula: 'SMA = (P1 + P2 + ... + Pn) / n'
      }
    ]
  },
  {
    id: 'quant-ai',
    title: 'Quant Trading & Signaux XGBoost',
    icon: Cpu,
    badge: 'Intelligence Artificielle',
    color: 'from-purple-500/20 to-purple-950/20 border-purple-500/30 text-purple-400',
    description: 'Exploiter les prédictions 3-classes du modèle XGBoost calibré et l\'audit macroéconomique RAG.',
    topics: [
      {
        name: 'Seuil de Confiance 60 %',
        rule: 'Le modèle XGBoost filtre le bruit : un signal HAUSSE (+1) ou BAISSE (-1) n\'est émis que si la probabilité dépasse 60%.'
      },
      {
        name: 'Features Techniques Alimentant le Modèle',
        rule: 'Le modèle ingère log-returns, volume z-score, écart à la SMA20, MACD histogramme et volatilité 30j.'
      },
      {
        name: 'Rôle de l\'Audit FinGPT sur Pause',
        rule: 'En pause de séance, le Copilot FinGPT confronte les probabilités quantitatives aux circulaires macro BCT et bilans financiers.'
      }
    ]
  }
];

export default function AcademyView() {
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const [completedMap, setCompletedMap] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const current = MODULES.find((m) => m.id === activeModule) || MODULES[0];

  const handleComplete = async () => {
    setIsValidating(true);
    setSuccessMsg(null);
    try {
      await completeAcademyCourse(current.id);
      setCompletedMap((prev) => ({ ...prev, [current.id]: true }));
      setSuccessMsg(`Cours validé ! Compétences associées débloquées dans l'Arbre et progrès de carrière mis à jour.`);
    } catch (e) {
      setSuccessMsg(e.message || 'Erreur lors de la validation du cours.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Academy Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] border border-[#1E293B] rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold mb-3">
            <GraduationCap size={14} /> Académie de Trading Compétitif
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight mb-2">
            Maîtrisez les Règles Mathématiques du Marché
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Un trader rentable ne prédit pas l'avenir : il gère le risque de manière asymétrique, coupe ses pertes vite et laisse courir ses gains selon des probabilités éprouvées.
          </p>
        </div>
      </div>

      {/* Module Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = m.id === activeModule;
          return (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`text-left p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                isActive
                  ? `bg-gradient-to-b ${m.color} shadow-lg shadow-sky-950/30 ring-1 ring-sky-500/50`
                  : 'bg-[#0B1120] border-[#1E293B] hover:border-[#334155] text-slate-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl bg-black/40 border border-white/10 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                    {m.badge}
                  </span>
                </div>
                <h3 className={`text-sm font-bold ${isActive ? 'text-slate-100' : 'text-slate-300'}`}>
                  {m.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {m.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-sky-400 mt-2">
                <span>Explorer le module</span>
                <ArrowRight size={13} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Module Content */}
      <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-sky-400" />
            <h3 className="text-base font-bold text-slate-100">{current.title} — Fiches Pratiques</h3>
          </div>

          <button
            onClick={handleComplete}
            disabled={isValidating || completedMap[current.id]}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 ${
              completedMap[current.id]
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer'
            }`}
          >
            {completedMap[current.id] ? (
              <>
                <Check size={14} /> Cours Validé
              </>
            ) : isValidating ? (
              'Validation...'
            ) : (
              <>
                <Sparkles size={14} /> Valider ce Cours & Débloquer Compétences
              </>
            )}
          </button>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {current.topics.map((t, idx) => (
            <div
              key={idx}
              className="bg-[#080C14] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-[#334155] transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-200">{t.name}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-6">
                  {t.rule}
                </p>
              </div>

              {t.formula && (
                <div className="ml-6 px-3 py-1.5 rounded-lg bg-[#0F172A] border border-[#334155]/60 font-mono text-[11px] text-sky-300">
                  {t.formula}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

