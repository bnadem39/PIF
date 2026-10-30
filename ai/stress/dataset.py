"""
Jeu d'entraînement des modèles satellites de risque de crédit.

Faute de série historique de pertes bancaires tunisiennes dans le dépôt, le jeu est SYNTHÉTIQUE :
chaque ligne combine un profil bancaire tiré au hasard et un choc macroéconomique, et les cibles sont
calculées par un processus générateur documenté ci-dessous (+ bruit). Les modèles apprennent donc ces
relations ; ils doivent être ré-entraînés sur des données réelles (BCT, rapports annuels, FMI) dès
qu'elles sont disponibles : il suffit de fournir un DataFrame avec les mêmes colonnes.

Processus générateur (par an, en fraction de l'encours de crédit) :

  pression_macro = 0.006 * chômage + 0.005 * max(0, -PIB)
                 + 0.00002 * taux_pb * (1 - 0.6 * islamique)      # Murabaha à marge fixe : moins sensible aux taux
                 + 0.0008 * baisse_actions * part_immobilier
                 + 0.0015 * baisse_actions * part_musharaka         # financements participatifs ~ fonds propres
                 + 0.015 * (multiplicateur_défaut - 1)
                 + 0.008 * dégradation_actifs
  vulnérabilité  = (1 + 2 * NPL_initial) * (1 + 5 * max(0, 0.12 - CET1)) * (1 + 0.3 * crédits/actifs)
  hausse_NPL     = pression_macro * vulnérabilité * bruit_lognormal(σ = 0.15)
  taux_perte     = hausse_NPL * LGD + 0.02 * NPL_initial * dégradation_actifs
  LGD            = 0.45 - 0.08 * part_immobilier (garanties) + 0.10 * part_musharaka (pas de garantie)
"""
import numpy as np
import pandas as pd

from .scenarios import SHOCK_BOUNDS

SHOCK_FEATURES = list(SHOCK_BOUNDS.keys())
BANK_FEATURES = [
    "is_islamic", "loan_to_assets", "real_estate_share", "equity_financing_share",
    "initial_npl_ratio", "cet1_ratio", "rate_gap", "psia_share", "cost_income",
]
FEATURES = SHOCK_FEATURES + BANK_FEATURES
TARGETS = ["npl_increase", "credit_loss_rate"]

FEATURE_LABELS = {
    "rate_shock_bp": "Hausse des taux",
    "equity_drop_pct": "Baisse des marchés actions",
    "unemployment_increase_pp": "Hausse du chômage",
    "gdp_growth_pct": "Croissance du PIB",
    "default_rate_multiplier": "Taux de défaut des emprunteurs",
    "asset_quality_downgrade": "Dégradation de la qualité des actifs",
    "revenue_drop_pct": "Baisse des revenus",
    "is_islamic": "Modèle bancaire islamique",
    "loan_to_assets": "Poids des crédits dans le bilan",
    "real_estate_share": "Exposition immobilière",
    "equity_financing_share": "Financements Musharaka / Mudaraba",
    "initial_npl_ratio": "Créances douteuses initiales",
    "cet1_ratio": "Ratio CET1 initial",
    "rate_gap": "Gap de taux",
    "psia_share": "Part des comptes d'investissement (PSIA)",
    "cost_income": "Coefficient d'exploitation",
}


def macro_pressure(x: pd.DataFrame) -> pd.Series:
    return (
        0.006 * x["unemployment_increase_pp"]
        + 0.005 * np.maximum(0.0, -x["gdp_growth_pct"])
        + 0.00002 * x["rate_shock_bp"] * (1 - 0.6 * x["is_islamic"])
        + 0.0008 * x["equity_drop_pct"] * x["real_estate_share"]
        + 0.0015 * x["equity_drop_pct"] * x["equity_financing_share"]
        + 0.015 * (x["default_rate_multiplier"] - 1)
        + 0.008 * x["asset_quality_downgrade"]
    )


def vulnerability(x: pd.DataFrame) -> pd.Series:
    return (
        (1 + 2 * x["initial_npl_ratio"])
        * (1 + 5 * np.maximum(0.0, 0.12 - x["cet1_ratio"]))
        * (1 + 0.3 * x["loan_to_assets"])
    )


def lgd(x: pd.DataFrame) -> pd.Series:
    return 0.45 - 0.08 * x["real_estate_share"] + 0.10 * x["equity_financing_share"]


def generate_training_data(n: int = 20000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    is_islamic = (rng.random(n) < 0.4).astype(float)

    x = pd.DataFrame({
        # Chocs : mélange de scénarios calmes et sévères
        "rate_shock_bp": rng.uniform(0, 500, n) * (rng.random(n) < 0.7),
        "equity_drop_pct": rng.uniform(0, 60, n) * (rng.random(n) < 0.6),
        "unemployment_increase_pp": rng.uniform(0, 10, n) * (rng.random(n) < 0.7),
        "gdp_growth_pct": rng.uniform(-10, 5, n),
        "default_rate_multiplier": 1 + rng.uniform(0, 4, n) * (rng.random(n) < 0.6),
        "asset_quality_downgrade": rng.integers(0, 4, n).astype(float),
        "revenue_drop_pct": rng.uniform(0, 50, n),
        # Profils bancaires
        "is_islamic": is_islamic,
        "loan_to_assets": rng.uniform(0.55, 0.82, n),
        "real_estate_share": rng.uniform(0.15, 0.30, n) + 0.15 * is_islamic * rng.random(n),
        "equity_financing_share": is_islamic * rng.uniform(0.0, 0.25, n),
        "initial_npl_ratio": rng.uniform(0.04, 0.20, n),
        "cet1_ratio": rng.uniform(0.08, 0.16, n),
        "rate_gap": np.where(is_islamic == 1, rng.uniform(-0.04, 0.0, n), rng.uniform(-0.15, 0.0, n)),
        "psia_share": is_islamic * rng.uniform(0.25, 0.55, n),
        "cost_income": rng.uniform(0.40, 0.65, n),
    })

    noise = rng.lognormal(mean=0.0, sigma=0.15, size=n)
    npl_increase = macro_pressure(x) * vulnerability(x) * noise
    credit_loss_rate = npl_increase * lgd(x) + 0.02 * x["initial_npl_ratio"] * x["asset_quality_downgrade"]

    x["npl_increase"] = npl_increase.clip(lower=0.0)
    x["credit_loss_rate"] = credit_loss_rate.clip(lower=0.0)
    return x
