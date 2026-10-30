import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Play, RefreshCw, Save, Trash2, Info, BrainCircuit } from 'lucide-react';
import {
  getStressScenarios,
  getStressBanks,
  getStressModels,
  runStressTest,
  createStressScenario,
  deleteStressScenario
} from '../services/stressTestService';

// Bornes identiques à ShocksDto (backend) et ai/stress/scenarios.py
const SHOCK_FIELDS = [
  { key: 'rateShockBp', label: 'Hausse des taux (pb)', min: 0, max: 500, step: 25, def: 0 },
  { key: 'equityDropPct', label: 'Baisse des actions (%)', min: 0, max: 60, step: 5, def: 0 },
  { key: 'unemploymentIncreasePp', label: 'Hausse du chômage (pts)', min: 0, max: 10, step: 0.5, def: 0 },
  { key: 'gdpGrowthPct', label: 'Croissance du PIB (%)', min: -10, max: 5, step: 0.5, def: 1 },
  { key: 'defaultRateMultiplier', label: 'Multiplicateur de défaut', min: 1, max: 5, step: 0.1, def: 1 },
  { key: 'assetQualityDowngrade', label: 'Dégradation des actifs (crans)', min: 0, max: 3, step: 1, def: 0 },
  { key: 'revenueDropPct', label: 'Baisse des revenus (%)', min: 0, max: 50, step: 5, def: 0 }
];
const DEFAULT_SHOCKS = Object.fromEntries(SHOCK_FIELDS.map((f) => [f.key, f.def]));

const TYPE_LABEL = { conventional: 'Conventionnelle', islamic: 'Islamique' };
const TYPE_COLOR = { conventional: '#38BDF8', islamic: '#A78BFA' };
const STATUS_STYLE = {
  CRITIQUE: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
  VULNERABLE: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  RESILIENTE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
};
const MODEL_LABEL = { ridge: 'Ridge', random_forest: 'Forêt aléatoire', xgboost: 'XGBoost' };
const TARGET_LABEL = { npl_increase: 'Hausse des créances douteuses', credit_loss_rate: 'Taux de perte de crédit' };

const pct = (v, d = 1) => (v == null ? '-' : `${(v * 100).toFixed(d)} %`);
const mtnd = (v) => (v == null ? '-' : `${Math.round(v).toLocaleString('fr-FR')} M`);

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

