package com.pif.backtest.dto;

import com.pif.backtest.model.StrategyType;

import java.util.List;

public record StrategyInfo(StrategyType type, String label, String description, List<StrategyType.ParamDef> params) {
    public static StrategyInfo from(StrategyType t) {
        return new StrategyInfo(t, t.label(), t.description(), t.params());
    }
}
