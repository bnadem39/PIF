"""
Endpoints FastAPI du module d'actuariat, montés dans ai_server.py :

  GET  /api/ai/actuarial/portfolio   description du portefeuille (synthétique)
  GET  /api/ai/actuarial/models      comparaison GLM / gradient boosting et coefficients multiplicateurs
  POST /api/ai/actuarial/quote       prime d'un contrat : fréquence, probabilité de sinistre, sévérité, prime
  POST /api/ai/actuarial/margins     marges de prime par segment (conventionnel ou takaful)
  GET  /api/ai/actuarial/reserving   triangle de référence (Taylor & Ashe)
  POST /api/ai/actuarial/reserving   Chain Ladder + erreur de Mack sur un triangle fourni
"""
import threading
from typing import List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .margins import SEGMENTS, compute_margins
from .portfolio import CATEGORIES, FUELS, POWER_CLASSES, REGIONS, USAGES, generate_portfolio
from .pricing import FACTOR_LABELS, PricingModel
from .reserving import TAYLOR_ASHE_INCREMENTAL, chain_ladder

router = APIRouter(prefix="/api/ai/actuarial", tags=["actuarial"])


class _State:
    def __init__(self):
        self._lock = threading.Lock()
        self.model: Optional[PricingModel] = None
        self.predicted = None

    def ready(self) -> PricingModel:
        if self.model is None:
            with self._lock:
                if self.model is None:
                    model = PricingModel(generate_portfolio())
                    self.predicted = model.predict(model.portfolio, "glm")
                    self.model = model
        return self.model


state = _State()


class Profile(BaseModel):
    driver_age: int = Field(..., ge=18, le=90)
    vehicle_age: int = Field(..., ge=0, le=40)
    power: Literal[tuple(POWER_CLASSES)]
    region: Literal[tuple(REGIONS)]
    usage: Literal[tuple(USAGES)] = "Personnel"
    fuel: Literal[tuple(FUELS)] = "Essence"
    bonus_malus: int = Field(100, ge=50, le=200)


class QuoteRequest(BaseModel):
    profile: Profile
    duration: float = Field(1.0, gt=0, le=5)
    expense_ratio: float = Field(0.25, ge=0, le=0.6)
    profit_margin: float = Field(0.05, ge=-0.2, le=0.3)


class MarginsRequest(BaseModel):
    segment_by: Literal[tuple(SEGMENTS)] = "age_band"
    expense_ratio: float = Field(0.25, ge=0, le=0.6)
    profit_margin: float = Field(0.05, ge=-0.2, le=0.3)
    mode: Literal["conventional", "takaful"] = "conventional"
    wakala_fee: float = Field(0.25, ge=0, le=0.6)
    surplus_share: float = Field(0.5, ge=0, le=1)


class ReservingRequest(BaseModel):
    triangle: List[List[float]] = Field(..., min_length=3, max_length=30)
    tail_factor: float = Field(1.0, ge=1.0, le=2.0)


@router.get("/portfolio")
def portfolio():
    m = state.ready()
    df = m.portfolio
    return {
        "synthetic": True,
        "note": "Portefeuille automobile synthétique généré à partir de paramètres connus (ai/actuarial/portfolio.py).",
        "policies": int(len(df)),
        "exposure": float(df["exposure"].sum()),
        "claims": int(df["claim_count"].sum()),
        "claim_amount": float(df["claim_amount"].sum()),
        "premium": float(df["premium"].sum()),
        "frequency": float(df["claim_count"].sum() / df["exposure"].sum()),
        "average_cost": float(df["claim_amount"].sum() / max(df["claim_count"].sum(), 1)),
        "loss_ratio": float(df["claim_amount"].sum() / df["premium"].sum()),
        "options": {**{k: v for k, v in CATEGORIES.items() if k in ("power", "region", "usage", "fuel")}},
        "segments": SEGMENTS,
        "sample": df.head(20).to_dict(orient="records"),
    }


@router.get("/models")
def models():
    m = state.ready()
    return {
        "train_size": int(len(m.train)),
        "test_size": int(len(m.test)),
        "comparison": m.comparison,
        "base": m.base(),
        "relativities": m.relativities(),
        "factor_labels": FACTOR_LABELS,
    }


@router.post("/quote")
def quote(req: QuoteRequest):
    if req.expense_ratio + req.profit_margin >= 0.9:
        raise HTTPException(400, "Frais + marge doivent rester inférieurs à 90 % de la prime.")
    return state.ready().quote(req.profile.model_dump(), req.duration, req.expense_ratio, req.profit_margin)


@router.post("/margins")
def margins(req: MarginsRequest):
    if req.expense_ratio + req.profit_margin >= 0.9:
        raise HTTPException(400, "Frais + marge doivent rester inférieurs à 90 % de la prime.")
    m = state.ready()
    return compute_margins(m.portfolio, state.predicted, req.segment_by, req.expense_ratio, req.profit_margin,
                           req.mode, req.wakala_fee, req.surplus_share)


@router.get("/reserving")
def reserving_default():
    return {
        "source": "Taylor & Ashe (1983), repris par Mack (1993)",
        "triangle": TAYLOR_ASHE_INCREMENTAL,
        "result": chain_ladder(TAYLOR_ASHE_INCREMENTAL),
    }


@router.post("/reserving")
def reserving(req: ReservingRequest):
    try:
        return {"source": "Triangle fourni", "triangle": req.triangle, "result": chain_ladder(req.triangle, req.tail_factor)}
    except ValueError as e:
        raise HTTPException(400, str(e))
