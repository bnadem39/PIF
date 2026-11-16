package com.pif.backtest.dto;

/** Résultat d'une stratégie sur une sous-période (fractions : 0.12 = 12 %). */
public record PeriodStats(String startDate, String endDate, int days, double totalReturn, Double sharpe, double maxDrawdown) {
}
