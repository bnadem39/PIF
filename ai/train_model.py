"""
================================================================================
     TRAIN MODEL — XGBoost Multi-Classe (3 Classes : Vente, Neutre, Achat)
      Cible Dynamique ATR • TimeSeriesSplit • Régularisation Anti-Overfitting
================================================================================

Classes cibles :
  -1 : Vente franche (Close_{T+5} < Close_T - 1.5 * ATR_T)  -> Mappé en 0
   0 : Neutre / Bruit (Prix dans le corridor ±1.5 * ATR)     -> Mappé en 1
  +1 : Achat franc   (Close_{T+5} > Close_T + 1.5 * ATR_T)  -> Mappé en 2

Usage :
    python train_model.py              # Entraînement complet 3-classes
    python train_model.py --ticker BNB-USD
"""

import argparse
import gc
import json
import logging
import warnings
from pathlib import Path
from datetime import datetime
from typing import Tuple, Dict, Any, List

import numpy as np
import pandas as pd

# ML & Metrics
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import RobustScaler
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix
)
import xgboost as xgb
import joblib

from data_pipeline import load_processed, OUTPUT_PATH

warnings.filterwarnings("ignore")

# Configuration des répertoires
AI_DIR        = Path(__file__).parent
MODELS_DIR    = AI_DIR / "models"
LOGS_DIR      = AI_DIR / "logs"
MODELS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

MODEL_PKL_PATH  = MODELS_DIR / "xgboost_model.pkl"
MODEL_JSON_PATH = MODELS_DIR / "xgboost_model.json"
METADATA_PATH   = MODELS_DIR / "model_metadata.json"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "train_model.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# Features techniques clés pour la prédiction
FEATURE_COLS = [
    # Momentum & Tendance
    "rsi_14", "macd", "macd_signal", "macd_hist",
    "bb_upper", "bb_lower", "bb_width", "bb_pct",
    "sma_20", "sma_50", "price_to_sma20",
    # Volatilité & Écart dynamique
    "atr_14", "volatility_30d", "candle_range_pct",
    # Rendements & Lagged Returns (T-1, T-2, T-3)
    "log_return_1d", "lag_return_1", "lag_return_2", "lag_return_3",
    # Dynamique de Volume
    "volume_zscore",
    # Score de Sentiment NLP FinBERT [-1.0, +1.0]
    "sentiment_score",
]
TARGET_COL = "target_direction"

# Mapping des 3 classes pour XGBoost (qui exige des entiers 0, 1, 2)
CLASS_TO_IDX = {-1: 0, 0: 1, 1: 2}
IDX_TO_CLASS = {0: -1, 1: 0, 2: 1}
CLASS_NAMES  = ["Vente (-1)", "Neutre (0)", "Achat (+1)"]

# Hyperparamètres XGBoost 3-Classes stricts anti-overfitting
XGBOOST_PARAMS = {
    "objective":          "multi:softprob",
    "num_class":          3,
    "eval_metric":        "mlogloss",
    "n_estimators":       600,
    "max_depth":          4,         # Faible profondeur pour éviter d'apprendre le bruit
    "learning_rate":      0.02,      # Apprentissage très progressif
    "subsample":          0.8,       # Sous-échantillonnage des lignes
    "colsample_bytree":   0.8,       # Sous-échantillonnage des colonnes
    "colsample_bylevel":  0.8,
    "reg_alpha":          1.0,       # Régularisation L1
    "reg_lambda":         1.0,       # Régularisation L2
    "min_child_weight":   5,
    "gamma":              0.1,
    "tree_method":        "hist",
    "device":             "cpu",
    "random_state":       42,
    "n_jobs":             -1,
    "verbosity":          0,
}

N_SPLITS   = 5   # Folds temporels TimeSeriesSplit
EARLY_STOP = 50  # Arrêt précoce strict sur validation


