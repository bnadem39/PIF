import React, { useCallback, useEffect, useState } from 'react';
import { Umbrella, Calculator, PieChart, Layers, RefreshCw, Info } from 'lucide-react';
import {
  getActuarialPortfolio,
  getActuarialModels,
  getQuote,
  getMargins,
  getDefaultReserving,
  runReserving
} from '../services/actuarialService';

const TABS = [
  { key: 'pricing', label: 'Tarification', icon: Calculator },
  { key: 'margins', label: 'Marges de prime', icon: PieChart },
  { key: 'reserving', label: 'Provisionnement', icon: Layers }
];

const fmt = (v, d = 0) => (v == null ? '-' : Number(v).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (v, d = 1) => (v == null ? '-' : `${(v * 100).toFixed(d)} %`);
const signedPct = (v) => (v == null ? '-' : `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)} %`);
const inputCls = 'w-full mt-0.5 bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200';

function Card({ title, children, right }) {
  return (
    <section className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-[#1E293B] px-2.5 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-bold text-slate-100 font-mono">{value}</div>
      {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block text-[11px] text-slate-400">{label}{children}</label>;
}

/** Coefficient multiplicateur : barre centrée sur 1 (échelle log), rouge > 1 (plus de risque), vert < 1. */
function RelBar({ value, max = 3 }) {
  const lv = Math.log(value);
  const lm = Math.log(max);
  const w = Math.min(Math.abs(lv) / lm, 1) * 50;
  return (
    <div className="relative h-2.5 w-full">
      <div className="absolute inset-y-0 left-1/2 border-l border-slate-600" />
      <div
        className={`absolute inset-y-0 rounded-sm ${lv >= 0 ? 'bg-rose-400' : 'bg-emerald-400'}`}
        style={lv >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
      />
    </div>
  );
}

// ── Tarification ────────────────────────────────────────────────────────
function PricingTab({ portfolio, models }) {
  const [profile, setProfile] = useState({
    driver_age: 22, vehicle_age: 1, power: '8-10 CV', region: 'Grand Tunis', usage: 'Personnel', fuel: 'Essence', bonus_malus: 100
  });
  const [duration, setDuration] = useState(1);
  const [expense, setExpense] = useState(0.25);
  const [profit, setProfit] = useState(0.05);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState(null);

  const compute = useCallback(async () => {
    setError(null);
    try {
      setQuote(await getQuote({ profile, duration, expense_ratio: expense, profit_margin: profit }));
    } catch (e) {
      setError(e.message);
    }
  }, [profile, duration, expense, profit]);

  useEffect(() => {
    const t = setTimeout(compute, 250);
    return () => clearTimeout(t);
  }, [compute]);

  const opts = portfolio?.options || {};
  const set = (k) => (e) => setProfile({ ...profile, [k]: e.target.type === 'number' || e.target.type === 'range' ? Number(e.target.value) : e.target.value });
  const c = models?.comparison;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">
        <Card title="Contrat à tarifer">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Âge du conducteur"><input type="number" min="18" max="90" value={profile.driver_age} onChange={set('driver_age')} className={inputCls} /></Field>
              <Field label="Âge du véhicule"><input type="number" min="0" max="40" value={profile.vehicle_age} onChange={set('vehicle_age')} className={inputCls} /></Field>
            </div>
            {[['power', 'Puissance fiscale'], ['region', 'Région'], ['usage', 'Usage'], ['fuel', 'Carburant']].map(([k, l]) => (
              <Field key={k} label={l}>
                <select value={profile[k]} onChange={set(k)} className={inputCls}>
                  {(opts[k] || [profile[k]]).map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            ))}
            <Field label={`Bonus-malus : ${profile.bonus_malus}`}>
              <input type="range" min="50" max="200" step="5" value={profile.bonus_malus} onChange={set('bonus_malus')} className="w-full accent-[#38BDF8]" />
            </Field>
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#1E293B]">
              <Field label="Durée (ans)"><input type="number" min="0.1" max="5" step="0.5" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls} /></Field>
              <Field label="Frais %"><input type="number" min="0" max="60" step="1" value={Math.round(expense * 100)} onChange={(e) => setExpense(Number(e.target.value) / 100)} className={inputCls} /></Field>
              <Field label="Marge %"><input type="number" min="-20" max="30" step="1" value={Math.round(profit * 100)} onChange={(e) => setProfit(Number(e.target.value) / 100)} className={inputCls} /></Field>
            </div>
          </div>
        </Card>

        <div className="space-y-3 min-w-0">
          {error && <div className="text-xs text-rose-400">{error}</div>}
          {quote && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Stat label="Fréquence annuelle" value={fmt(quote.frequency, 3)} hint="sinistres par an" />
                <Stat label={`P(sinistre sur ${quote.duration} an${quote.duration > 1 ? 's' : ''})`} value={pct(quote.claim_probability)} hint="1 − exp(−λ × durée)" />
                <Stat label="Coût moyen d'un sinistre" value={`${fmt(quote.severity)} TND`} />
                <Stat label="Prime pure" value={`${fmt(quote.pure_premium)} TND`} hint={`Boosting : ${fmt(quote.gbm.pure_premium)} TND`} />
                <Stat label="Prime commerciale" value={`${fmt(quote.commercial_premium)} TND`}
                  hint={`dont frais ${fmt(quote.expense_loading)} et marge ${fmt(quote.profit_loading)}`} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {[['frequency', 'Décomposition de la fréquence (GLM Poisson)', 3], ['severity', 'Décomposition du coût moyen (GLM Gamma)', 0]].map(([k, title, d]) => (
                  <Card key={k} title={title}>
                    <div className="space-y-1">
                      {quote.breakdown[k].map((s) => (
                        <div key={s.factor} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_64px] items-center gap-2 text-[11px]">
                          <span className="text-slate-300 truncate">{s.label}</span>
                          {s.factor === 'base' ? <span /> : <RelBar value={s.value} />}
                          <span className="font-mono text-right text-slate-200">{s.factor === 'base' ? fmt(s.value, d) : `× ${s.value.toFixed(2)}`}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-[#1E293B] pt-1 text-[11px] font-bold text-slate-100">
                        <span>Résultat (produit)</span>
                        <span className="font-mono">{fmt(k === 'frequency' ? quote.frequency : quote.severity, d)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {models && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3 items-start">
          <Card title="Comparaison des modèles (échantillon de test)">
            <table className="w-full text-[11px]">
              <thead className="text-slate-500">
                <tr><th className="text-left py-1">Indicateur</th><th className="text-right">GLM</th><th className="text-right">Boosting</th></tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  ['Déviance fréquence', 'frequency_deviance', (v) => v.toFixed(4), -1],
                  ['Déviance sévérité', 'severity_deviance', (v) => v.toFixed(4), -1],
                  ['Gini (segmentation)', 'gini', (v) => v.toFixed(3), 1],
                  ['Prédit / observé', 'predicted_to_actual', (v) => v.toFixed(3), 0]
                ].map(([l, k, f, better]) => {
                  const g = c.glm[k];
                  const b = c.gbm[k];
                  const glmBest = better > 0 ? g > b : better < 0 ? g < b : Math.abs(g - 1) < Math.abs(b - 1);
                  return (
                    <tr key={k} className="border-t border-[#1E293B]">
                      <td className="py-1">{l}</td>
                      <td className={`text-right font-mono ${glmBest ? 'text-emerald-300 font-bold' : ''}`}>{f(g)}</td>
                      <td className={`text-right font-mono ${!glmBest ? 'text-emerald-300 font-bold' : ''}`}>{f(b)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] text-slate-500">
              Déviance du modèle nul (même fréquence pour tous) : {c.null.frequency_deviance.toFixed(4)}.
              Apprentissage sur {fmt(models.train_size)} contrats, test sur {fmt(models.test_size)}.
              Le GLM sert de tarif : chaque coefficient s'explique à l'assuré et au régulateur.
            </p>
          </Card>

          <Card title="Coefficients multiplicateurs du GLM">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="text-slate-500 sticky top-0 bg-[#0F172A]">
                  <tr>
                    <th className="text-left px-1 py-1">Variable</th>
                    <th className="text-left px-1">Modalité</th>
                    <th className="text-right px-1">Fréquence [IC 95 %]</th>
                    <th className="text-right px-1">Vrai</th>
                    <th className="text-right px-1">Coût moyen [IC 95 %]</th>
                    <th className="text-right px-1">Vrai</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {models.relativities.map((r) => (
                    <tr key={r.factor + r.level} className={`border-t border-[#1E293B] ${r.reference ? 'text-slate-500' : ''}`}>
                      <td className="px-1 py-1">{r.factor_label}</td>
                      <td className="px-1">{r.level}{r.reference ? ' (réf.)' : ''}</td>
                      {['frequency', 'severity'].map((k) => {
                        const v = r[k];
                        const insignificant = v.p_value != null && v.p_value > 0.05;
                        return (
                          <React.Fragment key={k}>
                            <td className={`px-1 text-right font-mono whitespace-nowrap ${insignificant ? 'text-slate-500' : ''}`} title={v.p_value != null ? `p = ${v.p_value.toExponential(1)}` : ''}>
                              {v.relativity.toFixed(2)} {r.reference ? '' : <span className="text-slate-500">[{v.low.toFixed(2)}–{v.high.toFixed(2)}]</span>}
                            </td>
                            <td className="px-1 text-right font-mono text-slate-500">{v.true.toFixed(2)}</td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              « Vrai » : paramètre utilisé pour générer le portefeuille synthétique ; un bon modèle le retrouve dans son intervalle de confiance.
              En gris : non significatif (p &gt; 5 %). Bonus-malus : élasticité (λ ∝ (BM/100)^β).
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Marges ──────────────────────────────────────────────────────────────
function MarginsTab({ portfolio }) {
  const [segmentBy, setSegmentBy] = useState('age_band');
  const [expense, setExpense] = useState(0.25);
  const [profit, setProfit] = useState(0.05);
  const [mode, setMode] = useState('conventional');
  const [wakala, setWakala] = useState(0.25);
  const [surplus, setSurplus] = useState(0.5);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      getMargins({ segment_by: segmentBy, expense_ratio: expense, profit_margin: profit, mode, wakala_fee: wakala, surplus_share: surplus })
        .then((d) => !cancelled && (setData(d), setError(null)))
        .catch((e) => !cancelled && setError(e.message));
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [segmentBy, expense, profit, mode, wakala, surplus]);

  const takaful = mode === 'takaful';
  const t = data?.total;
  const breakEven = 1 - expense;

  return (
    <div className="space-y-3">
      <Card title="Hypothèses">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 items-end">
          <Field label="Segmenter par">
            <select value={segmentBy} onChange={(e) => setSegmentBy(e.target.value)} className={inputCls}>
              {Object.entries(portfolio?.segments || { age_band: 'Âge du conducteur' }).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Frais (% des primes)"><input type="number" min="0" max="60" value={Math.round(expense * 100)} onChange={(e) => setExpense(Number(e.target.value) / 100)} className={inputCls} /></Field>
          <Field label="Marge cible %"><input type="number" min="-20" max="30" value={Math.round(profit * 100)} onChange={(e) => setProfit(Number(e.target.value) / 100)} className={inputCls} /></Field>
          <div className="flex gap-1 col-span-2 md:col-span-1">
            {[['conventional', 'Conventionnel'], ['takaful', 'Takaful']].map(([v, l]) => (
              <button key={v} onClick={() => setMode(v)}
                className={`flex-1 px-2 py-1 rounded border text-[11px] ${mode === v ? 'border-[#38BDF8] text-[#38BDF8]' : 'border-[#334155] text-slate-400'}`}>{l}</button>
            ))}
          </div>
          {takaful && (
            <>
              <Field label="Commission wakala %"><input type="number" min="0" max="60" value={Math.round(wakala * 100)} onChange={(e) => setWakala(Number(e.target.value) / 100)} className={inputCls} /></Field>
              <Field label="Excédent redistribué %"><input type="number" min="0" max="100" value={Math.round(surplus * 100)} onChange={(e) => setSurplus(Number(e.target.value) / 100)} className={inputCls} /></Field>
            </>
          )}
        </div>
        {takaful && (
          <p className="mt-2 text-[10px] text-slate-500">
            Modèle wakala : les cotisations alimentent le fonds des participants, l'opérateur prélève une commission de gestion.
            Un excédent du fonds est en partie redistribué ; un déficit est couvert par un prêt sans intérêt de l'opérateur (qard hassan).
          </p>
        )}
      </Card>

      {error && <div className="text-xs text-rose-400">{error}</div>}

      {t && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Stat label={takaful ? 'Cotisations' : 'Primes encaissées'} value={`${fmt(t.premium / 1e6, 2)} M`} />
            <Stat label="Sinistres attendus (modèle)" value={`${fmt(t.expected_claims / 1e6, 2)} M`} hint={`observés : ${fmt(t.actual_claims / 1e6, 2)} M`} />
            <Stat label="S/P attendu" value={pct(t.expected_loss_ratio)} hint={`équilibre à ${pct(breakEven, 0)} avec ${pct(expense, 0)} de frais`} />
            {takaful ? (
              <Stat label="Résultat du fonds" value={`${fmt(t.fund_result / 1e6, 2)} M`}
                hint={t.fund_result >= 0 ? `${fmt(t.surplus_to_participants / 1e6, 2)} M redistribués` : `qard hassan : ${fmt(t.qard_hassan / 1e6, 2)} M`} />
            ) : (
              <Stat label="Marge technique" value={`${fmt(t.margin / 1e6, 2)} M`} hint={pct(t.margin_pct)} />
            )}
            <Stat label="Ajustement tarifaire nécessaire" value={signedPct(t.rate_change)} hint="prime technique / prime actuelle − 1" />
          </div>

          <Card title={`Rentabilité par ${data.segment_label.toLowerCase()}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left px-2 py-1">Segment</th>
                    <th className="text-right px-2">Contrats</th>
                    <th className="text-right px-2">Primes</th>
                    <th className="text-right px-2">Sinistres attendus</th>
                    <th className="px-2 w-40">S/P attendu</th>
                    <th className="text-right px-2">S/P observé</th>
                    <th className="text-right px-2">Prime technique</th>
                    <th className="text-right px-2">Ajustement</th>
                    {takaful ? (
                      <>
                        <th className="text-right px-2">Wakala</th>
                        <th className="text-right px-2">Résultat du fonds</th>
                      </>
                    ) : <th className="text-right px-2">Marge</th>}
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {data.segments.map((s) => (
                    <tr key={s.segment} className="border-t border-[#1E293B]">
                      <td className="px-2 py-1.5 whitespace-nowrap">{s.segment}</td>
                      <td className="px-2 text-right font-mono">{fmt(s.policies)}</td>
                      <td className="px-2 text-right font-mono">{fmt(s.premium)}</td>
                      <td className="px-2 text-right font-mono">{fmt(s.expected_claims)}</td>
                      <td className="px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 h-2.5 bg-[#1E293B] rounded-sm">
                            <div className={`absolute inset-y-0 left-0 rounded-sm ${s.expected_loss_ratio > breakEven ? 'bg-rose-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(s.expected_loss_ratio / 1.5, 1) * 100}%` }} />
                            <div className="absolute inset-y-[-2px] border-l border-dashed border-slate-300" style={{ left: `${(breakEven / 1.5) * 100}%` }} />
                          </div>
                          <span className="font-mono w-12 text-right">{pct(s.expected_loss_ratio, 0)}</span>
                        </div>
                      </td>
                      <td className="px-2 text-right font-mono">{pct(s.actual_loss_ratio, 0)}</td>
                      <td className="px-2 text-right font-mono">{fmt(s.technical_premium)}</td>
                      <td className={`px-2 text-right font-mono ${s.rate_change > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{signedPct(s.rate_change)}</td>
                      {takaful ? (
                        <>
                          <td className="px-2 text-right font-mono">{fmt(s.operator_fee)}</td>
                          <td className={`px-2 text-right font-mono ${s.fund_result >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmt(s.fund_result)}</td>
                        </>
                      ) : (
                        <td className={`px-2 text-right font-mono ${s.margin >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{fmt(s.margin)} ({pct(s.margin_pct, 0)})</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Montants annuels en TND. Ligne pointillée : S/P d'équilibre (1 − frais). Rouge : segment déficitaire au tarif actuel.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Provisionnement ─────────────────────────────────────────────────────
function triangleToText(tri) {
  return tri.map((row) => row.join('\t')).join('\n');
}

function textToTriangle(text) {
  return text.trim().split(/\n+/).map((line) => line.trim().split(/[\s;,]+/).filter(Boolean).map(Number));
}

function ReservingTab() {
  const [text, setText] = useState('');
  const [tail, setTail] = useState(1);
  const [data, setData] = useState(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDefault = useCallback(async () => {
    try {
      const d = await getDefaultReserving();
      setText(triangleToText(d.triangle));
      setTail(1);
      setData(d.result);
      setSource(d.source);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { loadDefault(); }, [loadDefault]);

  const compute = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await runReserving({ triangle: textToTriangle(text), tail_factor: tail });
      setData(d.result);
      setSource(d.source);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const n = data?.completed.length || 0;
  const maxReserve = data ? Math.max(...data.rows.map((r) => r.reserve + 2 * r.mack_se)) : 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-3 items-start">
        <Card title="Triangle des paiements (incrémentaux)" right={<button onClick={loadDefault} className="text-[10px] text-slate-500 hover:text-slate-300">Exemple</button>}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={11}
            spellCheck={false}
            className="w-full bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-[10px] font-mono text-slate-200 whitespace-pre"
          />
          <p className="text-[10px] text-slate-500 mb-2">
            Une ligne par année de survenance, une colonne par année de développement (séparateur : tabulation, espace ou point-virgule).
            Collez directement depuis un tableur.
          </p>
          <div className="flex items-end gap-2">
            <Field label="Facteur de queue"><input type="number" min="1" max="2" step="0.01" value={tail} onChange={(e) => setTail(Number(e.target.value))} className={inputCls} /></Field>
            <button onClick={compute} disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-[#38BDF8] text-[#0B1120] disabled:opacity-40">
              {loading && <RefreshCw size={12} className="animate-spin" />} Calculer
            </button>
          </div>
          {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
        </Card>

        {data && (
          <div className="space-y-3 min-w-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Stat label="Paiements à date" value={fmt(data.total.latest)} />
              <Stat label="Charge ultime estimée" value={fmt(data.total.ultimate)} />
              <Stat label="Provision (IBNR)" value={fmt(data.total.reserve)} hint={source} />
              <Stat label="Erreur de Mack" value={fmt(data.total.mack_se)} hint={`${pct(data.total.mack_se / data.total.reserve)} de la provision`} />
            </div>
            <Card title="Provision par année de survenance (± 2 erreurs de Mack)">
              <div className="space-y-1">
                {data.rows.map((r) => (
                  <div key={r.origin} className="grid grid-cols-[40px_minmax(0,1fr)_96px_56px] items-center gap-2 text-[11px]">
                    <span className="text-slate-400">An {r.origin}</span>
                    <div className="relative h-3">
                      <div className="absolute inset-y-0 left-0 bg-[#38BDF8] rounded-sm" style={{ width: `${(r.reserve / maxReserve) * 100}%` }} />
                      {r.mack_se > 0 && (
                        <div className="absolute top-1/2 h-px bg-slate-300"
                          style={{ left: `${(Math.max(0, r.reserve - 2 * r.mack_se) / maxReserve) * 100}%`, width: `${((Math.min(r.reserve, 2 * r.mack_se) + 2 * r.mack_se) / maxReserve) * 100}%` }} />
                      )}
                    </div>
                    <span className="font-mono text-right text-slate-200">{fmt(r.reserve)}</span>
                    <span className="font-mono text-right text-slate-500">{r.cv != null ? pct(r.cv, 0) : '-'}</span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">Dernière colonne : coefficient de variation (erreur de Mack / provision).</p>
            </Card>
          </div>
        )}
      </div>

      {data && (
        <Card title="Triangle complété par Chain Ladder">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left px-1.5 py-1 font-sans">Survenance</th>
                  {Array.from({ length: n }, (_, k) => <th key={k} className="text-right px-1.5">{k + 1}</th>)}
                  <th className="text-right px-1.5 font-sans">Ultime</th>
                </tr>
              </thead>
              <tbody>
                {data.completed.map((row, i) => (
                  <tr key={i} className="border-t border-[#1E293B]">
                    <td className="px-1.5 py-1 text-slate-400 font-sans">An {i + 1}</td>
                    {row.map((v, k) => (
                      <td key={k} className={`px-1.5 text-right ${k >= n - i ? 'text-[#38BDF8] bg-[#38BDF8]/5' : 'text-slate-300'}`}>{fmt(v)}</td>
                    ))}
                    <td className="px-1.5 text-right text-slate-100">{fmt(data.rows[i].ultimate)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[#334155] text-slate-400">
                  <td className="px-1.5 py-1 font-sans">Facteur</td>
                  {data.development_factors.map((f, k) => <td key={k} className="px-1.5 text-right">{f.toFixed(3)}</td>)}
                  <td className="px-1.5 text-right">{data.tail_factor !== 1 ? `queue ${data.tail_factor}` : ''}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Montants cumulés. En bleu : projections. Facteur de développement k = Σ C(i, k+1) / Σ C(i, k) sur les années observées.
          </p>
        </Card>
      )}
    </div>
  );
}

/**
 * Module d'actuariat (cahier §3.7) : tarification, marges de prime, provisionnement.
 */
export default function ActuarialPage({ currentUser }) {
  const [tab, setTab] = useState('pricing');
  const [portfolio, setPortfolio] = useState(null);
  const [models, setModels] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    getActuarialPortfolio().then(setPortfolio).catch((e) => setError(e.message));
    getActuarialModels().then(setModels).catch(() => {});
  }, [currentUser]);

  if (!currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Connectez-vous pour utiliser le module d'actuariat.
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-100">
          <Umbrella size={18} className="text-[#38BDF8]" />
          <h1 className="text-base font-extrabold">Actuariat · assurance automobile</h1>
        </div>
        {portfolio && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 max-w-2xl">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Portefeuille synthétique de {fmt(portfolio.policies)} contrats ({fmt(portfolio.claims)} sinistres, fréquence {fmt(portfolio.frequency, 3)},
              S/P {pct(portfolio.loss_ratio, 0)}) généré à partir de paramètres connus.
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${tab === key ? 'border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10' : 'border-[#334155] text-slate-400'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}

      {tab === 'pricing' && <PricingTab portfolio={portfolio} models={models} />}
      {tab === 'margins' && <MarginsTab portfolio={portfolio} />}
      {tab === 'reserving' && <ReservingTab />}
    </main>
  );
}
