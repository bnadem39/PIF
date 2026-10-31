package com.pif.learning.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.backtest.dto.BacktestRequest;
import com.pif.backtest.dto.BacktestResponse;
import com.pif.backtest.dto.Metrics;
import com.pif.backtest.dto.StrategyResult;
import com.pif.backtest.dto.StrategySpec;
import com.pif.backtest.model.StrategyType;
import com.pif.backtest.service.BacktestService;
import com.pif.backtest.service.Bar;
import com.pif.learning.catalog.LearningCatalog;
import com.pif.learning.catalog.LearningCatalog.Challenge;
import com.pif.learning.catalog.LearningCatalog.Module;
import com.pif.learning.catalog.LearningCatalog.Quiz;
import com.pif.learning.catalog.LearningCatalog.Scenario;
import com.pif.learning.dto.LearningDtos.*;
import com.pif.learning.model.ItemType;
import com.pif.learning.model.LearningProgress;
import com.pif.learning.repository.LearningProgressRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Parcours de formation (cahier §3.3) : leçons, quiz corrigés côté serveur, scénarios de marché sur données
 * réelles, défis notés par le moteur de backtesting, points, niveaux, badges et classement.
 */
@Service
public class LearningService {

    static final int LESSON_POINTS = 10;
    static final int QUIZ_POINTS = 50;
    static final int SCENARIO_POINTS = 50;
    /** En dessous de cette variation (en valeur absolue), « attendre » était la meilleure décision. */
    static final double NEUTRAL_MOVE = 0.02;

    static final int[] LEVEL_THRESHOLDS = {0, 100, 250, 500, 900, 1300};
    static final String[] LEVEL_NAMES = {"Débutant", "Apprenti", "Analyste", "Trader confirmé", "Gérant", "Expert"};

    private final LearningCatalog catalog;
    private final LearningProgressRepository repository;
    private final UserRepository userRepository;
    private final BacktestService backtestService;

    public LearningService(LearningCatalog catalog, LearningProgressRepository repository,
                           UserRepository userRepository, BacktestService backtestService) {
        this.catalog = catalog;
        this.repository = repository;
        this.userRepository = userRepository;
        this.backtestService = backtestService;
    }