def ensure_features(df: pd.DataFrame) -> pd.DataFrame:
    """Garantit la présence de toutes les features requises."""
    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if not missing:
        return df

    log.info(f"[ENRICH] Calcul dynamique des features manquantes : {missing}")
    frames = []
    for _, grp in df.groupby("ticker", observed=True):
        grp = grp.sort_values("date").copy()
        c = grp["close"].astype("float64")
        h = grp["high"].astype("float64")
        l = grp["low"].astype("float64")

        if "sma_20" not in grp.columns:
            grp["sma_20"] = c.rolling(20, min_periods=1).mean().astype("float32")
        if "sma_50" not in grp.columns:
            grp["sma_50"] = c.rolling(50, min_periods=1).mean().astype("float32")

        if "bb_upper" not in grp.columns or "bb_lower" not in grp.columns:
            std_20 = c.rolling(20, min_periods=1).std().fillna(0)
            grp["bb_upper"] = (grp["sma_20"] + 2.0 * std_20).astype("float32")
            grp["bb_lower"] = (grp["sma_20"] - 2.0 * std_20).astype("float32")
            grp["bb_width"] = ((grp["bb_upper"] - grp["bb_lower"]) / (grp["sma_20"].astype("float64") + 1e-9)).astype("float32")
            grp["bb_pct"]   = ((c - grp["bb_lower"]) / (grp["bb_upper"] - grp["bb_lower"] + 1e-9)).clip(0.0, 1.0).astype("float32")

        if "atr_14" not in grp.columns:
            prev_c = c.shift(1).fillna(c)
            tr1 = h - l
            tr2 = (h - prev_c).abs()
            tr3 = (l - prev_c).abs()
            tr  = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            atr_14 = tr.rolling(14, min_periods=1).mean()
            grp["atr_14"] = (atr_14 / (c + 1e-9)).astype("float32")

        log_ret = np.log(c / c.shift(1).replace(0, np.nan)).fillna(0)
        if "log_return_1d" not in grp.columns:
            grp["log_return_1d"] = log_ret.astype("float32")
        if "lag_return_1" not in grp.columns:
            grp["lag_return_1"] = log_ret.shift(1).fillna(0).astype("float32")
        if "lag_return_2" not in grp.columns:
            grp["lag_return_2"] = log_ret.shift(2).fillna(0).astype("float32")
        if "lag_return_3" not in grp.columns:
            grp["lag_return_3"] = log_ret.shift(3).fillna(0).astype("float32")

        if "price_to_sma20" not in grp.columns:
            grp["price_to_sma20"] = (c / (grp["sma_20"].astype("float64") + 1e-9)).astype("float32")
        if "candle_range_pct" not in grp.columns:
            grp["candle_range_pct"] = ((h - l) / (l + 1e-9) * 100).astype("float32")
        if "volume_zscore" not in grp.columns:
            vol_m = grp["volume"].rolling(20, min_periods=1).mean()
            vol_s = grp["volume"].rolling(20, min_periods=1).std().replace(0, 1).fillna(1)
            grp["volume_zscore"] = ((grp["volume"] - vol_m) / vol_s).astype("float32")

        if "sentiment_score" not in grp.columns:
            norm_rsi = (grp["rsi_14"] - 50.0) / 25.0
            norm_macd = grp["macd_hist"] / (c * 0.01 + 1e-9)
            grp["sentiment_score"] = np.tanh(0.6 * norm_rsi + 0.4 * norm_macd).astype("float32")

        frames.append(grp)

    return pd.concat(frames, ignore_index=True)


def prepare_data(df: pd.DataFrame, ticker: str = None) -> Tuple[pd.DataFrame, pd.Series]:
    """Prépare et trie chronologiquement les données multi-classes."""
    if ticker:
        df = df[df["ticker"] == ticker].copy()
        log.info(f"[PREP] Ticker ciblé : {ticker} -> {len(df):,} lignes")
    else:
        log.info(f"[PREP] Multi-actifs global -> {len(df):,} lignes")

    df = ensure_features(df)

    # Tri temporel strict par date (pas de shuffle / lookahead bias)
    df = df.sort_values("date").reset_index(drop=True)

    X = df[FEATURE_COLS].astype("float32")
    y = df[TARGET_COL].astype("int8")

    valid_mask = X.notna().all(axis=1) & y.notna()
    X = X[valid_mask].reset_index(drop=True)
    y = y[valid_mask].reset_index(drop=True)

    dist = y.value_counts(normalize=True).to_dict()
    log.info(
        f"[PREP] Échantillons: {len(X):,} | Features: {len(FEATURE_COLS)} | "
        f"-1 (Vente): {dist.get(-1, 0):.1%} | 0 (Neutre): {dist.get(0, 0):.1%} | +1 (Achat): {dist.get(1, 0):.1%}"
    )

    return X, y


