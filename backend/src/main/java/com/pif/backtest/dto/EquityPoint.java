package com.pif.backtest.dto;

/** Valeur du portefeuille à la clôture, drawdown depuis le plus haut, et position (1 = investi). */
public record EquityPoint(String date, double equity, double drawdown, int position) {
}
