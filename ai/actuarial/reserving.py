"""
Provisionnement des sinistres (cahier §3.7) : méthode Chain Ladder et erreur de prédiction de Mack (1993).

Triangle de référence : Taylor & Ashe (1983), utilisé par Mack (1993) et repris sous le nom « GenIns »
dans le package R ChainLadder. Montants incrémentaux par année de survenance (lignes) et année de
développement (colonnes).
"""
from typing import Dict, List, Optional

import numpy as np

TAYLOR_ASHE_INCREMENTAL = [
    [357848, 766940, 610542, 482940, 527326, 574398, 146342, 139950, 227229, 67948],
    [352118, 884021, 933894, 1183289, 445745, 320996, 527804, 266172, 425046],
    [290507, 1001799, 926219, 1016654, 750816, 146923, 495992, 280405],
    [310608, 1108250, 776189, 1562400, 272482, 352053, 206286],
    [443160, 693190, 991983, 769488, 504851, 470639],
    [396132, 937085, 847498, 805037, 705960],
    [440832, 847631, 1131398, 1063269],
    [359480, 1061648, 1443370],
    [376686, 986608],
    [344014],
]


def to_cumulative(incremental: List[List[float]]) -> np.ndarray:
    n = len(incremental)
    tri = np.full((n, n), np.nan)
    for i, row in enumerate(incremental):
        tri[i, :len(row)] = np.cumsum(row)
    return tri


def validate(triangle: List[List[float]]) -> None:
    n = len(triangle)
    if n < 3:
        raise ValueError("Le triangle doit avoir au moins 3 années de survenance.")
    for i, row in enumerate(triangle):
        if len(row) != n - i:
            raise ValueError(f"La ligne {i + 1} doit contenir {n - i} valeurs (triangle supérieur gauche).")
        if any(v is None or not np.isfinite(v) for v in row):
            raise ValueError(f"La ligne {i + 1} contient une valeur manquante.")
    if to_cumulative(triangle)[:, 0].min() <= 0:
        raise ValueError("Les montants de la première année de développement doivent être positifs.")


def chain_ladder(incremental: List[List[float]], tail_factor: float = 1.0) -> Dict:
    """
    Chain Ladder avec erreur de Mack. Retourne les facteurs de développement, le triangle complété,
    les charges ultimes, les provisions (IBNR) et leur erreur standard par année et au total.
    """
    validate(incremental)
    c = to_cumulative(incremental)
    n = c.shape[0]

    # Facteurs pondérés par les volumes : f_k = Σ C(i,k+1) / Σ C(i,k)
    f = np.ones(n - 1)
    for k in range(n - 1):
        rows = n - 1 - k
        f[k] = c[:rows, k + 1].sum() / c[:rows, k].sum()

    # Variances de Mack : σ²_k, extrapolation log-linéaire pour la dernière colonne
    sigma2 = np.zeros(n - 1)
    for k in range(n - 2):
        rows = n - 1 - k
        ratios = c[:rows, k + 1] / c[:rows, k]
        sigma2[k] = (c[:rows, k] * (ratios - f[k]) ** 2).sum() / (rows - 1)
    if n >= 3:
        sigma2[n - 2] = min(sigma2[n - 3] ** 2 / sigma2[n - 4], sigma2[n - 4], sigma2[n - 3]) if n >= 4 else sigma2[n - 3]

    full = c.copy()
    for i in range(n):
        for k in range(n - i, n):
            full[i, k] = full[i, k - 1] * f[k - 1]

    latest = np.array([c[i, n - 1 - i] for i in range(n)])
    ultimate = full[:, -1] * tail_factor
    reserve = ultimate - latest

    # Erreur de prédiction de Mack par année puis totale (covariances entre années)
    col_sums = [c[:n - 1 - k, k].sum() for k in range(n - 1)]
    mse = np.zeros(n)
    for i in range(1, n):
        s = 0.0
        for k in range(n - i, n):
            s += sigma2[k - 1] / f[k - 1] ** 2 * (1 / full[i, k - 1] + 1 / col_sums[k - 1])
        mse[i] = full[i, -1] ** 2 * s
    total_mse = mse.sum()
    for i in range(1, n):
        for j in range(i + 1, n):
            s = sum(2 * sigma2[k - 1] / f[k - 1] ** 2 / col_sums[k - 1] for k in range(n - i, n))
            total_mse += full[i, -1] * full[j, -1] * s

    se = np.sqrt(mse) * tail_factor
    return {
        "development_factors": f.round(6).tolist(),
        "cumulative_factors": np.cumprod(f[::-1])[::-1].round(6).tolist() + [1.0],
        "tail_factor": tail_factor,
        "sigma2": sigma2.round(4).tolist(),
        "cumulative": _nan_to_none(c),
        "completed": full.round(0).tolist(),
        "rows": [
            {
                "origin": i + 1,
                "latest": float(latest[i]),
                "ultimate": float(ultimate[i]),
                "reserve": float(reserve[i]),
                "mack_se": float(se[i]),
                "cv": float(se[i] / reserve[i]) if reserve[i] > 0 else None,
                "pct_developed": float(latest[i] / ultimate[i]),
            }
            for i in range(n)
        ],
        "total": {
            "latest": float(latest.sum()),
            "ultimate": float(ultimate.sum()),
            "reserve": float(reserve.sum()),
            "mack_se": float(np.sqrt(total_mse) * tail_factor),
        },
    }


def _nan_to_none(a: np.ndarray) -> List[List[Optional[float]]]:
    return [[None if np.isnan(v) else float(v) for v in row] for row in a]
