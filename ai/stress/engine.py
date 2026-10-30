"""
Projection d'un scénario de stress sur une banque, horizon 1 an.

Les modèles ML prédisent la hausse des créances douteuses et le taux de perte de crédit ;
le reste suit des règles prudentielles simples et explicites :

  Pertes de crédit   = taux_perte (ML) × encours de crédit
  Pertes de marché   = actions × baisse_actions + titres souverains × duration × hausse_taux
  Marge d'intérêt    = gap_de_taux × actifs × hausse_taux                  (banque conventionnelle)
                       - risque commercial déplacé (DCR) : la banque islamique rémunère davantage
                         ses PSIA pour rester compétitive : PSIA × hausse_taux × (1 - α)
  Revenus            = revenus hors intérêts × baisse_revenus
  Absorption PSIA    = part des pertes sur actifs financés par les PSIA supportée par les investisseurs
                       (principe Mudaraba, IFSB) : pertes × part_PSIA × taux_absorption
  CET1 après         = CET1 + résultat de base × (1 - impôt) - pertes nettes
  RWA après          = RWA × (1 + 8 % × crans de dégradation)
  LCR après          = HQLA × (1 - décote) / sorties × (1 + fuite des dépôts)

Seuils : ratio de solvabilité minimal BCT = 10 % (« Vulnérable » en dessous), 7 % = « Critique ».
"""
from dataclasses import dataclass

import numpy as np
import pandas as pd

from .banks import bank_features
from .dataset import FEATURES
from .scenarios import Shocks

TAX_RATE = 0.35
PSIA_LOSS_ABSORPTION = 0.8      # part des pertes sur actifs financés par PSIA supportée par les investisseurs
DCR_PASS_THROUGH = 0.5          # α : part de la hausse des taux de marché que la banque répercute à ses frais
RWA_INFLATION_PER_NOTCH = 0.08
REGULATORY_MIN_CAPITAL = 0.10   # BCT : ratio de solvabilité minimal
CRITICAL_CAPITAL = 0.07
LCR_MIN = 1.0


@dataclass
class Thresholds:
    min_capital: float = REGULATORY_MIN_CAPITAL
    critical_capital: float = CRITICAL_CAPITAL
    lcr_min: float = LCR_MIN


def feature_row(bank: pd.Series, shocks: Shocks) -> pd.DataFrame:
    values = {**shocks.to_dict(), **bank_features(bank)}
    return pd.DataFrame([[values[f] for f in FEATURES]], columns=FEATURES)


def status_of(cet1_ratio: float, lcr: float, t: Thresholds) -> str:
    if cet1_ratio < t.critical_capital:
        return "CRITIQUE"
    if cet1_ratio < t.min_capital or lcr < t.lcr_min:
        return "VULNERABLE"
    return "RESILIENTE"


