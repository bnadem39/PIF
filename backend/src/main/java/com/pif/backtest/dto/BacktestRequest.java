package com.pif.backtest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Paramètres d'un backtest. Dates au format yyyy-MM-dd ; absentes = tout l'historique disponible.
 * Frais en pourcentage du montant de chaque transaction.
 */
public record BacktestRequest(
        @NotBlank String symbol,
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}") String startDate,
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}") String endDate,
        @NotEmpty @Size(max = 8) List<@Valid StrategySpec> strategies,
        @DecimalMin("1000") @DecimalMax("100000000") BigDecimal initialCapital,
        @DecimalMin("0") @DecimalMax("5") BigDecimal commissionPct,
        @DecimalMin("0") @DecimalMax("5") BigDecimal slippagePct,
        @DecimalMin("0") @DecimalMax("0.3") BigDecimal riskFreeRate
) {
}
