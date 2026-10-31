package com.pif.learning.catalog;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Contenu pédagogique (modules, leçons, quiz, scénarios, défis), versionné dans
 * resources/learning/catalog.json pour que l'équipe puisse l'enrichir sans migration de base.
 * Le fichier est validé au démarrage : une erreur de contenu empêche l'application de démarrer.
 */
@Component
public class LearningCatalog {

    public record Catalog(int version, List<Module> modules, List<Scenario> scenarios, List<Challenge> challenges) {
    }

    public record Module(String id, String title, String level, String description, List<Lesson> lessons, Quiz quiz) {
    }

    /** Blocs de contenu : {type: p|list|tip|formula|link, ...}, rendus tels quels par le frontend. */
    public record Lesson(String id, String title, int minutes, List<JsonNode> blocks) {
    }

    public record Quiz(String id, String title, double passScore, List<Question> questions) {
    }

    public record Question(String id, String text, List<String> options, int answer, String explanation) {
    }

    public record Scenario(String id, String title, String symbol, String decisionDate, int horizonDays,
                           int historyDays, String context) {
    }

    public record Criterion(String type, Double value, Double minExposure) {
    }

    public record Challenge(String id, String title, String symbol, String startDate, String endDate,
                            String description, Criterion criterion, int points, String hint) {
    }

    private final Catalog catalog;
    private final Map<String, Lesson> lessons = new LinkedHashMap<>();
    private final Map<String, Quiz> quizzes = new LinkedHashMap<>();
    private final Map<String, Scenario> scenarios = new LinkedHashMap<>();
    private final Map<String, Challenge> challenges = new LinkedHashMap<>();

    @Autowired
    public LearningCatalog(ObjectMapper objectMapper) throws IOException {
        this(load(objectMapper));
    }

    LearningCatalog(Catalog catalog) {
        this.catalog = catalog;
        Set<String> ids = new HashSet<>();
        for (Module m : catalog.modules()) {
            requireUnique(ids, m.id());
            for (Lesson l : m.lessons()) {
                requireUnique(ids, l.id());
                lessons.put(l.id(), l);
            }
            Quiz q = m.quiz();
            requireUnique(ids, q.id());
            for (Question question : q.questions()) {
                if (question.answer() < 0 || question.answer() >= question.options().size()) {
                    throw new IllegalStateException("Quiz " + q.id() + ", question " + question.id() + " : réponse hors des options.");
                }
            }
            quizzes.put(q.id(), q);
        }
        for (Scenario s : catalog.scenarios()) {
            requireUnique(ids, s.id());
            scenarios.put(s.id(), s);
        }
        for (Challenge c : catalog.challenges()) {
            requireUnique(ids, c.id());
            if (!Set.of("BEAT_BUY_AND_HOLD_RETURN", "MIN_SHARPE", "MAX_DRAWDOWN_ABOVE").contains(c.criterion().type())) {
                throw new IllegalStateException("Défi " + c.id() + " : critère inconnu " + c.criterion().type());
            }
            challenges.put(c.id(), c);
        }
    }

    private static Catalog load(ObjectMapper objectMapper) throws IOException {
        try (InputStream in = new ClassPathResource("learning/catalog.json").getInputStream()) {
            return objectMapper.copy().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).readValue(in, Catalog.class);
        }
    }

    private static void requireUnique(Set<String> ids, String id) {
        if (!ids.add(id)) throw new IllegalStateException("Identifiant de contenu en double : " + id);
    }

    public Catalog catalog() { return catalog; }
    public Optional<Lesson> lesson(String id) { return Optional.ofNullable(lessons.get(id)); }
    public Optional<Quiz> quiz(String id) { return Optional.ofNullable(quizzes.get(id)); }
    public Optional<Scenario> scenario(String id) { return Optional.ofNullable(scenarios.get(id)); }
    public Optional<Challenge> challenge(String id) { return Optional.ofNullable(challenges.get(id)); }
}
