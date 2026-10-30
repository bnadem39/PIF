"""
Marges de prime (cahier §3.7) : primes encaissées comparées aux sinistres attendus par le modèle.

  Prime technique    = prime pure / (1 - taux de frais - marge bénéficiaire cible)
  Marge technique    = primes - sinistres attendus - frais (taux de frais × primes)
  Ratio sinistres/primes attendu (S/P) = sinistres attendus / primes

Mode takaful (assurance islamique, modèle wakala) : les cotisations appartiennent au fonds des participants.
L'opérateur prélève une commission de gestion (wakala) ; le fonds paie les sinistres. Un excédent est en partie
redistribué aux participants ; un déficit est couvert par un prêt sans intérêt (qard hassan) de l'opérateur.
"""
import pandas as pd

SEGMENTS = {
    "age_band": "Âge du conducteur",
    "region": "Région",
    "power": "Puissance fiscale",
    "vehicle_age_band": "Âge du véhicule",
    "usage": "Usage",
    "fuel": "Carburant",
}


def compute_margins(portfolio: pd.DataFrame, predicted: pd.DataFrame, segment_by: str, expense_ratio: float,
                    profit_margin: float, mode: str = "conventional", wakala_fee: float = 0.25,
                    surplus_share: float = 0.5) -> dict:
    df = portfolio.assign(expected_claims=predicted["pure_premium"] * portfolio["exposure"])

    def summarize(g: pd.DataFrame) -> dict:
        premium = float(g["premium"].sum())
        expected = float(g["expected_claims"].sum())
        actual = float(g["claim_amount"].sum())
        technical = expected / (1 - expense_ratio - profit_margin)
        row = {
            "policies": int(len(g)),
            "exposure": float(g["exposure"].sum()),
            "premium": premium,
            "expected_claims": expected,
            "actual_claims": actual,
            "expected_loss_ratio": expected / premium,
            "actual_loss_ratio": actual / premium,
            "technical_premium": technical,
            "rate_change": technical / premium - 1,
        }
        if mode == "takaful":
            fee = premium * wakala_fee
            fund_result = premium - fee - expected
            row.update({
                "operator_fee": fee,
                "fund_result": fund_result,
                "surplus_to_participants": max(fund_result, 0) * surplus_share,
                "qard_hassan": max(-fund_result, 0),
                # Résultat de l'opérateur : commission moins frais de gestion
                "margin": fee - premium * expense_ratio,
            })
        else:
            row["margin"] = premium - expected - premium * expense_ratio
        row["margin_pct"] = row["margin"] / premium
        return row

    segments = [{"segment": str(k), **summarize(g)} for k, g in df.groupby(segment_by, observed=True)]
    segments.sort(key=lambda r: r["expected_loss_ratio"], reverse=True)
    return {
        "segment_by": segment_by,
        "segment_label": SEGMENTS[segment_by],
        "mode": mode,
        "assumptions": {"expense_ratio": expense_ratio, "profit_margin": profit_margin,
                        "wakala_fee": wakala_fee if mode == "takaful" else None,
                        "surplus_share": surplus_share if mode == "takaful" else None},
        "segments": segments,
        "total": summarize(df),
    }
