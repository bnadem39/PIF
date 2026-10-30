package com.pif.backtest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.ai.config.AiServiceProperties;
import com.pif.common.exception.AiServiceUnavailableException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Récupère les probabilités historiques du modèle XGBoost (ai/backtest_signals.py).
 */
@Component
public class AiSignalClient {

    /** Probabilités par date (yyyy-MM-dd) et date de début de la période de validation du modèle. */
    public record AiSignals(Map<String, double[]> byDate, String validationStartDate) {
    }

    private final RestTemplate restTemplate;
    private final AiServiceProperties properties;

    public AiSignalClient(RestTemplateBuilder builder, AiServiceProperties properties) {
        this.properties = properties;
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(60))
                .build();
    }

    public AiSignals fetch(String symbol, List<Bar> bars) {
        List<Map<String, Object>> candles = bars.stream().map(b -> Map.<String, Object>of(
                "time", b.date(), "open", b.open(), "high", b.high(), "low", b.low(), "close", b.close())).toList();
        JsonNode body;
        try {
            body = restTemplate.postForObject(properties.getBaseUrl() + "/api/ai/backtest/signals",
                    Map.of("ticker", symbol, "candles", candles), JsonNode.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Service IA indisponible pour le signal XGBoost (" + properties.getBaseUrl() + ").", e);
        }
        Map<String, double[]> byDate = new HashMap<>();
        for (JsonNode s : body.path("signals")) {
            byDate.put(s.path("date").asText(), new double[]{s.path("p_buy").asDouble(), s.path("p_sell").asDouble()});
        }
        JsonNode start = body.path("validation_start_date");
        return new AiSignals(byDate, start.isTextual() ? start.asText() : null);
    }
}
