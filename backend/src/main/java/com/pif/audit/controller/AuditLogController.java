package com.pif.audit.controller;

import com.pif.audit.dto.AuditLogDto;
import com.pif.audit.model.AuditAction;
import com.pif.audit.repository.AuditLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultation du journal d'audit, réservée aux administrateurs
 * (règle /api/v1/admin/** dans SecurityConfig).
 * GET /api/v1/admin/audit-logs?page=0&size=50&userId=3&action=LOGIN_FAILURE
 */
@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AuditLogController {

    private final AuditLogRepository repository;

    public AuditLogController(AuditLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<Page<AuditLogDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) AuditAction action) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLogDto> result;
        if (userId != null) {
            result = repository.findByUserId(userId, pageable).map(AuditLogDto::from);
        } else if (action != null) {
            result = repository.findByAction(action, pageable).map(AuditLogDto::from);
        } else {
            result = repository.findAll(pageable).map(AuditLogDto::from);
        }
        return ResponseEntity.ok(result);
    }
}