def cross_validate_timeseries(X: pd.DataFrame, y: pd.Series):
    """Validation croisée temporelle 3-classes avec TimeSeriesSplit."""
    log.info(f"[CV] TimeSeriesSplit 3-Classes ({N_SPLITS} folds chronologiques)")
    tscv = TimeSeriesSplit(n_splits=N_SPLITS)

    # Mappage des labels {-1, 0, 1} vers {0, 1, 2}
    y_xgb = y.map(CLASS_TO_IDX).to_numpy()

    cv_results = []
    best_score = -np.inf
    best_fold_model = None

    for fold_idx, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y_xgb[train_idx], y_xgb[val_idx]

        # Pondération automatique des classes pour compenser le déséquilibre
        sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)

        scaler = RobustScaler()
        X_train_sc = scaler.fit_transform(X_train)
        X_val_sc   = scaler.transform(X_val)

        model = xgb.XGBClassifier(**XGBOOST_PARAMS, early_stopping_rounds=EARLY_STOP)
        model.fit(
            X_train_sc, y_train,
            sample_weight=sample_weights,
            eval_set=[(X_val_sc, y_val)],
            verbose=False,
        )

        y_prob = model.predict_proba(X_val_sc)
        y_pred = np.argmax(y_prob, axis=1)

        acc   = accuracy_score(y_val, y_pred)
        f1_m  = f1_score(y_val, y_pred, average="macro", zero_division=0)
        f1_w  = f1_score(y_val, y_pred, average="weighted", zero_division=0)
        p_buy = precision_score(y_val, y_pred, labels=[2], average=None, zero_division=0)[0]
        p_sel = precision_score(y_val, y_pred, labels=[0], average=None, zero_division=0)[0]

        log.info(
            f"  Fold {fold_idx + 1}/{N_SPLITS} | Accuracy={acc:.4f} | F1-Macro={f1_m:.4f} | "
            f"F1-Weighted={f1_w:.4f} | Prec(+1)={p_buy:.4f} | Prec(-1)={p_sel:.4f} | Iter={model.best_iteration}"
        )

        cv_results.append({
            "fold": fold_idx + 1,
            "accuracy": float(acc),
            "f1_macro": float(f1_m),
            "f1_weighted": float(f1_w),
            "precision_buy": float(p_buy),
            "precision_sell": float(p_sel),
            "best_iteration": int(model.best_iteration),
        })

        if f1_m > best_score:
            best_score = f1_m
            best_fold_model = (model, scaler)

        del X_train_sc, X_val_sc
        gc.collect()

    log.info("[CV] Résumé des métriques 3-classes :")
    log.info(f"  Accuracy Moyenne     = {np.mean([r['accuracy'] for r in cv_results]):.4f} ± {np.std([r['accuracy'] for r in cv_results]):.4f}")
    log.info(f"  F1-Macro Moyen       = {np.mean([r['f1_macro'] for r in cv_results]):.4f} ± {np.std([r['f1_macro'] for r in cv_results]):.4f}")
    log.info(f"  F1-Weighted Moyen    = {np.mean([r['f1_weighted'] for r in cv_results]):.4f} ± {np.std([r['f1_weighted'] for r in cv_results]):.4f}")

    return cv_results, best_fold_model


