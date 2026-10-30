"""
Définition des chocs d'un scénario de stress et scénarios prédéfinis.

Unités :
- rate_shock_bp            : hausse des taux directeurs (points de base)
- equity_drop_pct          : baisse des marchés actions (%)
- unemployment_increase_pp : hausse du chômage (points de %)
- gdp_growth_pct           : croissance du PIB sur l'horizon (%, négatif = récession)
- default_rate_multiplier  : multiplicateur du taux de défaut des emprunteurs (1 = inchangé)
- asset_quality_downgrade  : dégradation de la qualité des actifs (crans de notation, 0 à 3)
- revenue_drop_pct         : baisse des revenus hors intérêts (%)
"""
from dataclasses import dataclass, asdict, fields

SHOCK_BOUNDS = {
    "rate_shock_bp": (0.0, 500.0),
    "equity_drop_pct": (0.0, 60.0),
    "unemployment_increase_pp": (0.0, 10.0),
    "gdp_growth_pct": (-10.0, 5.0),
    "default_rate_multiplier": (1.0, 5.0),
    "asset_quality_downgrade": (0.0, 3.0),
    "revenue_drop_pct": (0.0, 50.0),
}

SHOCK_LABELS = {
    "rate_shock_bp": "Hausse des taux (pb)",
    "equity_drop_pct": "Baisse des marchés actions (%)",
    "unemployment_increase_pp": "Hausse du chômage (pts)",
    "gdp_growth_pct": "Croissance du PIB (%)",
    "default_rate_multiplier": "Multiplicateur du taux de défaut",
    "asset_quality_downgrade": "Dégradation des actifs (crans)",
    "revenue_drop_pct": "Baisse des revenus (%)",
}


@dataclass
class Shocks:
    rate_shock_bp: float = 0.0
    equity_drop_pct: float = 0.0
    unemployment_increase_pp: float = 0.0
    gdp_growth_pct: float = 1.0
    default_rate_multiplier: float = 1.0
    asset_quality_downgrade: float = 0.0
    revenue_drop_pct: float = 0.0

    def clipped(self) -> "Shocks":
        values = {}
        for f in fields(self):
            lo, hi = SHOCK_BOUNDS[f.name]
            values[f.name] = float(min(max(getattr(self, f.name), lo), hi))
        return Shocks(**values)

    def to_dict(self) -> dict:
        return asdict(self)


# Scénarios prédéfinis (miroir des données initiales de la migration Flyway V3 côté Spring)
PRESET_SCENARIOS = {
    "BASELINE": ("Scénario de référence", Shocks()),
    "RATE_SHOCK": ("Hausse brutale des taux", Shocks(rate_shock_bp=300, gdp_growth_pct=0.5)),
    "MARKET_CRASH": ("Krach boursier", Shocks(equity_drop_pct=35, gdp_growth_pct=-1, revenue_drop_pct=15)),
    "RECESSION": ("Récession économique", Shocks(gdp_growth_pct=-4, unemployment_increase_pp=4,
                                                  default_rate_multiplier=2.0, asset_quality_downgrade=1,
                                                  revenue_drop_pct=10)),
    "CREDIT_CRISIS": ("Crise de crédit", Shocks(default_rate_multiplier=3.0, asset_quality_downgrade=2,
                                                unemployment_increase_pp=2, gdp_growth_pct=-1.5)),
    "COMBINED_SEVERE": ("Choc combiné sévère", Shocks(rate_shock_bp=250, equity_drop_pct=30,
                                                      unemployment_increase_pp=5, gdp_growth_pct=-5,
                                                      default_rate_multiplier=2.5, asset_quality_downgrade=2,
                                                      revenue_drop_pct=20)),
}
