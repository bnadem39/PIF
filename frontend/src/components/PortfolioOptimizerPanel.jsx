import React, { useEffect, useMemo, useState } from 'react';
import { Target, Play, X, AlertTriangle } from 'lucide-react';
import { optimizePortfolio } from '../services/aiService';

const NAMES = {
  min_variance: 'Variance minimale',
  max_sharpe: 'Sharpe maximal',
  equal_weight: 'Équipondéré',
  current: 'Portefeuille actuel'
};
const COLORS = { min_variance: '#38BDF8', max_sharpe: '#10B981', equal_weight: '#A78BFA', current: '#F59E0B' };
const pct = (v, d = 1) => `${(v * 100).toFixed(d)} %`;
const signedPct = (v) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)} pts`;

/** Frontière efficiente (volatilité en abscisse, rendement en ordonnée) avec les portefeuilles calculés. */
function FrontierChart({ result }) {
  const W = 420, H = 230, P = { l: 46, r: 12, t: 10, b: 30 };
  const pts = [
    ...result.frontier.map((f) => [f.volatility, f.expected_return]),
    ...result.portfolios.map((p) => [p.volatility, p.expected_return]),
    ...result.assets.map((a) => [a.volatility, a.expected_return])
  ];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = 0, x1 = Math.max(...xs) * 1.08;
  const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.08 || 0.01;
  const y0 = Math.min(...ys) - yPad, y1 = Math.max(...ys) + yPad;
  const sx = (v) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r);
  const sy = (v) => H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const ticks = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Frontière efficiente">
      {ticks(y0, y1, 4).map((t) => (
        <g key={`y${t}`}>
          <line x1={P.l} x2={W - P.r} y1={sy(t)} y2={sy(t)} stroke="#1E293B" />
          <text x={P.l - 5} y={sy(t) + 3} fontSize="9" fill="#64748B" textAnchor="end">{(t * 100).toFixed(0)}%</text>
        </g>
      ))}
      {ticks(x0, x1, 4).map((t) => (
        <text key={`x${t}`} x={sx(t)} y={H - P.b + 13} fontSize="9" fill="#64748B" textAnchor="middle">{(t * 100).toFixed(0)}%</text>
      ))}
      <text x={(W + P.l) / 2} y={H - 3} fontSize="9" fill="#94A3B8" textAnchor="middle">Volatilité annualisée</text>
      {y0 < 0 && y1 > 0 && <line x1={P.l} x2={W - P.r} y1={sy(0)} y2={sy(0)} stroke="#334155" strokeDasharray="3 3" />}
      {result.frontier.length > 1 && (
        <polyline
          fill="none" stroke="#38BDF8" strokeWidth="2" strokeOpacity="0.6"
          points={result.frontier.map((f) => `${sx(f.volatility)},${sy(f.expected_return)}`).join(' ')}
        />
      )}
      {result.assets.map((a) => (
        <g key={a.symbol}>
          <circle cx={sx(a.volatility)} cy={sy(a.expected_return)} r="3" fill="#475569" />
          <text
            x={sx(a.volatility) + (sx(a.volatility) > W - 70 ? -5 : 5)}
            y={sy(a.expected_return) + 3}
            fontSize="9" fill="#94A3B8"
            textAnchor={sx(a.volatility) > W - 70 ? 'end' : 'start'}
          >{a.symbol}</text>
        </g>
      ))}
      {result.portfolios.map((p) => (
        <g key={p.name}>
          <circle cx={sx(p.volatility)} cy={sy(p.expected_return)} r="5.5" fill={COLORS[p.name]} stroke="#0F172A" strokeWidth="1.5">
            <title>{`${NAMES[p.name]} : rendement ${pct(p.expected_return)}, volatilité ${pct(p.volatility)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}

/**
 * Optimiseur de portefeuille (Markowitz, cahier §3.4.1) : propose des allocations calculées sur les cours connus
 * à la date simulée et les compare au portefeuille détenu.
 */