function StatusChip({ status }) {
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${STATUS_STYLE[status] || ''}`}>{status}</span>
  );
}

/** Ratio CET1 avant / après par banque, avec le minimum réglementaire en pointillé. */
function Cet1Bars({ results, minRatio }) {
  const max = Math.max(0.16, ...results.flatMap((r) => [r.before.cet1_ratio, r.after.cet1_ratio]));
  const x = (v) => `${(Math.max(0, v) / max) * 100}%`;
  return (
    <div className="space-y-1.5">
      {results.map((r) => (
        <div key={r.bank_id} className="grid grid-cols-[64px_1fr_120px] items-center gap-2 text-[11px]">
          <span className="font-mono" style={{ color: TYPE_COLOR[r.bank_type] }}>{r.bank_id}</span>
          <div className="relative h-4 bg-[#1E293B]/50 rounded">
            <div className="absolute top-0 h-1.5 rounded bg-slate-500/70" style={{ width: x(r.before.cet1_ratio) }} />
            <div
              className="absolute bottom-0 h-2.5 rounded"
              style={{ width: x(r.after.cet1_ratio), background: TYPE_COLOR[r.bank_type] }}
            />
            <div className="absolute inset-y-[-2px] border-l border-dashed border-rose-400" style={{ left: x(minRatio) }} />
          </div>
          <span className="font-mono text-right text-slate-300 whitespace-nowrap">
            {pct(r.before.cet1_ratio)} → <span className={r.after.cet1_ratio < minRatio ? 'text-rose-300' : ''}>{pct(r.after.cet1_ratio)}</span>
          </span>
        </div>
      ))}
      <div className="flex gap-4 pt-1 text-[10px] text-slate-500">
        <span><span className="inline-block w-3 h-1.5 bg-slate-500/70 mr-1" />Avant</span>
        <span><span className="inline-block w-3 h-2 mr-1" style={{ background: TYPE_COLOR.conventional }} />Après (conv.)</span>
        <span><span className="inline-block w-3 h-2 mr-1" style={{ background: TYPE_COLOR.islamic }} />Après (isl.)</span>
        <span><span className="inline-block w-3 border-t border-dashed border-rose-400 mr-1 align-middle" />Minimum {pct(minRatio, 0)}</span>
      </div>
    </div>
  );
}

/** Barres horizontales centrées sur zéro (cascade de capital, contributions SHAP). */
function DivergingBars({ rows, format, oneSided = false }) {
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  if (oneSided) {
    return (
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_40px] items-center gap-2 text-[11px]">
            <span className="text-slate-300 truncate" title={r.label}>{r.label}</span>
            <div className="h-2.5 rounded-sm bg-[#38BDF8]" style={{ width: `${(r.value / max) * 100}%` }} />
            <span className="font-mono text-right text-slate-300">{format(r.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_64px] items-center gap-2 text-[11px]">
          <span className="text-slate-300 truncate" title={r.hint || r.label}>{r.label}</span>
          <div className="relative h-3">
            <div className="absolute inset-y-0 left-1/2 border-l border-slate-600" />
            <div
              className={`absolute inset-y-0 rounded-sm ${r.value >= 0 ? (r.positiveBad ? 'bg-rose-400' : 'bg-emerald-400') : (r.positiveBad ? 'bg-emerald-400' : 'bg-rose-400')}`}
              style={r.value >= 0
                ? { left: '50%', width: `${(r.value / max) * 50}%` }
                : { right: '50%', width: `${(-r.value / max) * 50}%` }}
            />
          </div>
          <span className="font-mono text-right text-slate-300">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

function TypeSummary({ summary, minRatio }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {['conventional', 'islamic'].filter((t) => summary?.[t]).map((t) => {
        const s = summary[t];
        return (
          <div key={t} className="rounded-lg border border-[#1E293B] p-2.5" style={{ borderLeft: `3px solid ${TYPE_COLOR[t]}` }}>
            <div className="text-xs font-bold text-slate-100 mb-1.5">Banques {TYPE_LABEL[t].toLowerCase()}s ({s.count})</div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <dt className="text-slate-500">CET1 moyen</dt>
              <dd className={`font-mono text-right ${s.avg_cet1_after < minRatio ? 'text-rose-300' : 'text-slate-200'}`}>
                {pct(s.avg_cet1_before)} → {pct(s.avg_cet1_after)}
              </dd>
              <dt className="text-slate-500">LCR moyen après</dt>
              <dd className="font-mono text-right text-slate-200">{s.avg_lcr_after.toFixed(2)}</dd>
              <dt className="text-slate-500">NPL moyen après</dt>
              <dd className="font-mono text-right text-slate-200">{pct(s.avg_npl_after)}</dd>
              <dt className="text-slate-500">Perte de crédit</dt>
              <dd className="font-mono text-right text-slate-200">{pct(s.avg_credit_loss_rate, 2)}</dd>
              <dt className="text-slate-500">Hors seuils</dt>
              <dd className="font-mono text-right text-slate-200">{s.vulnerable} / {s.count}</dd>
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function ModelsPanel({ models }) {
  if (!models) return <div className="text-xs text-slate-500">Chargement des modèles…</div>;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Validation croisée à 5 plis sur {models.n_samples.toLocaleString('fr-FR')} observations
        ({models.data_source === 'synthetic' ? 'données synthétiques' : models.data_source}). Le meilleur R² est retenu.
      </p>
      <table className="w-full text-[11px]">
        <thead className="text-slate-500">
          <tr>
            <th className="text-left py-1">Cible (R²)</th>
            {Object.keys(MODEL_LABEL).map((m) => <th key={m} className="text-right py-1">{MODEL_LABEL[m]}</th>)}
          </tr>
        </thead>
        <tbody>
          {Object.entries(models.comparison).map(([target, scores]) => (
            <tr key={target} className="border-t border-[#1E293B] text-slate-300">
              <td className="py-1">{TARGET_LABEL[target] || target}</td>
              {Object.keys(MODEL_LABEL).map((m) => (
                <td key={m} className={`py-1 text-right font-mono ${models.selected[target] === m ? 'text-emerald-300 font-bold' : ''}`}>
                  {scores[m]?.r2.toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <div className="text-[11px] text-slate-400 mb-1">Importance globale SHAP (taux de perte de crédit)</div>
        <DivergingBars
          rows={(models.global_importance.credit_loss_rate || []).slice(0, 8).map((g) => ({
            key: g.feature, label: g.label, value: g.importance
          }))}
          oneSided
          format={(v) => (v * 100).toFixed(2)}
        />
      </div>
    </div>
  );
}

/**
 * AI Stress Testing (cahier §3.5) avec explications SHAP (§3.6).
 */
export default function StressTestPage({ currentUser }) {
  const isAdmin = currentUser?.role === 'ROLE_ADMIN';
  const [scenarios, setScenarios] = useState([]);
  const [banksInfo, setBanksInfo] = useState(null);
  const [models, setModels] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [useCustom, setUseCustom] = useState(false);
  const [shocks, setShocks] = useState(DEFAULT_SHOCKS);
  const [bankType, setBankType] = useState('all');
  const [minRatio, setMinRatio] = useState(0.1);
  const [result, setResult] = useState(null);
  const [activeScenario, setActiveScenario] = useState(0);
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newScenario, setNewScenario] = useState({ code: '', name: '' });

  const loadScenarios = useCallback(async () => {
    const list = await getStressScenarios();
    setScenarios(list);
    setSelectedIds((ids) => (ids.length ? ids : list.filter((s) => ['RECESSION', 'COMBINED_SEVERE'].includes(s.code)).map((s) => s.id)));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadScenarios().catch((e) => setError(e.message));
    getStressBanks().then(setBanksInfo).catch((e) => setError(e.message));
    getStressModels().then(setModels).catch(() => {});
  }, [currentUser, loadScenarios]);

  const bankIds = useMemo(() => {
    if (!banksInfo || bankType === 'all') return undefined;
    return banksInfo.banks.filter((b) => b.bank_type === bankType).map((b) => b.bank_id);
  }, [banksInfo, bankType]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runStressTest({
        scenarioIds: selectedIds,
        customShocks: useCustom ? shocks : undefined,
        bankIds,
        minCapitalRatio: minRatio
      });
      setResult(data);
      setActiveScenario(0);
      const first = data.scenarios[0]?.results || [];
      setSelectedBank(first.reduce((a, b) => (!a || b.after.cet1_ratio < a.after.cet1_ratio ? b : a), null)?.bank_id || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = async () => {
    setError(null);
    try {
      await createStressScenario({ code: newScenario.code.trim().toUpperCase(), name: newScenario.name.trim(), shocks });
      setNewScenario({ code: '', name: '' });
      await loadScenarios();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeScenario = async (id) => {
    setError(null);
    try {
      await deleteStressScenario(id);
      setSelectedIds((ids) => ids.filter((x) => x !== id));
      await loadScenarios();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Connectez-vous pour lancer un stress test.
      </main>
    );
  }

  const sc = result?.scenarios?.[activeScenario];
  const bank = sc?.results.find((r) => r.bank_id === selectedBank) || sc?.results[0];
  const canRun = (selectedIds.length > 0 || useCustom) && !loading;

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-100">
          <Landmark size={18} className="text-[#38BDF8]" />
          <h1 className="text-base font-extrabold">AI Stress Testing bancaire</h1>
        </div>
        {banksInfo?.illustrative && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 max-w-2xl">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Profils bancaires illustratifs et modèles entraînés sur données synthétiques : résultats pédagogiques,
              pas une évaluation des banques réelles.
            </span>
          </div>
        )}
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-3 items-start">
        {/* ── Paramètres ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <Card title="Scénarios">
            <div className="space-y-1">
              {scenarios.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(s.id)}
                    onChange={(e) => setSelectedIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                  />
                  <span className="flex-1">{s.name}</span>
                  {!s.preset && isAdmin && (
                    <button onClick={() => removeScenario(s.id)} className="text-slate-500 hover:text-rose-400" title="Supprimer">
                      <Trash2 size={12} />
                    </button>
                  )}
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs text-slate-200 pt-1 border-t border-[#1E293B]">
                <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} />
                Scénario personnalisé
              </label>
            </div>
          </Card>

          {useCustom && (
            <Card title="Chocs personnalisés" right={
              <button onClick={() => setShocks(DEFAULT_SHOCKS)} className="text-[10px] text-slate-500 hover:text-slate-300">Réinitialiser</button>
            }>
              <div className="space-y-2">
                {SHOCK_FIELDS.map((f) => (
                  <div key={f.key}>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{f.label}</span>
                      <span className="font-mono text-slate-200">{shocks[f.key]}</span>
                    </div>
                    <input
                      type="range" min={f.min} max={f.max} step={f.step} value={shocks[f.key]}
                      onChange={(e) => setShocks({ ...shocks, [f.key]: Number(e.target.value) })}
                      className="w-full accent-[#38BDF8]"
                    />
                  </div>
                ))}
                {isAdmin && (
                  <div className="pt-2 border-t border-[#1E293B] space-y-1.5">
                    <div className="text-[11px] text-slate-400">Enregistrer ce scénario (admin)</div>
                    <input
                      placeholder="CODE" value={newScenario.code}
                      onChange={(e) => setNewScenario({ ...newScenario, code: e.target.value })}
                      className="w-full bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200"
                    />
                    <input
                      placeholder="Nom" value={newScenario.name}
                      onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                      className="w-full bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200"
                    />
                    <button
                      disabled={!newScenario.code.trim() || !newScenario.name.trim()}
                      onClick={saveScenario}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[#1E293B] border border-[#334155] text-slate-200 hover:border-[#38BDF8] disabled:opacity-40"
                    >
                      <Save size={12} /> Enregistrer
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="Périmètre">
            <div className="space-y-2 text-xs text-slate-200">
              <div className="flex gap-1">
                {[['all', 'Toutes'], ['conventional', 'Conventionnelles'], ['islamic', 'Islamiques']].map(([v, l]) => (
                  <button
                    key={v} onClick={() => setBankType(v)}
                    className={`flex-1 px-2 py-1 rounded border text-[11px] ${bankType === v ? 'border-[#38BDF8] text-[#38BDF8]' : 'border-[#334155] text-slate-400'}`}
                  >{l}</button>
                ))}
              </div>
              <label className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                Ratio de solvabilité minimal
                <select
                  value={minRatio} onChange={(e) => setMinRatio(Number(e.target.value))}
                  className="bg-[#1E293B] border border-[#334155] rounded px-1.5 py-1 text-xs text-slate-200"
                >
                  {[0.08, 0.1, 0.12].map((v) => <option key={v} value={v}>{pct(v, 0)}</option>)}
                </select>
              </label>
              <button
                onClick={run} disabled={!canRun}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-[#38BDF8] text-[#0B1120] disabled:opacity-40"
              >
                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                {loading ? 'Calcul en cours…' : 'Lancer le stress test'}
              </button>
            </div>
          </Card>

          <Card title="Modèles IA" right={<BrainCircuit size={14} className="text-slate-500" />}>
            <ModelsPanel models={models} />
          </Card>
        </div>

        {/* ── Résultats ─────────────────────────────────────────── */}
        <div className="space-y-3 min-w-0">
          {!sc && (
            <div className="border border-dashed border-[#1E293B] rounded-xl p-8 text-center text-xs text-slate-500">
              Choisissez un ou plusieurs scénarios puis lancez le stress test.
            </div>
          )}

          {sc && (
            <>
              {result.scenarios.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {result.scenarios.map((s, i) => (
                    <button
                      key={s.scenario.code + i} onClick={() => setActiveScenario(i)}
                      className={`px-2.5 py-1 rounded-lg text-xs border ${i === activeScenario ? 'border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/10' : 'border-[#334155] text-slate-400'}`}
                    >{s.scenario.name}</button>
                  ))}
                </div>
              )}

              <Card title={`Conventionnelles vs islamiques · ${sc.scenario.name}`}>
                <TypeSummary summary={sc.summary_by_type} minRatio={minRatio} />
                {sc.type_comparison && (
                  <div className="mt-3">
                    <div className="text-[11px] text-slate-400 mb-1">
                      Pourquoi {sc.type_comparison.conventional_bank} perd plus (ou moins) que {sc.type_comparison.islamic_bank} :
                      écart SHAP sur le taux de perte de crédit (positif = plus de pertes côté conventionnel)
                    </div>
                    <DivergingBars
                      rows={sc.type_comparison.drivers.map((d) => ({ key: d.feature, label: d.label, value: d.difference, positiveBad: true }))}
                      format={(v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}`}
                    />
                  </div>
                )}
              </Card>

              <Card title="Ratio CET1 avant / après le choc">
                <Cet1Bars results={sc.results} minRatio={minRatio} />
              </Card>

              <Card title="Résultats par banque">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="text-left px-2 py-1">Banque</th>
                        <th className="text-right px-2 py-1">CET1</th>
                        <th className="text-right px-2 py-1">LCR</th>
                        <th className="text-right px-2 py-1">NPL</th>
                        <th className="text-right px-2 py-1">Pertes nettes</th>
                        <th className="text-right px-2 py-1">Besoin en capital</th>
                        <th className="text-left px-2 py-1">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sc.results.map((r) => (
                        <tr
                          key={r.bank_id} onClick={() => setSelectedBank(r.bank_id)}
                          className={`border-t border-[#1E293B] text-slate-300 cursor-pointer hover:bg-[#1E293B]/50 ${bank?.bank_id === r.bank_id ? 'bg-[#1E293B]/70' : ''}`}
                        >
                          <td className="px-2 py-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: TYPE_COLOR[r.bank_type] }} />
                            {r.name}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono">{pct(r.before.cet1_ratio)} → {pct(r.after.cet1_ratio)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{r.before.lcr.toFixed(2)} → {r.after.lcr.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{pct(r.before.npl_ratio)} → {pct(r.after.npl_ratio)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{mtnd(r.losses.total_net)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{r.capital_shortfall > 0 ? mtnd(r.capital_shortfall) : '-'}</td>
                          <td className="px-2 py-1.5"><StatusChip status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">Montants en millions TND. Cliquez sur une banque pour son détail.</p>
              </Card>

              {bank && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Card title={`Variation du capital · ${bank.name}`}>
                    <DivergingBars
                      rows={bank.waterfall.map((w) => ({ key: w.key, label: w.label, value: w.value }))}
                      format={(v) => `${v >= 0 ? '+' : ''}${Math.round(v)}`}
                    />
                    <div className="mt-2 text-[11px] text-slate-400 font-mono">
                      CET1 {mtnd(bank.before.cet1)} → {mtnd(bank.after.cet1)} · RWA {mtnd(bank.before.rwa)} → {mtnd(bank.after.rwa)}
                    </div>
                  </Card>
                  <Card title={`Explication SHAP · ${bank.name}`}>
                    {bank.explanation ? (
                      <>
                        <div className="text-[11px] text-slate-400 mb-1.5">
                          Taux de perte de crédit prédit {pct(bank.explanation.prediction, 2)} (moyenne des scénarios d'entraînement {pct(bank.explanation.base_value, 2)}).
                          Chaque barre (en points de %) montre l'écart dû à un facteur par rapport à cette moyenne : rouge = plus de pertes, vert = moins.
                        </div>
                        <DivergingBars
                          rows={bank.explanation.contributions.map((c) => ({
                            key: c.feature, label: c.label, value: c.shap, positiveBad: true, hint: `${c.label} = ${c.value}`
                          }))}
                          format={(v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}`}
                        />
                      </>
                    ) : <div className="text-xs text-slate-500">Pas d'explication disponible.</div>}
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
