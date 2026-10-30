package com.pif.stresstest.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Création / modification d'un scénario par un administrateur.
 */
public record ScenarioRequest(
        @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Z0-9_]+", message = "Code en majuscules, chiffres et _ uniquement")
        String code,
        @NotBlank @Size(max = 120) String name,
        @Size(max = 1000) String description,
        @NotNull @Valid ShocksDto shocks
) {
}
