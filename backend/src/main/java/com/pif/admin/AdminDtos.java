package com.pif.admin;

import com.pif.auth.model.Role;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Vues de la console d'administration (cahier §5). */
public final class AdminDtos {

    private AdminDtos() {
    }

    public record UserRow(Long id, String email, String fullName, Role role, boolean enabled, BigDecimal cashBalance,
                          long orders, BigDecimal tradedAmount, long openPositions, int learningPoints,
                          LocalDateTime createdAt) {
    }

    /** Champs absents = inchangés. */
    public record UserUpdate(Role role, Boolean enabled) {
    }

    public record DailyCount(String date, long count) {
    }

    public record PlatformStats(long users, long admins, long disabledUsers, long newUsers7d,
                                long orders, BigDecimal tradedAmount, long openPositions,
                                long logins30d, long loginFailures30d, long backtests30d, long stressTests30d,
                                long learners, long lessonsCompleted, long quizzesPassed, long challengesCompleted,
                                Map<String, Long> actions30d, List<DailyCount> activity30d) {
    }

    public record ItemStats(String id, String title, String type, long learners, long attempts, long completed,
                            Double averageScore, Map<String, Long> answers) {
    }
}
