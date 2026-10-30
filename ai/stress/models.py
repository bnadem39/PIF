"""
Comparaison de modèles satellites (cahier §3.5.3 : « comparer plusieurs modèles ») :
Ridge (linéaire), Random Forest, XGBoost, évalués en validation croisée 5 plis.
Le meilleur modèle (R² moyen) de chaque cible est utilisé pour les projections.
"""
import json
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from .dataset import FEATURES, TARGETS, generate_training_data

log = logging.getLogger("stress.models")

MODEL_DIR = Path(__file__).parent / "models"
MODEL_FILE = MODEL_DIR / "stress_models.joblib"
METRICS_FILE = MODEL_DIR / "stress_models_metrics.json"


def candidate_models() -> dict:
    return {
        "ridge": lambda: make_pipeline(StandardScaler(), Ridge(alpha=1.0)),
        "random_forest": lambda: RandomForestRegressor(n_estimators=200, max_depth=12, min_samples_leaf=5,
                                                       n_jobs=-1, random_state=42),
        "xgboost": lambda: XGBRegressor(n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.8,
                                        colsample_bytree=0.8, random_state=42, n_jobs=-1),
    }


def train_and_compare(data=None, n_splits: int = 5) -> dict:
    data = data if data is not None else generate_training_data()
    X = data[FEATURES].to_numpy()
    kf = KFold(n_splits=n_splits, shuffle=True, random_state=42)

    comparison, best = {}, {}
    for target in TARGETS:
        y = data[target].to_numpy()
        comparison[target] = {}
        for name, factory in candidate_models().items():
            r2s, maes = [], []
            for train_idx, val_idx in kf.split(X):
                model = factory()
                model.fit(X[train_idx], y[train_idx])
                pred = model.predict(X[val_idx])
                r2s.append(r2_score(y[val_idx], pred))
                maes.append(mean_absolute_error(y[val_idx], pred))
            comparison[target][name] = {"r2": float(np.mean(r2s)), "mae": float(np.mean(maes))}
            log.info("[STRESS] %s / %s : R2=%.4f MAE=%.5f", target, name, np.mean(r2s), np.mean(maes))

        best_name = max(comparison[target], key=lambda m: comparison[target][m]["r2"])
        final = candidate_models()[best_name]()
        final.fit(X, y)
        best[target] = {"name": best_name, "model": final}

    return {
        "comparison": comparison,
        "best": best,
        "features": FEATURES,
        "n_samples": int(len(data)),
        "data_source": "synthetic",
    }


def save(bundle: dict) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_FILE)
    METRICS_FILE.write_text(json.dumps({
        "comparison": bundle["comparison"],
        "selected": {t: b["name"] for t, b in bundle["best"].items()},
        "n_samples": bundle["n_samples"],
        "data_source": bundle["data_source"],
    }, indent=2), encoding="utf-8")


def load_or_train() -> dict:
    if MODEL_FILE.exists():
        try:
            return joblib.load(MODEL_FILE)
        except Exception as e:  # version de librairie différente, fichier corrompu...
            log.warning("[STRESS] Modèle illisible (%s) : ré-entraînement", e)
    bundle = train_and_compare()
    save(bundle)
    return bundle


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    result = train_and_compare()
    save(result)
    print(json.dumps(result["comparison"], indent=2))
