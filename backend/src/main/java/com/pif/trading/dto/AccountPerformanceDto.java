package com.pif.trading.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AccountPerformanceDto(
        BigDecimal initialCash,
        BigDecimal currentValue,
        BigDecimal totalReturn,
        BigDecimal totalReturnPercent,
        BigDecimal maxDrawdownPercent,
        int totalTrades,
        int winningTrades,
        int losingTrades,
        BigDecimal winRatePercent,
        List<Map<String, Object>> equityCurve
) {}