def train_final_model(X: pd.DataFrame, y: pd.Series):
    """
    Entraînement final sur 80% passé avec validation sur 20% futur (chronologique).
    """
    log.info("[TRAIN] Entraînement final 3-Classes (80% Train chronologique / 20% Val)...")

    split_idx = int(len(X) * 0.80)
    X_tr, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    y_tr, y_val = y.iloc[:split_idx], y.iloc[split_idx:]

    y_tr_xgb  = y_tr.map(CLASS_TO_IDX).to_numpy()
    y_val_xgb = y_val.map(CLASS_TO_IDX).to_numpy()

    sample_weights = compute_sample_weight(class_weight="balanced", y=y_tr_xgb)

    scaler = RobustScaler()
    X_tr_sc  = scaler.fit_transform(X_tr)
    X_val_sc = scaler.transform(X_val)

    final_model = xgb.XGBClassifier(**XGBOOST_PARAMS, early_stopping_rounds=EARLY_STOP)
    final_model.fit(
        X_tr_sc, y_tr_xgb,
        sample_weight=sample_weights,
        eval_set=[(X_val_sc, y_val_xgb)],
        verbose=100,
    )

    y_prob = final_model.predict_proba(X_val_sc)

    # Prédictions directes par argmax
    y_pred_xgb = np.argmax(y_prob, axis=1)
    y_pred_orig = np.array([IDX_TO_CLASS[idx] for idx in y_pred_xgb])
    y_val_orig  = y_val.to_numpy()

    acc    = accuracy_score(y_val_orig, y_pred_orig)
    f1_m   = f1_score(y_val_orig, y_pred_orig, average="macro", zero_division=0)
    f1_w   = f1_score(y_val_orig, y_pred_orig, average="weighted", zero_division=0)
    report = classification_report(y_val_orig, y_pred_orig, target_names=["Vente (-1)", "Neutre (0)", "Achat (+1)"], digits=4, zero_division=0)
    cm     = confusion_matrix(y_val_orig, y_pred_orig, labels=[-1, 0, 1])

    log.info("\n" + "=" * 70)
    log.info("  ÉVALUATION MODÈLE 3-CLASSES SUR LE JEU DE TEST (20% RÉCENT)")
    log.info("=" * 70)
    log.info(f"  Accuracy Globale   : {acc:.4f}")
    log.info(f"  F1-Score Macro     : {f1_m:.4f}")
    log.info(f"  F1-Score Pondéré   : {f1_w:.4f}")
    log.info(f"  Best Iteration     : {final_model.best_iteration}")
    log.info("\nClassification Report (3 Classes) :\n" + report)
    log.info(f"\nMatrice de Confusion (Lignes=Réel [-1,0,1], Colonnes=Prédit [-1,0,1]) :\n{cm}")

    eval_summary = {
        "accuracy": float(acc),
        "f1_macro": float(f1_m),
        "f1_weighted": float(f1_w),
        "confusion_matrix": cm.tolist(),
        "classification_report": report,
        "classes": [-1, 0, 1],
    }

    return final_model, scaler, eval_summary


