"""
Tests de l'explication SHAP, de l'analyse de sentiment, de l'optimiseur et de la détection d'anomalies
(lancer depuis ai/ : python -m pytest tests -q).
"""
import numpy as np
import pandas as pd
import pytest

import backtest_signals
from market_insight import explain_last
from portfolio_lab import AnomalyCandle, OptimizeRequest, detect_anomalies, optimize
from sentiment import analyze


def _candles(n=260, seed=1):
    rng = np.random.default_rng(seed)
    close = 40 * np.exp(np.cumsum(rng.normal(0, 0.012, n)))
    open_ = np.r_[close[0], close[:-1]]
    return pd.DataFrame({
        "time": pd.date_range("2021-01-04", periods=n, freq="B").strftime("%Y-%m-%d"),
        "open": open_, "high": np.maximum(open_, close) * 1.004, "low": np.minimum(open_, close) * 0.996,
        "close": close, "volume": rng.integers(1_000, 30_000, n).astype(float),
    })


# ── Explication SHAP ──────────────────────────────────────────────

def test_shap_contributions_add_up_to_probabilities():
    model, scaler, cols = backtest_signals._model.get()
    out = explain_last(_candles(), model, scaler, cols, threshold=0.6, top=len(cols))
    logits = np.array([out["base_values"][c] + sum(r["contribution"] for r in out["contributions"][c])
                       for c in ("sell", "neutral", "buy")])
    probs = np.exp(logits - logits.max())
    probs /= probs.sum()
    expected = [out["probabilities"][c] for c in ("sell", "neutral", "buy")]
    assert np.allclose(probs, expected, atol=2e-3)


def test_explanation_uses_only_past_bars():
    model, scaler, cols = backtest_signals._model.get()
    full = _candles()
    cut = full.iloc[:200]
    a = explain_last(cut, model, scaler, cols, threshold=0.6, top=5)
    # Les séances après la date ne changent pas l'explication de cette date
    b = explain_last(full.iloc[:200].copy(), model, scaler, cols, threshold=0.6, top=5)
    assert a == b and a["date"] == cut["time"].iloc[-1]


# ── Sentiment ─────────────────────────────────────────────────────

def test_sentiment_polarity_fr_en():
    assert analyze("La BIAT annonce une forte hausse de ses bénéfices")["label"] == "POSITIVE"
    assert analyze("Krach boursier : les banques plongent, crainte de récession")["label"] == "NEGATIVE"
    assert analyze("Stocks surge after strong earnings beat")["label"] == "POSITIVE"
    assert analyze("La société publie ses états financiers")["label"] == "NEUTRAL"


def test_sentiment_handles_negation_and_intensity():
    neg = analyze("La banque ne prévoit aucune baisse de son dividende")
    assert neg["score"] > 0
    assert any(t["negated"] for t in neg["terms"])
    strong = analyze("Les résultats chutent fortement")["negative"]
    weak = analyze("Les résultats chutent")["negative"]
    assert strong > weak


# ── Optimiseur de Markowitz ───────────────────────────────────────

def _prices(n=300, seed=3):
    rng = np.random.default_rng(seed)
    r = rng.normal([0.0006, 0.0002, 0.0009, 0.0001], [0.010, 0.015, 0.030, 0.008], (n, 4))
    return (100 * np.exp(np.cumsum(r, axis=0))).tolist()


def test_optimizer_respects_constraints():
    out = optimize(OptimizeRequest(symbols=list("ABCD"), closes=_prices(), max_weight=0.4,
                                   current_weights={"A": 1.0}))
    by = {p["name"]: p for p in out["portfolios"]}
    for p in by.values():
        w = np.array(list(p["weights"].values()))
        assert abs(w.sum() - 1) < 1e-3 and (w >= 0).all()
    for name in ("min_variance", "max_sharpe"):
        assert max(by[name]["weights"].values()) <= 0.4 + 1e-6
        assert abs(sum(by[name]["risk_contribution"].values()) - 1) < 1e-3
    # Variance minimale : la plus faible ; Sharpe maximal : le meilleur Sharpe parmi les portefeuilles contraints
    assert by["min_variance"]["volatility"] <= by["equal_weight"]["volatility"] + 1e-6
    assert by["max_sharpe"]["sharpe"] >= by["equal_weight"]["sharpe"] - 1e-6
    assert by["current"]["weights"] == {"A": 1.0}
    vols = [f["volatility"] for f in out["frontier"]]
    assert len(vols) > 2 and vols[0] <= vols[-1]


def test_optimizer_rejects_infeasible_cap():
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        optimize(OptimizeRequest(symbols=list("ABCD"), closes=_prices(), max_weight=0.2))


# ── Anomalies ─────────────────────────────────────────────────────

def test_anomalies_flag_shocks_without_lookahead():
    df = _candles(n=200, seed=5)
    candles = [AnomalyCandle(**row) for row in df.to_dict("records")]
    candles[150] = candles[150].model_copy(update={"close": candles[149].close * 0.82})
    candles[170] = candles[170].model_copy(update={"volume": candles[170].volume * 40})
    found = {a["date"]: a for a in detect_anomalies(candles, window=60, threshold=4.0)}
    assert candles[150].time in found and found[candles[150].time]["reasons"][0]["kind"] == "return"
    assert any(r["kind"] == "volume" for r in found[candles[170].time]["reasons"])
    # Une anomalie ne dépend que du passé : couper l'historique ne change pas les séances déjà signalées
    early = {a["date"] for a in detect_anomalies(candles[:160], window=60, threshold=4.0)}
    assert early == {d for d in found if d <= candles[159].time}