    // ── Parcours ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CatalogView catalog(User user) {
        Map<String, LearningProgress> done = progressMap(user);
        List<ModuleView> modules = catalog.catalog().modules().stream().map(m -> moduleView(m, done)).toList();
        List<ScenarioSummary> scenarios = catalog.catalog().scenarios().stream().map(s -> {
            LearningProgress p = done.get(key(ItemType.SCENARIO, s.id()));
            return new ScenarioSummary(s.id(), s.title(), s.symbol(), s.decisionDate(), p != null, p != null ? p.getPoints() : null);
        }).toList();
        List<ChallengeView> challenges = catalog.catalog().challenges().stream().map(c -> {
            LearningProgress p = done.get(key(ItemType.CHALLENGE, c.id()));
            return new ChallengeView(c.id(), c.title(), c.symbol(), c.startDate(), c.endDate(), c.description(),
                    c.criterion(), c.points(), c.hint(), p != null && p.isCompleted(), p != null ? p.getAttempts() : 0);
        }).toList();
        return new CatalogView(modules, scenarios, challenges, progress(user, done));
    }

    private ModuleView moduleView(Module m, Map<String, LearningProgress> done) {
        List<LessonSummary> lessons = m.lessons().stream()
                .map(l -> new LessonSummary(l.id(), l.title(), l.minutes(), done.containsKey(key(ItemType.LESSON, l.id()))))
                .toList();
        LearningProgress qp = done.get(key(ItemType.QUIZ, m.quiz().id()));
        boolean passed = qp != null && qp.isCompleted();
        QuizSummary quiz = new QuizSummary(m.quiz().id(), m.quiz().title(), m.quiz().questions().size(),
                m.quiz().passScore(), qp != null ? qp.getScore() : null, passed);
        long steps = lessons.stream().filter(LessonSummary::completed).count() + (passed ? 1 : 0);
        return new ModuleView(m.id(), m.title(), m.level(), m.description(), lessons, quiz,
                (double) steps / (m.lessons().size() + 1));
    }

    @Transactional(readOnly = true)
    public LessonView lesson(User user, String id) {
        var lesson = catalog.lesson(id).orElseThrow(() -> notFound("Leçon", id));
        boolean completed = repository.findByUserIdAndItemTypeAndItemId(user.getId(), ItemType.LESSON, id).isPresent();
        return new LessonView(lesson.id(), moduleOf(id), lesson.title(), lesson.minutes(), lesson.blocks(), completed);
    }

    @Transactional
    public ProgressView completeLesson(User user, String id) {
        catalog.lesson(id).orElseThrow(() -> notFound("Leçon", id));
        LearningProgress p = findOrCreate(user, ItemType.LESSON, id);
        if (!p.isCompleted()) {
            p.setCompleted(true);
            p.setPoints(LESSON_POINTS);
            p.setScore(1.0);
        }
        p.setAttempts(p.getAttempts() + 1);
        repository.save(p);
        return progress(user, progressMap(user));
    }

    // ── Quiz ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public QuizView quiz(User user, String id) {
        Quiz q = catalog.quiz(id).orElseThrow(() -> notFound("Quiz", id));
        Double best = repository.findByUserIdAndItemTypeAndItemId(user.getId(), ItemType.QUIZ, id)
                .map(LearningProgress::getScore).orElse(null);
        return new QuizView(q.id(), moduleOfQuiz(id), q.title(), q.passScore(),
                q.questions().stream().map(x -> new QuestionView(x.id(), x.text(), x.options())).toList(), best);
    }

    @Transactional
    public QuizResult submitQuiz(User user, String id, QuizSubmission submission) {
        Quiz q = catalog.quiz(id).orElseThrow(() -> notFound("Quiz", id));
        List<QuestionResult> results = new ArrayList<>();
        int correct = 0;
        for (var question : q.questions()) {
            Integer chosen = submission.answers().get(question.id());
            boolean ok = chosen != null && chosen == question.answer();
            if (ok) correct++;
            results.add(new QuestionResult(question.id(), chosen, question.answer(), ok, question.explanation()));
        }
        double score = (double) correct / q.questions().size();
        boolean passed = score >= q.passScore();

        // On garde le meilleur score : refaire un quiz ne peut pas faire perdre de points
        LearningProgress p = findOrCreate(user, ItemType.QUIZ, id);
        int before = p.getPoints();
        p.setAttempts(p.getAttempts() + 1);
        if (p.getScore() == null || score > p.getScore()) {
            p.setScore(score);
            p.setPoints((int) Math.round(QUIZ_POINTS * score));
        }
        p.setCompleted(p.isCompleted() || passed);
        repository.save(p);
        return new QuizResult(score, passed, p.getPoints() - before, p.getScore(), results);
    }

    // ── Scénarios de marché ────────────────────────────────────────

    @Transactional(readOnly = true)
    public ScenarioView scenario(User user, String id) {
        Scenario s = catalog.scenario(id).orElseThrow(() -> notFound("Scénario", id));
        ScenarioData data = scenarioData(s);
        ScenarioOutcome outcome = repository.findByUserIdAndItemTypeAndItemId(user.getId(), ItemType.SCENARIO, id)
                .map(p -> outcome(s, data, p.getDetail()))
                .orElse(null);
        // Avant la réponse, seul l'historique jusqu'à la date de décision est envoyé
        return new ScenarioView(s.id(), s.title(), s.symbol(), data.decisionDate(), s.horizonDays(), s.context(),
                data.history(), outcome);
    }

    @Transactional
    public ScenarioView answerScenario(User user, String id, ScenarioAnswer answer) {
        Scenario s = catalog.scenario(id).orElseThrow(() -> notFound("Scénario", id));
        ScenarioData data = scenarioData(s);
        LearningProgress p = findOrCreate(user, ItemType.SCENARIO, id);
        if (p.getAttempts() == 0) {
            // Une seule réponse par scénario : une fois le résultat révélé, rejouer n'aurait plus de sens
            ScenarioOutcome o = outcome(s, data, answer.decision());
            p.setAttempts(1);
            p.setDetail(answer.decision());
            p.setScore(o.marketReturn());
            p.setPoints(o.points());
            p.setCompleted(true);
            repository.save(p);
        }
        return new ScenarioView(s.id(), s.title(), s.symbol(), data.decisionDate(), s.horizonDays(), s.context(),
                data.history(), outcome(s, data, p.getDetail()));
    }

    record ScenarioData(String decisionDate, List<PricePoint> history, List<PricePoint> after, double marketReturn) {
    }

    ScenarioData scenarioData(Scenario s) {
        List<Bar> bars = backtestService.loadBars(s.symbol());
        int d = -1;
        for (int i = 0; i < bars.size(); i++) {
            if (bars.get(i).date().compareTo(s.decisionDate()) <= 0) d = i;
        }
        if (d < 0 || d + s.horizonDays() >= bars.size()) {
            throw new IllegalStateException("Données insuffisantes pour le scénario " + s.id());
        }
        List<PricePoint> history = bars.subList(Math.max(0, d - s.historyDays() + 1), d + 1).stream()
                .map(b -> new PricePoint(b.date(), b.close())).toList();
        List<PricePoint> after = bars.subList(d + 1, d + s.horizonDays() + 1).stream()
                .map(b -> new PricePoint(b.date(), b.close())).toList();
        double r = bars.get(d + s.horizonDays()).close() / bars.get(d).close() - 1;
        return new ScenarioData(bars.get(d).date(), history, after, r);
    }

    static String bestDecision(double r) {
        if (Math.abs(r) < NEUTRAL_MOVE) return "ATTENDRE";
        return r > 0 ? "ACHETER" : "VENDRE";
    }

    static int scenarioPoints(String decision, double r) {
        String best = bestDecision(r);
        if (decision.equals(best)) return SCENARIO_POINTS;
        // Attendre face à un vrai mouvement, ou agir dans un marché plat : à moitié juste
        if (decision.equals("ATTENDRE") || best.equals("ATTENDRE")) return SCENARIO_POINTS / 2;
        return 0;
    }

    private ScenarioOutcome outcome(Scenario s, ScenarioData data, String decision) {
        double r = data.marketReturn();
        String best = bestDecision(r);
        String move = String.format("%s %+.1f %% sur les %d séances suivantes.", s.symbol(), r * 100, s.horizonDays());
        String lesson = switch (best) {
            case "ACHETER" -> " La meilleure décision était d'acheter : la panique ou la peur de rater le départ ne doivent pas dicter la décision, seul le rapport rendement/risque compte.";
            case "VENDRE" -> " La meilleure décision était de vendre ou de rester à l'écart : l'euphorie et les records attirent souvent les acheteurs au pire moment.";
            default -> " Le marché est resté stable : attendre était la meilleure option, agir n'aurait fait que payer des frais.";
        };
        return new ScenarioOutcome(decision, best, r, scenarioPoints(decision, r), data.after(), move + lesson);
    }

    // ── Défis ──────────────────────────────────────────────────────

    @Transactional
    public ChallengeResult submitChallenge(User user, String id, ChallengeSubmission submission) {
        Challenge c = catalog.challenge(id).orElseThrow(() -> notFound("Défi", id));
        StrategySpec spec = submission.strategy();
        if (spec.type() == StrategyType.BUY_AND_HOLD || spec.type() == StrategyType.AI_SIGNAL) {
            throw new IllegalArgumentException("Choisissez une stratégie technique : l'achat-conservation et le signal IA servent de référence.");
        }
        BacktestResponse bt = backtestService.run(user, new BacktestRequest(c.symbol(), c.startDate(), c.endDate(),
                List.of(new StrategySpec(StrategyType.BUY_AND_HOLD, null), spec), null, null, null, null));
        StrategyResult bh = bt.results().get(0);
        StrategyResult mine = bt.results().get(1);

        String failure = evaluate(c.criterion(), mine.metrics(), bh.metrics());
        boolean passed = failure == null;

        LearningProgress p = findOrCreate(user, ItemType.CHALLENGE, id);
        p.setAttempts(p.getAttempts() + 1);
        int earned = 0;
        if (passed && !p.isCompleted()) {
            p.setCompleted(true);
            p.setPoints(c.points());
            p.setDetail(mine.label());
            earned = c.points();
        }
        repository.save(p);
        String message = passed ? "Défi réussi avec « " + mine.label() + " »." : failure;
        return new ChallengeResult(passed, mine.label(), mine.metrics(), bh.metrics(), earned, message);
    }

    /** null si le critère est rempli, sinon l'explication de l'échec. */
    static String evaluate(LearningCatalog.Criterion criterion, Metrics m, Metrics buyAndHold) {
        if (m.trades() == 0) {
            return "Aucune transaction : la stratégie n'a jamais été investie sur la période.";
        }
        if (criterion.minExposure() != null && m.exposure() < criterion.minExposure()) {
            return String.format("Exposition de %.0f %% : il faut rester investi au moins %.0f %% du temps.",
                    m.exposure() * 100, criterion.minExposure() * 100);
        }
        return switch (criterion.type()) {
            case "BEAT_BUY_AND_HOLD_RETURN" -> m.totalReturn() > buyAndHold.totalReturn() ? null
                    : String.format("Rendement %.1f %% contre %.1f %% pour l'achat-conservation.",
                    m.totalReturn() * 100, buyAndHold.totalReturn() * 100);
            case "MIN_SHARPE" -> m.sharpe() != null && m.sharpe() >= criterion.value() ? null
                    : String.format("Sharpe de %s, il faut au moins %.2f.",
                    m.sharpe() == null ? "-" : String.format("%.2f", m.sharpe()), criterion.value());
            case "MAX_DRAWDOWN_ABOVE" -> m.maxDrawdown() >= criterion.value() ? null
                    : String.format("Perte maximale de %.1f %%, la limite est %.0f %%.",
                    m.maxDrawdown() * 100, criterion.value() * 100);
            default -> throw new IllegalStateException("Critère inconnu : " + criterion.type());
        };
    }

    // ── Progression, badges et classement ──────────────────────────

    @Transactional(readOnly = true)
    public ProgressView progress(User user) {
        return progress(user, progressMap(user));
    }

    private ProgressView progress(User user, Map<String, LearningProgress> done) {
        var cat = catalog.catalog();
        int points = done.values().stream().mapToInt(LearningProgress::getPoints).sum();
        int level = levelOf(points);
        Integer next = level + 1 < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level + 1] : null;

        int lessonsTotal = cat.modules().stream().mapToInt(m -> m.lessons().size()).sum();
        int lessonsDone = count(done, ItemType.LESSON, LearningProgress::isCompleted);
        int quizzesPassed = count(done, ItemType.QUIZ, LearningProgress::isCompleted);
        int perfectQuizzes = count(done, ItemType.QUIZ, p -> p.getScore() != null && p.getScore() >= 1.0);
        int scenariosAnswered = count(done, ItemType.SCENARIO, p -> true);
        int scenariosCorrect = count(done, ItemType.SCENARIO, p -> p.getPoints() == SCENARIO_POINTS);
        int challengesDone = count(done, ItemType.CHALLENGE, LearningProgress::isCompleted);
        boolean islamicDone = cat.modules().stream().filter(m -> m.id().equals("islamique"))
                .allMatch(m -> moduleView(m, done).progress() >= 1.0);

        List<Badge> badges = List.of(
                new Badge("premiers-pas", "Premiers pas", "Terminer une première leçon", lessonsDone >= 1),
                new Badge("sans-faute", "Sans faute", "Obtenir 100 % à un quiz", perfectQuizzes >= 1),
                new Badge("diplome", "Diplômé", "Réussir tous les quiz", quizzesPassed == cat.modules().size()),
                new Badge("finance-islamique", "Finance islamique", "Terminer le module de finance islamique", islamicDone),
                new Badge("visionnaire", "Visionnaire", "Prendre la meilleure décision dans 3 scénarios", scenariosCorrect >= 3),
                new Badge("stratege", "Stratège", "Réussir un défi de backtesting", challengesDone >= 1),
                new Badge("maitre-des-defis", "Maître des défis", "Réussir tous les défis", challengesDone == cat.challenges().size())
        );
        Integer rank = points > 0 ? rankOf(user.getId()) : null;
        return new ProgressView(points, level, LEVEL_NAMES[level], LEVEL_THRESHOLDS[level], next, lessonsDone, lessonsTotal, quizzesPassed,
                cat.modules().size(), scenariosAnswered, scenariosCorrect, cat.scenarios().size(), challengesDone,
                cat.challenges().size(), rank, badges);
    }

    @Transactional(readOnly = true)
    public List<LeaderboardEntry> leaderboard(User user, int limit) {
        List<Object[]> rows = repository.leaderboard(Pageable.ofSize(limit));
        Map<Long, User> users = userRepository.findAllById(rows.stream().map(r -> (Long) r[0]).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<LeaderboardEntry> out = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            Long id = (Long) rows.get(i)[0];
            int pts = ((Number) rows.get(i)[1]).intValue();
            out.add(new LeaderboardEntry(i + 1, displayName(users.get(id)), pts, LEVEL_NAMES[levelOf(pts)],
                    user != null && id.equals(user.getId())));
        }
        return out;
    }

    private Integer rankOf(Long userId) {
        List<Object[]> all = repository.leaderboard(Pageable.unpaged());
        for (int i = 0; i < all.size(); i++) {
            if (userId.equals(all.get(i)[0])) return i + 1;
        }
        return null;
    }

    /** Nom affiché dans le classement : le nom complet, sinon le début de l'e-mail masqué. */
    static String displayName(User u) {
        if (u == null) return "Utilisateur supprimé";
        if (u.getFullName() != null && !u.getFullName().isBlank()) return u.getFullName();
        String local = u.getEmail().split("@")[0];
        return local.substring(0, Math.min(3, local.length())) + "***";
    }

    static int levelOf(int points) {
        int level = 0;
        for (int i = 0; i < LEVEL_THRESHOLDS.length; i++) {
            if (points >= LEVEL_THRESHOLDS[i]) level = i;
        }
        return level;
    }

    // ── Utilitaires ────────────────────────────────────────────────

    private Map<String, LearningProgress> progressMap(User user) {
        Map<String, LearningProgress> out = new HashMap<>();
        for (LearningProgress p : repository.findByUserId(user.getId())) {
            out.put(key(p.getItemType(), p.getItemId()), p);
        }
        return out;
    }

    private static int count(Map<String, LearningProgress> done, ItemType type, java.util.function.Predicate<LearningProgress> filter) {
        return (int) done.values().stream().filter(p -> p.getItemType() == type).filter(filter).count();
    }

    private LearningProgress findOrCreate(User user, ItemType type, String id) {
        return repository.findByUserIdAndItemTypeAndItemId(user.getId(), type, id)
                .orElseGet(() -> new LearningProgress(user.getId(), type, id));
    }

    private static String key(ItemType type, String id) {
        return type + ":" + id;
    }

    private String moduleOf(String lessonId) {
        return catalog.catalog().modules().stream()
                .filter(m -> m.lessons().stream().anyMatch(l -> l.id().equals(lessonId)))
                .map(Module::id).findFirst().orElse(null);
    }

    private String moduleOfQuiz(String quizId) {
        return catalog.catalog().modules().stream()
                .filter(m -> m.quiz().id().equals(quizId)).map(Module::id).findFirst().orElse(null);
    }

    private static NoSuchElementException notFound(String what, String id) {
        return new NoSuchElementException(what + " introuvable : " + id);
    }
}
