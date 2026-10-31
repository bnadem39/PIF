"""
Optimisation de portefeuille et détection d'anomalies (cahier §3.4.1).

  POST /api/ai/optimize    cours alignés de plusieurs actifs -> portefeuilles de Markowitz (variance minimale,
                           Sharpe maximal), frontière efficiente et comparaison avec les poids actuels
  POST /api/ai/anomalies   chandeliers d'un actif -> séances anormales (rendement, volume, amplitude)

Les deux calculs n'utilisent que les cours transmis, que le backend coupe à la date simulée : aucune donnée future.
"""
from typing import Dict, List, Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from scipy.optimize import minimize

router = APIRouter(prefix="/api/ai", tags=["portfolio-lab"])

TRADING_DAYS = 252


# ---------------------------------------------------------------------------
# Optimisation de Markowitz
# ---------------------------------------------------------------------------
class OptimizeRequest(BaseModel):
    symbols: List[str] = Field(..., min_length=2, max_length=30)
    # closes[i][j] : clôture de l'actif j à la séance i (séances communes, ordre chronologique)
    closes: List[List[float]] = Field(..., min_length=40)
    periods_per_year: List[int] = Field(default_factory=list)
    risk_free: float = Field(0.0, ge=0, le=0.5)
    max_weight: float = Field(0.4, gt=0, le=1)
    current_weights: Optional[Dict[str, float]] = None
    frontier_points: int = Field(20, ge=5, le=60)


def _shrunk_covariance(returns: np.ndarray) -> np.ndarray:
    """Covariance de Ledoit-Wolf (plus stable que l'empirique quand l'historique est court)."""
    from sklearn.covariance import LedoitWolf
    return LedoitWolf().fit(returns).covariance_


def _stats(w, mu, cov, rf):
    ret = float(w @ mu)
    vol = float(np.sqrt(max(w @ cov @ w, 0.0)))
    return ret, vol, (ret - rf) / vol if vol > 0 else 0.0


def _solve(objective, n, max_weight, extra=()):
    bounds = [(0.0, max_weight)] * n
    cons = [{"type": "eq", "fun": lambda w: w.sum() - 1.0}, *extra]
    x0 = np.full(n, 1.0 / n)
    res = minimize(objective, x0, method="SLSQP", bounds=bounds, constraints=cons,
                   options={"maxiter": 500, "ftol": 1e-10})
    w = np.clip(res.x, 0, None)
    return w / w.sum()


def _portfolio(name, w, symbols, mu, cov, rf, rc=True):
    ret, vol, sharpe = _stats(w, mu, cov, rf)
    out = {
        "name": name,
        "weights": {s: round(float(x), 4) for s, x in zip(symbols, w) if x > 1e-4},
        "expected_return": round(ret, 4),
        "volatility": round(vol, 4),
        "sharpe": round(sharpe, 3),
    }
    if rc and vol > 0:
        # Contribution de chaque actif au risque total (somme = 100 %)
        contrib = w * (cov @ w) / (vol ** 2)
        out["risk_contribution"] = {s: round(float(c), 4) for s, c in zip(symbols, contrib) if w[symbols.index(s)] > 1e-4}
    return out


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    prices = np.asarray(req.closes, dtype=float)
    n = len(req.symbols)
    if prices.ndim != 2 or prices.shape[1] != n:
        raise HTTPException(422, "Chaque séance doit contenir un cours par actif.")
    if np.any(prices <= 0):
        raise HTTPException(422, "Cours nuls ou négatifs.")
    if req.max_weight * n < 1:
        raise HTTPException(422, f"Poids maximal trop faible : avec {n} actifs, il faut au moins {100 / n:.0f} %.")

    rets = np.diff(np.log(prices), axis=0)
    ppy = np.asarray(req.periods_per_year or [TRADING_DAYS] * n, dtype=float)
    # Annualisation par actif (252 séances pour la bourse, 365 jours pour les cryptos)
    mu = rets.mean(axis=0) * ppy
    scale = np.sqrt(ppy)
    cov = _shrunk_covariance(rets) * np.outer(scale, scale)
    rf = req.risk_free

    w_min = _solve(lambda w: w @ cov @ w, n, req.max_weight)
    w_sharpe = _solve(lambda w: -(w @ mu - rf) / np.sqrt(max(w @ cov @ w, 1e-12)), n, req.max_weight)
    w_equal = np.full(n, 1.0 / n)

    portfolios = [
        _portfolio("min_variance", w_min, req.symbols, mu, cov, rf),
        _portfolio("max_sharpe", w_sharpe, req.symbols, mu, cov, rf),
        _portfolio("equal_weight", w_equal, req.symbols, mu, cov, rf),
    ]
    if req.current_weights:
        cw = np.array([max(0.0, req.current_weights.get(s, 0.0)) for s in req.symbols])
        if cw.sum() > 0:
            portfolios.append(_portfolio("current", cw / cw.sum(), req.symbols, mu, cov, rf))

    # Frontière efficiente : variance minimale pour chaque rendement cible atteignable
    r_lo = float(w_min @ mu)
    r_hi = float(_solve(lambda w: -(w @ mu), n, req.max_weight) @ mu)
    frontier = []
    if r_hi > r_lo + 1e-6:
        for target in np.linspace(r_lo, r_hi, req.frontier_points):
            w = _solve(lambda w: w @ cov @ w, n, req.max_weight,
                       extra=({"type": "eq", "fun": lambda w, t=target: w @ mu - t},))
            ret, vol, _ = _stats(w, mu, cov, rf)
            frontier.append({"expected_return": round(ret, 4), "volatility": round(vol, 4)})

    assets = []
    for j, s in enumerate(req.symbols):
        assets.append({"symbol": s, "expected_return": round(float(mu[j]), 4),
                       "volatility": round(float(np.sqrt(cov[j, j])), 4)})
    corr = cov / np.outer(np.sqrt(np.diag(cov)), np.sqrt(np.diag(cov)))
    return {
        "observations": int(rets.shape[0]),
        "risk_free": rf,
        "max_weight": req.max_weight,
        "portfolios": portfolios,
        "frontier": frontier,
        "assets": assets,
        "correlation": [[round(float(x), 3) for x in row] for row in corr],
        "method": "Markowitz long-only, covariance de Ledoit-Wolf, rendements logarithmiques annualisés",
    }


