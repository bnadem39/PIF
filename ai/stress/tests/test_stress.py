"""
Tests du module de stress testing (lancer depuis ai/ : python -m pytest stress/tests -q).

Les modèles sont entraînés sur un petit jeu synthétique (2 000 lignes, 3 plis) pour rester rapides ;
le fichier de modèle pré-entraîné n'est ni lu ni écrit.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from stress import api
from stress.banks import load_banks
from stress.dataset import FEATURES, generate_training_data
from stress.engine import Thresholds, project, status_of
from stress.explain import StressExplainer
from stress.models import train_and_compare
from stress.scenarios import PRESET_SCENARIOS, Shocks


@pytest.fixture(scope="session")
def bundle():
    return train_and_compare(generate_training_data(n=2000, seed=1), n_splits=3)


@pytest.fixture(scope="session")
def client(bundle):
    api.state.bundle = bundle
    api.state.explainer = StressExplainer(bundle, generate_training_data(n=300, seed=2))
    app = FastAPI()
    app.include_router(api.router)
    return TestClient(app)


def test_bank_profiles_cover_both_models():
    banks = load_banks()
    assert set(banks["bank_type"]) == {"conventional", "islamic"}
    assert (banks.loc[banks["bank_type"] == "conventional", "psia"] == 0).all()


def test_synthetic_targets_grow_with_stress():
    data = generate_training_data(n=3000, seed=3)
    assert set(FEATURES) <= set(data.columns)
    calm = data[data["default_rate_multiplier"] < 1.2]["npl_increase"].mean()
    severe = data[data["default_rate_multiplier"] > 3.5]["npl_increase"].mean()
    assert severe > calm


def test_model_comparison_selects_best_r2(bundle):
    for target, scores in bundle["comparison"].items():
        assert set(scores) == {"ridge", "random_forest", "xgboost"}
        best = bundle["best"][target]["name"]
        assert scores[best]["r2"] == max(s["r2"] for s in scores.values())
    assert bundle["data_source"] == "synthetic"


def test_status_thresholds():
    t = Thresholds()
    assert status_of(0.05, 1.2, t) == "CRITIQUE"
    assert status_of(0.09, 1.2, t) == "VULNERABLE"
    assert status_of(0.12, 0.9, t) == "VULNERABLE"
    assert status_of(0.12, 1.2, t) == "RESILIENTE"


def test_severe_scenario_hurts_more_than_baseline(bundle):
    bank = load_banks().iloc[0]
    base = project(bank, PRESET_SCENARIOS["BASELINE"][1], bundle["best"])
    severe = project(bank, PRESET_SCENARIOS["COMBINED_SEVERE"][1], bundle["best"])
    assert severe["after"]["cet1_ratio"] < base["after"]["cet1_ratio"]
    assert severe["after"]["npl_ratio"] > base["after"]["npl_ratio"]
    assert severe["capital_shortfall"] >= base["capital_shortfall"] >= 0


def test_islamic_bank_less_rate_sensitive_on_margin(bundle):
    banks = load_banks()
    shock = Shocks(rate_shock_bp=300)
    conv = project(banks[banks["bank_type"] == "conventional"].iloc[0], shock, bundle["best"])
    islm = project(banks[banks["bank_type"] == "islamic"].iloc[0], shock, bundle["best"])
    nii = lambda r: next(w["value"] for w in r["waterfall"] if w["key"] == "nii_impact")
    assert abs(nii(islm)) / islm["before"]["cet1"] < abs(nii(conv)) / conv["before"]["cet1"]


def test_shocks_are_clipped_to_bounds():
    s = Shocks(rate_shock_bp=10_000, equity_drop_pct=-5).clipped()
    assert s.rate_shock_bp == 500 and s.equity_drop_pct == 0


def test_api_lists_banks_and_scenarios(client):
    banks = client.get("/api/ai/stress/banks").json()
    assert banks["illustrative"] is True and len(banks["banks"]) >= 2
    sc = client.get("/api/ai/stress/scenarios").json()
    assert {p["code"] for p in sc["presets"]} == set(PRESET_SCENARIOS)


def test_api_run_returns_projection_and_shap(client):
    shocks = PRESET_SCENARIOS["RECESSION"][1].to_dict()
    r = client.post("/api/ai/stress/run", json={"scenarios": [{"code": "RECESSION", "shocks": shocks}]})
    assert r.status_code == 200
    sc = r.json()["scenarios"][0]
    assert set(sc["summary_by_type"]) == {"conventional", "islamic"}
    first = sc["results"][0]
    assert first["status"] in {"CRITIQUE", "VULNERABLE", "RESILIENTE"}
    contrib = first["explanation"]["contributions"]
    assert contrib and all("shap" in c and "label" in c for c in contrib)
    assert sc["type_comparison"]["drivers"]


def test_api_rejects_unknown_bank_and_bad_shock(client):
    shocks = Shocks().to_dict()
    r = client.post("/api/ai/stress/run", json={"scenarios": [{"shocks": shocks}], "bank_ids": ["NOPE"]})
    assert r.status_code == 400
    bad = {**shocks, "rate_shock_bp": 9999}
    assert client.post("/api/ai/stress/run", json={"scenarios": [{"shocks": bad}]}).status_code == 422


def test_models_endpoint_has_global_importance(client):
    m = client.get("/api/ai/stress/models").json()
    assert m["global_importance"]["credit_loss_rate"]
    assert m["selected"].keys() == {"npl_increase", "credit_loss_rate"}
