package com.pif.backtest.dto;

/**
 * Indicateurs de performance. Les valeurs non définies (pas de transaction, volatilité nulle…) valent null.
 * Rendements, volatilité, drawdown et taux de réussite sont des fractions (0.12 = 12 %).
 */
public record Metrics(
        double finalEquity,
        double totalReturn,
        Double cagr,
        Double volatility,
        Double sharpe,
        Double sortino,
        double maxDrawdown,
        Double calmar,
        Double beta,
        int trades,
        Double winRate,
        Double profitFactor,
        Double avgTradeReturn,
        double exposure,
        double totalCosts
) {
}
