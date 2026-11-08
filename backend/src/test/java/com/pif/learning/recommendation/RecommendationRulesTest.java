package com.pif.learning.recommendation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.learning.catalog.LearningCatalog;
import com.pif.learning.recommendation.MatchRecommendationDtos.Item;
import com.pif.learning.recommendation.RecommendationRules.Finding;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendationRulesTest {

    private static LearningCatalog catalog;

    @BeforeAll
    static void loadCatalog() throws Exception {
        catalog = new LearningCatalog(new ObjectMapper());
    }

    /** Joueur parti de 100 000 TND. */
    private static MatchStats stats(double equity, double cash, double positionsValue, double largest, int positions,
                                    int trades, boolean protectedOrders, int rank, int participants) {
        return new MatchStats(100_000, equity, cash, positionsValue, largest, positions, trades, protectedOrders, rank, participants);
    }

    private static RecommendationRules.Progress progress(Set<String> lessons, Set<String> quizzes) {
        return new RecommendationRules.Progress() {
            public boolean lessonDone(String id) { return lessons.contains(id); }
            public boolean quizPassed(String id) { return quizzes.contains(id); }
        };
    }

    private static final RecommendationRules.Progress NOTHING_DONE = progress(Set.of(), Set.of());

    private static List<String> codes(List<Finding> findings) {
        return findings.stream().map(Finding::code).toList();
    }

    @Test
    void everyRuleTargetsAnExistingModuleAndLesson() {
        List<MatchStats> cases = List.of(
                stats(100_000, 100_000, 0, 0, 0, 0, false, 1, 1),
                stats(90_000, 0, 90_000, 90_000, 1, 40, false, 2, 2),
                stats(100_000, 95_000, 5_000, 5_000, 1, 2, true, 1, 2),
                stats(120_000, 20_000, 100_000, 50_000, 2, 5, true, 1, 3));
        for (MatchStats s : cases) {
            for (Finding f : RecommendationRules.evaluate(s)) {
                var module = catalog.catalog().modules().stream().filter(m -> m.id().equals(f.moduleId())).findFirst();
                assertThat(module).as(f.code()).isPresent();
                assertThat(module.get().lessons()).as(f.code()).anyMatch(l -> l.id().equals(f.lessonId()));
            }
        }
    }

    @Test
    void noOrderRecommendsTheBasicsOnly() {
        List<Finding> findings = RecommendationRules.evaluate(stats(100_000, 100_000, 0, 0, 0, 0, false, 1, 2));
        assertThat(codes(findings)).containsExactly("NO_TRADES");
        List<Item> items = RecommendationRules.plan(findings, catalog, NOTHING_DONE);
        assertThat(items).hasSize(1);
        assertThat(items.get(0).moduleId()).isEqualTo("bases");
        assertThat(items.get(0).lessonId()).isEqualTo("bases-ordres");
        assertThat(items.get(0).nextStep()).isEqualTo("LESSON");
    }

    @Test
    void bigLossAndConcentrationPointToRiskFirstAndOnlyOnce() {
        // -8 %, tout investi sur une seule position, aucun Stop-Loss
        MatchStats s = stats(92_000, 0, 92_000, 92_000, 1, 6, false, 2, 2);
        List<Finding> findings = RecommendationRules.evaluate(s);
        assertThat(codes(findings)).contains("BIG_LOSS", "CONCENTRATION", "NO_PROTECTION");
        List<Item> items = RecommendationRules.plan(findings, catalog, NOTHING_DONE);
        assertThat(items.get(0).code()).isEqualTo("BIG_LOSS");
        assertThat(items.get(0).moduleId()).isEqualTo("risque");
        assertThat(items.stream().map(Item::moduleId).distinct()).hasSameSizeAs(items);
        assertThat(items).hasSizeLessThanOrEqualTo(RecommendationRules.MAX_RECOMMENDATIONS);
    }

    @Test
    void idleCashIsDetectedOnlyWhenPlayerTraded() {
        List<Finding> findings = RecommendationRules.evaluate(stats(100_000, 96_000, 4_000, 4_000, 1, 2, true, 1, 2));
        assertThat(codes(findings)).contains("IDLE_CASH");
        assertThat(codes(RecommendationRules.evaluate(stats(100_000, 100_000, 0, 0, 0, 0, false, 1, 2)))).doesNotContain("IDLE_CASH");
    }

    @Test
    void overtradingNeedsManyOrdersAndANegativeResult() {
        assertThat(codes(RecommendationRules.evaluate(stats(98_000, 50_000, 48_000, 20_000, 3, 35, true, 2, 2)))).contains("OVERTRADING");
        assertThat(codes(RecommendationRules.evaluate(stats(104_000, 50_000, 54_000, 20_000, 3, 35, true, 1, 2)))).doesNotContain("OVERTRADING");
    }

    @Test
    void strongResultOpensTheAdvancedModule() {
        MatchStats s = stats(112_000, 40_000, 72_000, 30_000, 3, 8, true, 1, 3);
        List<Item> items = RecommendationRules.plan(RecommendationRules.evaluate(s), catalog, NOTHING_DONE);
        assertThat(items).extracting(Item::moduleId).contains("ia");
    }

    @Test
    void completedLessonsAreSkippedThenTheQuizIsProposed() {
        List<Finding> findings = List.of(new Finding("BIG_LOSS", "risque", "risque-mesures", 90, "perte"));

        Item secondLesson = RecommendationRules.plan(findings, catalog, progress(Set.of("risque-mesures"), Set.of())).get(0);
        assertThat(secondLesson.nextStep()).isEqualTo("LESSON");
        assertThat(secondLesson.lessonId()).isEqualTo("risque-diversification");

        Item quiz = RecommendationRules.plan(findings, catalog,
                progress(Set.of("risque-mesures", "risque-diversification"), Set.of())).get(0);
        assertThat(quiz.nextStep()).isEqualTo("QUIZ");
        assertThat(quiz.lessonId()).isNull();
        assertThat(quiz.quizId()).isEqualTo("quiz-risque");
    }

    @Test
    void fullyValidatedModuleIsSkippedAndFallbackContinuesTheCourse() {
        List<Finding> findings = List.of(new Finding("BIG_LOSS", "risque", "risque-mesures", 90, "perte"));
        List<Item> items = RecommendationRules.plan(findings, catalog,
                progress(Set.of("risque-mesures", "risque-diversification"), Set.of("quiz-risque")));
        assertThat(items).hasSize(1);
        assertThat(items.get(0).code()).isEqualTo("CONTINUE");
        assertThat(items.get(0).moduleId()).isNotEqualTo("risque");
    }

    @Test
    void emptyWhenEverythingIsDone() {
        Set<String> lessons = new java.util.HashSet<>();
        Set<String> quizzes = new java.util.HashSet<>();
        catalog.catalog().modules().forEach(m -> {
            m.lessons().forEach(l -> lessons.add(l.id()));
            quizzes.add(m.quiz().id());
        });
        assertThat(RecommendationRules.plan(List.of(), catalog, progress(lessons, quizzes))).isEmpty();
    }
}
