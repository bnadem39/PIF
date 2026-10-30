package com.pif.backtest.dto;

import com.pif.backtest.model.StrategyType;

import java.util.List;
import java.util.Map;

public record StrategyResult(
        String key,
        String label,
        StrategyType type,
        Map<String, Double> params,
        Metrics metrics,
        List<EquityPoint> equity,
        List<TradeDto> trades
) {
}
