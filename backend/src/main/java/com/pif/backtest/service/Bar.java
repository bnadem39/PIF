package com.pif.backtest.service;

/** Chandelier journalier utilisé par le moteur (prix d'ouverture pour exécuter, clôture pour valoriser). */
public record Bar(String date, double open, double high, double low, double close, double volume) {

    public Bar(String date, double open, double high, double low, double close) {
        this(date, open, high, low, close, 0);
    }
}
