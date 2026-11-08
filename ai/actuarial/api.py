"""
Endpoint FastAPI du module d'actuariat, monté dans ai_server.py :

  POST /api/ai/actuarial/analyze   risque (volatilité, VaR, Expected Shortfall, drawdown maximal),
                                   prévision de volatilité et simulation Monte-Carlo d'un actif

L'historique des clôtures est fourni par le backend Spring (CSV locaux) : ce service ne lit aucune donnée.
"""
from typing import List, Literal, Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from .forecast import TRADING_DAYS, forecast_volatility, monte_carlo
from .risk import downsample, drawdown_series, log_returns, risk_summary

router = APIRouter(prefix="/api/ai/actuarial", tags=["actuarial"])

MIN_OBSERVATIONS = 60


class AnalyzeRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    dates: List[str] = Field(..., min_length=MIN_OBSERVATIONS)
    closes: List[float] = Field(..., min_length=MIN_OBSERVATIONS)
    confidence: float = Field(0.95, ge=0.90, le=0.999)
    horizon_days: int = Field(10, ge=1, le=60)       # horizon de la VaR / ES
    forecast_days: int = Field(30, ge=1, le=90)      # horizon de la prévision et du Monte-Carlo
    simulations: int = Field(5000, ge=500, le=20000)
    volatility_model: Literal["garch", "ewma"] = "garch"
    distribution: Literal["normal", "student"] = "normal"
    drift: Literal["zero", "historical"] = "zero"
    seed: Optional[int] = None

    @model_validator(mode="after")
    def _same_length(self):
        if len(self.dates) != len(self.closes):
            raise ValueError("dates et closes doivent avoir la même longueur.")
        return self


@router.post("/analyze")
def analyze(req: AnalyzeRequest):
    try:
        returns = log_returns(req.closes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    risk = risk_summary(req.closes, req.dates, req.confidence, req.horizon_days)
    vol = forecast_volatility(returns, req.forecast_days, req.volatility_model)
    drift = float(np.mean(returns)) if req.drift == "historical" else 0.0
    mc = monte_carlo(
        last_price=float(req.closes[-1]),
        daily_vol_path=vol["daily_path"],
        n_sims=req.simulations,
        drift_daily=drift,
        distribution=req.distribution,
        confidence=req.confidence,
        seed=req.seed,
    )
    risk["drawdown"]["series"] = downsample(drawdown_series(req.closes))
    return {
        "symbol": req.symbol.upper(),
        "period": {"start": req.dates[0], "end": req.dates[-1], "observations": len(req.closes)},
        "risk": risk,
        "volatility_forecast": {
            "model": vol["model"],
            "params": vol["params"],
            "current_annualized": risk["annualized_volatility"],
            "annualized_path": [round(float(v), 6) for v in vol["annualized_path"]],
            "trading_days_per_year": TRADING_DAYS,
        },
        "monte_carlo": mc,
        "note": "Analyse statistique sur l'historique : elle décrit un risque, elle ne prédit pas un rendement.",
    }
