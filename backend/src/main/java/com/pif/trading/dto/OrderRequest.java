package com.pif.trading.dto;

import com.pif.trading.model.ExecutionType;
import com.pif.trading.model.OrderType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Requête d'exécution d'ordre incluant les paramètres avancés de gestion des risques (SL, TP, Trailing Stop).
 *
 * Le cours d'exécution est déterminé côté serveur à partir de la date simulée :
 * {@code executionPrice} est conservé pour compatibilité mais ignoré par le moteur.
 */
public record OrderRequest(
        @NotBlank(message = "Le symbole de l'actif est obligatoire")
        String symbol,

        // Sens de l'ordre : BUY ou SELL
        @NotNull(message = "Le sens de l'ordre (BUY/SELL) est obligatoire")
        OrderType type,

        @NotNull(message = "La quantité est obligatoire")
        @Min(value = 1, message = "La quantité doit être supérieure ou égale à 1")
        Integer quantity,

        // Ignoré : le cours est lu côté serveur (voir MarketPriceService)
        BigDecimal executionPrice,

        @NotBlank(message = "La date simulée courante est obligatoire")
        String simulatedDate,

        // Paramètres avancés optionnels de gestion des risques
        BigDecimal stopLossPrice,
        BigDecimal takeProfitPrice,
        BigDecimal trailingStopDistance,

        // Mode d'exécution (MARKET par défaut) et limite associée
        ExecutionType orderType,

        @DecimalMin(value = "0.001", message = "Le prix limite doit être strictement positif")
        BigDecimal limitPrice
) {
    public OrderRequest(String symbol, OrderType type, Integer quantity, BigDecimal executionPrice, String simulatedDate) {
        this(symbol, type, quantity, executionPrice, simulatedDate, null, null, null, null, null);
    }

    public ExecutionType executionTypeOrDefault() {
        return orderType != null ? orderType : ExecutionType.MARKET;
    }
}
