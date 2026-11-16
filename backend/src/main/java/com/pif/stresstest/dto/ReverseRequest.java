package com.pif.stresstest.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Stress test inversé : on choisit un scénario enregistré (scenarioId) ou des chocs libres (customShocks)
 * et on cherche l'ampleur de crise qui fait passer chaque banque sous le ratio minimal.
 */
public record ReverseRequest(
        Long scenarioId,
        ShocksDto customShocks,
        @Size(max = 50) List<String> bankIds,
        @DecimalMin("0.01") @DecimalMax("0.5") BigDecimal minCapitalRatio
) {
}
