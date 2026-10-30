"""
Tarification (cahier §3.7) : modèle fréquence × sévérité.

  Fréquence : GLM de Poisson, lien log, offset log(exposition)       -> λ (sinistres par an)
  Sévérité  : GLM Gamma, lien log, pondéré par le nombre de sinistres -> coût moyen d'un sinistre
  Prime pure = λ × coût moyen ; P(au moins un sinistre sur la durée) = 1 - exp(-λ × durée)

Un gradient boosting (HistGradientBoosting, pertes Poisson et Gamma) est entraîné sur les mêmes données
pour comparaison. Le GLM reste le modèle de tarif : ses coefficients se lisent directement comme des
coefficients multiplicateurs, ce qu'exigent l'explication du tarif et le contrôle prudentiel.
"""
import logging
import warnings

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split

from .portfolio import CATEGORIES, TRUE_FREQUENCY, TRUE_SEVERITY, age_band, vehicle_age_band

log = logging.getLogger("actuarial.pricing")

REFERENCE = {"age_band": "36-50", "vehicle_age_band": "6-10", "power": "4-5 CV", "region": "Nord",
             "usage": "Personnel", "fuel": "Essence"}
FACTOR_LABELS = {
    "age_band": "Âge du conducteur", "vehicle_age_band": "Âge du véhicule", "power": "Puissance fiscale",
    "region": "Région", "usage": "Usage", "fuel": "Carburant", "bonus_malus": "Bonus-malus",
}
RHS = " + ".join(f"C({c}, Treatment('{REFERENCE[c]}'))" for c in CATEGORIES) + " + log_bm"


