package com.pif.audit.service;

import com.pif.audit.model.AuditAction;
import com.pif.audit.model.AuditLog;
import com.pif.audit.repository.AuditLogRepository;
import com.pif.auth.model.User;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Écrit le journal d'audit dans sa propre transaction (REQUIRES_NEW) :
 * un échec de connexion est tracé même si la requête échoue,
 * et une erreur d'écriture du journal ne fait jamais échouer l'opération métier.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);
    private static final int MAX_DETAILS = 2000;

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(User user, AuditAction action, boolean success, String details) {
        record(user != null ? user.getId() : null, user != null ? user.getEmail() : null, action, success, details);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long userId, String email, AuditAction action, boolean success, String details) {
        try {
            String trimmed = details != null && details.length() > MAX_DETAILS ? details.substring(0, MAX_DETAILS) : details;
            repository.save(new AuditLog(userId, email, action, success, trimmed, currentIp()));
        } catch (Exception e) {
            log.error("Échec d'écriture du journal d'audit ({}) : {}", action, e.getMessage());
        }
    }

    private static String currentIp() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        return request.getRemoteAddr();
    }
}
