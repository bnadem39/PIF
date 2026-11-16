package com.pif.learning.recommendation;

import com.pif.learning.recommendation.MatchRecommendationDtos.RoomSuggestion;
import com.pif.learning.recommendation.MatchRecommendationDtos.TrainingCheck;
import com.pif.learning.recommendation.MatchRecommendationDtos.TrainingResult;
import com.pif.learning.recommendation.RecommendationRules.Finding;
import com.pif.multiplayer.model.TrainingTheme;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Salles d'entraînement : note le comportement d'un joueur selon le thème de la salle (règles simples, sur 100 points)
 * et suggère la salle qui corrige sa principale faiblesse. Classe sans état ni accès à la base, comme RecommendationRules.
 * Les règles sont seulement notées : le joueur reste libre, mais son score d'entraînement baisse s'il ne les respecte pas.
 */
public final class TrainingScorer {

    static final double MAX_LOSS = -0.05;
    static final double MAX_SINGLE_SHARE_RISK = 0.40;
    static final double MAX_SINGLE_SHARE_DIVERSIFIED = 0.35;
    static final int MIN_POSITIONS_DIVERSIFIED = 4;
    static final int MAX_ORDERS_DISCIPLINE = 15;
    static final double MAX_CASH_SHARE = 0.9;
    static final double MIN_CASH_CRISIS = 0.2;
    static final int GOAL_REACHED = 80;
    static final int PROGRESSING = 50;

    /** Comportement constaté (code du constat de RecommendationRules) -> salle qui le travaille. */
    private static final Map<String, TrainingTheme> THEME_BY_FINDING = Map.of(
            "CONCENTRATION", TrainingTheme.DIVERSIFICATION,
            "IDLE_CASH", TrainingTheme.DIVERSIFICATION,
            "OVERTRADING", TrainingTheme.DISCIPLINE,
            "NO_PROTECTION", TrainingTheme.RISK,
            "BIG_LOSS", TrainingTheme.CRISIS,
            "STRONG_RESULT", TrainingTheme.AI);

    private TrainingScorer() {
    }

