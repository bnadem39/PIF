"""
Construit ai/models/market_return_by_date.csv : la moyenne des rendements à 1 jour (log_return_1d)
de TOUS les tickers, par date — exactement la même définition que celle utilisée dans
data_pipeline.compute_features() pour calculer relative_to_market_return à l'entraînement.

Pourquoi ce fichier : à l'inférence (backtest_signals.py, market_insight.py), un seul ticker est
traité à la fois, donc la moyenne de marché ne peut pas être recalculée sur place (elle retomberait
sur le ticker lui-même). Ce fichier précalculé permet de lire la vraie moyenne de marché de la date
et de calculer relative_to_market_return correctement, sans réentraîner le modèle.

Usage :
    python build_market_return.py
"""
import logging

import pandas as pd

from data_pipeline import AI_DIR, fuse_sources, sanitize, compute_features

log = logging.getLogger(__name__)

MARKET_RETURN_PATH = AI_DIR / "models" / "market_return_by_date.csv"


def build() -> pd.DataFrame:
    log.info("[MARKET] Chargement et calcul des rendements journaliers (tous tickers)...")
    df = fuse_sources()
    df = sanitize(df)
    df = compute_features(df)  # calcule log_return_1d par ticker, avec la même logique qu'à l'entraînement

    # Moyenne de marché du jour = moyenne de log_return_1d de tous les tickers à la même date
    # (identique à la définition utilisée dans compute_features pour relative_to_market_return)
    market_return = (
        df.groupby("date")["log_return_1d"]
        .mean()
        .reset_index()
        .rename(columns={"log_return_1d": "market_avg_return_1d"})
    )
    market_return["date"] = pd.to_datetime(market_return["date"]).dt.strftime("%Y-%m-%d")
    market_return = market_return.sort_values("date").reset_index(drop=True)

    MARKET_RETURN_PATH.parent.mkdir(exist_ok=True)
    market_return.to_csv(MARKET_RETURN_PATH, index=False)
    log.info(f"[MARKET] {len(market_return):,} dates écrites -> {MARKET_RETURN_PATH}")
    return market_return


if __name__ == "__main__":
    build()
