package com.pif.backtest.dto;

/** Aller-retour complet. Une position encore ouverte en fin de période est valorisée à la dernière clôture (open = true). */
public record TradeDto(
        String entryDate,
        double entryPrice,
        String exitDate,
        double exitPrice,
        long quantity,
        double pnl,
        double returnPct,
        boolean open
) {
}
