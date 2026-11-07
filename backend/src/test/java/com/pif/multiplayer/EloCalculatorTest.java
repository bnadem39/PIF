package com.pif.multiplayer;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.multiplayer.dto.EloUpdateResultDto;
import com.pif.multiplayer.service.EloCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class EloCalculatorTest {

    private EloCalculator eloCalculator;

    @BeforeEach
    void setUp() {
        eloCalculator = new EloCalculator();
    }

    @Test
    @DisplayName("Calcul de l'Alpha positif : le joueur surperforme le TUNINDEX")
    void shouldIncreaseEloWhenPlayerOutperformsBenchmark() {
        User user = new User("trader@pif.tn", "password", "Apex Trader", Role.ROLE_TRADER, new BigDecimal("100000.00"));
        user.setEloRating(1000);
        user.setTier("SILVER");

        BigDecimal playerPnl = BigDecimal.valueOf(15.0); // +15%
        BigDecimal tunindexPnl = BigDecimal.valueOf(5.0); // +5%
        BigDecimal volatility = BigDecimal.valueOf(0.15); // 15%

        EloUpdateResultDto result = eloCalculator.calculateAndApply(user, playerPnl, tunindexPnl, volatility, 1);

        assertTrue(result.getDeltaElo() > 0, "Le delta ELO doit être strictement positif");
        assertTrue(result.getNewElo() > 1000, "Le score ELO doit augmenter");
        assertEquals("SILVER", result.getNewTier().toUpperCase());
        assertTrue(result.isWon(), "Le joueur ayant le rang 1 doit avoir le statut won=true");
        assertEquals(1, user.getWins());
        assertEquals(1, user.getTotalMatches());
    }

    @Test
    @DisplayName("Calcul de l'Alpha négatif : le joueur sous-performe le TUNINDEX")
    void shouldDecreaseEloWhenPlayerUnderperformsBenchmark() {
        User user = new User("novice@pif.tn", "password", "Novice Trader", Role.ROLE_TRADER, new BigDecimal("100000.00"));
        user.setEloRating(1200);

        BigDecimal playerPnl = BigDecimal.valueOf(-8.0); // -8%
        BigDecimal tunindexPnl = BigDecimal.valueOf(4.0); // +4%
        BigDecimal volatility = BigDecimal.valueOf(0.20); // 20%

        EloUpdateResultDto result = eloCalculator.calculateAndApply(user, playerPnl, tunindexPnl, volatility, 4);

        assertTrue(result.getDeltaElo() < 0, "Le delta ELO doit être négatif en cas de sous-performance");
        assertTrue(result.getNewElo() < 1200);
        assertFalse(result.isWon());
        assertEquals(0, user.getWins());
        assertEquals(1, user.getTotalMatches());
    }

    @Test
    @DisplayName("Transition de Tier ELO : passage de Silver à Gold et Master")
    void shouldTransitionTiersCorrectly() {
        User user = new User("pro@pif.tn", "password", "Pro Trader", Role.ROLE_TRADER, new BigDecimal("100000.00"));
        user.setEloRating(1480);
        user.updateTierFromElo();
        assertEquals("SILVER", user.getTier().toUpperCase());

        // Gain qui le propulse à 1500+
        eloCalculator.calculateAndApply(user, BigDecimal.valueOf(25.0), BigDecimal.valueOf(0.0), BigDecimal.valueOf(0.15), 1);
        assertEquals("GOLD", user.getTier().toUpperCase());

        // Progression jusqu'à Master (2500+)
        user.setEloRating(2550);
        user.updateTierFromElo();
        assertEquals("MASTER", user.getTier().toUpperCase());
    }

    @Test
    @DisplayName("Plafond de sécurité : le delta ELO ne dépasse jamais les bornes extrêmes")
    void shouldBoundDeltaEloWithinLimits() {
        User user = new User("whale@pif.tn", "password", "Whale", Role.ROLE_TRADER, new BigDecimal("100000.00"));
        user.setEloRating(1000);

        // Alpha délirant (+500%)
        EloUpdateResultDto result = eloCalculator.calculateAndApply(user, BigDecimal.valueOf(500.0), BigDecimal.valueOf(0.0), BigDecimal.valueOf(0.05), 1);
        assertTrue(result.getDeltaElo() <= 150, "Le gain d'ELO ne doit pas excéder 150 points par manche");
    }
}
