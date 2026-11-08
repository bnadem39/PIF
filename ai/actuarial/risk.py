"""
Mesures de risque d'un actif, calculées sur ses clôtures historiques.

Convention : toutes les pertes (VaR, Expected Shortfall, drawdown) sont renvoyées en nombres POSITIFS,
exprimés en fraction (0.05 = 5 %). Les rendements sont des rendements logarithmiques journaliers.
"""
from typing import Dict, List

import numpy as np
from scipy.stats import norm

TRADING_DAYS = 252


def log_returns(closes) -> np.ndarray:
    prices = np.asarray(closes, dtype=float)
    if prices.ndim != 1 or len(prices) < 2:
        raise ValueError("Au moins 2 clôtures sont nécessaires.")
    if not np.all(np.isfinite(prices)) or np.any(prices <= 0):
        raise ValueError("Les clôtures doivent être strictement positives et finies.")
    return np.diff(np.log(prices))


def annualized_volatility(returns: np.ndarray, periods_per_year: int = TRADING_DAYS) -> float:
    return float(np.std(returns, ddof=1) * np.sqrt(periods_per_year))


def historical_var(returns: np.ndarray, confidence: float) -> float:
    """VaR historique 1 jour : perte dépassée dans (1 - confidence) des séances."""
    return float(max(0.0, -np.quantile(returns, 1.0 - confidence)))


def parametric_var(returns: np.ndarray, confidence: float) -> float:
    """VaR paramétrique (loi normale) 1 jour."""
    mu, sigma = float(np.mean(returns)), float(np.std(returns, ddof=1))
    return float(max(0.0, -(mu + norm.ppf(1.0 - confidence) * sigma)))


def expected_shortfall(returns: np.ndarray, confidence: float) -> float:
    """Expected Shortfall historique 1 jour : perte moyenne au-delà de la VaR."""
    threshold = np.quantile(returns, 1.0 - confidence)
    tail = returns[returns <= threshold]
    if len(tail) == 0:
        return 0.0
    return float(max(0.0, -np.mean(tail)))


def drawdown_series(closes) -> np.ndarray:
    prices = np.asarray(closes, dtype=float)
    peaks = np.maximum.accumulate(prices)
    return 1.0 - prices / peaks


def max_drawdown(closes, dates: List[str] = None) -> Dict:
    prices = np.asarray(closes, dtype=float)
    dd = drawdown_series(prices)
    trough = int(np.argmax(dd))
    peak = int(np.argmax(prices[: trough + 1]))
    recovered = bool(np.any(prices[trough:] >= prices[peak]))
    out = {
        "max_drawdown": float(dd[trough]),
        "current_drawdown": float(dd[-1]),
        "peak_index": peak,
        "trough_index": trough,
        "recovered": recovered,
    }
    if dates:
        out["peak_date"] = dates[peak]
        out["trough_date"] = dates[trough]
    return out


def downsample(values, max_points: int = 250) -> List[float]:
    values = list(values)
    if len(values) <= max_points:
        return [round(float(v), 6) for v in values]
    idx = np.linspace(0, len(values) - 1, max_points).round().astype(int)
    return [round(float(values[i]), 6) for i in idx]


def risk_summary(closes, dates: List[str], confidence: float, horizon_days: int) -> Dict:
    """Synthèse de risque. La VaR/ES à h jours suit la règle de la racine du temps (√h)."""
    r = log_returns(closes)
    scale = float(np.sqrt(horizon_days))
    var_hist, var_param = historical_var(r, confidence), parametric_var(r, confidence)
    es = expected_shortfall(r, confidence)
    dd = max_drawdown(closes, dates)
    skew = float(((r - r.mean()) ** 3).mean() / (r.std() ** 3)) if r.std() > 0 else 0.0
    kurt = float(((r - r.mean()) ** 4).mean() / (r.std() ** 4) - 3.0) if r.std() > 0 else 0.0
    return {
        "confidence": confidence,
        "horizon_days": horizon_days,
        "observations": int(len(r)),
        "daily_volatility": float(np.std(r, ddof=1)),
        "annualized_volatility": annualized_volatility(r),
        "mean_daily_return": float(np.mean(r)),
        "skewness": skew,
        "excess_kurtosis": kurt,
        "var_historical_1d": var_hist,
        "var_parametric_1d": var_param,
        "expected_shortfall_1d": es,
        "var_historical_horizon": var_hist * scale,
        "var_parametric_horizon": var_param * scale,
        "expected_shortfall_horizon": es * scale,
        "worst_day": float(max(0.0, -r.min())),
        "best_day": float(max(0.0, r.max())),
        "drawdown": dd,
    }
