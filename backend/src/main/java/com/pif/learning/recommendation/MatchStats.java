package com.pif.learning.recommendation;

/**
 * Résultat d'un joueur dans une salle, résumé en quelques indicateurs. Valeurs monétaires en TND ; seules les données
 * du joueur lui-même et son rang sont utilisés.
 */
public record MatchStats(
        double initialCash,
        double equity,
        double cash,
        double positionsValue,
        double largestPositionValue,
        int positionCount,
        int tradeCount,
        boolean usedProtection,
        int rank,
        int participants
) {

    /** Rendement du match : 0,05 = +5 %. */
    public double returnPct() {
        return initialCash > 0 ? equity / initialCash - 1.0 : 0.0;
    }

    /** Part du capital restée en cash. */
    public double cashShare() {
        return equity > 0 ? Math.max(0.0, Math.min(1.0, cash / equity)) : 1.0;
    }

    /** Part du capital investie en positions. */
    public double investedShare() {
        return equity > 0 ? Math.max(0.0, Math.min(1.0, positionsValue / equity)) : 0.0;
    }

    /** Poids de la plus grosse position dans l'ensemble des positions. */
    public double largestShareOfInvested() {
        return positionsValue > 0 ? Math.min(1.0, largestPositionValue / positionsValue) : 0.0;
    }
}
