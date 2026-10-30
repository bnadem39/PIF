package com.pif.audit.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * Entrée du journal d'audit. Volontairement sans relation JPA vers User :
 * l'email est copié pour que la trace reste lisible même si le compte est supprimé.
 */
@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_email", length = 150)
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuditAction action;

    @Column(nullable = false)
    private boolean success;

    @Column(length = 2000)
    private String details;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected AuditLog() {
    }

    public AuditLog(Long userId, String userEmail, AuditAction action, boolean success, String details, String ipAddress) {
        this.userId = userId;
        this.userEmail = userEmail;
        this.action = action;
        this.success = success;
        this.details = details;
        this.ipAddress = ipAddress;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public AuditAction getAction() {
        return action;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getDetails() {
        return details;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
