import React, { useEffect, useMemo, useState } from 'react';
import { History, Play, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { getBacktestStrategies, runBacktest } from '../services/backtestService';
import { getRealSymbols } from '../services/realMarketService';

// Une couleur par stratégie, dans l'ordre du catalogue (achat-conservation en gris : c'est la référence)
const STRATEGY_COLOR = {
  BUY_AND_HOLD: '#94A3B8',
  SMA_CROSSOVER: '#38BDF8',
  RSI_REVERSION: '#F59E0B',
  MACD_CROSSOVER: '#A78BFA',
  BOLLINGER_REVERSION: '#F472B6',
  AI_SIGNAL: '#34D399'
};
const DEFAULT_SELECTION = ['BUY_AND_HOLD', 'SMA_CROSSOVER', 'RSI_REVERSION', 'AI_SIGNAL'];

const pct = (v, d = 1) => (v == null ? '-' : `${(v * 100).toFixed(d)} %`);
const num = (v, d = 2) => (v == null ? '-' : v.toFixed(d));
const money = (v) => (v == null ? '-' : Math.round(v).toLocaleString('fr-FR'));

// Colonnes du tableau comparatif : better = sens dans lequel la valeur est meilleure
const METRICS = [
  { key: 'totalReturn', label: 'Rendement', fmt: pct, better: 1 },
  { key: 'cagr', label: 'Rend. annualisé', fmt: pct, better: 1 },
  { key: 'volatility', label: 'Volatilité', fmt: pct, better: -1 },
  { key: 'sharpe', label: 'Sharpe', fmt: num, better: 1 },
  { key: 'sortino', label: 'Sortino', fmt: num, better: 1 },
  { key: 'maxDrawdown', label: 'Perte max.', fmt: pct, better: 1 },
  { key: 'calmar', label: 'Calmar', fmt: num, better: 1 },
  { key: 'trades', label: 'Trades', fmt: (v) => v },
  { key: 'winRate', label: 'Réussite', fmt: (v) => pct(v, 0), better: 1 },
  { key: 'profitFactor', label: 'Profit factor', fmt: num, better: 1 },
  { key: 'exposure', label: 'Exposition', fmt: (v) => pct(v, 0) },
  { key: 'beta', label: 'Bêta', fmt: num },
  { key: 'totalCosts', label: 'Frais', fmt: money, better: -1 }
];

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

/** Courbes multi-séries en SVG (valeur du portefeuille ou drawdown), axe des dates partagé. */
function LineChart({ series, valueKey, height = 220, format, zeroLine = false }) {
  const [hover, setHover] = useState(null);
  const width = 900;
  const pad = { l: 56, r: 8, t: 8, b: 20 };
  const n = series[0]?.points.length || 0;
  if (!n) return null;

  let min = Infinity;
  let max = -Infinity;
  series.forEach((s) => s.points.forEach((p) => {
    min = Math.min(min, p[valueKey]);
    max = Math.max(max, p[valueKey]);
  }));
  if (zeroLine) max = Math.max(max, 0);
  if (max === min) max = min + 1;
  const x = (i) => pad.l + (i / Math.max(1, n - 1)) * (width - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const dateTicks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - pad.l) / (width - pad.l - pad.r)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="#1E293B" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#64748B">{format(v)}</text>
          </g>
        ))}
        {dateTicks.map((i) => (
          <text key={i} x={x(i)} y={height - 4} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize="10" fill="#64748B">
            {series[0].points[i].date}
          </text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth={s.key.startsWith('BUY_AND_HOLD') ? 1.5 : 2}
            strokeDasharray={s.key.startsWith('BUY_AND_HOLD') ? '4 3' : undefined}
            points={s.points.map((p, i) => `${x(i).toFixed(1)},${y(p[valueKey]).toFixed(1)}`).join(' ')}
          />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="#475569" />}
      </svg>
      {hover != null && (
        <div className="absolute top-1 left-16 bg-[#0B1120]/95 border border-[#334155] rounded-lg px-2 py-1.5 text-[11px] pointer-events-none">
          <div className="text-slate-400 mb-0.5">{series[0].points[hover].date}</div>
          {series.map((s) => (
            <div key={s.key} className="flex justify-between gap-3">
              <span style={{ color: s.color }}>{s.label}</span>
              <span className="font-mono text-slate-200">{format(s.points[hover][valueKey])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ParamInputs({ info, values, onChange }) {
  if (!info.params.length) return null;
  return (
    <div className="grid grid-cols-2 gap-1.5 mt-1.5 pl-5">
      {info.params.map((p) => (
        <label key={p.name} className="text-[10px] text-slate-500">
          {p.label}
          <input
            type="number"
            min={p.min}
            max={p.max}
            step={p.integer ? 1 : 0.01}
            value={values[p.name] ?? p.defaultValue}
            onChange={(e) => onChange(p.name, e.target.value === '' ? undefined : Number(e.target.value))}
            className="w-full mt-0.5 bg-[#1E293B] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-slate-200"
          />
        </label>
      ))}
    </div>
  );
}

/**
 * Backtesting & comparaison de stratégies (cahier §3.2).
 */
export default function BacktestPage({ currentUser }) {
  const [catalog, setCatalog] = useState([]);
  const [symbols, setSymbols] = useState([]);
  const [symbol, setSymbol] = useState('BIAT');
  const [startDate, setStartDate] = useState('2020-07-01');
  const [endDate, setEndDate] = useState('');
  const [capital, setCapital] = useState(100000);
  const [commission, setCommission] = useState(0.4);
  const [slippage, setSlippage] = useState(0.1);
  const [selected, setSelected] = useState(DEFAULT_SELECTION);
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    getBacktestStrategies().then(setCatalog).catch((e) => setError(e.message));
    getRealSymbols('ALL').then((list) => setSymbols(Array.isArray(list) ? list : [])).catch(() => {});
  }, [currentUser]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runBacktest({
        symbol,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        initialCapital: capital,
        commissionPct: commission,
        slippagePct: slippage,
        strategies: catalog.filter((c) => selected.includes(c.type)).map((c) => ({ type: c.type, params: params[c.type] || {} }))
      });
      setResult(data);
      const best = [...data.results].sort((a, b) => (b.metrics.sharpe ?? -99) - (a.metrics.sharpe ?? -99))[0];
      setFocus(best?.key || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const series = useMemo(() => (result?.results || []).map((r) => ({
    key: r.key,
    label: r.label,
    color: STRATEGY_COLOR[r.type],
    points: r.equity
  })), [result]);

  // Meilleure valeur de chaque colonne, pour la mettre en évidence
  const best = useMemo(() => {
    const out = {};
    METRICS.filter((m) => m.better).forEach((m) => {
      const vals = (result?.results || []).map((r) => r.metrics[m.key]).filter((v) => v != null);
      if (vals.length > 1) out[m.key] = m.better > 0 ? Math.max(...vals) : Math.min(...vals);
    });
    return out;
  }, [result]);

  if (!currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-slate-400">
        Connectez-vous pour lancer un backtest.
      </main>
    );
  }

  const focused = result?.results.find((r) => r.key === focus);
  const inputCls = 'w-full bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200';

  return (
    <main className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-100">
        <History size={18} className="text-[#38BDF8]" />
        <h1 className="text-base font-extrabold">Backtesting & comparaison de stratégies</h1>
      </div>

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-3 items-start">
        {/* ── Paramètres ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <Card title="Actif et période">
            <div className="space-y-2 text-[11px] text-slate-400">
              <label className="block">
                Actif
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className={`${inputCls} mt-0.5`}>
                  {(symbols.length ? symbols : [{ ticker: 'BIAT', name: 'BIAT' }]).map((s) => (
                    <option key={s.ticker} value={s.ticker}>{s.ticker} · {s.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>Début<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls} mt-0.5`} /></label>
                <label>Fin<input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${inputCls} mt-0.5`} /></label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label>Capital<input type="number" min="1000" step="1000" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className={`${inputCls} mt-0.5`} /></label>
                <label>Frais %<input type="number" min="0" max="5" step="0.05" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className={`${inputCls} mt-0.5`} /></label>
                <label>Slippage %<input type="number" min="0" max="5" step="0.05" value={slippage} onChange={(e) => setSlippage(Number(e.target.value))} className={`${inputCls} mt-0.5`} /></label>
              </div>
            </div>
          </Card>

          <Card title="Stratégies">
            <div className="space-y-2.5">
              {catalog.map((c) => (
                <div key={c.type}>
                  <label className="flex items-center gap-2 text-xs text-slate-200" title={c.description}>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.type)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, c.type] : s.filter((x) => x !== c.type)))}
                    />
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: STRATEGY_COLOR[c.type] }} />
                    {c.label}
                  </label>
                  {selected.includes(c.type) && (
                    <ParamInputs
                      info={c}
                      values={params[c.type] || {}}
                      onChange={(name, v) => setParams((p) => ({ ...p, [c.type]: { ...(p[c.type] || {}), [name]: v } }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={run}
              disabled={!selected.length || loading}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-[#38BDF8] text-[#0B1120] disabled:opacity-40"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
              {loading ? 'Calcul en cours…' : 'Lancer le backtest'}
            </button>
          </Card>

          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 px-1">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>
              Les décisions sont prises à la clôture et exécutées à l'ouverture suivante, frais et slippage compris.
              Positions acheteuses uniquement (pas de vente à découvert), titres entiers.
            </span>
          </div>
        </div>

        {/* ── Résultats ─────────────────────────────────────────── */}
        <div className="space-y-3 min-w-0">
          {!result && (
            <div className="border border-dashed border-[#1E293B] rounded-xl p-8 text-center text-xs text-slate-500">
              Choisissez un actif, une période et des stratégies, puis lancez le backtest.
            </div>
          )}

          {result && (
            <>
              {result.warnings.map((w) => (
                <div key={w} className="flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
                </div>
              ))}

              <Card
                title={`Valeur du portefeuille · ${result.symbol} · ${result.startDate} → ${result.endDate}`}
                right={<span className="text-[10px] text-slate-500">{result.tradingDays} séances</span>}
              >
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1 text-[11px]">
                  {series.map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5 text-slate-300">
                      <span className="inline-block w-3 h-0.5" style={{ background: s.color }} />{s.label}
                    </span>
                  ))}
                </div>
                <LineChart series={series} valueKey="equity" format={(v) => money(v)} />
              </Card>

              <Card title="Drawdown (perte depuis le plus haut)">
                <LineChart series={series} valueKey="drawdown" height={140} format={(v) => pct(v, 0)} zeroLine />
              </Card>

              <Card title="Comparaison des performances">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="text-left px-2 py-1">Stratégie</th>
                        {METRICS.map((m) => <th key={m.key} className="text-right px-2 py-1 whitespace-nowrap">{m.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((r) => (
                        <tr
                          key={r.key}
                          onClick={() => setFocus(r.key)}
                          className={`border-t border-[#1E293B] text-slate-300 cursor-pointer hover:bg-[#1E293B]/50 ${focus === r.key ? 'bg-[#1E293B]/70' : ''}`}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <span className="inline-block w-2 h-2 rounded-sm mr-1.5" style={{ background: STRATEGY_COLOR[r.type] }} />
                            {r.label}
                          </td>
                          {METRICS.map((m) => {
                            const v = r.metrics[m.key];
                            const isBest = best[m.key] != null && v === best[m.key];
                            return (
                              <td key={m.key} className={`px-2 py-1.5 text-right font-mono whitespace-nowrap ${isBest ? 'text-emerald-300 font-bold' : ''}`}>
                                {m.fmt(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  En vert : meilleure valeur de la colonne. Montants en devise de l'actif. Cliquez sur une stratégie pour voir ses transactions.
                </p>
              </Card>

              {focused && (
                <Card title={`Transactions · ${focused.label}`} right={<span className="text-[10px] text-slate-500">{focused.metrics.trades} au total</span>}>
                  {focused.trades.length === 0 ? (
                    <div className="text-xs text-slate-500">Aucune transaction sur la période.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                      <table className="w-full text-[11px]">
                        <thead className="text-slate-500 sticky top-0 bg-[#0F172A]">
                          <tr>
                            <th className="text-left px-2 py-1">Entrée</th>
                            <th className="text-right px-2 py-1">Prix</th>
                            <th className="text-left px-2 py-1">Sortie</th>
                            <th className="text-right px-2 py-1">Prix</th>
                            <th className="text-right px-2 py-1">Quantité</th>
                            <th className="text-right px-2 py-1">P&L</th>
                            <th className="text-right px-2 py-1">Rendement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...focused.trades].reverse().map((t) => (
                            <tr key={t.entryDate} className="border-t border-[#1E293B] text-slate-300">
                              <td className="px-2 py-1 font-mono">{t.entryDate}</td>
                              <td className="px-2 py-1 text-right font-mono">{num(t.entryPrice)}</td>
                              <td className="px-2 py-1 font-mono">{t.open ? <span className="text-slate-500">en cours</span> : t.exitDate}</td>
                              <td className="px-2 py-1 text-right font-mono">{num(t.exitPrice)}</td>
                              <td className="px-2 py-1 text-right font-mono">{t.quantity}</td>
                              <td className={`px-2 py-1 text-right font-mono ${t.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{money(t.pnl)}</td>
                              <td className={`px-2 py-1 text-right font-mono ${t.returnPct >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{pct(t.returnPct)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
