import React, { useEffect, useState } from 'react';
import { BrainCircuit, AlertTriangle, RefreshCw, Newspaper, Activity } from 'lucide-react';
import { explainSignal, getAnomalies } from '../services/aiService';
import { getNews, getNewsSentiment } from '../services/newsService';

const CLASS_LABEL = { buy: 'Achat (hausse)', sell: 'Vente (baisse)', neutral: 'Neutre' };
const CLASS_COLOR = { buy: '#10B981', sell: '#EF4444', neutral: '#94A3B8' };
const SENT_COLOR = { POSITIVE: '#10B981', NEGATIVE: '#EF4444', NEUTRAL: '#94A3B8' };
const SENT_LABEL = { POSITIVE: 'Positif', NEGATIVE: 'Négatif', NEUTRAL: 'Neutre' };
const SIGNAL_LABEL = { 1: 'ACHAT', 0: 'ATTENTE', '-1': 'VENTE' };

function formatValue(v) {
  if (v == null) return '-';
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

/**
 * Explication du signal XGBoost de l'actif à la date simulée (cahier §3.6.1) : probabilités des trois classes
 * et contribution de chaque variable (valeurs de Shapley exactes de l'arbre), avec la valeur réelle de la variable.
 */
export default function SignalExplainPanel({ symbol, date, isPlaying }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState(null);
  const [news, setNews] = useState([]);
  const [newsAgg, setNewsAgg] = useState(null);
  const [anomalies, setAnomalies] = useState(null);

  const load = () => {
    if (!symbol || !date) return;
    setLoading(true);
    setError(null);
    explainSignal(symbol, date)
      .then((d) => {
        setData(d);
        setView(d.explained_class === 'neutral' ? 'buy' : d.explained_class);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // Actualités publiées jusqu'à la date simulée uniquement (aucune information future)
    Promise.all([getNews(date, symbol, 5), getNewsSentiment(date, symbol)])
      .then(([list, agg]) => { setNews(list || []); setNewsAgg(agg); })
      .catch(() => { setNews([]); setNewsAgg(null); });
    getAnomalies(symbol, date).then(setAnomalies).catch(() => setAnomalies(null));
  };

  // Pendant la lecture, l'explication n'est recalculée qu'à la pause
  useEffect(() => {
    if (!isPlaying) load();
  }, [symbol, date, isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = data && view ? data.contributions[view] : [];
  const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(r.contribution)));

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-100 text-sm font-semibold">
          <BrainCircuit size={15} className="text-[#38BDF8]" />
          Pourquoi ce signal ? <span className="font-mono text-slate-400 text-xs">{symbol}</span>
        </div>
        <button onClick={load} disabled={loading} className="text-slate-400 hover:text-white disabled:opacity-40" title="Recalculer">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {isPlaying && <div className="text-xs text-slate-300">Mettez la simulation en pause pour expliquer le signal du jour.</div>}
      {error && <div className="text-xs text-rose-400">{error}</div>}

      {data && (
        <>
          <div className="rounded-lg border border-[#1E293B] bg-[#0B1120] p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Séance du {data.date} · clôture <b className="text-slate-100 font-mono text-sm">{formatValue(data.close)}</b></span>
              <span
                className="font-mono font-bold px-2 py-0.5 rounded text-sm"
                style={{ color: CLASS_COLOR[data.explained_class], background: `${CLASS_COLOR[data.explained_class]}1A` }}
              >
                {SIGNAL_LABEL[data.signal]}
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden">
              {['sell', 'neutral', 'buy'].map((k) => (
                <div key={k} style={{ width: `${data.probabilities[k] * 100}%`, background: CLASS_COLOR[k] }} />
              ))}
            </div>
            <div className="flex justify-between text-xs font-mono">
              {['sell', 'neutral', 'buy'].map((k) => (
                <span key={k} style={{ color: CLASS_COLOR[k] }}>{CLASS_LABEL[k]} {(data.probabilities[k] * 100).toFixed(0)} %</span>
              ))}
            </div>
            <div className="text-xs text-slate-300">
              Un signal d'achat ou de vente n'est émis que si sa probabilité atteint {Math.round(data.threshold * 100)} %.
            </div>
          </div>

          {data.in_sample && (
            <div className="flex gap-1.5 text-xs text-amber-300/90">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              Date antérieure au {data.validation_start_date} : le modèle a été entraîné sur cette période, sa confiance y est surestimée.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold uppercase tracking-wide text-slate-300" title="SHAP : méthode qui calcule combien chaque indicateur (RSI, MACD...) a pesé dans la décision du modèle.">Contributions (SHAP)</span>
              <div className="flex gap-1">
                {['buy', 'sell'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setView(k)}
                    className={`px-1.5 py-0.5 rounded text-xs font-semibold ${view === k ? 'bg-[#1E293B] text-white' : 'text-slate-400 hover:text-slate-300'}`}
                  >
                    P({k === 'buy' ? 'hausse' : 'baisse'})
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {rows.map((r) => {
                const w = (Math.abs(r.contribution) / maxAbs) * 50;
                const positive = r.contribution >= 0;
                return (
                  <div key={r.feature} title={`${r.label} = ${formatValue(r.value)} · contribution ${r.contribution > 0 ? '+' : ''}${r.contribution.toFixed(3)} (log-odds)`}>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-slate-300 truncate pr-2">{r.label}</span>
                      <span className="font-mono text-slate-300 shrink-0">{formatValue(r.value)}</span>
                    </div>
                    <div className="relative h-2 bg-[#0B1120] rounded">
                      <div className="absolute top-0 bottom-0 w-px bg-slate-600" style={{ left: '50%' }} />
                      <div
                        className="absolute top-0 bottom-0 rounded"
                        style={{
                          left: positive ? '50%' : `${50 - w}%`,
                          width: `${w}%`,
                          background: positive ? CLASS_COLOR[view] : '#64748B'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              À droite, la variable pousse vers {view === 'buy' ? 'la hausse' : 'la baisse'} ; à gauche, elle s'y oppose.
              Valeurs de Shapley exactes calculées sur les arbres XGBoost, en log-odds. Le « score de momentum » est un proxy RSI/MACD utilisé à l'entraînement.
            </p>
          </div>
        </>
      )}

      <div className="rounded-lg border border-[#1E293B] bg-[#0B1120] p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-300">
            <Newspaper size={12} /> Actualités & sentiment
          </span>
          {newsAgg?.label && (
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ color: SENT_COLOR[newsAgg.label], background: `${SENT_COLOR[newsAgg.label]}1A` }}>
              {SENT_LABEL[newsAgg.label]} {newsAgg.score > 0 ? '+' : ''}{newsAgg.score.toFixed(2)}
            </span>
          )}
        </div>
        {news.length === 0 ? (
          <div className="text-xs text-slate-300">Aucune actualité publiée sur {symbol} au cours des 30 jours précédant le {date}.</div>
        ) : (
          <>
            <div className="text-xs text-slate-300">
              {newsAgg?.articles ?? 0} article(s) sur 30 jours, les plus récents pèsent davantage (demi-vie 7 jours).
            </div>
            <ul className="space-y-1.5">
              {news.map((n) => (
                <li key={n.id} className="border-l-2 pl-2" style={{ borderColor: SENT_COLOR[n.sentimentLabel] }}>
                  <div className="text-xs text-slate-200 leading-snug">{n.title}</div>
                  <div className="text-[13px] text-slate-400 font-mono">
                    {n.publishedDate}{n.source ? ` · ${n.source}` : ''} · {n.sentimentScore > 0 ? '+' : ''}{n.sentimentScore.toFixed(2)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {anomalies && (
        <div className="rounded-lg border border-[#1E293B] bg-[#0B1120] p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-300">
              <Activity size={12} /> Séances anormales
            </span>
            <span className="text-xs font-mono text-slate-300">{anomalies.count} depuis le début</span>
          </div>
          {anomalies.anomalies.length === 0 ? (
            <div className="text-xs text-slate-300">Aucune séance anormale détectée jusqu'au {date}.</div>
          ) : (
            <ul className="space-y-1.5">
              {anomalies.anomalies.slice(0, 5).map((a) => (
                <li key={a.date} className="flex gap-2">
                  <span className="font-mono text-[13px] text-slate-400 shrink-0 w-[68px]">{a.date}</span>
                  <span className="text-xs text-slate-300 leading-snug">
                    {a.reasons.map((r) => r.text).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="text-xs text-slate-300">
            Une séance est signalée quand son rendement, son volume ou son amplitude s'écarte d'au moins {anomalies.threshold} écarts-types
            de la médiane des {anomalies.window} séances précédentes.
          </div>
        </div>
      )}
    </div>
  );
}
