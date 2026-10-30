"""
Signaux historiques du modèle XGBoost pour le backtesting (cahier §3.2 et §3.6 : évaluer les décisions de l'IA).

  POST /api/ai/backtest/signals   chandeliers journaliers -> signal calibré (+1 / 0 / -1) pour chaque jour

Les indicateurs sont recalculés avec data_pipeline.compute_features, exactement comme à l'entraînement.
Le signal du jour T n'utilise que les données connues à la clôture de T ; c'est le backend qui l'exécute en T+1.
"""
import json
import threading
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from data_pipeline import compute_features

MODEL_DIR = Path(__file__).parent / "models"
router = APIRouter(prefix="/api/ai/backtest", tags=["backtesting"])


class _Model:
    def __init__(self):
        self._lock = threading.Lock()
        self.pipeline = None
        self.metadata = {}

    def get(self):
        if self.pipeline is None:
            with self._lock:
                if self.pipeline is None:
                    from train_model import load_model
                    model, scaler, feature_cols = load_model()
                    meta_path = MODEL_DIR / "model_metadata.json"
                    self.metadata = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
                    self.pipeline = (model, scaler, feature_cols)
        return self.pipeline


_model = _Model()


class CandleIn(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


class SignalsRequest(BaseModel):
    ticker: str = "ASSET"
    candles: List[CandleIn] = Field(..., min_length=30, max_length=20000)
    threshold: float = Field(0.60, ge=0.34, le=0.95)


def signals_for(candles: pd.DataFrame, model, scaler, feature_cols, threshold: float) -> pd.DataFrame:
    df = candles.copy()
    df["ticker"] = "ASSET"
    df["date"] = pd.to_datetime(df["time"].str.slice(0, 10))
    feats = compute_features(df).sort_values("date").reset_index(drop=True)
    X = feats[feature_cols].astype("float32").replace([np.inf, -np.inf], np.nan).fillna(0.0)
    probas = model.predict_proba(scaler.transform(X))      # colonnes [P(-1), P(0), P(+1)]
    p_sell, p_buy = probas[:, 0], probas[:, 2]
    signal = np.zeros(len(X), dtype=int)
    buy = (p_buy >= threshold) & (p_buy > p_sell)
    signal[buy] = 1
    signal[(p_sell >= threshold) & (p_sell > p_buy) & ~buy] = -1
    return pd.DataFrame({
        "date": feats["date"].dt.strftime("%Y-%m-%d"),
        "signal": signal,
        "p_buy": p_buy.round(4),
        "p_sell": p_sell.round(4),
    })


@router.post("/signals")
def signals(req: SignalsRequest):
    try:
        model, scaler, feature_cols = _model.get()
    except FileNotFoundError:
        raise HTTPException(503, "Modèle XGBoost absent : exécutez train_model.py.")
    candles = pd.DataFrame([c.model_dump() for c in req.candles])
    out = signals_for(candles, model, scaler, feature_cols, req.threshold)
    return {
        "ticker": req.ticker,
        "threshold": req.threshold,
        "validation_start_date": _model.metadata.get("validation_start_date"),
        "trained_at": _model.metadata.get("trained_at"),
        "signals": out.to_dict(orient="records"),
    }
