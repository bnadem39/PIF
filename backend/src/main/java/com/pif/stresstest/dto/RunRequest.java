package com.pif.stresstest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Lancement d'un stress test : scénarios enregistrés (scenarioIds) et/ou un scénario libre (customShocks),
 * sur toutes les banques ou une sélection (bankIds).
 */
public record RunRequest(
        @Size(max = 10) List<Long> scenarioIds,
        @Valid ShocksDto customShocks,
        @Size(max = 50) List<String> bankIds,
        @DecimalMin("0.01") @DecimalMax("0.5") BigDecimal minCapitalRatio
) {
}
