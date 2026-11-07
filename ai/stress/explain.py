"""
Explications XAI (cahier §3.6) avec SHAP.

- Locales : contribution de chaque variable (chocs + caractéristiques de la banque) au taux de perte
  prédit pour une banque dans un scénario (« pourquoi cette banque perd-elle autant ? »).
- Globales : importance moyenne |SHAP| sur un échantillon du jeu d'entraînement.
- Comparaison : différence des contributions entre deux banques (« pourquoi réagissent-elles différemment ? »).

Pour les modèles à arbres (Random Forest, XGBoost) on utilise TreeExplainer (exact et rapide) ;
pour le modèle linéaire, LinearExplainer.
"""
import logging
import numpy as np

try:
    import shap
    HAVE_SHAP = True
except ImportError:
    shap = None
    HAVE_SHAP = False

from .dataset import FEATURE_LABELS, FEATURES

log = logging.getLogger("stress.explain")

# Patch de résilience automatique pour compatibilité entre XGBoost >= 2.0/3.0 et SHAP TreeExplainer
if HAVE_SHAP:
    try:
        import shap.explainers._tree as _st
        if hasattr(_st, "XGBTreeModelLoader"):
            _orig_loader_init = _st.XGBTreeModelLoader.__init__

            def _safe_loader_init(self, xgb_model):
                try:
                    _orig_loader_init(self, xgb_model)
                except ValueError as ve:
                    if "could not convert string to float" in str(ve):
                        import io, scipy.special
                        from shap.explainers._tree import decode_ubjson_buffer
                        raw = xgb_model.save_raw(raw_format="ubj")
                        with io.BytesIO(raw) as fd:
                            jmodel = decode_ubjson_buffer(fd)
                        learner = jmodel["learner"]
                        learner_model_param = learner["learner_model_param"]
                        raw_bs = learner_model_param["base_score"]
                        if isinstance(raw_bs, str):
                            raw_bs = raw_bs.strip("[] \t\r\n")
                        base_score = float(raw_bs)
                        self.base_score = base_score
                        objective_name = learner["objective"]["name"]
                        if objective_name in ("binary:logistic", "reg:logistic"):
                            self.base_score = scipy.special.logit(base_score)
                        elif objective_name in ("reg:gamma", "reg:tweedie", "count:poisson", "survival:cox", "survival:aft"):
                            self.base_score = np.log(self.base_score)
                    else:
                        raise
            _st.XGBTreeModelLoader.__init__ = _safe_loader_init
    except Exception:
        pass


class StressExplainer:
    def __init__(self, bundle: dict, background):
        self.explainers = {}
        self.bundle = bundle
        bg = background[FEATURES].to_numpy()
        if HAVE_SHAP:
            for target, best in bundle["best"].items():
                model = best["model"]
                if best["name"] == "ridge":
                    scaler, ridge = model.steps[0][1], model.steps[-1][1]
                    self.explainers[target] = ("linear", shap.LinearExplainer(ridge, scaler.transform(bg)), scaler)
                else:
                    try:
                        self.explainers[target] = ("tree", shap.TreeExplainer(model), None)
                    except Exception as ex:
                        log.warning("[STRESS] TreeExplainer fallback sur Explainer universel pour %s: %s", target, ex)
                        try:
                            self.explainers[target] = ("exact", shap.Explainer(model.predict, bg[:100]), None)
                        except Exception:
                            pass
        self.global_importance = {t: self._global(t, bg) for t in bundle.get("best", {})}

    def _values(self, target: str, X: np.ndarray) -> tuple:
        if HAVE_SHAP and target in self.explainers:
            kind, explainer, scaler = self.explainers[target]
            Xt = scaler.transform(X) if scaler is not None else X
            values = np.asarray(explainer.shap_values(Xt))
            base = explainer.expected_value
            base = float(np.asarray(base).reshape(-1)[0])
            return values, base
        # Fallback sans SHAP
        model = self.bundle.get("best", {}).get(target, {}).get("model")
        n_features = len(FEATURES)
        if model and hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
        else:
            importances = np.ones(n_features) / n_features
        pred = model.predict(X) if model else np.zeros(len(X))
        base = float(np.mean(pred)) if len(pred) > 0 else 0.0
        diff = (pred - base).reshape(-1, 1)
        values = diff * importances.reshape(1, -1)
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
