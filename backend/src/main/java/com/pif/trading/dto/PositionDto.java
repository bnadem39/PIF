package com.pif.trading.dto;

import java.math.BigDecimal;

public record PositionDto(
        Long id,
        String symbol,
        Integer quantity,
        BigDecimal averageCostPrice, // PRU
        BigDecimal currentPrice,
        BigDecimal marketValue,
        BigDecimal unrealizedPnl,
        BigDecimal unrealizedPnlPercent,
        BigDecimal stopLossPrice,
        BigDecimal takeProfitPrice,
        BigDecimal trailingStopDistance,
        BigDecimal highestPriceSeen
) {
    public PositionDto(Long id, String symbol, Integer quantity, BigDecimal averageCostPrice,
                       BigDecimal currentPrice, BigDecimal marketValue, BigDecimal unrealizedPnl,
                       BigDecimal unrealizedPnlPercent) {
        this(id, symbol, quantity, averageCostPrice, currentPrice, marketValue, unrealizedPnl,
             unrealizedPnlPercent, null, null, null, null);
    }
}
