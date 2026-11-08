package com.pif.actuarial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.actuarial.dto.ActuarialRequest;
import com.pif.marketdata.dto.CandleDto;
import com.pif.marketdata.service.LocalCsvMarketDataService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Actuariat appliqué aux actifs de la Bourse (non assurables : ni primes ni sinistres) : risque (volatilité, VaR,
 * Expected Shortfall, drawdown maximal) et prévision (volatilité, Monte-Carlo) sur l'historique journalier local.
 */
@Service
public class ActuarialService {

    static final int MIN_DAYS = 60;

    private final LocalCsvMarketDataService marketData;
    private final ActuarialAiClient aiClient;

    public ActuarialService(LocalCsvMarketDataService marketData, ActuarialAiClient aiClient) {
        this.marketData = marketData;
        this.aiClient = aiClient;
    }

    public JsonNode analyze(ActuarialRequest req) {
        String symbol = req.symbol().trim().toUpperCase(Locale.ROOT);
        String start = req.startDate() != null ? req.startDate() : "0000-01-01";
        String end = req.endDate() != null ? req.endDate() : "9999-12-31";
        if (start.compareTo(end) > 0) {
            throw new IllegalArgumentException("La date de début doit précéder la date de fin.");
        }

        List<String> dates = new ArrayList<>();
        List<Double> closes = new ArrayList<>();
        String last = "";
        for (CandleDto c : marketData.getCandles(symbol, "1d", "ALL", 0)) {
            if (c.time() == null || c.time().length() < 10 || c.close() <= 0) continue;
            String date = c.time().substring(0, 10);
            if (date.compareTo(last) <= 0) continue;               // ordre strict, sans doublon
            last = date;
            if (date.compareTo(start) < 0 || date.compareTo(end) > 0) continue;
            dates.add(date);
            closes.add(c.close());
        }
        if (dates.isEmpty()) {
            throw new IllegalArgumentException("Aucun historique journalier pour " + symbol + " sur cette période.");
        }
        if (dates.size() < MIN_DAYS) {
            throw new IllegalArgumentException("Période trop courte : au moins " + MIN_DAYS + " séances sont nécessaires ("
                    + dates.size() + " disponibles).");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("symbol", symbol);
        body.put("dates", dates);
        body.put("closes", closes);
        putIfPresent(body, "confidence", req.confidence());
        putIfPresent(body, "horizon_days", req.horizonDays());
        putIfPresent(body, "forecast_days", req.forecastDays());
        putIfPresent(body, "simulations", req.simulations());
        putIfPresent(body, "volatility_model", req.volatilityModel());
        putIfPresent(body, "distribution", req.distribution());
        putIfPresent(body, "drift", req.drift());
        return aiClient.analyze(body);
    }

    private static void putIfPresent(Map<String, Object> body, String key, Object value) {
        if (value != null) body.put(key, value);
    }
}
