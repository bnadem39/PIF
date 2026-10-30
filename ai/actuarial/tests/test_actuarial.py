"""
Tests du module d'actuariat (lancer depuis ai/ : python -m pytest actuarial/tests -q).
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from actuarial import api
from actuarial.margins import compute_margins
from actuarial.portfolio import TRUE_FREQUENCY, generate_portfolio
from actuarial.pricing import PricingModel
from actuarial.reserving import TAYLOR_ASHE_INCREMENTAL, chain_ladder

PROFILE = {"driver_age": 22, "vehicle_age": 1, "power": "8-10 CV", "region": "Grand Tunis",
           "usage": "Personnel", "fuel": "Diesel", "bonus_malus": 100}


@pytest.fixture(scope="session")
def model():
    return PricingModel(generate_portfolio(n=30000, seed=7))


@pytest.fixture(scope="session")
def client(model):
    api.state.model = model
    api.state.predicted = model.predict(model.portfolio, "glm")
    app = FastAPI()
    app.include_router(api.router)
    return TestClient(app)


def test_chain_ladder_matches_mack_1993():
    r = chain_ladder(TAYLOR_ASHE_INCREMENTAL)
    # Valeurs publiées par Mack (1993) pour ce triangle
    assert round(r["total"]["reserve"]) == 18_680_856
    assert round(r["total"]["mack_se"]) == 2_447_095
    assert round(r["rows"][9]["mack_se"]) == 1_363_155
    assert r["rows"][0]["reserve"] == 0


def test_chain_ladder_rejects_malformed_triangle():
    with pytest.raises(ValueError):
        chain_ladder([[1, 2, 3], [4, 5], [6, 7]])


def test_glm_recovers_true_relativities(model):
    rel = {(r["factor"], r["level"]): r for r in model.relativities()}
    young = rel[("age_band", "18-25")]["frequency"]
    assert young["low"] <= TRUE_FREQUENCY["age_band"]["18-25"] <= young["high"]
    assert young["p_value"] < 0.001
    bm = rel[("bonus_malus", "élasticité")]["frequency"]
    assert abs(bm["relativity"] - TRUE_FREQUENCY["bonus_malus_elasticity"]) < 0.15


def test_models_beat_null_and_are_calibrated(model):
    c = model.comparison
    for name in ("glm", "gbm"):
        assert c[name]["frequency_deviance"] < c["null"]["frequency_deviance"]
        assert c[name]["gini"] > 0.15
        assert 0.85 < c[name]["predicted_to_actual"] < 1.15


def test_quote_breakdown_multiplies_to_frequency(model):
    q = model.quote(PROFILE, duration=1.0, expense_ratio=0.25, profit_margin=0.05)
    product = 1.0
    for step in q["breakdown"]["frequency"]:
        product *= step["value"]
    assert product == pytest.approx(q["frequency"], rel=1e-6)
    assert q["commercial_premium"] == pytest.approx(q["pure_premium"] / 0.70)
    assert 0 < q["claim_probability"] < q["expected_claims"]


def test_margins_flag_young_drivers_and_takaful_balances(model):
    pred = model.predict(model.portfolio, "glm")
    conv = compute_margins(model.portfolio, pred, "age_band", 0.25, 0.05)
    assert conv["segments"][0]["segment"] == "18-25"          # tri par S/P attendu décroissant
    assert conv["segments"][0]["rate_change"] > 0.5
    tak = compute_margins(model.portfolio, pred, "region", 0.2, 0.0, mode="takaful", wakala_fee=0.25, surplus_share=0.5)
    t = tak["total"]
    assert t["operator_fee"] == pytest.approx(0.25 * t["premium"])
    assert t["fund_result"] == pytest.approx(t["premium"] - t["operator_fee"] - t["expected_claims"])
    assert t["surplus_to_participants"] == 0 or t["qard_hassan"] == 0


def test_api_endpoints(client):
    assert client.get("/api/ai/actuarial/portfolio").json()["synthetic"] is True
    assert client.get("/api/ai/actuarial/models").json()["relativities"]
    q = client.post("/api/ai/actuarial/quote", json={"profile": PROFILE})
    assert q.status_code == 200 and q.json()["commercial_premium"] > 0
    bad = client.post("/api/ai/actuarial/quote", json={"profile": {**PROFILE, "region": "Paris"}})
    assert bad.status_code == 422
    m = client.post("/api/ai/actuarial/margins", json={"segment_by": "region", "mode": "takaful"})
    assert m.status_code == 200 and m.json()["mode"] == "takaful"
    r = client.post("/api/ai/actuarial/reserving", json={"triangle": [[100, 50, 10], [120, 60], [130]]})
    assert r.status_code == 200 and r.json()["result"]["total"]["reserve"] > 0
    assert client.post("/api/ai/actuarial/reserving", json={"triangle": [[1, 2], [3, 4], [5]]}).status_code == 400
