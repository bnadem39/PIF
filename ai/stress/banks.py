"""
Profils bancaires de départ (en millions de TND).

ATTENTION : les profils fournis dans data/bank_profiles.csv sont ILLUSTRATIFS (ordres de grandeur
plausibles pour le secteur tunisien, banques anonymisées). Pour un résultat exploitable, remplacer
ces lignes par les chiffres des rapports annuels / publications BCT des banques étudiées.

Colonnes spécifiques aux banques islamiques :
- psia                    : comptes d'investissement participatifs (Mudaraba), qui supportent une part des pertes
- equity_financing_share  : part des financements en Musharaka / Mudaraba (exposition de type fonds propres)
"""
from pathlib import Path

import pandas as pd

DATA_FILE = Path(__file__).parent / "data" / "bank_profiles.csv"

NUMERIC_COLUMNS = [
    "total_assets", "loans", "real_estate_share", "equity_financing_share", "sovereign_securities",
    "equity_holdings", "hqla", "deposits", "psia", "net_outflows_30d", "cet1", "rwa", "npl_ratio",
    "pre_tax_profit", "non_interest_income", "rate_gap", "bond_duration", "cost_income",
]


def load_banks(path: Path = DATA_FILE) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = {"bank_id", "name", "bank_type", *NUMERIC_COLUMNS} - set(df.columns)
    if missing:
        raise ValueError(f"Colonnes manquantes dans {path.name} : {sorted(missing)}")
    bad_types = set(df["bank_type"]) - {"conventional", "islamic"}
    if bad_types:
        raise ValueError(f"bank_type invalide : {sorted(bad_types)} (attendu conventional | islamic)")
    df[NUMERIC_COLUMNS] = df[NUMERIC_COLUMNS].astype(float)
    return df.set_index("bank_id", drop=False)


def bank_features(row) -> dict:
    """Caractéristiques d'une banque utilisées par les modèles (ratios, indépendants de la taille)."""
    funding = row["deposits"] + row["psia"]
    return {
        "is_islamic": 1.0 if row["bank_type"] == "islamic" else 0.0,
        "loan_to_assets": row["loans"] / row["total_assets"],
        "real_estate_share": row["real_estate_share"],
        "equity_financing_share": row["equity_financing_share"],
        "initial_npl_ratio": row["npl_ratio"],
        "cet1_ratio": row["cet1"] / row["rwa"],
        "rate_gap": row["rate_gap"],
        "psia_share": row["psia"] / funding if funding > 0 else 0.0,
        "cost_income": row["cost_income"],
    }