    public static TrainingResult score(TrainingTheme theme, MatchStats s) {
        List<TrainingCheck> checks = new ArrayList<>();
        if (s.tradeCount() == 0) {
            checks.add(new TrainingCheck("Passer au moins un ordre", false, 0, "Aucun ordre passé : rien à évaluer."));
            return result(theme, 0, checks);
        }
        switch (theme) {
            case RISK -> {
                add(checks, "Utiliser un Stop-Loss ou un Take-Profit", s.usedProtection(), 40,
                        "Au moins un ordre protégé", "Aucun ordre protégé");
                add(checks, "Ne pas dépasser 40 % sur un seul titre",
                        s.positionCount() == 0 || s.largestShareOfInvested() <= MAX_SINGLE_SHARE_RISK, 30,
                        "Positions bien réparties", "Une position pèse " + pct(s.largestShareOfInvested()));
                add(checks, "Limiter la perte à 5 % maximum", s.returnPct() >= MAX_LOSS, 30,
                        "Perte maîtrisée (" + signed(s.returnPct()) + ")", "Perte de " + pct(s.returnPct()));
            }
            case DIVERSIFICATION -> {
                add(checks, "Détenir au moins 4 actifs", s.positionCount() >= MIN_POSITIONS_DIVERSIFIED, 40,
                        s.positionCount() + " actifs détenus", "Seulement " + s.positionCount() + " actif(s)");
                add(checks, "Aucun actif au-dessus de 35 % de tes investissements",
                        s.positionCount() >= 1 && s.largestShareOfInvested() <= MAX_SINGLE_SHARE_DIVERSIFIED, 40,
                        "Plus grosse position : " + pct(s.largestShareOfInvested()),
                        "Plus grosse position : " + pct(s.largestShareOfInvested()));
                add(checks, "Investir au moins 50 % du capital", s.investedShare() >= 0.5, 20,
                        pct(s.investedShare()) + " investi", "Seulement " + pct(s.investedShare()) + " investi");
            }
            case DISCIPLINE -> {
                add(checks, "Rester entre 1 et 15 ordres", s.tradeCount() >= 1 && s.tradeCount() <= MAX_ORDERS_DISCIPLINE, 40,
                        s.tradeCount() + " ordres", s.tradeCount() + " ordres : trop d'allers-retours");
                add(checks, "Protéger tes ordres (Stop-Loss ou Take-Profit)", s.usedProtection(), 30,
                        "Au moins un ordre protégé", "Aucun ordre protégé");
                add(checks, "Ne pas laisser plus de 90 % du capital en cash", s.cashShare() <= MAX_CASH_SHARE, 30,
                        pct(s.cashShare()) + " en cash", pct(s.cashShare()) + " du capital reste inactif");
            }
            case AI -> {
                add(checks, "Obtenir un rendement positif", s.returnPct() > 0, 50,
                        "Rendement " + signed(s.returnPct()), "Rendement " + signed(s.returnPct()));
                add(checks, "Décider avec méthode : 3 à 20 ordres", s.tradeCount() >= 3 && s.tradeCount() <= 20, 25,
                        s.tradeCount() + " ordres", s.tradeCount() + " ordres");
                add(checks, "Investir au moins 30 % du capital", s.investedShare() >= 0.3, 25,
                        pct(s.investedShare()) + " investi", "Seulement " + pct(s.investedShare()) + " investi");
            }
            case CRISIS -> {
                add(checks, "Limiter la perte à 5 % maximum", s.returnPct() >= MAX_LOSS, 50,
                        "Perte maîtrisée (" + signed(s.returnPct()) + ")", "Perte de " + pct(s.returnPct()));
                add(checks, "Garder au moins 20 % de cash", s.cashShare() >= MIN_CASH_CRISIS, 25,
                        pct(s.cashShare()) + " de cash gardé", "Seulement " + pct(s.cashShare()) + " de cash");
                add(checks, "Utiliser un Stop-Loss", s.usedProtection(), 25,
                        "Au moins un ordre protégé", "Aucun ordre protégé");
            }
        }
        int score = checks.stream().filter(TrainingCheck::ok).mapToInt(TrainingCheck::points).sum();
        return result(theme, score, checks);
    }

    /**
     * Salle conseillée : celle qui travaille le constat le plus prioritaire. Aucune suggestion si le joueur vient
     * de jouer cette salle et a atteint l'objectif, ou si aucun constat ne correspond à une salle.
     */
    public static Optional<RoomSuggestion> suggest(List<Finding> findings, TrainingTheme playedTheme, Integer playedScore) {
        return findings.stream()
                .filter(f -> THEME_BY_FINDING.containsKey(f.code()))
                .max(Comparator.comparingInt(Finding::priority))
                .flatMap(f -> {
                    TrainingTheme theme = THEME_BY_FINDING.get(f.code());
                    if (theme == playedTheme && playedScore != null && playedScore >= GOAL_REACHED) {
                        return Optional.empty();
                    }
                    return Optional.of(new RoomSuggestion(theme.name(), theme.title(), theme.goal(), f.reason()));
                });
    }

    static String verdict(int score) {
        if (score >= GOAL_REACHED) return "Objectif atteint";
        if (score >= PROGRESSING) return "En progrès";
        return "À retravailler";
    }

    private static TrainingResult result(TrainingTheme theme, int score, List<TrainingCheck> checks) {
        return new TrainingResult(theme.name(), theme.title(), score, verdict(score), checks);
    }

    private static void add(List<TrainingCheck> checks, String label, boolean ok, int points, String okDetail, String koDetail) {
        checks.add(new TrainingCheck(label, ok, points, ok ? okDetail : koDetail));
    }

    private static String pct(double v) {
        return Math.round(Math.abs(v) * 100) + " %";
    }

    private static String signed(double v) {
        return (v >= 0 ? "+" : "-") + pct(v);
    }
}
