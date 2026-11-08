"""Tests du module d'actuariat (lancer depuis ai/ : python -m pytest actuarial/tests -q)."""
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from actuarial import api
from actuarial.forecast import fit_garch11, forecast_volatility, monte_carlo
from actuarial.risk import (
    annualized_volatility, expected_shortfall, historical_var, log_returns, max_drawdown, parametric_var, risk_summary,
)

SIGMA = 0.02


def gbm(n=1000, sigma=SIGMA, mu=0.0, seed=1, start=100.0):
    rng = np.random.default_rng(seed)
    return start * np.exp(np.cumsum(mu + sigma * rng.standard_normal(n)))


def garch_returns(n=3000, omega=1e-5, alpha=0.1, beta=0.85, seed=3):
    rng = np.random.default_rng(seed)
    r, s2 = np.empty(n), omega / (1 - alpha - beta)
    for t in range(n):
        r[t] = np.sqrt(s2) * rng.standard_normal()
        s2 = omega + alpha * r[t] ** 2 + beta * s2
    return r


def test_volatility_recovers_sigma():
    r = log_returns(gbm(5000))
    assert annualized_volatility(r) == pytest.approx(SIGMA * np.sqrt(252), rel=0.05)


def test_es_is_larger_than_var_and_var_close_to_normal():
    r = log_returns(gbm(5000))
    for conf in (0.95, 0.99):
        assert expected_shortfall(r, conf) >= historical_var(r, conf)
    assert historical_var(r, 0.99) > historical_var(r, 0.95)
    assert historical_var(r, 0.95) == pytest.approx(parametric_var(r, 0.95), rel=0.15)


def test_max_drawdown_known_series():
    dd = max_drawdown([100, 120, 60, 90], ["a", "b", "c", "d"])
    assert dd["max_drawdown"] == pytest.approx(0.5)
    assert (dd["peak_date"], dd["trough_date"]) == ("b", "c")
    assert dd["recovered"] is False
    assert dd["current_drawdown"] == pytest.approx(0.25)


def test_max_drawdown_monotonic_rise_is_zero():
    assert max_drawdown(np.linspace(100, 200, 50))["max_drawdown"] == 0.0


def test_log_returns_rejects_bad_prices():
    with pytest.raises(ValueError):
        log_returns([100, 0, 50])
    with pytest.raises(ValueError):
        log_returns([100])


def test_risk_horizon_scaling():
    prices = gbm(500)
    s = risk_summary(prices, [str(i) for i in range(500)], 0.95, 9)
    assert s["var_historical_horizon"] == pytest.approx(s["var_historical_1d"] * 3)


def test_garch_fit_and_mean_reversion():
    r = garch_returns()
    fit = fit_garch11(r)
    assert fit is not None and 0.5 < fit["persistence"] < 1
    assert fit["long_run_daily_vol"] == pytest.approx(np.sqrt(1e-5 / 0.05), rel=0.3)
    path = forecast_volatility(r, 60, "garch")["daily_path"]
    assert path[-1] == pytest.approx(fit["long_run_daily_vol"], rel=0.5)


def test_forecast_falls_back_to_ewma_on_short_history():
    out = forecast_volatility(log_returns(gbm(60)), 5, "garch")
    assert out["model"] == "ewma"
    assert np.allclose(out["daily_path"], out["daily_path"][0])


def test_monte_carlo_zero_drift_is_roughly_neutral_and_reproducible():
    vol = np.full(20, 0.01)
    a = monte_carlo(100.0, vol, n_sims=20000, seed=7)
    b = monte_carlo(100.0, vol, n_sims=20000, seed=7)
    assert a["expected_price"] == b["expected_price"]
    assert a["expected_price"] == pytest.approx(100.0, rel=0.01)
    assert a["price_p5"] < a["median_price"] < a["price_p95"]
    assert len(a["fan"]) == 21 and a["fan"][0]["p50"] == pytest.approx(100.0)
    assert a["expected_shortfall_terminal"] >= a["var_terminal"] >= 0


def test_monte_carlo_wider_with_higher_vol():
    lo = monte_carlo(100.0, np.full(20, 0.005), n_sims=5000, seed=1)
    hi = monte_carlo(100.0, np.full(20, 0.03), n_sims=5000, seed=1)
    assert hi["price_p95"] - hi["price_p5"] > lo["price_p95"] - lo["price_p5"]
    assert hi["var_terminal"] > lo["var_terminal"]


@pytest.fixture(scope="module")
def client():
    app = FastAPI()
    app.include_router(api.router)
    return TestClient(app)


def _payload(n=300, **extra):
    closes = gbm(n).tolist()
    return {"symbol": "biat", "dates": [f"d{i}" for i in range(n)], "closes": closes, "seed": 1,
            "simulations": 500, **extra}


def test_analyze_endpoint(client):
    res = client.post("/api/ai/actuarial/analyze", json=_payload(forecast_days=15, horizon_days=5))
    assert res.status_code == 200
    body = res.json()
    assert body["symbol"] == "BIAT"
    assert body["risk"]["expected_shortfall_1d"] >= body["risk"]["var_historical_1d"]
    assert len(body["volatility_forecast"]["annualized_path"]) == 15
    assert len(body["monte_carlo"]["fan"]) == 16
    assert 0 <= body["risk"]["drawdown"]["max_drawdown"] <= 1
    assert "premium" not in str(body).lower()


def test_analyze_rejects_invalid_input(client):
    bad = _payload()
    bad["closes"][10] = -1
    assert client.post("/api/ai/actuarial/analyze", json=bad).status_code == 422
    short = _payload()
    short["dates"] = short["dates"][:-1]
    assert client.post("/api/ai/actuarial/analyze", json=short).status_code == 422
    assert client.post("/api/ai/actuarial/analyze", json=_payload(n=30)).status_code == 422
    assert client.post("/api/ai/actuarial/analyze", json=_payload(confidence=0.5)).status_code == 422
