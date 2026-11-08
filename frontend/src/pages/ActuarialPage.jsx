import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Play, Info } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getRealSymbols } from '../services/realMarketService';
import { analyzeAsset } from '../services/actuarialService';

const pct = (v, d = 2) => (v == null ? '-' : `${(v * 100).toFixed(d)} %`);
const num = (v, d = 2) => (v == null ? '-' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d }));

const W = 560;
const H = 180;
const PAD = { l: 44, r: 10, t: 10, b: 20 };

function scale(min, max, a, b) {
  const span = max - min || 1;
  return (v) => a + ((v - min) / span) * (b - a);
}

/** Courbes SVG simples : series = [{ values, color, fill? }], axe x = indice. */
function LineChart({ series, yFormat, invertY = false }) {
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const n = Math.max(...series.map((s) => s.values.length));
  const x = scale(0, Math.max(n - 1, 1), PAD.l, W - PAD.r);
  const y = invertY ? scale(min, max, PAD.t, H - PAD.b) : scale(min, max, H - PAD.b, PAD.t);
  const path = (vals) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
      {[min, (min + max) / 2, max].map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1E293B" />
          <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#64748B">{yFormat(t)}</text>
        </g>
      ))}
      {series.map((s, i) => (
        <g key={i}>
          {s.fill && (
            <path d={`${path(s.values)} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={s.color} opacity="0.18" />
          )}
          <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.width || 1.5} strokeDasharray={s.dash} />
        </g>
      ))}
    </svg>
  );
}

/** Éventail Monte-Carlo : bandes 5-95 % et 25-75 %, médiane. */
function FanChart({ fan }) {
  const lows = fan.map((f) => f.p5);
  const highs = fan.map((f) => f.p95);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const x = scale(0, Math.max(fan.length - 1, 1), PAD.l, W - PAD.r);
  const y = scale(min, max, H - PAD.b, PAD.t);
  const line = (k) => fan.map((f, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(f[k]).toFixed(1)}`).join(' ');
  const band = (lo, hi) =>
    `${line(hi)} ${fan.map((f, i) => `L${x(fan.length - 1 - i).toFixed(1)},${y(fan[fan.length - 1 - i][lo]).toFixed(1)}`).join(' ')} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
      {[min, (min + max) / 2, max].map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1E293B" />
          <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#64748B">{num(t, 1)}</text>
        </g>
      ))}
      <path d={band('p5', 'p95')} fill="#38BDF8" opacity="0.15" />
      <path d={band('p25', 'p75')} fill="#38BDF8" opacity="0.3" />
      <path d={line('p50')} fill="none" stroke="#38BDF8" strokeWidth="1.8" />
    </svg>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3" title={hint}>
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-lg font-bold text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
      <h2 className="text-xs font-bold text-slate-300 mb-2">{title}</h2>
      {children}
    </section>
  );
}

const SELECT = 'w-full bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200';

/** simulatedDate : date de la séance de la salle ; l'analyse n'utilise jamais de cours postérieurs (pas de fuite d'information). */
export default function ActuarialPage({ simulatedDate }) {
  const [symbols, setSymbols] = useState([]);
  const [form, setForm] = useState({
    symbol: '', confidence: 0.95, horizonDays: 10, forecastDays: 30, simulations: 5000,
    volatilityModel: 'garch', distribution: 'normal', drift: 'zero'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRealSymbols('ALL')
      .then((list) => {
        setSymbols(list);
        setForm((f) => (f.symbol || !list.length ? f : { ...f, symbol: list[0].ticker }));
      })
      .catch(() => setSymbols([]));
  }, []);

  const set = (key) => (e) => {
    const raw = e.target.value;
    const numeric = ['confidence', 'horizonDays', 'forecastDays', 'simulations'].includes(key);
    setForm((f) => ({ ...f, [key]: numeric ? Number(raw) : raw }));
  };

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const endDate = /^\d{4}-\d{2}-\d{2}$/.test(simulatedDate || '') ? simulatedDate : undefined;
      setResult(await analyzeAsset({ ...form, endDate }));
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const r = result?.risk;
  const mc = result?.monte_carlo;
  const vf = result?.volatility_forecast;
  const confLabel = useMemo(() => `${Math.round(form.confidence * 1000) / 10} %`, [form.confidence]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader
        icon={Activity}
        title="Actuariat des actifs"
        subtitle="Risque et prévision d'un actif à partir de son historique : volatilité, VaR, Expected Shortfall, drawdown maximal, Monte-Carlo."
        right={
          <span className="flex items-center gap-1 text-[11px] text-slate-400" title="La Bourse n'est pas assurable : le module ne calcule ni prime ni sinistre.">
            <Info size={13} /> Pas de primes ni de sinistres
          </span>
        }
      />

      <Card title="Paramètres">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
          <label>Actif
            <select className={SELECT} value={form.symbol} onChange={set('symbol')}>
              {symbols.map((s) => <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>)}
            </select>
          </label>
          <label>Niveau de confiance
            <select className={SELECT} value={form.confidence} onChange={set('confidence')}>
              <option value={0.9}>90 %</option><option value={0.95}>95 %</option><option value={0.99}>99 %</option>
            </select>
          </label>
          <label>Horizon VaR (jours)
            <input type="number" min="1" max="60" className={SELECT} value={form.horizonDays} onChange={set('horizonDays')} />
          </label>
          <label>Prévision (jours)
            <input type="number" min="1" max="90" className={SELECT} value={form.forecastDays} onChange={set('forecastDays')} />
          </label>
          <label>Simulations
            <select className={SELECT} value={form.simulations} onChange={set('simulations')}>
              <option value={1000}>1 000</option><option value={5000}>5 000</option><option value={20000}>20 000</option>
            </select>
          </label>
          <label>Modèle de volatilité
            <select className={SELECT} value={form.volatilityModel} onChange={set('volatilityModel')}>
              <option value="garch">GARCH(1,1)</option><option value="ewma">EWMA (RiskMetrics)</option>
            </select>
          </label>
          <label>Lois des chocs
            <select className={SELECT} value={form.distribution} onChange={set('distribution')}>
              <option value="normal">Normale</option><option value="student">Student (queues épaisses)</option>
            </select>
          </label>
          <label>Dérive
            <select className={SELECT} value={form.drift} onChange={set('drift')}>
              <option value="zero">Nulle (neutre)</option><option value="historical">Historique</option>
            </select>
          </label>
        </div>
        <button
          onClick={run}
          disabled={loading || !form.symbol}
          className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#38BDF8] text-[#0B1120] disabled:opacity-40"
        >
          <Play size={13} /> {loading ? 'Calcul…' : "Analyser l'actif"}
        </button>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </Card>

      {result && (
        <>
          <p className="text-xs text-slate-400">
            {result.symbol} - {result.period.observations} séances du {result.period.start} au {result.period.end}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Volatilité annualisée" value={pct(r.annualized_volatility)} hint="Écart-type des rendements journaliers x racine de 252" />
            <Kpi label={`VaR ${confLabel} - 1 jour`} value={pct(r.var_historical_1d)} hint="Perte dépassée dans (1 - confiance) des séances, méthode historique" />
            <Kpi label={`VaR ${confLabel} - ${r.horizon_days} j`} value={pct(r.var_historical_horizon)} hint="VaR 1 jour x racine de l'horizon" />
            <Kpi label={`Expected Shortfall ${confLabel}`} value={pct(r.expected_shortfall_1d)} hint="Perte moyenne les jours où la VaR est dépassée" />
            <Kpi label="VaR paramétrique 1 jour" value={pct(r.var_parametric_1d)} hint="Hypothèse de rendements normaux" />
            <Kpi label="Drawdown maximal" value={pct(r.drawdown.max_drawdown)} hint={`Du ${r.drawdown.peak_date} au ${r.drawdown.trough_date}`} />
            <Kpi label="Drawdown actuel" value={pct(r.drawdown.current_drawdown)} />
            <Kpi label="Kurtosis (excès)" value={num(r.excess_kurtosis)} hint="Plus il est élevé, plus les queues de distribution sont épaisses" />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Drawdown historique">
              <LineChart series={[{ values: r.drawdown.series.map((v) => -v), color: '#F43F5E', fill: true }]} yFormat={(v) => pct(v, 0)} />
            </Card>
            <Card title={`Volatilité annualisée prévue (${vf.model === 'garch' ? 'GARCH(1,1)' : 'EWMA'})`}>
              <LineChart
                series={[
                  { values: vf.annualized_path, color: '#A78BFA' },
                  { values: vf.annualized_path.map(() => vf.current_annualized), color: '#64748B', dash: '4 3', width: 1 }
                ]}
                yFormat={(v) => pct(v, 0)}
              />
              <p className="text-[11px] text-slate-500 mt-1">Pointillé : volatilité historique moyenne. Un modèle GARCH revient progressivement vers sa moyenne de long terme.</p>
            </Card>
          </div>

          <Card title={`Simulation Monte-Carlo sur ${mc.horizon_days} jours (${num(mc.simulations, 0)} trajectoires)`}>
            <FanChart fan={mc.fan} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs text-slate-300">
              <div>Prix médian : <b>{num(mc.median_price)}</b></div>
              <div>Intervalle 90 % : <b>{num(mc.price_p5)} - {num(mc.price_p95)}</b></div>
              <div>Probabilité de perte : <b>{pct(mc.prob_loss, 1)}</b></div>
              <div>Drawdown moyen attendu : <b>{pct(mc.expected_max_drawdown, 1)}</b></div>
              <div>VaR {confLabel} : <b>{pct(mc.var_terminal)}</b></div>
              <div>Expected Shortfall : <b>{pct(mc.expected_shortfall_terminal)}</b></div>
              <div>Drawdown (95e centile) : <b>{pct(mc.max_drawdown_p95, 1)}</b></div>
            </div>
          </Card>
          <p className="text-[11px] text-slate-500">{result.note}</p>
        </>
      )}
    </div>
  );
}
