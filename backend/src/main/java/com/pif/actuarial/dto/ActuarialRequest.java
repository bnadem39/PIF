package com.pif.actuarial.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Paramètres de l'analyse actuarielle d'un actif. Champs optionnels : valeurs par défaut appliquées par le service.
 * Dates au format yyyy-MM-dd ; absentes = tout l'historique disponible.
 */
public record ActuarialRequest(
        @NotBlank String symbol,
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}") String startDate,
        @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}") String endDate,
        @DecimalMin("0.90") @DecimalMax("0.999") Double confidence,
        @Min(1) @Max(60) Integer horizonDays,
        @Min(1) @Max(90) Integer forecastDays,
        @Min(500) @Max(20000) Integer simulations,
        @Pattern(regexp = "garch|ewma") String volatilityModel,
        @Pattern(regexp = "normal|student") String distribution,
        @Pattern(regexp = "zero|historical") String drift
) {
}
