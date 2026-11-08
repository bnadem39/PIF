package com.pif.learning.recommendation;

import com.pif.learning.catalog.LearningCatalog;
import com.pif.learning.catalog.LearningCatalog.Lesson;
import com.pif.learning.catalog.LearningCatalog.Module;
import com.pif.learning.recommendation.MatchRecommendationDtos.Item;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Règles qui transforment le résultat d'un match en cours conseillés. Classe sans état ni accès à la base :
 * chaque règle est testable seule. Le contenu pédagogique vient du catalogue (resources/learning/catalog.json).
 */
public final class RecommendationRules {

    public static final int MAX_RECOMMENDATIONS = 3;

    static final double BIG_LOSS = -0.05;
    static final double GOOD_RESULT = 0.05;
    static final double IDLE_CASH_SHARE = 0.9;
    static final double CONCENTRATION_SHARE = 0.6;
    static final double MIN_INVESTED_SHARE = 0.3;
    static final int OVERTRADING_ORDERS = 30;
    static final int MIN_ORDERS_FOR_PROTECTION = 3;

    /** Un constat sur le match, relié à un module (et à la leçon la plus pertinente). Priorité élevée = traité en premier. */
    public record Finding(String code, String moduleId, String lessonId, int priority, String reason) {
    }

    /** Progression de l'utilisateur dans la formation. */
    public interface Progress {
        boolean lessonDone(String lessonId);

        boolean quizPassed(String quizId);
    }

    private RecommendationRules() {
    }

    public static List<Finding> evaluate(MatchStats s) {
        List<Finding> out = new ArrayList<>();
        double ret = s.returnPct();

        if (s.tradeCount() == 0) {
            out.add(new Finding("NO_TRADES", "bases", "bases-ordres", 100,
                    "Tu n'as passé aucun ordre pendant ce match : commence par comprendre comment fonctionnent les ordres "
                            + "(au marché, à cours limité, Stop-Loss, Take-Profit)."));
            return out;
        }
        if (ret <= BIG_LOSS) {
            out.add(new Finding("BIG_LOSS", "risque", "risque-mesures", 90,
                    "Ton portefeuille a perdu " + pct(ret) + " pendant le match : apprends à mesurer et à limiter le risque d'une position."));
        }
        if (s.positionCount() >= 1 && s.investedShare() >= MIN_INVESTED_SHARE && s.largestShareOfInvested() >= CONCENTRATION_SHARE) {
            out.add(new Finding("CONCENTRATION", "risque", "risque-diversification", 80,
                    "Une seule position pèse " + pct(s.largestShareOfInvested()) + " de tes investissements : "
                            + "la diversification réduit le risque sans renoncer à tout le rendement."));
        }
        if (s.tradeCount() >= OVERTRADING_ORDERS && ret < 0) {
            out.add(new Finding("OVERTRADING", "technique", "technique-tendance", 70,
                    "Tu as passé " + s.tradeCount() + " ordres pour un résultat négatif : "
                            + "apprends à confirmer une tendance avant d'agir plutôt que de multiplier les allers-retours."));
        }
        if (s.tradeCount() >= MIN_ORDERS_FOR_PROTECTION && !s.usedProtection() && ret < 0) {
            out.add(new Finding("NO_PROTECTION", "bases", "bases-ordres", 65,
                    "Aucun de tes ordres n'avait de Stop-Loss ni de Take-Profit : ces ordres protègent le capital quand le marché se retourne."));
        }
        if (s.cashShare() >= IDLE_CASH_SHARE) {
            out.add(new Finding("IDLE_CASH", "actifs", "actifs-actions-obligations", 60,
                    pct(s.cashShare()) + " de ton capital est resté en cash : découvre les classes d'actifs pour savoir où et comment l'investir."));
        }
        if (ret >= GOOD_RESULT || (s.participants() >= 2 && s.rank() == 1 && ret > 0)) {
            out.add(new Finding("STRONG_RESULT", "ia", "ia-modeles", 30,
                    "Bon résultat (" + (ret >= 0 ? "+" : "-") + pct(ret) + ") : tu peux passer au niveau avancé et "
                            + "comprendre comment les modèles d'IA aident à décider."));
        }
        return out;
    }

    /**
     * Transforme les constats en cours conseillés (3 au plus, un par module) : la leçon visée si elle n'est pas faite,
     * sinon la prochaine leçon du module, sinon son quiz. Un module entièrement validé est ignoré. Sans constat exploitable,
     * on propose la suite du parcours.
     */
    public static List<Item> plan(List<Finding> findings, LearningCatalog catalog, Progress progress) {
        List<Finding> sorted = new ArrayList<>(findings);
        sorted.sort(Comparator.comparingInt(Finding::priority).reversed());

        List<Item> items = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Finding f : sorted) {
            if (items.size() >= MAX_RECOMMENDATIONS) break;
            Module module = catalog.catalog().modules().stream().filter(m -> m.id().equals(f.moduleId())).findFirst().orElse(null);
            if (module == null || !seen.add(module.id())) continue;
            next(module, f.lessonId(), progress).ifPresent(step -> items.add(toItem(f.code(), module, step, f.reason())));
        }
        if (items.isEmpty()) {
            for (Module module : catalog.catalog().modules()) {
                Optional<Step> step = next(module, null, progress);
                if (step.isPresent()) {
                    items.add(toItem("CONTINUE", module, step.get(), "Poursuis ton parcours de formation avec le prochain cours."));
                    break;
                }
            }
        }
        return items;
    }

    private record Step(String nextStep, Lesson lesson) {
    }

    private static Optional<Step> next(Module module, String preferredLessonId, Progress progress) {
        if (preferredLessonId != null) {
            for (Lesson l : module.lessons()) {
                if (l.id().equals(preferredLessonId) && !progress.lessonDone(l.id())) {
                    return Optional.of(new Step("LESSON", l));
                }
            }
        }
        for (Lesson l : module.lessons()) {
            if (!progress.lessonDone(l.id())) return Optional.of(new Step("LESSON", l));
        }
        if (!progress.quizPassed(module.quiz().id())) return Optional.of(new Step("QUIZ", null));
        return Optional.empty();
    }

    private static Item toItem(String code, Module module, Step step, String reason) {
        return new Item(code, module.id(), module.title(), module.level(), step.nextStep(),
                step.lesson() != null ? step.lesson().id() : null,
                step.lesson() != null ? step.lesson().title() : null,
                module.quiz().id(), reason);
    }

    private static String pct(double v) {
        return Math.round(Math.abs(v) * 100) + " %";
    }
}
