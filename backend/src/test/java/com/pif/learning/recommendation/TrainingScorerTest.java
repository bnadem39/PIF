package com.pif.learning.recommendation;

import com.pif.learning.recommendation.MatchRecommendationDtos.RoomSuggestion;
import com.pif.learning.recommendation.MatchRecommendationDtos.TrainingResult;
import com.pif.learning.recommendation.RecommendationRules.Finding;
import com.pif.multiplayer.model.TrainingTheme;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TrainingScorerTest {

    /** equity, cash, positionsValue, largest, positions, trades, protection */
    private static MatchStats stats(double equity, double cash, double positions, double largest, int count, int trades,
                                    boolean protection) {
        return new MatchStats(100_000, equity, cash, positions, largest, count, trades, protection, 1, 2);
    }

    @Test
    void noTradeScoresZeroWhateverTheTheme() {
        for (TrainingTheme t : TrainingTheme.values()) {
            assertThat(TrainingScorer.score(t, stats(100_000, 100_000, 0, 0, 0, 0, false)).score()).isZero();
        }
    }

    @Test
    void riskRoomRewardsProtectionSpreadAndLimitedLoss() {
        // Perte de 2 %, plus grosse position = 40 % des investissements, un ordre protégé : 100 points
        TrainingResult good = TrainingScorer.score(TrainingTheme.RISK, stats(98_000, 20_000, 78_000, 31_200, 3, 5, true));
        assertThat(good.score()).isEqualTo(100);
        assertThat(good.verdict()).isEqualTo("Objectif atteint");

        // Perte de 10 %, tout sur un titre, aucun ordre protégé : 0 point
        TrainingResult bad = TrainingScorer.score(TrainingTheme.RISK, stats(90_000, 0, 90_000, 90_000, 1, 5, false));
        assertThat(bad.score()).isZero();
        assertThat(bad.verdict()).isEqualTo("À retravailler");
    }

    @Test
    void diversificationRoomNeedsFourAssetsAndNoDominantOne() {
        TrainingResult ok = TrainingScorer.score(TrainingTheme.DIVERSIFICATION, stats(100_000, 20_000, 80_000, 24_000, 4, 6, false));
        assertThat(ok.score()).isEqualTo(100);

        TrainingResult concentrated = TrainingScorer.score(TrainingTheme.DIVERSIFICATION, stats(100_000, 20_000, 80_000, 70_000, 2, 6, false));
        assertThat(concentrated.score()).isEqualTo(20);   // seul « investir 50 % » est respecté
    }

    @Test
    void disciplineRoomPenalisesOvertradingAndIdleCash() {
        TrainingResult over = TrainingScorer.score(TrainingTheme.DISCIPLINE, stats(95_000, 50_000, 45_000, 20_000, 2, 40, false));
        assertThat(over.score()).isEqualTo(30);           // cash OK seulement
        TrainingResult calm = TrainingScorer.score(TrainingTheme.DISCIPLINE, stats(102_000, 50_000, 52_000, 20_000, 2, 8, true));
        assertThat(calm.score()).isEqualTo(100);
    }

    @Test
    void verdictThresholds() {
        assertThat(TrainingScorer.verdict(80)).isEqualTo("Objectif atteint");
        assertThat(TrainingScorer.verdict(79)).isEqualTo("En progrès");
        assertThat(TrainingScorer.verdict(50)).isEqualTo("En progrès");
        assertThat(TrainingScorer.verdict(49)).isEqualTo("À retravailler");
    }

    @Test
    void suggestsTheRoomOfTheMostImportantFinding() {
        List<Finding> findings = List.of(
                new Finding("CONCENTRATION", "risque", "x", 80, "trop concentré"),
                new Finding("NO_PROTECTION", "bases", "y", 65, "pas de protection"));
        Optional<RoomSuggestion> s = TrainingScorer.suggest(findings, null, null);
        assertThat(s).isPresent();
        assertThat(s.get().theme()).isEqualTo("DIVERSIFICATION");
    }

    @Test
    void noSuggestionWithoutMappedFindingOrWhenGoalAlreadyReached() {
        assertThat(TrainingScorer.suggest(List.of(new Finding("NO_TRADES", "bases", "x", 100, "r")), null, null)).isEmpty();
        List<Finding> findings = List.of(new Finding("CONCENTRATION", "risque", "x", 80, "r"));
        assertThat(TrainingScorer.suggest(findings, TrainingTheme.DIVERSIFICATION, 90)).isEmpty();
        assertThat(TrainingScorer.suggest(findings, TrainingTheme.DIVERSIFICATION, 40)).isPresent();
    }

    @Test
    void themeNormalizationAcceptsCaseAndRejectsUnknown() {
        assertThat(TrainingTheme.normalize(" risk ")).isEqualTo("RISK");
        assertThat(TrainingTheme.normalize("")).isNull();
        assertThat(TrainingTheme.normalize(null)).isNull();
        assertThatThrownBy(() -> TrainingTheme.normalize("MAGIE")).isInstanceOf(IllegalArgumentException.class);
    }
}
