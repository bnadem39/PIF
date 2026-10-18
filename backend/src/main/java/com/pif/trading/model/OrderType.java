package com.pif.trading.model;

/**
 * Type d'ordre financier : Exécution standard ou gestion avancée du risque.
 */
public enum OrderType {
    BUY,
    SELL,
    LIMIT,
    MARKET,
    STOP_LOSS,
    TAKE_PROFIT,
    OCO
}