# ---------------------------------------------------------------------------
# Détection d'anomalies
# ---------------------------------------------------------------------------
class AnomalyCandle(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class AnomalyRequest(BaseModel):
    ticker: str
    candles: List[AnomalyCandle] = Field(..., min_length=30)
    window: int = Field(60, ge=20, le=250)
    threshold: float = Field(4.0, ge=2.0, le=10.0)
    limit: int = Field(15, ge=1, le=100)


def _robust_z(x: float, hist: np.ndarray) -> float:
    """Écart à la médiane des séances précédentes, en unités de dispersion.

    La dispersion retenue est le maximum de l'écart-type et du MAD normalisé : le MAD seul sous-estime la dispersion
    des rendements à queues épaisses et signalerait trop de séances, l'écart-type seul serait gonflé par un choc passé.
    """
    med = np.median(hist)
    scale = max(float(np.median(np.abs(hist - med)) * 1.4826), float(np.std(hist)))
    if scale < 1e-12:
        return 0.0
    return float((x - med) / scale)


def detect_anomalies(candles: List[AnomalyCandle], window: int, threshold: float) -> List[dict]:
    close = np.array([c.close for c in candles], dtype=float)
    vol = np.array([c.volume for c in candles], dtype=float)
    rng = np.array([(c.high - c.low) / c.close if c.close > 0 else 0.0 for c in candles], dtype=float)
    ret = np.zeros_like(close)
    ret[1:] = np.log(close[1:] / np.where(close[:-1] > 0, close[:-1], np.nan))
    ret = np.nan_to_num(ret)
    log_vol = np.log1p(vol)
    has_volume = vol.sum() > 0

    out = []
    for i in range(window, len(candles)):
        # Statistiques calculées sur les séances PRÉCÉDENTES uniquement
        lo = i - window
        z_ret = _robust_z(ret[i], ret[lo:i])
        z_rng = _robust_z(rng[i], rng[lo:i])
        z_vol = _robust_z(log_vol[i], log_vol[lo:i]) if has_volume else 0.0
        reasons = []
        if abs(z_ret) >= threshold:
            reasons.append({"kind": "return", "z": round(z_ret, 1),
                            "text": f"Variation de {np.expm1(ret[i]) * 100:+.1f} % ({abs(z_ret):.1f} écarts-types)"})
        if z_vol >= threshold and vol[i] > 0:
            avg = np.mean(vol[lo:i]) or 1
            reasons.append({"kind": "volume", "z": round(z_vol, 1),
                            "text": f"Volume {vol[i] / avg:.1f} fois la moyenne des {window} séances"})
        if z_rng >= threshold + 1:
            reasons.append({"kind": "range", "z": round(z_rng, 1),
                            "text": f"Amplitude intra-séance de {rng[i] * 100:.1f} %"})
        if reasons:
            score = max(abs(r["z"]) for r in reasons)
            out.append({"date": candles[i].time[:10], "close": candles[i].close,
                        "return_pct": round(float(np.expm1(ret[i]) * 100), 2),
                        "score": round(score, 1), "reasons": reasons})
    return out


@router.post("/anomalies")
def anomalies(req: AnomalyRequest):
    if len(req.candles) <= req.window:
        raise HTTPException(422, f"Au moins {req.window + 1} séances sont nécessaires.")
    found = detect_anomalies(req.candles, req.window, req.threshold)
    recent = sorted(found, key=lambda a: a["date"], reverse=True)[:req.limit]
    return {
        "ticker": req.ticker,
        "as_of": req.candles[-1].time[:10],
        "window": req.window,
        "threshold": req.threshold,
        "count": len(found),
        "anomalies": recent,
        "method": f"écart à la médiane des {req.window} séances précédentes, seuil {req.threshold} écarts-types",
    }
