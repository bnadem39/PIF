package com.pif.stresstest.dto;

import com.pif.stresstest.model.StressScenario;

public record ScenarioDto(
        Long id,
        String code,
        String name,
        String description,
        boolean preset,
        ShocksDto shocks
) {
    public static ScenarioDto from(StressScenario s) {
        return new ScenarioDto(s.getId(), s.getCode(), s.getName(), s.getDescription(), s.isPreset(),
                new ShocksDto(s.getRateShockBp(), s.getEquityDropPct(), s.getUnemploymentIncreasePp(),
                        s.getGdpGrowthPct(), s.getDefaultRateMultiplier(), s.getAssetQualityDowngrade(),
                        s.getRevenueDropPct()));
    }
}