def _design(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["log_bm"] = np.log(out["bonus_malus"] / 100.0)
    for c, levels in CATEGORIES.items():
        out[c] = pd.Categorical(out[c], categories=levels)
    return out


def _gbm_matrix(df: pd.DataFrame) -> np.ndarray:
    cols = [df[c].map({v: i for i, v in enumerate(levels)}).to_numpy(float) for c, levels in CATEGORIES.items()]
    return np.column_stack(cols + [df["bonus_malus"].to_numpy(float)])


def poisson_deviance(y, mu, w):
    y, mu = np.asarray(y, float), np.maximum(np.asarray(mu, float), 1e-12)
    term = y * np.log(np.where(y > 0, y, 1.0) / mu) * (y > 0) - (y - mu)
    return float(2 * np.sum(w * term) / np.sum(w))


def gamma_deviance(y, mu, w):
    y, mu = np.asarray(y, float), np.maximum(np.asarray(mu, float), 1e-12)
    return float(2 * np.sum(w * (-np.log(y / mu) + (y - mu) / mu)) / np.sum(w))


def gini(actual, predicted, exposure) -> float:
    """Gini normalisé (courbe de Lorenz ordonnée par la prime prédite) : 0 = aucun pouvoir de segmentation."""
    def raw(order_by):
        order = np.argsort(order_by)
        a, e = np.asarray(actual)[order], np.asarray(exposure)[order]
        cum_a, cum_e = np.cumsum(a) / a.sum(), np.cumsum(e) / e.sum()
        return 1 - 2 * np.trapezoid(cum_a, cum_e)
    return float(raw(predicted) / raw(np.asarray(actual) / np.asarray(exposure)))


class PricingModel:
    def __init__(self, portfolio: pd.DataFrame, test_size: float = 0.2, seed: int = 42):
        self.portfolio = portfolio
        train, test = train_test_split(_design(portfolio), test_size=test_size, random_state=seed)
        self.train, self.test = train, test

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            self.freq = smf.glm(f"claim_count ~ {RHS}", data=train, family=sm.families.Poisson(),
                                offset=np.log(train["exposure"])).fit()
            sev_train = train[train["claim_count"] > 0].assign(avg_cost=lambda d: d["claim_amount"] / d["claim_count"])
            self.sev = smf.glm(f"avg_cost ~ {RHS}", data=sev_train,
                               family=sm.families.Gamma(sm.families.links.Log()),
                               var_weights=sev_train["claim_count"]).fit()

        self.freq_gbm = HistGradientBoostingRegressor(loss="poisson", max_iter=300, learning_rate=0.05,
                                                      categorical_features=list(range(len(CATEGORIES))), random_state=0)
        self.freq_gbm.fit(_gbm_matrix(train), train["claim_count"] / train["exposure"], sample_weight=train["exposure"])
        self.sev_gbm = HistGradientBoostingRegressor(loss="gamma", max_iter=200, learning_rate=0.05,
                                                     categorical_features=list(range(len(CATEGORIES))), random_state=0)
        self.sev_gbm.fit(_gbm_matrix(sev_train), sev_train["avg_cost"], sample_weight=sev_train["claim_count"])

        self.comparison = self._evaluate()
        log.info("[ACTUARIAT] Modèles de tarification entraînés : %s", self.comparison)

    # ── Prédictions ────────────────────────────────────────────────
    def predict(self, df: pd.DataFrame, model: str = "glm") -> pd.DataFrame:
        d = _design(df)
        if model == "glm":
            lam = self.freq.predict(d, offset=np.zeros(len(d)))
            sev = self.sev.predict(d)
        else:
            X = _gbm_matrix(d)
            lam, sev = self.freq_gbm.predict(X), self.sev_gbm.predict(X)
        lam, sev = np.asarray(lam), np.asarray(sev)
        return pd.DataFrame({"frequency": lam, "severity": sev, "pure_premium": lam * sev}, index=df.index)

    def _evaluate(self) -> dict:
        t = self.test
        has = t[t["claim_count"] > 0]
        out = {}
        for name in ("glm", "gbm"):
            p = self.predict(t, name)
            ps = p.loc[has.index]
            out[name] = {
                "frequency_deviance": poisson_deviance(t["claim_count"] / t["exposure"], p["frequency"], t["exposure"]),
                "severity_deviance": gamma_deviance(has["claim_amount"] / has["claim_count"], ps["severity"], has["claim_count"]),
                "gini": gini(t["claim_amount"].to_numpy(), p["pure_premium"].to_numpy(), t["exposure"].to_numpy()),
                "predicted_to_actual": float((p["pure_premium"] * t["exposure"]).sum() / t["claim_amount"].sum()),
            }
        # Modèle nul (prime moyenne pour tous) : référence pour lire les déviances
        mean_freq = self.train["claim_count"].sum() / self.train["exposure"].sum()
        out["null"] = {"frequency_deviance": poisson_deviance(t["claim_count"] / t["exposure"],
                                                              np.full(len(t), mean_freq), t["exposure"])}
        return out

    # ── Coefficients ───────────────────────────────────────────────
    def relativities(self) -> list:
        """Coefficients multiplicateurs exp(β) des deux GLM, avec IC 95 %, p-value et valeur vraie du simulateur."""
        rows = []
        for factor, levels in CATEGORIES.items():
            for level in levels:
                row = {"factor": factor, "factor_label": FACTOR_LABELS[factor], "level": level,
                       "reference": level == REFERENCE[factor]}
                for key, fit, truth in (("frequency", self.freq, TRUE_FREQUENCY), ("severity", self.sev, TRUE_SEVERITY)):
                    true_rel = truth[factor][level] / truth[factor][REFERENCE[factor]]
                    if level == REFERENCE[factor]:
                        row[key] = {"relativity": 1.0, "low": 1.0, "high": 1.0, "p_value": None, "true": 1.0}
                        continue
                    name = f"C({factor}, Treatment('{REFERENCE[factor]}'))[T.{level}]"
                    lo, hi = fit.conf_int().loc[name]
                    row[key] = {"relativity": float(np.exp(fit.params[name])), "low": float(np.exp(lo)),
                                "high": float(np.exp(hi)), "p_value": float(fit.pvalues[name]), "true": round(true_rel, 4)}
                rows.append(row)
        rows.append({
            "factor": "bonus_malus", "factor_label": FACTOR_LABELS["bonus_malus"], "level": "élasticité", "reference": False,
            "frequency": {"relativity": float(self.freq.params["log_bm"]), "low": float(self.freq.conf_int().loc["log_bm"][0]),
                          "high": float(self.freq.conf_int().loc["log_bm"][1]), "p_value": float(self.freq.pvalues["log_bm"]),
                          "true": TRUE_FREQUENCY["bonus_malus_elasticity"]},
            "severity": {"relativity": float(self.sev.params["log_bm"]), "low": float(self.sev.conf_int().loc["log_bm"][0]),
                         "high": float(self.sev.conf_int().loc["log_bm"][1]), "p_value": float(self.sev.pvalues["log_bm"]),
                         "true": 0.0},
        })
        return rows

    def base(self) -> dict:
        return {"frequency": float(np.exp(self.freq.params["Intercept"])), "severity": float(np.exp(self.sev.params["Intercept"]))}

    # ── Devis ──────────────────────────────────────────────────────
    def quote(self, profile: dict, duration: float, expense_ratio: float, profit_margin: float) -> dict:
        df = pd.DataFrame([profile])
        df["age_band"] = age_band(df["driver_age"])
        df["vehicle_age_band"] = vehicle_age_band(df["vehicle_age"])
        glm, gbm = self.predict(df, "glm").iloc[0], self.predict(df, "gbm").iloc[0]

        # Décomposition multiplicative : base × relativité de chaque caractéristique
        steps = []
        for key, fit in (("frequency", self.freq), ("severity", self.sev)):
            items = [{"factor": "base", "label": "Profil de référence", "value": float(np.exp(fit.params["Intercept"]))}]
            for factor in CATEGORIES:
                level = df[factor].iloc[0]
                name = f"C({factor}, Treatment('{REFERENCE[factor]}'))[T.{level}]"
                rel = float(np.exp(fit.params[name])) if name in fit.params else 1.0
                items.append({"factor": factor, "label": f"{FACTOR_LABELS[factor]} : {level}", "value": rel})
            bm = float((df["bonus_malus"].iloc[0] / 100.0) ** fit.params["log_bm"])
            items.append({"factor": "bonus_malus", "label": f"Bonus-malus : {int(df['bonus_malus'].iloc[0])}", "value": bm})
            steps.append((key, items))

        pure = float(glm["pure_premium"]) * duration
        loading = 1 - expense_ratio - profit_margin
        return {
            "profile": {**profile, "age_band": df["age_band"].iloc[0], "vehicle_age_band": df["vehicle_age_band"].iloc[0]},
            "duration": duration,
            "frequency": float(glm["frequency"]),
            "claim_probability": float(1 - np.exp(-glm["frequency"] * duration)),
            "expected_claims": float(glm["frequency"] * duration),
            "severity": float(glm["severity"]),
            "pure_premium": pure,
            "expense_loading": pure * expense_ratio / loading,
            "profit_loading": pure * profit_margin / loading,
            "commercial_premium": pure / loading,
            "gbm": {"frequency": float(gbm["frequency"]), "severity": float(gbm["severity"]),
                    "pure_premium": float(gbm["pure_premium"]) * duration},
            "breakdown": {k: v for k, v in steps},
        }
