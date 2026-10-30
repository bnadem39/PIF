package com.pif.stresstest.service;

import com.pif.stresstest.dto.ShocksDto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StressTestServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void scenarioPayloadUsesAiServiceFieldNames() {
        ShocksDto shocks = new ShocksDto(new BigDecimal("250"), new BigDecimal("30"), new BigDecimal("5"),
                new BigDecimal("-5"), new BigDecimal("2.5"), new BigDecimal("2"), new BigDecimal("20"));

        Map<String, Object> payload = StressTestService.scenarioPayload("COMBINED_SEVERE", "Choc", shocks);

        assertThat(payload).containsEntry("code", "COMBINED_SEVERE").containsEntry("name", "Choc");
        assertThat((Map<String, Object>) payload.get("shocks"))
                .containsEntry("rate_shock_bp", 250.0)
                .containsEntry("gdp_growth_pct", -5.0)
                .containsEntry("default_rate_multiplier", 2.5)
                .containsOnlyKeys("rate_shock_bp", "equity_drop_pct", "unemployment_increase_pp", "gdp_growth_pct",
                        "default_rate_multiplier", "asset_quality_downgrade", "revenue_drop_pct");
    }
}
