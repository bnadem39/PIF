"""
================================================================================
    PREDICT SIGNALS — Évaluation Calibrée des Signaux 3-Classes (XGBoost)
     Filtrage par Seuil de Confiance ≥ 0.60 • Rapport de Classification
================================================================================

Objectif : Évaluer l'impact de la calibration post-hoc (seuil de confiance)
           sur la réduction des faux signaux d'achat (+1) et de vente (-1).

Usage :
    python predict_signals.py                    # Seuil par défaut (0.60)
    python predict_signals.py --threshold 0.55   # Seuil personnalisé
    python predict_signals.py --ticker BNB-USD   # Ticker spécifique
"""

import argparse
import json
import logging
import warnings
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix,
)

from data_pipeline import load_processed, OUTPUT_PATH
from train_model import (
    load_model, prepare_data, FEATURE_COLS, TARGET_COL,
    CLASS_TO_IDX, IDX_TO_CLASS, CLASS_NAMES,
)

warnings.filterwarnings("ignore")

AI_DIR   = Path(__file__).parent
LOGS_DIR = AI_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "predict_signals.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
#  FONCTIONS DE PRÉDICTION CALIBRÉE (BATCH)
# ══════════════════════════════════════════════════════════════════════════════

def predict_calibrated_batch(
    X: np.ndarray,
    model,
    scaler,
    confidence_threshold: float = 0.60,
) -> Dict[str, Any]:
    """
    Prédiction calibrée sur un batch de données.

    Logique :
      - Achat (+1)  : uniquement si P(Classe +1) >= confidence_threshold
      - Vente (-1)  : uniquement si P(Classe -1) >= confidence_threshold
      - Neutre (0)  : TOUS les autres cas (confiance insuffisante → sécurité)

    Returns:
        dict avec preds_argmax (brut), preds_calibrated (filtré), probas
    """
    X_sc = scaler.transform(X)
    probas = model.predict_proba(X_sc)  # shape (n, 3) : [P(-1), P(0), P(+1)]

    # --- Méthode classique : argmax brut ---
    preds_argmax_idx = np.argmax(probas, axis=1)
    preds_argmax = np.array([IDX_TO_CLASS[idx] for idx in preds_argmax_idx])

    # --- Méthode calibrée : seuil de confiance avec dominance directionnelle ---
    p_sell    = probas[:, 0]  # P(Classe -1)
    p_neutral = probas[:, 1]  # P(Classe  0)
    p_buy     = probas[:, 2]  # P(Classe +1)

    preds_calibrated = np.zeros(len(probas), dtype=np.int8)  # Défaut : Neutre (0)

    # Achat (+1) si et seulement si P(Achat) >= threshold ET P(Achat) > P(Vente)
    buy_mask  = (p_buy >= confidence_threshold) & (p_buy > p_sell)
    preds_calibrated[buy_mask] = 1

    # Vente (-1) si et seulement si P(Vente) >= threshold ET P(Vente) > P(Achat)
    sell_mask = (p_sell >= confidence_threshold) & (p_sell > p_buy) & (~buy_mask)
    preds_calibrated[sell_mask] = -1

    return {
        "preds_argmax": preds_argmax,
        "preds_calibrated": preds_calibrated,
        "probas": probas,
        "p_buy": p_buy,
        "p_sell": p_sell,
        "p_neutral": p_neutral,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  RAPPORT COMPARATIF : ARGMAX vs CALIBRÉ
# ══════════════════════════════════════════════════════════════════════════════

def generate_comparison_report(
    y_true: np.ndarray,
    preds_argmax: np.ndarray,
    preds_calibrated: np.ndarray,
    threshold: float,
) -> str:
    """Génère un rapport comparatif détaillé entre argmax brut et calibré."""

    # --- Métriques argmax brut ---
    acc_argmax  = accuracy_score(y_true, preds_argmax)
    f1m_argmax  = f1_score(y_true, preds_argmax, average="macro", zero_division=0)
    f1w_argmax  = f1_score(y_true, preds_argmax, average="weighted", zero_division=0)
    prec_argmax = precision_score(y_true, preds_argmax, average=None, labels=[-1, 0, 1], zero_division=0)
    rec_argmax  = recall_score(y_true, preds_argmax, average=None, labels=[-1, 0, 1], zero_division=0)
    cm_argmax   = confusion_matrix(y_true, preds_argmax, labels=[-1, 0, 1])

    # --- Métriques calibrées ---
    acc_cal  = accuracy_score(y_true, preds_calibrated)
    f1m_cal  = f1_score(y_true, preds_calibrated, average="macro", zero_division=0)
    f1w_cal  = f1_score(y_true, preds_calibrated, average="weighted", zero_division=0)
    prec_cal = precision_score(y_true, preds_calibrated, average=None, labels=[-1, 0, 1], zero_division=0)
    rec_cal  = recall_score(y_true, preds_calibrated, average=None, labels=[-1, 0, 1], zero_division=0)
    cm_cal   = confusion_matrix(y_true, preds_calibrated, labels=[-1, 0, 1])

    # --- Distribution des signaux ---
    n_total = len(y_true)
    dist_true = {v: (y_true == v).sum() for v in [-1, 0, 1]}
    dist_argmax = {v: (preds_argmax == v).sum() for v in [-1, 0, 1]}
    dist_cal = {v: (preds_calibrated == v).sum() for v in [-1, 0, 1]}

    # Faux signaux
    false_buy_argmax  = ((preds_argmax == 1) & (y_true != 1)).sum()
    false_sell_argmax = ((preds_argmax == -1) & (y_true != -1)).sum()
    false_buy_cal     = ((preds_calibrated == 1) & (y_true != 1)).sum()
    false_sell_cal    = ((preds_calibrated == -1) & (y_true != -1)).sum()

    report = f"""
{'=' * 80}
  RAPPORT DE CALIBRATION DES SIGNAUX 3-CLASSES (SEUIL ≥ {threshold:.0%})
{'=' * 80}

  Échantillons de test : {n_total:,}
  Distribution réelle  : Vente(-1)={dist_true[-1]:,} ({dist_true[-1]/n_total:.1%}) | Neutre(0)={dist_true[0]:,} ({dist_true[0]/n_total:.1%}) | Achat(+1)={dist_true[1]:,} ({dist_true[1]/n_total:.1%})

{'─' * 80}
  ┌──────────────────────────┬───────────────────┬───────────────────┐
  │ MÉTRIQUE                 │ ARGMAX (Brut)     │ CALIBRÉ (≥{threshold:.0%})    │
  ├──────────────────────────┼───────────────────┼───────────────────┤
  │ Accuracy Globale         │ {acc_argmax:17.4f} │ {acc_cal:17.4f} │
  │ F1-Score Macro           │ {f1m_argmax:17.4f} │ {f1m_cal:17.4f} │
  │ F1-Score Pondéré         │ {f1w_argmax:17.4f} │ {f1w_cal:17.4f} │
  ├──────────────────────────┼───────────────────┼───────────────────┤
  │ Précision Vente (-1)     │ {prec_argmax[0]:17.4f} │ {prec_cal[0]:17.4f} │
  │ Précision Neutre (0)     │ {prec_argmax[1]:17.4f} │ {prec_cal[1]:17.4f} │
  │ Précision Achat (+1)     │ {prec_argmax[2]:17.4f} │ {prec_cal[2]:17.4f} │
  ├──────────────────────────┼───────────────────┼───────────────────┤
  │ Rappel Vente (-1)        │ {rec_argmax[0]:17.4f} │ {rec_cal[0]:17.4f} │
  │ Rappel Neutre (0)        │ {rec_argmax[1]:17.4f} │ {rec_cal[1]:17.4f} │
  │ Rappel Achat (+1)        │ {rec_argmax[2]:17.4f} │ {rec_cal[2]:17.4f} │
  └──────────────────────────┴───────────────────┴───────────────────┘

{'─' * 80}
  DISTRIBUTION DES SIGNAUX ÉMIS :
  ┌────────────────────┬─────────────────┬─────────────────┬──────────────┐
  │ Signal             │ ARGMAX (Brut)   │ CALIBRÉ         │ Réduction    │
  ├────────────────────┼─────────────────┼─────────────────┼──────────────┤
  │ Vente (-1)         │ {dist_argmax[-1]:>15,} │ {dist_cal[-1]:>15,} │ {(1 - dist_cal[-1]/(dist_argmax[-1]+1e-9))*100:>10.1f}%  │
  │ Neutre (0)         │ {dist_argmax[0]:>15,} │ {dist_cal[0]:>15,} │ {(dist_cal[0]/(dist_argmax[0]+1e-9)-1)*100:>+10.1f}%  │
  │ Achat (+1)         │ {dist_argmax[1]:>15,} │ {dist_cal[1]:>15,} │ {(1 - dist_cal[1]/(dist_argmax[1]+1e-9))*100:>10.1f}%  │
  └────────────────────┴─────────────────┴─────────────────┴──────────────┘

{'─' * 80}
  FAUX SIGNAUX (Signaux émis sur la mauvaise classe) :
  ┌────────────────────┬─────────────────┬─────────────────┬──────────────┐
  │ Faux Signal        │ ARGMAX (Brut)   │ CALIBRÉ         │ Réduction    │
  ├────────────────────┼─────────────────┼─────────────────┼──────────────┤
  │ Faux Achat (+1)    │ {false_buy_argmax:>15,} │ {false_buy_cal:>15,} │ {(1 - false_buy_cal/(false_buy_argmax+1e-9))*100:>10.1f}%  │
  │ Faux Vente (-1)    │ {false_sell_argmax:>15,} │ {false_sell_cal:>15,} │ {(1 - false_sell_cal/(false_sell_argmax+1e-9))*100:>10.1f}%  │
  └────────────────────┴─────────────────┴─────────────────┴──────────────┘

{'─' * 80}
  MATRICE DE CONFUSION — ARGMAX (Brut) :
  (Lignes = Réel [-1, 0, +1], Colonnes = Prédit [-1, 0, +1])
{cm_argmax}

  MATRICE DE CONFUSION — CALIBRÉ (Seuil ≥ {threshold:.0%}) :
  (Lignes = Réel [-1, 0, +1], Colonnes = Prédit [-1, 0, +1])
{cm_cal}

{'─' * 80}
  RAPPORT CLASSIFICATION DÉTAILLÉ — CALIBRÉ :
{classification_report(y_true, preds_calibrated, target_names=CLASS_NAMES, digits=4, zero_division=0)}
{'=' * 80}
"""
    return report


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def evaluate_threshold_grid(
    X_test_values: np.ndarray,
    y_test: np.ndarray,
    model,
    scaler,
    thresholds: List[float] = [0.45, 0.50, 0.55, 0.60],
) -> Dict[float, Dict[str, Any]]:
    """Évalue et compare une grille de seuils de confiance sur le jeu de test."""
    grid_results = {}
    print("\n" + "=" * 90)
    print("  PIF AI — COMPARAISON MULTI-SEUILS DE CONFIANCE [0.45, 0.50, 0.55, 0.60]")
    print("=" * 90)
    print(f"{'Seuil':>7} | {'Accuracy':>9} | {'F1-Macro':>9} | {'Prec Achat':>10} | {'Prec Vente':>10} | {'Faux Achat':>10} | {'Faux Vente':>10} | {'Signaux (A/V)':>13}")
    print("-" * 90)

    for th in thresholds:
        res = predict_calibrated_batch(X_test_values, model, scaler, confidence_threshold=th)
        preds = res["preds_calibrated"]
        acc = accuracy_score(y_test, preds)
        f1m = f1_score(y_test, preds, average="macro", zero_division=0)
        prec = precision_score(y_test, preds, average=None, labels=[-1, 0, 1], zero_division=0)
        rec = recall_score(y_test, preds, average=None, labels=[-1, 0, 1], zero_division=0)

        false_buy = int(((preds == 1) & (y_test != 1)).sum())
        false_sell = int(((preds == -1) & (y_test != -1)).sum())
        n_buy = int((preds == 1).sum())
        n_sell = int((preds == -1).sum())

        grid_results[th] = {
            "threshold": th,
            "accuracy": float(acc),
            "f1_macro": float(f1m),
            "precision_buy": float(prec[2]),
            "precision_sell": float(prec[0]),
            "recall_buy": float(rec[2]),
            "recall_sell": float(rec[0]),
            "false_buy": false_buy,
            "false_sell": false_sell,
            "n_buy": n_buy,
            "n_sell": n_sell,
        }

        print(f"{th:>6.0%} | {acc:>9.4f} | {f1m:>9.4f} | {prec[2]:>10.4f} | {prec[0]:>10.4f} | {false_buy:>10,d} | {false_sell:>10,d} | {n_buy:>5,d} / {n_sell:>5,d}")

    print("=" * 90 + "\n")
    return grid_results


def update_metadata_threshold(threshold: float = 0.60):
    """Sauvegarde le seuil optimal de confiance dans model_metadata.json."""
    metadata_path = AI_DIR / "models" / "model_metadata.json"
    if metadata_path.exists():
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
            meta["confidence_threshold"] = threshold
            meta["calibration_note"] = (
                f"Signaux Achat (+1) et Vente (-1) filtrés avec confiance >= {threshold:.0%}. "
                "Sous ce seuil, les observations sont classées Neutre (0) pour éliminer les faux positifs."
            )
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(meta, f, indent=2, ensure_ascii=False)
            log.info(f"[METADATA] Clé 'confidence_threshold'={threshold:.2f} enregistrée dans {metadata_path.name}")
        except Exception as e:
            log.warning(f"[METADATA] Impossible de mettre à jour {metadata_path}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Évaluation calibrée des signaux 3-classes PIF")
    parser.add_argument("--threshold", type=float, default=0.60,
                        help="Seuil de confiance minimal pour émettre un signal Achat/Vente (défaut: 0.60)")
    parser.add_argument("--grid", action="store_true", default=True,
                        help="Exécuter la grille comparative [0.45, 0.50, 0.55, 0.60]")
    parser.add_argument("--ticker", type=str, default=None,
                        help="Filtrer sur un ticker spécifique")
    parser.add_argument("--data-path", type=str, default=str(OUTPUT_PATH))
    args = parser.parse_args()

    log.info("=" * 70)
    log.info("  PIF AI — ÉVALUATION CALIBRÉE DES SIGNAUX 3-CLASSES")
    log.info(f"  Seuil de confiance sélectionné : {args.threshold:.0%}")
    log.info("=" * 70)

    # 1. Charger les données et le modèle
    df = load_processed(Path(args.data_path))
    X, y = prepare_data(df, ticker=args.ticker)

    model, scaler, feature_cols = load_model()

    # 2. Split temporel 80/20 (même que l'entraînement)
    split_idx = int(len(X) * 0.80)
    X_test = X.iloc[split_idx:]
    y_test = y.iloc[split_idx:].to_numpy()

    log.info(f"[EVAL] Jeu de test (20% récent) : {len(X_test):,} échantillons")

    # 3. Grille comparative multi-seuils demandée [0.45, 0.50, 0.55, 0.60]
    if args.grid:
        grid_metrics = evaluate_threshold_grid(
            X_test.values, y_test, model, scaler, thresholds=[0.45, 0.50, 0.55, 0.60]
        )
        grid_file = LOGS_DIR / "threshold_grid_comparison.json"
        with open(grid_file, "w", encoding="utf-8") as f:
            json.dump({str(k): v for k, v in grid_metrics.items()}, f, indent=2)

    # 4. Prédictions brutes et calibrées pour le seuil choisi
    result = predict_calibrated_batch(
        X_test.values, model, scaler,
        confidence_threshold=args.threshold,
    )

    # 5. Rapport comparatif
    report = generate_comparison_report(
        y_true=y_test,
        preds_argmax=result["preds_argmax"],
        preds_calibrated=result["preds_calibrated"],
        threshold=args.threshold,
    )
    log.info(report)

    # 6. Sauvegarder le rapport et métriques
    report_path = LOGS_DIR / "calibration_report.txt"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    log.info(f"[SAVE] Rapport sauvegardé → {report_path}")

    metrics = {
        "threshold": args.threshold,
        "test_size": len(X_test),
        "argmax": {
            "accuracy": float(accuracy_score(y_test, result["preds_argmax"])),
            "f1_macro": float(f1_score(y_test, result["preds_argmax"], average="macro", zero_division=0)),
            "false_buy": int(((result["preds_argmax"] == 1) & (y_test != 1)).sum()),
            "false_sell": int(((result["preds_argmax"] == -1) & (y_test != -1)).sum()),
        },
        "calibrated": {
            "accuracy": float(accuracy_score(y_test, result["preds_calibrated"])),
            "f1_macro": float(f1_score(y_test, result["preds_calibrated"], average="macro", zero_division=0)),
            "false_buy": int(((result["preds_calibrated"] == 1) & (y_test != 1)).sum()),
            "false_sell": int(((result["preds_calibrated"] == -1) & (y_test != -1)).sum()),
        },
    }
    metrics_path = LOGS_DIR / "calibration_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)
    log.info(f"[SAVE] Métriques JSON → {metrics_path}")

    # 7. Mettre à jour model_metadata.json avec le seuil optimal retenu
    update_metadata_threshold(args.threshold)


if __name__ == "__main__":
    main()
