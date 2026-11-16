"""
Stress test inversé et sensibilité par choc.

Au lieu de demander « que se passe-t-il si cette crise arrive ? », on demande l'inverse :
« quelle ampleur de crise faut-il pour que la banque passe sous le ratio de solvabilité minimal ? »

- Point de rupture d'un scénario : on multiplie tous les chocs du scénario par un facteur k
  (0 % = aucun choc, 100 % = le scénario tel quel, 200 % = deux fois plus violent)
  et on cherche par dichotomie le plus petit k qui fait passer le ratio CET1 sous le minimum.
- Limite par choc : même recherche, mais un seul choc à la fois (taux, chômage, défauts...).
"""
from dataclasses import replace
from typing import Dict, List, Optional

import pandas as pd

from .engine import Thresholds, project
from .scenarios import SHOCK_BOUNDS, SHOCK_LABELS, Shocks

MAX_FACTOR = 2.0   # on teste jusqu'à 200 % de la sévérité du scénario
_NEUTRAL = Shocks()


def scale_shocks(shocks: Shocks, factor: float) -> Shocks:
    """Chaque choc part de sa valeur neutre et avance de `factor` fois vers la valeur du scénario."""
    values = {}
    for name in SHOCK_BOUNDS:
        base = getattr(_NEUTRAL, name)
        values[name] = base + factor * (getattr(shocks, name) - base)
    return Shocks(**values).clipped()


def _ratio_after(bank: pd.Series, shocks: Shocks, models: dict, thresholds: Thresholds) -> float:
    return project(bank, shocks, models, thresholds)["after"]["cet1_ratio"]


def _bisect(low: float, high: float, breaks, steps: int = 14) -> float:
    """Plus petite valeur de [low, high] pour laquelle breaks(v) est vrai (breaks(high) doit être vrai)."""
    for _ in range(steps):
        mid = (low + high) / 2
        if breaks(mid):
            high = mid
        else:
            low = mid
    return high


def breaking_point(bank: pd.Series, shocks: Shocks, models: dict, thresholds: Thresholds) -> Dict:
    """Facteur de sévérité (1.0 = le scénario) à partir duquel le CET1 passe sous le minimum."""
    minimum = thresholds.min_capital

    def breaks(k: float) -> bool:
        return _ratio_after(bank, scale_shocks(shocks, k), models, thresholds) < minimum

    if breaks(0.0):
        return {"state": "already_below", "factor": 0.0}
    if not breaks(MAX_FACTOR):
        return {"state": "resists", "factor": None}
    return {"state": "breaks", "factor": round(_bisect(0.0, MAX_FACTOR, breaks), 2)}


def single_shock_limits(bank: pd.Series, models: dict, thresholds: Thresholds) -> List[Dict]:
    """Pour chaque choc pris seul : valeur qui fait craquer la banque (si elle existe dans les bornes)."""
    minimum = thresholds.min_capital
    base_ratio = _ratio_after(bank, _NEUTRAL, models, thresholds)
    out = []
    for name, (lo, hi) in SHOCK_BOUNDS.items():
        neutral = getattr(_NEUTRAL, name)
        # le choc « grave » est du côté le plus éloigné de la valeur neutre
        worst = hi if abs(hi - neutral) >= abs(lo - neutral) else lo

        def with_value(v: float) -> Shocks:
            return replace(_NEUTRAL, **{name: v})

        ratio_worst = _ratio_after(bank, with_value(worst), models, thresholds)
        limit: Optional[float] = None
        if ratio_worst < minimum <= base_ratio:
            # dichotomie sur la fraction du chemin neutre -> pire valeur
            frac = _bisect(0.0, 1.0, lambda f: _ratio_after(
                bank, with_value(neutral + f * (worst - neutral)), models, thresholds) < minimum)
            limit = round(neutral + frac * (worst - neutral), 2)
        out.append({
            "key": name,
            "label": SHOCK_LABELS[name],
            "worst_value": worst,
            "limit": limit,                                   # None = la banque encaisse même le choc maximal
            "cet1_drop_at_max": max(0.0, base_ratio - ratio_worst),   # perte de ratio CET1 (en points de ratio)
        })
    return sorted(out, key=lambda r: r["cet1_drop_at_max"], reverse=True)


def reverse_stress(df: pd.DataFrame, shocks: Shocks, models: dict, thresholds: Thresholds) -> List[Dict]:
    results = []
    for _, bank in df.iterrows():
        results.append({
            "bank_id": bank["bank_id"],
            "name": bank["name"],
            "bank_type": bank["bank_type"],
            "cet1_ratio_now": float(bank["cet1"] / bank["rwa"]),
            "breaking_point": breaking_point(bank, shocks, models, thresholds),
            "single_shocks": single_shock_limits(bank, models, thresholds),
        })
    return results
