package com.pif.learning.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.backtest.dto.Metrics;
import com.pif.backtest.dto.StrategySpec;
import com.pif.learning.catalog.LearningCatalog;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.List;
import java.util.Map;

/** Vues et requêtes du module de formation. Les bonnes réponses des quiz ne sont jamais envoyées avant correction. */
public final class LearningDtos {

    private LearningDtos() {
    }

    // ── Parcours ───────────────────────────────────────────────────
    public record LessonSummary(String id, String title, int minutes, boolean completed) {
    }

    public record QuizSummary(String id, String title, int questions, double passScore, Double bestScore, boolean passed) {
    }

    public record ModuleView(String id, String title, String level, String description,
                             List<LessonSummary> lessons, QuizSummary quiz, double progress) {
    }

    public record ScenarioSummary(String id, String title, String symbol, String decisionDate, boolean answered, Integer points) {
    }

    public record ChallengeView(String id, String title, String symbol, String startDate, String endDate,
                                String description, LearningCatalog.Criterion criterion, int points, String hint,
                                boolean completed, int attempts) {
    }

    public record CatalogView(List<ModuleView> modules, List<ScenarioSummary> scenarios,
                              List<ChallengeView> challenges, ProgressView progress) {
    }

    public record LessonView(String id, String moduleId, String title, int minutes, List<JsonNode> blocks, boolean completed) {
    }

    // ── Quiz ───────────────────────────────────────────────────────
    public record QuestionView(String id, String text, List<String> options) {
    }

    public record QuizView(String id, String moduleId, String title, double passScore, List<QuestionView> questions,
                           Double bestScore) {
    }

    public record QuizSubmission(@NotNull Map<String, Integer> answers) {
    }

    public record QuestionResult(String id, Integer chosen, int answer, boolean correct, String explanation) {
    }

    public record QuizResult(double score, boolean passed, int points, double bestScore, List<QuestionResult> questions) {
    }

    // ── Scénarios de marché ────────────────────────────────────────
    public record PricePoint(String date, double close) {
    }

    public record ScenarioOutcome(String decision, String bestDecision, double marketReturn, int points,
                                  List<PricePoint> after, String explanation) {
    }

    public record ScenarioView(String id, String title, String symbol, String decisionDate, int horizonDays,
                               String context, List<PricePoint> history, ScenarioOutcome outcome) {
    }

    public record ScenarioAnswer(@NotNull @Pattern(regexp = "ACHETER|ATTENDRE|VENDRE") String decision) {
    }

    // ── Défis ──────────────────────────────────────────────────────
    public record ChallengeSubmission(@NotNull @Valid StrategySpec strategy) {
    }

    public record ChallengeResult(boolean passed, String strategyLabel, Metrics metrics, Metrics buyAndHold,
                                  int pointsEarned, String message) {
    }

    // ── Progression ────────────────────────────────────────────────
    public record Badge(String id, String label, String description, boolean earned) {
    }

    public record ProgressView(int points, int level, String levelName, int levelStartPoints, Integer nextLevelPoints,
                               int lessonsDone, int lessonsTotal, int quizzesPassed, int quizzesTotal,
                               int scenariosAnswered, int scenariosCorrect, int scenariosTotal,
                               int challengesDone, int challengesTotal, Integer rank, List<Badge> badges) {
    }

    public record LeaderboardEntry(int rank, String name, int points, String levelName, boolean me) {
    }
}
