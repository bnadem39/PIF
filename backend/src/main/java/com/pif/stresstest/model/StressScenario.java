package com.pif.stresstest.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Scénario de stress : ensemble de chocs macroéconomiques et financiers appliqués aux banques.
 */
@Entity
@Table(name = "stress_scenarios")
public class StressScenario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(name = "rate_shock_bp", nullable = false, precision = 8, scale = 2)
    private BigDecimal rateShockBp;

    @Column(name = "equity_drop_pct", nullable = false, precision = 8, scale = 2)
    private BigDecimal equityDropPct;

    @Column(name = "unemployment_increase_pp", nullable = false, precision = 8, scale = 2)
    private BigDecimal unemploymentIncreasePp;

    @Column(name = "gdp_growth_pct", nullable = false, precision = 8, scale = 2)
    private BigDecimal gdpGrowthPct;

    @Column(name = "default_rate_multiplier", nullable = false, precision = 8, scale = 2)
    private BigDecimal defaultRateMultiplier;

    @Column(name = "asset_quality_downgrade", nullable = false, precision = 8, scale = 2)
    private BigDecimal assetQualityDowngrade;

    @Column(name = "revenue_drop_pct", nullable = false, precision = 8, scale = 2)
    private BigDecimal revenueDropPct;

    @Column(nullable = false)
    private boolean preset;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getRateShockBp() { return rateShockBp; }
    public void setRateShockBp(BigDecimal v) { this.rateShockBp = v; }
    public BigDecimal getEquityDropPct() { return equityDropPct; }
    public void setEquityDropPct(BigDecimal v) { this.equityDropPct = v; }
    public BigDecimal getUnemploymentIncreasePp() { return unemploymentIncreasePp; }
    public void setUnemploymentIncreasePp(BigDecimal v) { this.unemploymentIncreasePp = v; }
    public BigDecimal getGdpGrowthPct() { return gdpGrowthPct; }
    public void setGdpGrowthPct(BigDecimal v) { this.gdpGrowthPct = v; }
    public BigDecimal getDefaultRateMultiplier() { return defaultRateMultiplier; }
    public void setDefaultRateMultiplier(BigDecimal v) { this.defaultRateMultiplier = v; }
    public BigDecimal getAssetQualityDowngrade() { return assetQualityDowngrade; }
    public void setAssetQualityDowngrade(BigDecimal v) { this.assetQualityDowngrade = v; }
    public BigDecimal getRevenueDropPct() { return revenueDropPct; }
    public void setRevenueDropPct(BigDecimal v) { this.revenueDropPct = v; }
    public boolean isPreset() { return preset; }
    public void setPreset(boolean preset) { this.preset = preset; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