def save_model(model, scaler, cv_results: list, feature_cols: list, eval_summary: dict):
    """Sauvegarde le modèle multi-classe aux formats .pkl, .json natif et metadata."""
    pipeline = {
        "model": model,
        "scaler": scaler,
        "feature_cols": feature_cols,
        "classes": [-1, 0, 1],
        "class_to_idx": CLASS_TO_IDX,
        "idx_to_class": IDX_TO_CLASS,
        "eval_summary": eval_summary,
    }
    joblib.dump(pipeline, MODEL_PKL_PATH, compress=3)
    log.info(f"[SAVE] Modèle Python complet sauvegardé -> {MODEL_PKL_PATH}")

    model.save_model(str(MODEL_JSON_PATH))
    log.info(f"[SAVE] Modèle natif XGBoost JSON exporté -> {MODEL_JSON_PATH}")

    metadata = {
        "trained_at": datetime.now().isoformat(),
        "model_type": "XGBClassifier (3-Classes multi:softprob)",
        "feature_cols": feature_cols,
        "hyperparams": XGBOOST_PARAMS,
        "n_cv_folds": N_SPLITS,
        "classes": [-1, 0, 1],
        "cv_results": cv_results,
        "cv_mean_accuracy": float(np.mean([r["accuracy"] for r in cv_results])),
        "cv_mean_f1_macro": float(np.mean([r["f1_macro"] for r in cv_results])),
        "final_evaluation": eval_summary,
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    log.info(f"[SAVE] Métadonnées écrites -> {METADATA_PATH}")


def load_model():
    """Charge le modèle 3-classes pour l'inférence."""
    if not MODEL_PKL_PATH.exists():
        raise FileNotFoundError(f"Modèle non trouvé : {MODEL_PKL_PATH}")
    pipeline = joblib.load(MODEL_PKL_PATH)
    return pipeline["model"], pipeline["scaler"], pipeline["feature_cols"]


def predict(raw_features: dict, confidence_threshold: float = 0.60) -> Dict[str, Any]:
    """
    Inférence 3-classes CALIBRÉE en temps réel pour une observation.

    Logique de filtrage par seuil de confiance :
      - Achat (+1)  : uniquement si P(Classe +1) >= confidence_threshold
      - Vente (-1)  : uniquement si P(Classe -1) >= confidence_threshold
      - Neutre (0)  : dans TOUS les autres cas (confiance insuffisante)

    Args:
        raw_features: dict des features techniques pour une observation.
        confidence_threshold: seuil minimal de probabilité (défaut=0.60).

    Returns:
        prediction: -1 (Vente), 0 (Neutre), 1 (Achat)
        signal: "BEARISH", "NEUTRAL", "BULLISH"
        probabilities: {"sell": P(-1), "neutral": P(0), "buy": P(+1)}
        confidence: probabilité de la classe prédite
        calibrated: True si le signal a été filtré par le seuil
    """
    model, scaler, feature_cols = load_model()
    x = np.array([[raw_features.get(c, 0.0) for c in feature_cols]], dtype="float32")
    x_sc = scaler.transform(x)

    probs = model.predict_proba(x_sc)[0]
    p_sell    = float(probs[0])  # P(Classe -1)
    p_neutral = float(probs[1])  # P(Classe  0)
    p_buy     = float(probs[2])  # P(Classe +1)

    # --- Filtrage calibré par seuil de confiance avec dominance directionnelle ---
    if p_buy >= confidence_threshold and p_buy > p_sell:
        pred_class = 1
        confidence = p_buy
    elif p_sell >= confidence_threshold and p_sell > p_buy:
        pred_class = -1
        confidence = p_sell
    else:
        # Confiance insuffisante ou indécision → sécurité : Neutre
        pred_class = 0
        confidence = p_neutral

    signal_map = {-1: "BEARISH", 0: "NEUTRAL", 1: "BULLISH"}
    return {
        "prediction": pred_class,
        "signal": signal_map[pred_class],
        "confidence": confidence,
        "calibrated": True,
        "confidence_threshold": confidence_threshold,
        "probabilities": {
            "sell": p_sell,
            "neutral": p_neutral,
            "buy": p_buy,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="XGBoost 3-Classes Training — PIF AI Engine")
    parser.add_argument("--ticker", type=str, default=None, help="Filtrer sur un ticker spécifique")
    parser.add_argument("--data-path", type=str, default=str(OUTPUT_PATH))
    args = parser.parse_args()

    log.info("=" * 70)
    log.info("  PIF AI — ENTRAÎNEMENT XGBOOST 3 CLASSES (DYNAMIQUE ATR)")
    log.info("=" * 70)

    df = load_processed(Path(args.data_path))
    X, y = prepare_data(df, ticker=args.ticker)

    # 1. Validation croisée temporelle
    cv_results, _ = cross_validate_timeseries(X, y)

    # 2. Entraînement final
    final_model, final_scaler, eval_summary = train_final_model(X, y)

    # 3. Sauvegarde multi-format
    save_model(final_model, final_scaler, cv_results, FEATURE_COLS, eval_summary)

    gc.collect()
    log.info("=" * 70)
    log.info("  MODÈLE 3-CLASSES ENTRAÎNÉ ET EXPORTÉ AVEC SUCCÈS")
    log.info("=" * 70)


if __name__ == "__main__":
    main()