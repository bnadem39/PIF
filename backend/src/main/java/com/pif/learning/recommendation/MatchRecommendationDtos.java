package com.pif.learning.recommendation;

import java.util.List;

/** Vues renvoyées par GET /api/v1/learning/recommendation/{roomId}. */
public final class MatchRecommendationDtos {

    private MatchRecommendationDtos() {
    }

    /** Un cours conseillé. nextStep vaut LESSON (leçon à lire) ou QUIZ (quiz du module à passer). */
    public record Item(String code, String moduleId, String moduleTitle, String level, String nextStep,
                       String lessonId, String lessonTitle, String quizId, String reason) {
    }

    /** Pourcentages exprimés en % (5,2 = 5,2 %). */
    public record Summary(double returnPct, int rank, int participants, int tradeCount, int positionCount,
                          double cashSharePct, double largestPositionSharePct) {
    }

    /** Un critère noté d'une salle d'entraînement (points gagnés seulement si ok). */
    public record TrainingCheck(String label, boolean ok, int points, String detail) {
    }

    /** Score d'entraînement (sur 100) du joueur dans une salle à thème. */
    public record TrainingResult(String theme, String title, int score, String verdict, List<TrainingCheck> checks) {
    }

    /** Salle d'entraînement conseillée pour corriger la principale faiblesse constatée. */
    public record RoomSuggestion(String theme, String title, String goal, String reason) {
    }

    public record MatchRecommendationView(Summary summary, List<Item> recommendations, String message,
                                          TrainingResult training, RoomSuggestion suggestedRoom) {
    }
}
