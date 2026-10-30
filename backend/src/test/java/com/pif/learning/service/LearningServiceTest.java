package com.pif.learning.service;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.backtest.dto.Metrics;
import com.pif.learning.catalog.LearningCatalog.Criterion;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class LearningServiceTest {

    private static Metrics metrics(double totalReturn, Double sharpe, double maxDrawdown, int trades, double exposure) {
        return new Metrics(100_000 * (1 + totalReturn), totalReturn, null, null, sharpe, null, maxDrawdown, null, null,
                trades, null, null, null, exposure, 0);
    }

    @Test
    void bestDecisionFollowsTheMoveWithANeutralZone() {
        assertThat(LearningService.bestDecision(0.15)).isEqualTo("ACHETER");
        assertThat(LearningService.bestDecision(-0.08)).isEqualTo("VENDRE");
        assertThat(LearningService.bestDecision(0.019)).isEqualTo("ATTENDRE");
        assertThat(LearningService.bestDecision(-0.019)).isEqualTo("ATTENDRE");
    }

    @Test
    void scenarioPointsRewardHalfForCautiousOrNeedlessDecisions() {
        assertThat(LearningService.scenarioPoints("ACHETER", 0.2)).isEqualTo(50);
        assertThat(LearningService.scenarioPoints("ATTENDRE", 0.2)).isEqualTo(25);
        assertThat(LearningService.scenarioPoints("VENDRE", 0.2)).isZero();
        assertThat(LearningService.scenarioPoints("ACHETER", 0.005)).isEqualTo(25);
        assertThat(LearningService.scenarioPoints("ATTENDRE", 0.005)).isEqualTo(50);
    }

    @Test
    void challengeCriteriaAreChecked() {
        Metrics bh = metrics(-0.39, -0.9, -0.41, 1, 1.0);
        Criterion beat = new Criterion("BEAT_BUY_AND_HOLD_RETURN", null, null);
        assertThat(LearningService.evaluate(beat, metrics(-0.2, -0.5, -0.3, 4, 0.3), bh)).isNull();
        assertThat(LearningService.evaluate(beat, metrics(-0.45, -1.0, -0.5, 4, 0.3), bh)).contains("Rendement");

        Criterion sharpe = new Criterion("MIN_SHARPE", 1.0, null);
        assertThat(LearningService.evaluate(sharpe, metrics(0.5, 1.2, -0.2, 3, 0.6), bh)).isNull();
        assertThat(LearningService.evaluate(sharpe, metrics(0.5, 0.8, -0.2, 3, 0.6), bh)).contains("Sharpe");
        assertThat(LearningService.evaluate(sharpe, metrics(0.0, null, 0.0, 1, 0.6), bh)).contains("Sharpe");

        Criterion dd = new Criterion("MAX_DRAWDOWN_ABOVE", -0.3, 0.2);
        assertThat(LearningService.evaluate(dd, metrics(-0.1, -0.5, -0.2, 5, 0.3), bh)).isNull();
        assertThat(LearningService.evaluate(dd, metrics(-0.4, -0.5, -0.45, 5, 0.3), bh)).contains("Perte maximale");
        // Rester hors du marché ne doit pas suffire
        assertThat(LearningService.evaluate(dd, metrics(-0.01, -0.5, -0.02, 1, 0.05), bh)).contains("Exposition");
        assertThat(LearningService.evaluate(beat, metrics(0, null, 0, 0, 0), bh)).contains("Aucune transaction");
    }

    @Test
    void levelsFollowThresholds() {
        assertThat(LearningService.levelOf(0)).isZero();
        assertThat(LearningService.levelOf(99)).isZero();
        assertThat(LearningService.levelOf(100)).isEqualTo(1);
        assertThat(LearningService.levelOf(899)).isEqualTo(3);
        assertThat(LearningService.levelOf(5000)).isEqualTo(LearningService.LEVEL_NAMES.length - 1);
    }

    @Test
    void leaderboardNamesDoNotExposeEmails() {
        User anonymous = new User("oumayma@example.com", "x", " ", Role.ROLE_TRADER, BigDecimal.ZERO);
        assertThat(LearningService.displayName(anonymous)).isEqualTo("oum***");
        User named = new User("a@example.com", "x", "Trader Pro", Role.ROLE_TRADER, BigDecimal.ZERO);
        assertThat(LearningService.displayName(named)).isEqualTo("Trader Pro");
    }
}
