package com.pif.audit.model;

/**
 * Opérations tracées dans le journal d'audit.
 */
public enum AuditAction {
    LOGIN_SUCCESS,
    LOGIN_FAILURE,
    REGISTER,
    ORDER_EXECUTED,
    RISK_ORDER_TRIGGERED,
    RISK_THRESHOLDS_UPDATED,
    ACCOUNT_RESET
}
