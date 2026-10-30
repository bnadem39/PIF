package com.pif.backtest.dto;

import com.pif.backtest.model.StrategyType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Une stratégie à tester et ses paramètres (les paramètres absents prennent leur valeur par défaut).
 */
public record StrategySpec(@NotNull StrategyType type, Map<String, Double> params) {
}
