"""
Signal XGBoost expliqué à une date donnée (cahier §3.4.1 et §3.6.1).

  POST /api/ai/insight/explain   historique journalier jusqu'à la date -> indicateurs réels, probabilités,
                                 signal calibré et contribution de chaque variable (valeurs de Shapley)

Les indicateurs sont recalculés avec data_pipeline.compute_features, comme à l'entraînement : aucune valeur
n'est fournie par le client. Les contributions sont les valeurs de Shapley exactes de l'arbre (TreeSHAP natif
de XGBoost, pred_contribs), exprimées en log-odds de chaque classe : elles s'additionnent avec la valeur de base
pour redonner la sortie du modèle.
"""
from typing import List

import numpy as np
import pandas as pd
import xgboost as xgb
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backtest_signals import CandleIn, _model
from data_pipeline import compute_features

router = APIRouter(prefix="/api/ai/insight", tags=["insight"])

# Libellés lisibles ; sentiment_score est un proxy de momentum (RSI/MACD) faute de flux d'actualités à l'entraînement
FEATURE_LABELS = {
    "rsi_14": "RSI 14 jours",
    "macd": "MACD",
    "macd_signal": "Ligne de signal MACD",
    "macd_hist": "Histogramme MACD",
    "bb_upper": "Bande de Bollinger haute",
    "bb_lower": "Bande de Bollinger basse",
    "bb_width": "Largeur des bandes de Bollinger",
    "bb_pct": "Position dans les bandes (%B)",
    "sma_20": "Moyenne mobile 20 jours",
    "sma_50": "Moyenne mobile 50 jours",
    "price_to_sma20": "Écart du cours à la MM20",
    "atr_14": "ATR 14 jours",
    "volatility_30d": "Volatilité 30 jours",
    "candle_range_pct": "Amplitude de la séance",
    "log_return_1d": "Rendement du jour",
    "lag_return_1": "Rendement de la veille",
    "lag_return_2": "Rendement à J-2",
    "lag_return_3": "Rendement à J-3",
    "volume_zscore": "Volume anormal (z-score)",
    "sentiment_score": "Score de momentum (proxy RSI/MACD)",
}
CLASSES = {"sell": 0, "neutral": 1, "buy": 2}   # ordre des colonnes de predict_proba : [-1, 0, +1]


class ExplainRequest(BaseModel):
    ticker: str = "ASSET"
    candles: List[CandleIn] = Field(..., min_length=60, max_length=20000)
    threshold: float = Field(0.60, ge=0.34, le=0.95)
    top: int = Field(8, ge=3, le=20)


def explain_last(candles: pd.DataFrame, model, scaler, feature_cols, threshold: float, top: int) -> dict:
    df = candles.copy()
    df["ticker"] = "ASSET"
    df["date"] = pd.to_datetime(df["time"].str.slice(0, 10))
    feats = compute_features(df).sort_values("date").reset_index(drop=True)
    if feats.empty:
        raise ValueError("Historique insuffisant pour calculer les indicateurs.")
    raw = feats[feature_cols].astype("float64").replace([np.inf, -np.inf], np.nan).fillna(0.0)
    last_raw = raw.iloc[[-1]]
    x = scaler.transform(last_raw.astype("float32"))
    proba = model.predict_proba(x)[0]
    p_sell, p_neutral, p_buy = (float(v) for v in proba)

    if p_buy >= threshold and p_buy > p_sell:
        signal, target = 1, "buy"
    elif p_sell >= threshold and p_sell > p_buy:
        signal, target = -1, "sell"
    else:
        signal, target = 0, "neutral"

    # (1, n_classes, n_features + 1) : dernière colonne = valeur de base
    # Mêmes arbres que predict_proba : avec l'arrêt précoce, seuls les best_iteration + 1 premiers sont utilisés
    best = getattr(model, "best_iteration", None)
    rounds = (0, best + 1) if best is not None else (0, 0)
    contribs = model.get_booster().predict(xgb.DMatrix(x, feature_names=list(feature_cols)), pred_contribs=True,
                                           iteration_range=rounds)
    contribs = np.asarray(contribs).reshape(len(CLASSES), len(feature_cols) + 1)

    def ranked(cls: str) -> list:
        row = contribs[CLASSES[cls]]
        order = np.argsort(-np.abs(row[:-1]))[:top]
        return [{
            "feature": feature_cols[i],
            "label": FEATURE_LABELS.get(feature_cols[i], feature_cols[i]),
            "value": round(float(last_raw.iloc[0, i]), 6),
            "contribution": round(float(row[i]), 5),
        } for i in order]

    return {
        "date": feats["date"].iloc[-1].strftime("%Y-%m-%d"),
        "close": round(float(feats["close"].iloc[-1]), 6),
        "signal": signal,
        "explained_class": target,
        "probabilities": {"sell": round(p_sell, 4), "neutral": round(p_neutral, 4), "buy": round(p_buy, 4)},
        "threshold": threshold,
        "features": {c: round(float(last_raw.iloc[0, i]), 6) for i, c in enumerate(feature_cols)},
        "contributions": {cls: ranked(cls) for cls in CLASSES},
        "base_values": {cls: round(float(contribs[i, -1]), 5) for cls, i in CLASSES.items()},
    }


@router.post("/explain")
def explain(req: ExplainRequest):
    try:
        model, scaler, feature_cols = _model.get()
    except FileNotFoundError:
        raise HTTPException(503, "Modèle XGBoost absent : exécutez train_model.py.")
    candles = pd.DataFrame([c.model_dump() for c in req.candles])
    try:
        out = explain_last(candles, model, scaler, feature_cols, req.threshold, req.top)
    except ValueError as e:
        raise HTTPException(422, str(e))
    out["ticker"] = req.ticker
    out["validation_start_date"] = _model.metadata.get("validation_start_date")
    out["in_sample"] = bool(out["validation_start_date"]) and out["date"] < out["validation_start_date"]
    return out
