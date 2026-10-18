package com.pif.trading.dto;

import java.math.BigDecimal;
import java.util.List;

public record PortfolioSummaryDto(
        BigDecimal cashBalance,
        BigDecimal blockedCash,
        BigDecimal availableCash,
        BigDecimal positionsMarketValue,
        BigDecimal totalPortfolioValue,
        BigDecimal totalUnrealizedPnl,
        BigDecimal totalUnrealizedPnlPercent,
        BigDecimal totalRealizedPnl,
        int positionsCount,
        List<PositionDto> positions,
        String simulatedDate
) {}
