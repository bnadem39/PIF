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
        BigDecimal unrealizedPnlPercent
) {}
