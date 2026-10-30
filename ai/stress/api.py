"""
Endpoints FastAPI du stress testing, montés dans ai_server.py :

  GET  /api/ai/stress/banks       profils bancaires de départ
  GET  /api/ai/stress/scenarios   scénarios prédéfinis et bornes des chocs
  GET  /api/ai/stress/models      comparaison des modèles + importance globale SHAP
  POST /api/ai/stress/run         projection d'un ou plusieurs scénarios sur les banques choisies
"""
import logging
import threading
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .banks import load_banks
from .dataset import generate_training_data
from .engine import Thresholds, feature_row, project, summarize_by_type
from .explain import StressExplainer
from .models import load_or_train
from .scenarios import PRESET_SCENARIOS, SHOCK_BOUNDS, SHOCK_LABELS, Shocks

log = logging.getLogger("stress.api")
router = APIRouter(prefix="/api/ai/stress", tags=["stress-testing"])


class _State:
    """Chargement paresseux et unique (modèles + explainer), partagé par toutes les requêtes."""

    def __init__(self):
        self._lock = threading.Lock()
        self.bundle = None
        self.explainer = None

    def ready(self):
        if self.bundle is None:
            with self._lock:
                if self.bundle is None:
                    bundle = load_or_train()
                    self.explainer = StressExplainer(bundle, generate_training_data(n=3000, seed=7))
                    self.bundle = bundle
        return self.bundle, self.explainer


state = _State()


class ShocksIn(BaseModel):
    rate_shock_bp: float = Field(0.0, ge=0, le=500)
    equity_drop_pct: float = Field(0.0, ge=0, le=60)
    unemployment_increase_pp: float = Field(0.0, ge=0, le=10)
    gdp_growth_pct: float = Field(1.0, ge=-10, le=5)
    default_rate_multiplier: float = Field(1.0, ge=1, le=5)
    asset_quality_downgrade: float = Field(0.0, ge=0, le=3)
    revenue_drop_pct: float = Field(0.0, ge=0, le=50)


class ScenarioIn(BaseModel):
    code: str = "CUSTOM"
    name: str = "Scénario personnalisé"
    shocks: ShocksIn


class RunRequest(BaseModel):
    scenarios: List[ScenarioIn] = Field(..., min_length=1, max_length=10)
    bank_ids: Optional[List[str]] = None
    explain: bool = True
    min_capital_ratio: float = Field(0.10, gt=0, lt=1)


@router.get("/banks")
def banks():
    df = load_banks()
    return {
        "illustrative": True,
        "note": "Profils illustratifs anonymisés (millions TND). Remplacer ai/stress/data/bank_profiles.csv "
                "par les données réelles des rapports annuels.",
        "banks": df.reset_index(drop=True).to_dict(orient="records"),
    }


@router.get("/scenarios")
def scenarios():
    return {
        "bounds": {k: {"min": lo, "max": hi, "label": SHOCK_LABELS[k]} for k, (lo, hi) in SHOCK_BOUNDS.items()},
        "presets": [{"code": code, "name": name, "shocks": s.to_dict()} for code, (name, s) in PRESET_SCENARIOS.items()],
    }


@router.get("/models")
def models():
    bundle, explainer = state.ready()
    return {
        "data_source": bundle["data_source"],
        "n_samples": bundle["n_samples"],
        "comparison": bundle["comparison"],
        "selected": {t: b["name"] for t, b in bundle["best"].items()},
        "global_importance": explainer.global_importance,
    }


@router.post("/run")
def run(req: RunRequest):
    bundle, explainer = state.ready()
    df = load_banks()
    if req.bank_ids:
        unknown = sorted(set(req.bank_ids) - set(df.index))
        if unknown:
            raise HTTPException(status_code=400, detail=f"Banques inconnues : {unknown}")
        df = df.loc[req.bank_ids]

    thresholds = Thresholds(min_capital=req.min_capital_ratio)
    out = []
    for sc in req.scenarios:
        shocks = Shocks(**sc.shocks.model_dump())
        results: List[Dict] = []
        rows = {}
        for _, bank in df.iterrows():
            r = project(bank, shocks, bundle["best"], thresholds)
            if req.explain:
                x = feature_row(bank, shocks.clipped())
                rows[bank["bank_id"]] = x
                r["explanation"] = explainer.local("credit_loss_rate", x)
            results.append(r)

        # Écart conventionnelle vs islamique : banque la plus touchée de chaque catégorie
        type_comparison = None
        conv = [r for r in results if r["bank_type"] == "conventional"]
        islm = [r for r in results if r["bank_type"] == "islamic"]
        if req.explain and conv and islm:
            a = max(conv, key=lambda r: r["predicted"]["credit_loss_rate"])
            b = max(islm, key=lambda r: r["predicted"]["credit_loss_rate"])
            type_comparison = {
                "conventional_bank": a["bank_id"],
                "islamic_bank": b["bank_id"],
                "drivers": explainer.compare("credit_loss_rate", rows[a["bank_id"]], rows[b["bank_id"]]),
            }

        out.append({
            "scenario": {"code": sc.code, "name": sc.name, "shocks": shocks.clipped().to_dict()},
            "results": results,
            "summary_by_type": summarize_by_type(results),
            "type_comparison": type_comparison,
        })
    return {"model": {t: b["name"] for t, b in bundle["best"].items()}, "data_source": bundle["data_source"],
            "scenarios": out}
