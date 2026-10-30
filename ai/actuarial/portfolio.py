"""
Portefeuille d'assurance automobile pour l'entraînement des modèles de tarification.

Aucun portefeuille réel n'est disponible dans le dépôt : ce jeu est SYNTHÉTIQUE, généré à partir de
paramètres connus (TRUE_FREQUENCY, TRUE_SEVERITY ci-dessous). C'est aussi un outil pédagogique : un GLM
bien spécifié doit retrouver ces paramètres. Pour travailler sur des données réelles (par exemple le jeu
public freMTPL2), fournir un DataFrame avec les mêmes colonnes.

Fréquence  : N ~ Poisson(exposition × λ),  log λ = somme des effets ci-dessous
Sévérité   : coût moyen ~ Gamma(forme 2),  log μ = somme des effets ci-dessous
"""
import numpy as np
import pandas as pd

REGIONS = ["Grand Tunis", "Nord", "Sahel", "Sfax", "Centre-Ouest", "Sud"]
AGE_BANDS = ["18-25", "26-35", "36-50", "51-65", "66+"]
VEHICLE_AGE_BANDS = ["0-2", "3-5", "6-10", "11+"]
POWER_CLASSES = ["4-5 CV", "6-7 CV", "8-10 CV", "11+ CV"]
USAGES = ["Personnel", "Professionnel"]
FUELS = ["Essence", "Diesel"]

CATEGORIES = {
    "age_band": AGE_BANDS,
    "vehicle_age_band": VEHICLE_AGE_BANDS,
    "power": POWER_CLASSES,
    "region": REGIONS,
    "usage": USAGES,
    "fuel": FUELS,
}

# Effets multiplicatifs « vrais » (exp(β)) ; référence = 1.0
TRUE_FREQUENCY = {
    "base": 0.075,
    "age_band": {"18-25": 2.2, "26-35": 1.3, "36-50": 1.0, "51-65": 0.9, "66+": 1.15},
    "vehicle_age_band": {"0-2": 1.0, "3-5": 1.05, "6-10": 1.1, "11+": 1.2},
    "power": {"4-5 CV": 1.0, "6-7 CV": 1.1, "8-10 CV": 1.25, "11+ CV": 1.45},
    "region": {"Grand Tunis": 1.35, "Nord": 1.0, "Sahel": 1.1, "Sfax": 1.15, "Centre-Ouest": 0.85, "Sud": 0.8},
    "usage": {"Personnel": 1.0, "Professionnel": 1.4},
    "fuel": {"Essence": 1.0, "Diesel": 1.05},
    "bonus_malus_elasticity": 1.2,   # λ ∝ (bonus_malus / 100) ^ 1.2
}
TRUE_SEVERITY = {
    "base": 1800.0,   # TND
    "age_band": {"18-25": 1.15, "26-35": 1.05, "36-50": 1.0, "51-65": 1.0, "66+": 1.1},
    "vehicle_age_band": {"0-2": 1.3, "3-5": 1.15, "6-10": 1.0, "11+": 0.85},
    "power": {"4-5 CV": 1.0, "6-7 CV": 1.15, "8-10 CV": 1.35, "11+ CV": 1.7},
    "region": {"Grand Tunis": 1.2, "Nord": 1.0, "Sahel": 1.05, "Sfax": 1.05, "Centre-Ouest": 0.9, "Sud": 0.9},
    "usage": {"Personnel": 1.0, "Professionnel": 1.1},
    "fuel": {"Essence": 1.0, "Diesel": 1.0},
    "shape": 2.0,
}
# Tarif « actuel » de la compagnie fictive : grille simple par puissance et région, sans tenir compte de l'âge
CURRENT_TARIFF_BASE = 330.0


def age_band(age):
    return pd.cut(age, [17, 25, 35, 50, 65, 120], labels=AGE_BANDS).astype(str)


def vehicle_age_band(v):
    return pd.cut(v, [-1, 2, 5, 10, 100], labels=VEHICLE_AGE_BANDS).astype(str)


def _effect(df: pd.DataFrame, table: dict) -> np.ndarray:
    out = np.full(len(df), 1.0)
    for col in CATEGORIES:
        out *= df[col].map(table[col]).to_numpy(dtype=float)
    return out


def true_frequency(df: pd.DataFrame) -> np.ndarray:
    return (TRUE_FREQUENCY["base"] * _effect(df, TRUE_FREQUENCY)
            * (df["bonus_malus"].to_numpy() / 100.0) ** TRUE_FREQUENCY["bonus_malus_elasticity"])


def true_severity(df: pd.DataFrame) -> np.ndarray:
    return TRUE_SEVERITY["base"] * _effect(df, TRUE_SEVERITY)


def current_premium(df: pd.DataFrame) -> np.ndarray:
    power = df["power"].map({"4-5 CV": 0.85, "6-7 CV": 1.0, "8-10 CV": 1.25, "11+ CV": 1.6}).to_numpy(float)
    region = df["region"].map({"Grand Tunis": 1.15}).fillna(1.0).to_numpy(float)
    return CURRENT_TARIFF_BASE * power * region * df["exposure"].to_numpy()


def generate_portfolio(n: int = 60000, seed: int = 2026) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    driver_age = np.clip(rng.gamma(3.2, 8.5, n) + 18, 18, 90).round()
    vehicle_age = np.clip(rng.gamma(2.0, 3.5, n), 0, 30).round()
    bm = np.clip(np.round(rng.lognormal(np.log(85), 0.25, n)), 50, 200)
    bm = np.where(driver_age <= 25, np.maximum(bm, 100), bm)   # jeunes conducteurs sans bonus
    df = pd.DataFrame({
        "policy_id": np.arange(1, n + 1),
        "driver_age": driver_age.astype(int),
        "vehicle_age": vehicle_age.astype(int),
        "power": rng.choice(POWER_CLASSES, n, p=[0.35, 0.35, 0.2, 0.1]),
        "region": rng.choice(REGIONS, n, p=[0.35, 0.15, 0.17, 0.13, 0.1, 0.1]),
        "usage": rng.choice(USAGES, n, p=[0.85, 0.15]),
        "fuel": rng.choice(FUELS, n, p=[0.55, 0.45]),
        "bonus_malus": bm.astype(int),
        "exposure": np.round(np.where(rng.random(n) < 0.7, 1.0, rng.uniform(0.08, 1.0, n)), 3),
    })
    df["age_band"] = age_band(df["driver_age"])
    df["vehicle_age_band"] = vehicle_age_band(df["vehicle_age"])

    lam = true_frequency(df)
    df["claim_count"] = rng.poisson(lam * df["exposure"])
    mu = true_severity(df)
    shape = TRUE_SEVERITY["shape"]
    # Somme de N coûts Gamma(forme, μ/forme) = Gamma(N × forme, μ/forme)
    total = np.where(df["claim_count"] > 0,
                     rng.gamma(np.maximum(df["claim_count"], 1) * shape, mu / shape), 0.0)
    df["claim_amount"] = np.round(total, 2)
    df["premium"] = np.round(current_premium(df), 2)
    return df
