package com.pif.auth.model;

/**
 * Enumération des rôles d'utilisateurs pour le contrôle d'accès basé sur les rôles (RBAC).
 */
public enum Role {
    ROLE_ADMIN,
    ROLE_TRADER,
    ROLE_AGENT,
    ROLE_USER;

    public boolean canCreateRoom() {
        return this == ROLE_ADMIN || this == ROLE_AGENT;
    }
}
