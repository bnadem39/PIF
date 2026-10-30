"""
Explications XAI (cahier §3.6) avec SHAP.

- Locales : contribution de chaque variable (chocs + caractéristiques de la banque) au taux de perte
  prédit pour une banque dans un scénario (« pourquoi cette banque perd-elle autant ? »).
- Globales : importance moyenne |SHAP| sur un échantillon du jeu d'entraînement.
- Comparaison : différence des contributions entre deux banques (« pourquoi réagissent-elles différemment ? »).

Pour les modèles à arbres (Random Forest, XGBoost) on utilise TreeExplainer (exact et rapide) ;
pour le modèle linéaire, LinearExplainer.
"""
import numpy as np
import shap

from .dataset import FEATURE_LABELS, FEATURES


class StressExplainer:
    def __init__(self, bundle: dict, background):
        self.explainers = {}
        bg = background[FEATURES].to_numpy()
        for target, best in bundle["best"].items():
            model = best["model"]
            if best["name"] == "ridge":
                scaler, ridge = model.steps[0][1], model.steps[-1][1]
                self.explainers[target] = ("linear", shap.LinearExplainer(ridge, scaler.transform(bg)), scaler)
            else:
                self.explainers[target] = ("tree", shap.TreeExplainer(model), None)
        self.global_importance = {t: self._global(t, bg) for t in self.explainers}

    def _values(self, target: str, X: np.ndarray) -> tuple:
        kind, explainer, scaler = self.explainers[target]
        Xt = scaler.transform(X) if scaler is not None else X
        values = np.asarray(explainer.shap_values(Xt))
        base = explainer.expected_value
        base = float(np.asarray(base).reshape(-1)[0])
        return values, base

    def _global(self, target: str, bg: np.ndarray) -> list:
        sample = bg[:2000]
        values, _ = self._values(target, sample)
        mean_abs = np.abs(values).mean(axis=0)
        order = np.argsort(-mean_abs)
        return [{"feature": FEATURES[i], "label": FEATURE_LABELS[FEATURES[i]], "importance": float(mean_abs[i])}
                for i in order]

    def local(self, target: str, x_row, top: int = 8) -> dict:
        values, base = self._values(target, x_row.to_numpy())
        contrib = values[0]
        order = np.argsort(-np.abs(contrib))[:top]
        return {
            "target": target,
            "base_value": base,
            "prediction": base + float(contrib.sum()),
            "contributions": [
                {
                    "feature": FEATURES[i],
                    "label": FEATURE_LABELS[FEATURES[i]],
                    "value": float(x_row.iloc[0, i]),
                    "shap": float(contrib[i]),
                    "direction": "hausse du risque" if contrib[i] > 0 else "baisse du risque",
                }
                for i in order
            ],
        }

    def compare(self, target: str, x_a, x_b, top: int = 6) -> list:
        va, _ = self._values(target, x_a.to_numpy())
        vb, _ = self._values(target, x_b.to_numpy())
        diff = va[0] - vb[0]
        order = np.argsort(-np.abs(diff))[:top]
        return [{"feature": FEATURES[i], "label": FEATURE_LABELS[FEATURES[i]], "difference": float(diff[i])}
                for i in order]
