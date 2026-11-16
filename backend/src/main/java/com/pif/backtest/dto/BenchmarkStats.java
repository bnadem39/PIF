package com.pif.backtest.dto;

/**
 * Comparaison à l'indice de référence (fractions : 0.12 = 12 %).
 * excessReturn = rendement de la stratégie - rendement de l'indice ;
 * beta = sensibilité de la stratégie aux variations de l'indice ;
 * alpha = gain annualisé en plus (ou en moins) de ce que le marché explique déjà.
 */
public record BenchmarkStats(double benchmarkReturn, double excessReturn, Double beta, Double alpha) {
}
