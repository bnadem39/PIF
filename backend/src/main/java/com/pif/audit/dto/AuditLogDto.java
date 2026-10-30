package com.pif.audit.dto;

import com.pif.audit.model.AuditLog;

import java.time.LocalDateTime;

public record AuditLogDto(
        Long id,
        Long userId,
        String userEmail,
        String action,
        boolean success,
        String details,
        String ipAddress,
        LocalDateTime createdAt
) {
    public static AuditLogDto from(AuditLog log) {
        return new AuditLogDto(log.getId(), log.getUserId(), log.getUserEmail(), log.getAction().name(),
                log.isSuccess(), log.getDetails(), log.getIpAddress(), log.getCreatedAt());
    }
}
