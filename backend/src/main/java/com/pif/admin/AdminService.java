package com.pif.admin;

import com.pif.admin.AdminDtos.*;
import com.pif.audit.model.AuditAction;
import com.pif.audit.model.AuditLog;
import com.pif.audit.repository.AuditLogRepository;
import com.pif.audit.service.AuditService;
import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.learning.catalog.LearningCatalog;
import com.pif.learning.model.ItemType;
import com.pif.learning.model.LearningProgress;
import com.pif.learning.repository.LearningProgressRepository;
import com.pif.trading.repository.OrderTransactionRepository;
import com.pif.trading.repository.PositionRepository;
import com.pif.trading.service.TradingService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Console d'administration (cahier §5) : comptes et autorisations, statistiques globales de la plateforme,
 * suivi des contenus pédagogiques et des performances des utilisateurs.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final OrderTransactionRepository orderRepository;
    private final PositionRepository positionRepository;
    private final LearningProgressRepository learningRepository;
    private final AuditLogRepository auditRepository;
    private final AuditService auditService;
    private final TradingService tradingService;
    private final LearningCatalog catalog;

    public AdminService(UserRepository userRepository, OrderTransactionRepository orderRepository,
                        PositionRepository positionRepository, LearningProgressRepository learningRepository,
                        AuditLogRepository auditRepository, AuditService auditService, TradingService tradingService,
                        LearningCatalog catalog) {
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.positionRepository = positionRepository;
        this.learningRepository = learningRepository;
        this.auditRepository = auditRepository;
        this.auditService = auditService;
        this.tradingService = tradingService;
        this.catalog = catalog;
    }

    // ── Comptes ────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<UserRow> users(String search) {
        Map<Long, Object[]> orders = byUser(orderRepository.activityByUser());
        Map<Long, Object[]> positions = byUser(positionRepository.openPositionsByUser());
        Map<Long, Object[]> points = byUser(learningRepository.leaderboard(Pageable.unpaged()));
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return userRepository.findAll().stream()
                .filter(u -> q.isEmpty() || u.getEmail().toLowerCase(Locale.ROOT).contains(q)
                        || (u.getFullName() != null && u.getFullName().toLowerCase(Locale.ROOT).contains(q)))
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(u -> {
                    Object[] o = orders.get(u.getId());
                    Object[] p = positions.get(u.getId());
                    Object[] l = points.get(u.getId());
                    return new UserRow(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), u.isEnabled(),
                            u.getCashBalance(), o != null ? ((Number) o[1]).longValue() : 0,
                            o != null ? toDecimal(o[2]) : BigDecimal.ZERO, p != null ? ((Number) p[1]).longValue() : 0,
                            l != null ? ((Number) l[1]).intValue() : 0, u.getCreatedAt());
                })
                .toList();
    }

    @Transactional
    public UserRow updateUser(User admin, Long id, UserUpdate update) {
        User u = userRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Utilisateur introuvable : " + id));
        if (u.getId().equals(admin.getId())
                && (update.enabled() != null && !update.enabled() || update.role() != null && update.role() != Role.ROLE_ADMIN)) {
            throw new IllegalArgumentException("Un administrateur ne peut ni se désactiver ni retirer son propre rôle.");
        }
        List<String> changes = new ArrayList<>();
        if (update.role() != null && update.role() != u.getRole()) {
            changes.add("rôle " + u.getRole() + " → " + update.role());
            u.setRole(update.role());
        }
        if (update.enabled() != null && update.enabled() != u.isEnabled()) {
            changes.add(update.enabled() ? "compte réactivé" : "compte désactivé");
            u.setEnabled(update.enabled());
        }
        userRepository.save(u);
        if (!changes.isEmpty()) {
            auditService.record(admin, AuditAction.ADMIN_USER_UPDATED, true, u.getEmail() + " : " + String.join(", ", changes));
        }
        return users(u.getEmail()).stream().filter(r -> r.id().equals(id)).findFirst().orElseThrow();
    }

    @Transactional
    public void resetPortfolio(User admin, Long id) {
        User u = userRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Utilisateur introuvable : " + id));
        tradingService.resetAccount(u);
        auditService.record(admin, AuditAction.ADMIN_USER_UPDATED, true, u.getEmail() + " : portefeuille réinitialisé");
    }

    // ── Statistiques globales ──────────────────────────────────────

    @Transactional(readOnly = true)
    public PlatformStats stats() {
        List<User> all = userRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        long admins = all.stream().filter(u -> u.getRole() == Role.ROLE_ADMIN).count();
        long disabled = all.stream().filter(u -> !u.isEnabled()).count();
        long recent = all.stream().filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(now.minusDays(7))).count();

        long orders = 0;
        BigDecimal traded = BigDecimal.ZERO;
        for (Object[] r : orderRepository.activityByUser()) {
            orders += ((Number) r[1]).longValue();
            traded = traded.add(toDecimal(r[2]));
        }
        long openPositions = positionRepository.openPositionsByUser().stream().mapToLong(r -> ((Number) r[1]).longValue()).sum();

        List<AuditLog> logs = auditRepository.findByCreatedAtAfter(now.minusDays(30));
        Map<String, Long> byAction = new TreeMap<>(logs.stream()
                .collect(Collectors.groupingBy(a -> a.getAction().name(), Collectors.counting())));
        Map<LocalDate, Long> byDay = logs.stream()
                .collect(Collectors.groupingBy(a -> a.getCreatedAt().toLocalDate(), Collectors.counting()));
        List<DailyCount> activity = new ArrayList<>();
        for (int d = 29; d >= 0; d--) {
            LocalDate day = now.toLocalDate().minusDays(d);
            activity.add(new DailyCount(day.toString(), byDay.getOrDefault(day, 0L)));
        }

        List<LearningProgress> progress = learningRepository.findAll();
        long learners = progress.stream().map(LearningProgress::getUserId).distinct().count();
        return new PlatformStats(all.size(), admins, disabled, recent, orders, traded, openPositions,
                byAction.getOrDefault("LOGIN_SUCCESS", 0L), byAction.getOrDefault("LOGIN_FAILURE", 0L),
                byAction.getOrDefault("BACKTEST_RUN", 0L), byAction.getOrDefault("STRESS_TEST_RUN", 0L),
                learners, completed(progress, ItemType.LESSON), completed(progress, ItemType.QUIZ),
                completed(progress, ItemType.CHALLENGE), byAction, activity);
    }

    // ── Contenus pédagogiques ──────────────────────────────────────

    /** Fréquentation et réussite de chaque quiz, scénario et défi du catalogue. */
    @Transactional(readOnly = true)
    public List<ItemStats> learningStats() {
        Map<String, List<LearningProgress>> byItem = learningRepository.findAll().stream()
                .collect(Collectors.groupingBy(p -> p.getItemType() + ":" + p.getItemId()));
        List<ItemStats> out = new ArrayList<>();
        for (var m : catalog.catalog().modules()) {
            out.add(item(m.quiz().id(), m.title() + " · quiz", "QUIZ", byItem.get("QUIZ:" + m.quiz().id()), false));
        }
        for (var s : catalog.catalog().scenarios()) {
            out.add(item(s.id(), s.title(), "SCENARIO", byItem.get("SCENARIO:" + s.id()), true));
        }
        for (var c : catalog.catalog().challenges()) {
            out.add(item(c.id(), c.title(), "CHALLENGE", byItem.get("CHALLENGE:" + c.id()), false));
        }
        return out;
    }

    private static ItemStats item(String id, String title, String type, List<LearningProgress> rows, boolean answers) {
        List<LearningProgress> r = rows != null ? rows : List.of();
        Double avg = type.equals("QUIZ") ? r.stream().filter(p -> p.getScore() != null)
                .mapToDouble(LearningProgress::getScore).average().stream().boxed().findFirst().orElse(null) : null;
        Map<String, Long> dist = answers
                ? new TreeMap<>(r.stream().filter(p -> p.getDetail() != null)
                .collect(Collectors.groupingBy(LearningProgress::getDetail, Collectors.counting())))
                : null;
        // Pour un scénario, « réussi » signifie la meilleure décision (50 points)
        long completed = type.equals("SCENARIO")
                ? r.stream().filter(p -> p.getPoints() == 50).count()
                : r.stream().filter(LearningProgress::isCompleted).count();
        return new ItemStats(id, title, type, r.size(), r.stream().mapToLong(LearningProgress::getAttempts).sum(),
                completed, avg, dist);
    }

    // ── Utilitaires ────────────────────────────────────────────────

    private static long completed(List<LearningProgress> rows, ItemType type) {
        return rows.stream().filter(p -> p.getItemType() == type && p.isCompleted()).count();
    }

    private static Map<Long, Object[]> byUser(List<Object[]> rows) {
        Map<Long, Object[]> out = new HashMap<>();
        for (Object[] r : rows) out.put(((Number) r[0]).longValue(), r);
        return out;
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        return v instanceof BigDecimal b ? b : new BigDecimal(v.toString());
    }
}
