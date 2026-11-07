package com.pif.multiplayer.service;

import com.pif.auth.model.User;
import com.pif.multiplayer.dto.EloUpdateResultDto;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Calculateur ELO compétitif pour la simulation multijoueur.
 *
 * Formule d'ajustement du score ELO :
 *   ΔELO = K × ((PnL_joueur - PnL_TUNINDEX) / Volatilité)
 *
 * Avec :
 *   - K : Facteur d'échelle de volatilité ELO (valeur de base = 32.0)
 *   - PnL_joueur : Profit/Perte en pourcentage ou montant généré par le joueur
 *   - PnL_TUNINDEX : Performance de l'indice de référence du marché
 *   - Volatilité : Écart-type annualisé ou volatilité observée sur la période
 */
@Component
public class EloCalculator {

    public static final double DEFAULT_K_FACTOR = 32.0;
    private static final double MIN_VOLATILITY = 0.05; // 5% minimum pour éviter la division par zéro

    public EloUpdateResultDto calculateAndApply(
            User user,
            BigDecimal playerPnl,
            BigDecimal tunindexPnl,
            BigDecimal volatility,
            int rank,
            double kFactor
    ) {
        EloUpdateResultDto result = new EloUpdateResultDto();
        result.setUserId(user.getId());
        result.setUsername(user.getUsernameAlias());
        result.setOldElo(user.getEloRating());
        result.setOldTier(user.getTier());
        result.setPlayerPnl(playerPnl != null ? playerPnl : BigDecimal.ZERO);
        result.setTunindexPnl(tunindexPnl != null ? tunindexPnl : BigDecimal.ZERO);
        result.setFinalRank(rank);

        // Calcul de l'Alpha généré vs TUNINDEX
        BigDecimal alpha = result.getPlayerPnl().subtract(result.getTunindexPnl());
        result.setAlpha(alpha);

        double vol = volatility != null && volatility.doubleValue() > MIN_VOLATILITY
                ? volatility.doubleValue()
                : 0.15; // Volatilité typique du marché de 15%
        result.setVolatility(BigDecimal.valueOf(vol));

        // Calcul de delta ELO
        double alphaVal = alpha.doubleValue();
        double k = kFactor > 0 ? kFactor : DEFAULT_K_FACTOR;
        double rawDelta = k * (alphaVal / vol);

        // Bornage du delta par match pour stabilité (-150 <= delta <= +150)
        int delta = (int) Math.round(rawDelta);
        delta = Math.max(-150, Math.min(150, delta));

        // Bonus pour la 1ère place (+15)
        boolean won = (rank == 1);
        if (won && delta < 15) {
            delta = Math.max(delta, 15);
        }
        result.setWon(won);
        result.setDeltaElo(delta);

        int newElo = Math.max(100, user.getEloRating() + delta);
        result.setNewElo(newElo);

        // Application au profil du joueur
        user.setEloRating(newElo);
        user.setTotalMatches((user.getTotalMatches() != null ? user.getTotalMatches() : 0) + 1);
        if (won) {
            user.setWins((user.getWins() != null ? user.getWins() : 0) + 1);
        }
        user.updateTierFromElo();
        result.setNewTier(user.getTier());

        return result;
    }

    public EloUpdateResultDto calculateAndApply(User user, BigDecimal playerPnl, BigDecimal tunindexPnl, BigDecimal volatility, int rank) {
        return calculateAndApply(user, playerPnl, tunindexPnl, volatility, rank, DEFAULT_K_FACTOR);
    }
}

