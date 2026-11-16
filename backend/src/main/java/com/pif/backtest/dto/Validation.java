package com.pif.backtest.dto;

/**
 * Validation hors échantillon : la période est coupée en deux (70 % de référence, 30 % de test jamais vue).
 * verdict : FIABLE, A_SURVEILLER ou FRAGILE ; message : explication en langage simple.
 */
public record Validation(PeriodStats reference, PeriodStats test, String verdict, String message) {
}
