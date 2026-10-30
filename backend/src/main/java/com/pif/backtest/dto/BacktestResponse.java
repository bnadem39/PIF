package com.pif.backtest.dto;

import java.util.List;

public record BacktestResponse(
        String symbol,
        String startDate,
        String endDate,
        int tradingDays,
        double initialCapital,
        double commissionPct,
        double slippagePct,
        List<StrategyResult> results,
        List<String> warnings
) {
}