export default function PortfolioOptimizerPanel({ simulatedDate, heldSymbols = [], allSymbols = [] }) {
  const [symbols, setSymbols] = useState(heldSymbols.length >= 2 ? heldSymbols : []);
  const [input, setInput] = useState('');
  const [lookbackDays, setLookbackDays] = useState(365);
  const [maxWeight, setMaxWeight] = useState(0.4);
  const [riskFree, setRiskFree] = useState(0.07);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('max_sharpe');
  const heldKey = heldSymbols.join(',');

  // Les positions arrivent après le premier rendu : elles pré-remplissent la sélection si elle est vide
  useEffect(() => {
    if (heldSymbols.length >= 2) setSymbols((prev) => (prev.length ? prev : heldSymbols.slice(0, 15)));
  }, [heldKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestions = useMemo(() => {
    const q = input.trim().toUpperCase();
    if (!q) return [];
    return allSymbols.filter((s) => s.includes(q) && !symbols.includes(s)).slice(0, 6);
  }, [input, allSymbols, symbols]);

  const add = (s) => {
    const v = s.trim().toUpperCase();
    if (v && !symbols.includes(v) && symbols.length < 15) setSymbols([...symbols, v]);
    setInput('');
  };

  const run = () => {
    setLoading(true);
    setError(null);
    optimizePortfolio({ date: simulatedDate, symbols: symbols.length ? symbols : null, lookbackDays, maxWeight, riskFree })
      .then((r) => { setResult(r); setView('max_sharpe'); })
      .catch((e) => { setError(e.message); setResult(null); })
      .finally(() => setLoading(false));
  };

  const selected = result?.portfolios.find((p) => p.name === view);
  const current = result?.portfolios.find((p) => p.name === 'current');
  const minWeightNeeded = symbols.length ? 1 / symbols.length : 0;

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden mb-5">
      <div className="px-4 py-3 bg-[#0A0E17] border-b border-[#1E293B] flex items-center gap-2">
        <Target size={16} className="text-[#38BDF8]" />
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Optimiseur de portefeuille (Markowitz)</h2>
        <span className="text-[10px] text-slate-500 ml-auto">Cours connus au {simulatedDate}</span>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-4">
        {/* Paramètres */}
        <div className="space-y-3 text-xs">
          <div>
            <div className="text-slate-400 mb-1">Actifs ({symbols.length}/15)</div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {symbols.map((s) => (
                <span key={s} className="flex items-center gap-1 bg-[#1E293B] text-slate-200 font-mono text-[11px] px-1.5 py-0.5 rounded">
                  {s}
                  <button onClick={() => setSymbols(symbols.filter((x) => x !== s))} className="text-slate-500 hover:text-rose-400" aria-label={`Retirer ${s}`}>
                    <X size={11} />
                  </button>
                </span>
              ))}
              {symbols.length === 0 && <span className="text-[11px] text-slate-500">Vide : les positions détenues seront utilisées.</span>}
            </div>
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') add(suggestions[0] || input); }}
                placeholder="Ajouter un actif (ex : SFBT, BTC-USD)"
                className="w-full bg-[#0B1120] border border-[#1E293B] rounded px-2 py-1.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#38BDF8]"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-[#0B1120] border border-[#1E293B] rounded shadow-lg">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => add(s)} className="block w-full text-left px-2 py-1 font-mono text-[11px] text-slate-300 hover:bg-[#1E293B]">{s}</button>
                  ))}
                </div>
              )}
            </div>
            {heldSymbols.length > 0 && (
              <button onClick={() => setSymbols([...new Set([...symbols, ...heldSymbols])].slice(0, 15))} className="mt-1 text-[10px] text-[#38BDF8] hover:underline">
                Ajouter les positions détenues
              </button>
            )}
          </div>

          <label className="block">
            <div className="flex justify-between text-slate-400"><span>Historique</span><b className="text-slate-200 font-mono">{lookbackDays} jours</b></div>
            <input type="range" min={120} max={1095} step={15} value={lookbackDays} onChange={(e) => setLookbackDays(+e.target.value)} className="w-full accent-[#38BDF8]" />
          </label>
          <label className="block">
            <div className="flex justify-between text-slate-400"><span>Poids maximal par actif</span><b className="text-slate-200 font-mono">{pct(maxWeight, 0)}</b></div>
            <input type="range" min={0.1} max={1} step={0.05} value={maxWeight} onChange={(e) => setMaxWeight(+e.target.value)} className="w-full accent-[#38BDF8]" />
            {maxWeight < minWeightNeeded && (
              <div className="text-[10px] text-amber-400">Avec {symbols.length} actifs, il faut au moins {pct(minWeightNeeded, 0)}.</div>
            )}
          </label>
          <label className="block">
            <div className="flex justify-between text-slate-400"><span>Taux sans risque (TMM)</span><b className="text-slate-200 font-mono">{pct(riskFree, 2)}</b></div>
            <input type="range" min={0} max={0.12} step={0.0025} value={riskFree} onChange={(e) => setRiskFree(+e.target.value)} className="w-full accent-[#38BDF8]" />
          </label>

          <button
            onClick={run}
            disabled={loading || maxWeight < minWeightNeeded}
            className="w-full flex items-center justify-center gap-2 bg-[#0369A1] hover:bg-[#0284C7] disabled:opacity-40 text-white font-semibold rounded py-2"
          >
            <Play size={13} /> {loading ? 'Calcul…' : 'Optimiser'}
          </button>
          {error && <div className="text-[11px] text-rose-400">{error}</div>}
          <p className="text-[10px] text-slate-500 leading-snug">
            Rendements et risques estimés sur l'historique passé uniquement (covariance de Ledoit-Wolf, sans vente à découvert).
            Les performances passées ne préjugent pas des performances futures.
          </p>
        </div>

        {/* Résultats */}
        {!result ? (
          <div className="flex items-center justify-center text-xs text-slate-500 border border-dashed border-[#1E293B] rounded-lg min-h-[200px] p-4 text-center">
            Choisissez au moins deux actifs, ou laissez vide pour optimiser vos positions, puis lancez le calcul.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {result.portfolios.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setView(p.name)}
                    className={`text-left rounded-lg border p-2 transition-colors ${view === p.name ? 'border-[#38BDF8] bg-[#0B1120]' : 'border-[#1E293B] hover:border-slate-600'}`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[p.name] }} />{NAMES[p.name]}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      R {pct(p.expected_return)} · σ {pct(p.volatility)} · Sharpe <b className="text-slate-200">{p.sharpe.toFixed(2)}</b>
                    </div>
                  </button>
                ))}
              </div>
              <FrontierChart result={result} />
              <div className="text-[10px] text-slate-500">
                {result.observations} séances communes du {result.from} au {result.date}. Points gris : actifs seuls ; courbe : frontière efficiente.
              </div>
            </div>

            {selected && (
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Allocation · {NAMES[selected.name]}</div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-500 text-left">
                      <th className="font-normal pb-1">Actif</th>
                      <th className="font-normal pb-1 text-right">Poids</th>
                      {current && selected.name !== 'current' && <th className="font-normal pb-1 text-right">Actuel</th>}
                      <th className="font-normal pb-1 text-right">Part du risque</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selected.weights).sort((a, b) => b[1] - a[1]).map(([s, w]) => (
                      <tr key={s} className="border-t border-[#1E293B]">
                        <td className="py-1 font-mono text-slate-200">{s}</td>
                        <td className="py-1 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-16 h-1.5 bg-[#1E293B] rounded overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${w * 100}%`, background: COLORS[selected.name] }} />
                            </div>
                            <span className="font-mono text-slate-200 w-12">{pct(w)}</span>
                          </div>
                        </td>
                        {current && selected.name !== 'current' && (
                          <td className="py-1 text-right font-mono text-slate-400">{pct(current.weights[s] || 0)}</td>
                        )}
                        <td className="py-1 text-right font-mono text-slate-400">{selected.risk_contribution ? pct(selected.risk_contribution[s] || 0) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {current && selected.name !== 'current' && (
                  <div className="mt-3 text-[11px] text-slate-300 bg-[#0B1120] border border-[#1E293B] rounded-lg p-2 leading-snug">
                    Par rapport à votre portefeuille : volatilité {signedPct(selected.volatility - current.volatility)}{' '}
                    et rendement attendu {signedPct(selected.expected_return - current.expected_return)}.
                    {Object.values(current.weights).some((w) => w > result.max_weight + 1e-6) && (
                      <div className="flex gap-1 mt-1 text-[10px] text-amber-300/90">
                        <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                        Votre portefeuille dépasse le poids maximal de {pct(result.max_weight, 0)} sur au moins un actif : il n'est pas dans l'ensemble optimisé.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
