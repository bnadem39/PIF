package com.pif.stresstest.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Chocs d'un scénario. Bornes identiques à ai/stress/scenarios.py (SHOCK_BOUNDS).
 */
public record ShocksDto(
        @NotNull @DecimalMin("0") @DecimalMax("500") BigDecimal rateShockBp,
        @NotNull @DecimalMin("0") @DecimalMax("60") BigDecimal equityDropPct,
        @NotNull @DecimalMin("0") @DecimalMax("10") BigDecimal unemploymentIncreasePp,
        @NotNull @DecimalMin("-10") @DecimalMax("5") BigDecimal gdpGrowthPct,
        @NotNull @DecimalMin("1") @DecimalMax("5") BigDecimal defaultRateMultiplier,
        @NotNull @DecimalMin("0") @DecimalMax("3") BigDecimal assetQualityDowngrade,
        @NotNull @DecimalMin("0") @DecimalMax("50") BigDecimal revenueDropPct
) {
}
