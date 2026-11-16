import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Play, Info, HelpCircle } from 'lucide-react';
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

/** Petite bulle d'aide : clic (ou toucher) sur le « ? » pour lire l'explication en mots simples. */
function Help({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-middle ml-1">
      <button
        type="button"
        aria-label="Aide"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        onBlur={() => setOpen(false)}
        className="text-slate-500 hover:text-sky-300"
      >
        <HelpCircle size={12} />
      </button>
      {open && (
        <span role="tooltip" className="absolute z-20 left-0 top-5 w-56 max-w-[70vw] rounded-lg border border-[#334155] bg-[#0B1120] p-2 text-[11px] leading-snug font-normal text-slate-200 shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}

function Kpi({ label, value, help }) {
  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
      <div className="text-[11px] text-slate-400">{label}{help && <Help text={help} />}</div>
      <div className="text-lg font-bold text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}

/** Niveau de risque d'après la volatilité annuelle : moins de 15 % faible, jusqu'à 30 % moyen, au-delà élevé. */
function riskVerdict(vol) {
  if (vol == null) return null;
  if (vol < 0.15) return { level: 'Faible', box: 'border-emerald-500/40 bg-emerald-500/10', text: 'text-emerald-300', line: 'Ce titre varie peu : ses prix sont plutôt stables.' };
  if (vol < 0.30) return { level: 'Moyen', box: 'border-amber-500/40 bg-amber-500/10', text: 'text-amber-300', line: 'Ce titre varie de façon normale pour la Bourse : des hausses et des baisses sont à prévoir.' };
  return { level: 'Élevé', box: 'border-rose-500/40 bg-rose-500/10', text: 'text-rose-300', line: 'Ce titre varie beaucoup : il peut gagner ou perdre vite.' };
}

/** « 1 séance sur 20 » à partir du niveau de confiance (95 % -> 1 sur 20). */
const oneIn = (confidence) => Math.max(2, Math.round(1 / Math.max(1 - confidence, 0.001)));
const tnd = (fraction, base = 1000) => `${num(Math.abs(fraction) * base, 0)} TND`;

/** Le résultat expliqué en phrases, sans sigle : pour quelqu'un qui n'est pas du métier. */
function PlainSummary({ result, confidence }) {
  const r = result.risk;
  const mc = result.monte_carlo;
  const v = riskVerdict(r.annualized_volatility);
  const dailyMove = r.annualized_volatility / Math.sqrt(252);
  const n = oneIn(confidence);
  const dd = r.drawdown;
  const nearTop = dd.current_drawdown < 0.005;

  return (
    <section className="space-y-3">
      <div className={`rounded-xl border p-4 ${v.box}`}>
        <div className="text-[11px] text-slate-400">Niveau de risque de {result.symbol}</div>
        <div className={`text-2xl font-extrabold ${v.text}`}>{v.level}</div>
        <p className="text-xs text-slate-300 mt-1">{v.line}</p>
        <p className="text-[11px] text-slate-500 mt-1">Repère : sous 15 % de volatilité annuelle le risque est faible, entre 15 % et 30 % moyen, au-dessus élevé. Ici : {pct(r.annualized_volatility, 1)}.</p>
      </div>

      <Card title="Ce que ça veut dire, en clair">
        <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc pl-4">
          <li>
            <b>Au quotidien</b> : le prix bouge en général d'environ <b>±{pct(dailyMove, 1)}</b> par séance.
          </li>
          <li>
            <b>Une mauvaise séance</b> : environ 1 séance sur {n}, la perte dépasse <b>{pct(r.var_historical_1d)}</b>.
            Sur 1 000 TND investis, cela fait plus de <b>{tnd(r.var_historical_1d)}</b> perdus en une journée.
          </li>
          <li>
            <b>Les très mauvaises séances</b> (celles-là) : la perte moyenne est de <b>{pct(r.expected_shortfall_1d)}</b>, soit environ <b>{tnd(r.expected_shortfall_1d)}</b> pour 1 000 TND.
          </li>
          <li>
            <b>Sur {r.horizon_days} jours</b> : environ 1 fois sur {n}, la perte dépasse <b>{pct(r.var_historical_horizon)}</b>.
          </li>
          <li>
            <b>Dans l'histoire</b> : le titre a déjà perdu jusqu'à <b>{pct(dd.max_drawdown, 1)}</b> entre un sommet et un creux.{' '}
            {nearTop ? "Aujourd'hui il est proche de son plus haut." : <>Aujourd'hui il est à <b>{pct(dd.current_drawdown, 1)}</b> sous son dernier sommet.</>}
          </li>
          <li>
            <b>Dans {mc.horizon_days} jours</b> : dans 9 cas sur 10, le prix se situera entre <b>{num(mc.price_p5)}</b> et <b>{num(mc.price_p95)}</b> (valeur centrale {num(mc.median_price)}).
            Probabilité de finir en baisse : <b>{pct(mc.prob_loss, 0)}</b>.
          </li>
        </ul>
        <p className="text-[11px] text-slate-500 mt-3">
          Ces chiffres mesurent l'incertitude du passé : ils ne disent pas si le titre va monter ou baisser.
        </p>
      </Card>
    </section>
  );
}

const GLOSSARY = [
  ['Volatilité', "À quel point le prix bouge. 20 % par an veut dire que le prix s'écarte typiquement d'environ 20 % de sa tendance sur une année."],
  ['VaR (Value at Risk)', "La perte qu'on ne dépasse pas dans la plupart des séances (par exemple 19 séances sur 20). Les séances restantes sont pires."],
  ['Expected Shortfall', "La perte moyenne les mauvais jours, ceux où la VaR est dépassée. C'est une image plus réaliste du pire."],
  ['Drawdown', "La baisse depuis le dernier plus haut. Le drawdown maximal est la plus grosse chute passée entre un sommet et un creux."],
  ['Kurtosis', "Mesure si les gros chocs sont plus fréquents qu'on ne le croit. Plus il est élevé, plus les grosses surprises arrivent souvent."],
  ['GARCH / EWMA', "Deux méthodes pour estimer la volatilité des prochains jours à partir des derniers mouvements : après une agitation, la volatilité reste élevée un moment puis redescend."],
  ['Monte-Carlo', "On simule des milliers de futurs possibles du prix au hasard, avec la volatilité estimée. La zone où tombent la plupart d'entre eux donne une fourchette, pas une prédiction."],
  ['Dérive', "La tendance supposée : « nulle » suppose que le prix ne monte ni ne baisse en moyenne, « historique » reprend la tendance passée."],
];

function Glossary() {
  return (
    <details className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-3">
      <summary className="text-xs font-bold text-slate-300 cursor-pointer">Comprendre les termes</summary>
      <dl className="mt-3 space-y-2 text-xs">
        {GLOSSARY.map(([term, def]) => (
          <div key={term}>
            <dt className="font-semibold text-sky-300">{term}</dt>
            <dd className="text-slate-400 leading-relaxed">{def}</dd>
          </div>
        ))}
      </dl>
    </details>
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
  const [ran, setRan] = useState(null); // réglages utilisés pour l'analyse affichée
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
      const data = await analyzeAsset({ ...form, endDate });
      setRan({ ...form });
      setResult(data);
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
  const confLabel = useMemo(() => `${Math.round((ran?.confidence ?? form.confidence) * 1000) / 10} %`, [ran, form.confidence]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <PageHeader
        icon={Activity}
        title="Actuariat des actifs"
        subtitle="À quel point ce titre est risqué, et dans quelle zone son prix peut se trouver dans les prochains jours. Les détails techniques sont plus bas."
        right={
          <span className="flex items-center gap-1 text-[11px] text-slate-400" title="La Bourse n'est pas assurable : le module ne calcule ni prime ni sinistre.">
            <Info size={13} /> Pas de primes ni de sinistres
          </span>
        }
      />

      <Card title="Paramètres">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <label>Actif à analyser
            <select className={SELECT} value={form.symbol} onChange={set('symbol')}>
              {symbols.map((s) => <option key={s.ticker} value={s.ticker}>{s.ticker} - {s.name}</option>)}
            </select>
          </label>
          <label>Niveau de prudence
            <Help text="Plus il est haut, plus on regarde loin dans les mauvais cas. 95 % veut dire : on regarde les pertes qui n'arrivent que 1 séance sur 20." />
            <select className={SELECT} value={form.confidence} onChange={set('confidence')}>
              <option value={0.9}>90 % (1 séance sur 10)</option><option value={0.95}>95 % (1 séance sur 20)</option><option value={0.99}>99 % (1 séance sur 100)</option>
            </select>
          </label>
          <label>Durée de la prévision (jours)
            <Help text="Nombre de jours de bourse à simuler pour obtenir la fourchette de prix." />
            <input type="number" min="1" max="90" className={SELECT} value={form.forecastDays} onChange={set('forecastDays')} />
          </label>
        </div>
        <details className="mt-3">
          <summary className="text-[11px] text-slate-400 cursor-pointer">Réglages avancés (facultatif)</summary>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300 mt-3">
            <label>Horizon de la perte (jours)
              <Help text="Sur combien de jours on mesure la perte possible (par exemple 10 jours de bourse)." />
              <input type="number" min="1" max="60" className={SELECT} value={form.horizonDays} onChange={set('horizonDays')} />
            </label>
            <label>Nombre de simulations
              <Help text="Combien de futurs possibles on tire au hasard. Plus il y en a, plus le résultat est stable, mais plus c'est long." />
              <select className={SELECT} value={form.simulations} onChange={set('simulations')}>
                <option value={1000}>1 000</option><option value={5000}>5 000</option><option value={20000}>20 000</option>
              </select>
            </label>
            <label>Méthode d'estimation de la volatilité
              <Help text="GARCH et EWMA estiment l'agitation des prochains jours à partir des derniers mouvements. GARCH est plus fin, EWMA est plus simple." />
              <select className={SELECT} value={form.volatilityModel} onChange={set('volatilityModel')}>
                <option value="garch">GARCH(1,1)</option><option value="ewma">EWMA (RiskMetrics)</option>
              </select>
            </label>
            <label>Type de chocs
              <Help text="Normale : les gros chocs sont rares. Student : les gros chocs sont plus fréquents, ce qui est plus prudent." />
              <select className={SELECT} value={form.distribution} onChange={set('distribution')}>
                <option value="normal">Normale</option><option value="student">Student (gros chocs plus fréquents)</option>
              </select>
            </label>
            <label>Tendance supposée
              <Help text="Nulle : on suppose que le prix ne monte ni ne baisse en moyenne. Historique : on reprend la tendance passée." />
              <select className={SELECT} value={form.drift} onChange={set('drift')}>
                <option value="zero">Nulle (neutre)</option><option value="historical">Historique</option>
              </select>
            </label>
          </div>
        </details>
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
          <PlainSummary result={result} confidence={ran?.confidence ?? form.confidence} />

          <h2 className="text-xs font-bold text-slate-400 pt-2">Détails techniques</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Volatilité annualisée" value={pct(r.annualized_volatility)} help="À quel point le prix bouge sur une année. Plus c'est haut, plus le titre est agité." />
            <Kpi label={`Perte max. (VaR) ${confLabel} - 1 jour`} value={pct(r.var_historical_1d)} help="La perte qu'on ne dépasse pas dans la plupart des séances. Les séances restantes sont pires." />
            <Kpi label={`Perte max. (VaR) ${confLabel} - ${r.horizon_days} j`} value={pct(r.var_historical_horizon)} help="La même idée sur plusieurs jours de suite." />
            <Kpi label={`Perte moyenne les mauvais jours (ES) ${confLabel}`} value={pct(r.expected_shortfall_1d)} help="La perte moyenne quand les mauvais jours arrivent, c'est-à-dire quand la VaR est dépassée." />
            <Kpi label="Perte max. (VaR) en loi normale" value={pct(r.var_parametric_1d)} help="Le même calcul en supposant que les gros chocs sont rares. S'il est plus bas que la VaR ci-dessus, les chocs sont plus fréquents que prévu." />
            <Kpi label="Pire chute passée (drawdown max.)" value={pct(r.drawdown.max_drawdown)} help={`La plus grosse baisse entre un sommet et un creux, du ${r.drawdown.peak_date} au ${r.drawdown.trough_date}.`} />
            <Kpi label="Écart au dernier sommet" value={pct(r.drawdown.current_drawdown)} help="De combien le prix est aujourd'hui sous son dernier plus haut." />
            <Kpi label="Gros chocs (kurtosis)" value={num(r.excess_kurtosis)} help="Plus ce nombre est haut, plus les grosses surprises arrivent souvent. 0 veut dire des chocs rares comme dans une loi normale." />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Baisse depuis le dernier sommet (drawdown)">
              <LineChart series={[{ values: r.drawdown.series.map((v) => -v), color: '#F43F5E', fill: true }]} yFormat={(v) => pct(v, 0)} />
            </Card>
            <Card title={`Agitation prévue des prochains jours (${vf.model === 'garch' ? 'GARCH(1,1)' : 'EWMA'})`}>
              <LineChart
                series={[
                  { values: vf.annualized_path, color: '#A78BFA' },
                  { values: vf.annualized_path.map(() => vf.current_annualized), color: '#64748B', dash: '4 3', width: 1 }
                ]}
                yFormat={(v) => pct(v, 0)}
              />
              <p className="text-[11px] text-slate-500 mt-1">Pointillé : agitation moyenne du passé. L'agitation prévue revient peu à peu vers cette moyenne.</p>
            </Card>
          </div>

          <Card title={`Où le prix peut se trouver dans ${mc.horizon_days} jours (${num(mc.simulations, 0)} futurs simulés)`}>
            <FanChart fan={mc.fan} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs text-slate-300">
              <div>Prix central : <b>{num(mc.median_price)}</b></div>
              <div>9 cas sur 10 entre : <b>{num(mc.price_p5)} et {num(mc.price_p95)}</b></div>
              <div>Probabilité de finir en baisse : <b>{pct(mc.prob_loss, 1)}</b></div>
              <div>Baisse moyenne attendue en route : <b>{pct(mc.expected_max_drawdown, 1)}</b></div>
              <div>Perte max. (VaR) {confLabel} : <b>{pct(mc.var_terminal)}</b></div>
              <div>Perte moyenne les mauvais cas : <b>{pct(mc.expected_shortfall_terminal)}</b></div>
              <div>Baisse en route (cas défavorable, 1 sur 20) : <b>{pct(mc.max_drawdown_p95, 1)}</b></div>
            </div>
          </Card>
          <Glossary />
          <p className="text-[11px] text-slate-500">{result.note}</p>
        </>
      )}
    </div>
  );
}