def project(bank: pd.Series, shocks: Shocks, models: dict, thresholds: Thresholds = Thresholds()) -> dict:
    shocks = shocks.clipped()
    x = feature_row(bank, shocks)
    npl_increase = max(0.0, float(models["npl_increase"]["model"].predict(x.to_numpy())[0]))
    loss_rate = max(0.0, float(models["credit_loss_rate"]["model"].predict(x.to_numpy())[0]))

    is_islamic = bank["bank_type"] == "islamic"
    rate = shocks.rate_shock_bp / 10000.0

    credit_loss = loss_rate * bank["loans"]
    market_loss = (bank["equity_holdings"] * shocks.equity_drop_pct / 100.0
                   + bank["sovereign_securities"] * bank["bond_duration"] * rate)
    nii_impact = bank["rate_gap"] * bank["total_assets"] * rate          # gap négatif + hausse des taux = perte
    dcr_cost = bank["psia"] * rate * (1 - DCR_PASS_THROUGH) if is_islamic else 0.0
    revenue_loss = bank["non_interest_income"] * shocks.revenue_drop_pct / 100.0

    funding = bank["deposits"] + bank["psia"]
    psia_share = bank["psia"] / funding if funding > 0 else 0.0
    psia_absorption = (credit_loss + market_loss) * psia_share * PSIA_LOSS_ABSORPTION if is_islamic else 0.0

    baseline_profit_after_tax = bank["pre_tax_profit"] * (1 - TAX_RATE)
    gross_losses = credit_loss + market_loss - nii_impact + dcr_cost + revenue_loss
    net_impact = baseline_profit_after_tax - gross_losses + psia_absorption

    cet1_after = bank["cet1"] + net_impact
    rwa_after = bank["rwa"] * (1 + RWA_INFLATION_PER_NOTCH * shocks.asset_quality_downgrade)
    cet1_ratio_before = bank["cet1"] / bank["rwa"]
    cet1_ratio_after = cet1_after / rwa_after

    hqla_haircut = min(0.5, 0.02 * shocks.rate_shock_bp / 100.0 + 0.002 * shocks.equity_drop_pct)
    deposit_run = 0.02 * shocks.unemployment_increase_pp + 0.01 * max(0.0, -shocks.gdp_growth_pct) \
        + (0.05 if cet1_ratio_after < thresholds.min_capital else 0.0)
    lcr_before = bank["hqla"] / bank["net_outflows_30d"]
    lcr_after = bank["hqla"] * (1 - hqla_haircut) / (bank["net_outflows_30d"] * (1 + deposit_run))

    npl_before = bank["npl_ratio"]
    npl_after = min(1.0, npl_before + npl_increase)

    roa_before = baseline_profit_after_tax / bank["total_assets"]
    roa_after = (baseline_profit_after_tax - gross_losses + psia_absorption) / bank["total_assets"]

    # Décomposition de la variation de capital (somme = cet1_after - cet1)
    waterfall = [
        {"key": "baseline_profit", "label": "Résultat de base après impôt", "value": baseline_profit_after_tax},
        {"key": "credit_loss", "label": "Pertes de crédit", "value": -credit_loss},
        {"key": "market_loss", "label": "Pertes de marché", "value": -market_loss},
        {"key": "nii_impact", "label": "Marge d'intérêt (gap de taux)", "value": nii_impact},
        {"key": "dcr_cost", "label": "Risque commercial déplacé (PSIA)", "value": -dcr_cost},
        {"key": "revenue_loss", "label": "Baisse des revenus", "value": -revenue_loss},
        {"key": "psia_absorption", "label": "Pertes absorbées par les PSIA", "value": psia_absorption},
    ]
    if not is_islamic:
        waterfall = [w for w in waterfall if w["key"] not in ("dcr_cost", "psia_absorption")]

    return {
        "bank_id": bank["bank_id"],
        "name": bank["name"],
        "bank_type": bank["bank_type"],
        "before": {
            "cet1_ratio": cet1_ratio_before,
            "lcr": lcr_before,
            "npl_ratio": npl_before,
            "roa": roa_before,
            "cet1": float(bank["cet1"]),
            "rwa": float(bank["rwa"]),
        },
        "after": {
            "cet1_ratio": cet1_ratio_after,
            "lcr": lcr_after,
            "npl_ratio": npl_after,
            "roa": roa_after,
            "cet1": cet1_after,
            "rwa": rwa_after,
        },
        "losses": {
            "credit": credit_loss,
            "market": market_loss,
            "nii_impact": nii_impact,
            "dcr_cost": dcr_cost,
            "revenue": revenue_loss,
            "psia_absorption": psia_absorption,
            "total_net": gross_losses - psia_absorption,
        },
        "predicted": {"npl_increase": npl_increase, "credit_loss_rate": loss_rate},
        "capital_shortfall": max(0.0, thresholds.min_capital * rwa_after - cet1_after),
        "status": status_of(cet1_ratio_after, lcr_after, thresholds),
        "waterfall": [{**w, "value": float(w["value"])} for w in waterfall],
    }


def summarize_by_type(results: list) -> dict:
    out = {}
    for bank_type in ("conventional", "islamic"):
        rows = [r for r in results if r["bank_type"] == bank_type]
        if not rows:
            continue
        out[bank_type] = {
            "count": len(rows),
            "avg_cet1_before": float(np.mean([r["before"]["cet1_ratio"] for r in rows])),
            "avg_cet1_after": float(np.mean([r["after"]["cet1_ratio"] for r in rows])),
            "avg_lcr_after": float(np.mean([r["after"]["lcr"] for r in rows])),
            "avg_npl_after": float(np.mean([r["after"]["npl_ratio"] for r in rows])),
            "avg_credit_loss_rate": float(np.mean([r["predicted"]["credit_loss_rate"] for r in rows])),
            "vulnerable": sum(1 for r in rows if r["status"] != "RESILIENTE"),
        }
    return out
