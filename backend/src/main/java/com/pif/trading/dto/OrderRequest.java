package com.pif.trading.dto;

import com.pif.trading.model.OrderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Requête d'exécution d'ordre incluant les paramètres avancés de gestion des risques (SL, TP, Trailing Stop).
 */
public record OrderRequest(
        @NotBlank(message = "Le symbole de l'actif est obligatoire")
        String symbol,

        @NotNull(message = "Le type d'ordre est obligatoire")
        OrderType type,

        @NotNull(message = "La quantité est obligatoire")
        @Min(value = 1, message = "La quantité doit être supérieure ou égale à 1")
        Integer quantity,

        @NotNull(message = "Le cours d'exécution simulé est obligatoire")
        @DecimalMin(value = "0.001", message = "Le cours d'exécution doit être strictement positif")
        BigDecimal executionPrice,

        @NotBlank(message = "La date simulée courante est obligatoire")
        String simulatedDate,

        // Paramètres avancés optionnels de gestion des risques
        BigDecimal stopLossPrice,
        BigDecimal takeProfitPrice,
        BigDecimal trailingStopDistance
) {
    public OrderRequest(String symbol, OrderType type, Integer quantity, BigDecimal executionPrice, String simulatedDate) {
        this(symbol, type, quantity, executionPrice, simulatedDate, null, null, null);
    }
}
