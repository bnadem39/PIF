package com.pif.multiplayer.model;

import java.util.Locale;
import java.util.Optional;

/**
 * Thème d'une salle d'entraînement : le comportement que la salle fait travailler.
 * Une salle sans thème est une salle de jeu ordinaire.
 */
public enum TrainingTheme {
    RISK("Gestion du risque",
            "Protège ton capital : utilise des Stop-Loss, ne mise pas tout sur un titre et limite tes pertes."),
    DIVERSIFICATION("Diversification",
            "Répartis ton capital sur plusieurs actifs pour qu'un seul titre ne décide pas de ton résultat."),
    DISCIPLINE("Discipline de trading",
            "Moins d'ordres, mais réfléchis et protégés : évite de multiplier les allers-retours."),
    AI("Stratégie IA",
            "Décide avec méthode en t'aidant du Desk IA et des signaux du modèle, puis vérifie ton résultat."),
    CRISIS("Gestion de crise",
            "Traverse un marché difficile en limitant la perte et en gardant du cash de côté.");

    private final String title;
    private final String goal;

    TrainingTheme(String title, String goal) {
        this.title = title;
        this.goal = goal;
    }

    public String title() {
        return title;
    }

    public String goal() {
        return goal;
    }

    /** Thème normalisé (majuscules), ou null si la valeur est vide : salle ordinaire. */
    public static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String v = value.trim().toUpperCase(Locale.ROOT);
        for (TrainingTheme t : values()) {
            if (t.name().equals(v)) {
                return v;
            }
        }
        throw new IllegalArgumentException("Thème d'entraînement inconnu : " + value
                + ". Thèmes possibles : RISK, DIVERSIFICATION, DISCIPLINE, AI, CRISIS.");
    }

    public static Optional<TrainingTheme> of(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(value.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
