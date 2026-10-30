"""
Tests du signal IA utilisé par le backtesting (lancer depuis ai/ : python -m pytest tests -q).
Utilise le modèle XGBoost versionné dans ai/models/.
"""
import numpy as np
import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import backtest_signals
from backtest_signals import router, signals_for


def _candles(n=220, seed=0):
    rng = np.random.default_rng(seed)
    close = 50 * np.exp(np.cumsum(rng.normal(0, 0.015, n)))
    open_ = np.r_[close[0], close[:-1]]
    return pd.DataFrame({
        "time": pd.date_range("2021-01-04", periods=n, freq="B").strftime("%Y-%m-%d"),
        "open": open_, "high": np.maximum(open_, close) * 1.005, "low": np.minimum(open_, close) * 0.995,
        "close": close, "volume": rng.integers(1_000, 50_000, n).astype(float),
    })


@pytest.fixture(scope="module")
def model():
    return backtest_signals._model.get()


def test_signals_are_calibrated_probabilities(model):
    out = signals_for(_candles(), *model, threshold=0.5)
    assert len(out) == 220
    assert set(out["signal"]).issubset({-1, 0, 1})
    assert out["p_buy"].between(0, 1).all() and out["p_sell"].between(0, 1).all()
    buys = out[out["signal"] == 1]
    assert (buys["p_buy"] >= 0.5).all()


def test_no_lookahead(model):
    """Le signal d'un jour ne doit pas changer quand on ajoute des jours futurs."""
    full = _candles()
    a = signals_for(full, *model, threshold=0.5)
    b = signals_for(full.iloc[:150].reset_index(drop=True), *model, threshold=0.5)
    pd.testing.assert_frame_equal(a.iloc[:150].reset_index(drop=True), b, check_exact=False, atol=1e-4)


def test_endpoint_reports_validation_start():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)
    candles = _candles(60).to_dict(orient="records")
    r = client.post("/api/ai/backtest/signals", json={"ticker": "TEST", "candles": candles})
    assert r.status_code == 200
    body = r.json()
    assert body["validation_start_date"] == "2020-06-19"
    assert len(body["signals"]) == 60
    assert client.post("/api/ai/backtest/signals", json={"candles": candles[:10]}).status_code == 422
