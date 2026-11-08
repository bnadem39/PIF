"""
Prévision de la volatilité (EWMA RiskMetrics et GARCH(1,1)) et simulation Monte-Carlo des prix.

Aucune prédiction de rendement n'est affirmée : par défaut la dérive est nulle et le Monte-Carlo
décrit l'éventail des trajectoires possibles compte tenu de la volatilité prévue.
"""
from typing import Dict, Optional

import numpy as np
from scipy.optimize import minimize

TRADING_DAYS = 252
MIN_GARCH_OBS = 100


def ewma_variance(returns: np.ndarray, lam: float = 0.94) -> np.ndarray:
    """Variance conditionnelle EWMA ; renvoie la série des variances σ²_t (t = 0..n-1)."""
    x = np.asarray(returns, dtype=float)
    var = np.empty(len(x))
    var[0] = np.var(x[: min(len(x), 20)]) or 1e-12
    for t in range(1, len(x)):
        var[t] = lam * var[t - 1] + (1 - lam) * x[t - 1] ** 2
    return var


def _garch_filter(x: np.ndarray, omega: float, alpha: float, beta: float) -> np.ndarray:
    s2 = np.empty(len(x))
    s2[0] = np.var(x)
    for t in range(1, len(x)):
        s2[t] = omega + alpha * x[t - 1] ** 2 + beta * s2[t - 1]
    return s2


def _garch_nll(params, x):
    omega, alpha, beta = params
    s2 = _garch_filter(x, omega, alpha, beta)
    if np.any(s2 <= 0) or not np.all(np.isfinite(s2)):
        return 1e12
    return 0.5 * float(np.sum(np.log(s2) + x ** 2 / s2))


def fit_garch11(returns: np.ndarray) -> Optional[Dict]:
    """Estimation GARCH(1,1) gaussien par maximum de vraisemblance (rendements en %). None si l'ajustement échoue."""
    r = np.asarray(returns, dtype=float)
    if len(r) < MIN_GARCH_OBS:
        return None
    x = (r - r.mean()) * 100.0
    var0 = float(np.var(x))
    if var0 <= 0:
        return None
    res = minimize(
        _garch_nll,
        x0=[var0 * 0.05, 0.08, 0.90],
        args=(x,),
        method="SLSQP",
        bounds=[(1e-8, None), (1e-6, 0.999), (1e-6, 0.999)],
        constraints=[{"type": "ineq", "fun": lambda p: 0.999 - p[1] - p[2]}],
        options={"maxiter": 200, "ftol": 1e-9},
    )
    omega, alpha, beta = (float(v) for v in res.x)
    if not np.isfinite(res.fun) or alpha + beta >= 0.9995:
        return None
    s2 = _garch_filter(x, omega, alpha, beta)
    next_var = omega + alpha * x[-1] ** 2 + beta * s2[-1]
    return {
        "omega": omega, "alpha": alpha, "beta": beta,
        "persistence": alpha + beta,
        "long_run_daily_vol": float(np.sqrt(omega / (1 - alpha - beta)) / 100.0),
        "_next_var": float(next_var),          # en %²
    }


def forecast_volatility(returns: np.ndarray, horizon: int, model: str = "garch") -> Dict:
    """
    Volatilité journalière prévue pour chacun des `horizon` prochains jours.
    GARCH(1,1) si possible (retour progressif vers la variance de long terme), sinon EWMA (volatilité constante).
    """
    r = np.asarray(returns, dtype=float)
    used, params = "ewma", None
    path = None
    if model == "garch":
        fit = fit_garch11(r)
        if fit is not None:
            a_b = fit["persistence"]
            v_lr = fit["omega"] / (1 - a_b)
            k = np.arange(horizon)
            var_path = v_lr + (a_b ** k) * (fit["_next_var"] - v_lr)
            path = np.sqrt(var_path) / 100.0
            used = "garch"
            params = {key: val for key, val in fit.items() if not key.startswith("_")}
    if path is None:
        lam = 0.94
        var_now = lam * ewma_variance(r, lam)[-1] + (1 - lam) * r[-1] ** 2
        path = np.full(horizon, np.sqrt(var_now))
        params = {"lambda": lam}
    return {
        "model": used,
        "params": params,
        "daily_path": path,
        "annualized_path": path * np.sqrt(TRADING_DAYS),
    }


def monte_carlo(
    last_price: float,
    daily_vol_path: np.ndarray,
    n_sims: int = 5000,
    drift_daily: float = 0.0,
    distribution: str = "normal",
    confidence: float = 0.95,
    seed: Optional[int] = None,
) -> Dict:
    """
    Simule des trajectoires de prix : log-rendement_t = (dérive - σ_t²/2) + σ_t · ε_t.
    ε ~ N(0,1) ou Student(5) normalisée (queues plus épaisses). Dérive par défaut nulle.
    """
    rng = np.random.default_rng(seed)
    h = len(daily_vol_path)
    sigma = np.asarray(daily_vol_path, dtype=float)
    if distribution == "student":
        df = 5
        eps = rng.standard_t(df, size=(n_sims, h)) * np.sqrt((df - 2) / df)
    else:
        eps = rng.standard_normal((n_sims, h))
    log_steps = (drift_daily - 0.5 * sigma ** 2) + sigma * eps
    log_paths = np.concatenate([np.zeros((n_sims, 1)), np.cumsum(log_steps, axis=1)], axis=1)
    prices = last_price * np.exp(log_paths)

    terminal = prices[:, -1]
    term_ret = terminal / last_price - 1.0
    q = np.quantile(term_ret, 1.0 - confidence)
    tail = term_ret[term_ret <= q]
    peaks = np.maximum.accumulate(prices, axis=1)
    max_dd = (1.0 - prices / peaks).max(axis=1)

    pct = [5, 25, 50, 75, 95]
    bands = np.percentile(prices, pct, axis=0)
    fan = [
        {"day": d, **{f"p{p}": round(float(bands[i, d]), 4) for i, p in enumerate(pct)}}
        for d in range(h + 1)
    ]
    return {
        "simulations": n_sims,
        "horizon_days": h,
        "distribution": distribution,
        "drift_daily": drift_daily,
        "last_price": last_price,
        "expected_price": float(np.mean(terminal)),
        "median_price": float(np.median(terminal)),
        "price_p5": float(np.percentile(terminal, 5)),
        "price_p95": float(np.percentile(terminal, 95)),
        "expected_return": float(np.mean(term_ret)),
        "prob_loss": float(np.mean(terminal < last_price)),
        "var_terminal": float(max(0.0, -q)),
        "expected_shortfall_terminal": float(max(0.0, -tail.mean())) if len(tail) else 0.0,
        "expected_max_drawdown": float(np.mean(max_dd)),
        "max_drawdown_p95": float(np.percentile(max_dd, 95)),
        "fan": fan,
    }
