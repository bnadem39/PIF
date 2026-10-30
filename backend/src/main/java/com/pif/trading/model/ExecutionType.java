package com.pif.trading.model;

/**
 * Mode d'exécution d'un ordre, indépendant du sens (BUY/SELL).
 * MARKET : exécution immédiate au cours serveur de la date simulée.
 * LIMIT  : exécution uniquement si le cours serveur respecte la limite (achat <= limite, vente >= limite).
 */
public enum ExecutionType {
    MARKET,
    LIMIT
}
