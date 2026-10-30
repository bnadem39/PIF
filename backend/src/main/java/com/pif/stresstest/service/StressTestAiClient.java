package com.pif.stresstest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.ai.config.AiServiceProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

/**
 * Client HTTP du service IA de stress testing (FastAPI, ai/stress/api.py).
 * Délai de lecture long : le premier appel peut entraîner les modèles (environ une minute).
 */
@Component
public class StressTestAiClient {

    private final RestTemplate restTemplate;
    private final AiServiceProperties properties;

    public StressTestAiClient(RestTemplateBuilder builder, AiServiceProperties properties) {
        this.properties = properties;
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(180))
                .build();
    }

    public JsonNode get(String path) {
        try {
            return restTemplate.getForObject(url(path), JsonNode.class);
        } catch (RestClientException e) {
            throw unavailable(e);
        }
    }

    public JsonNode post(String path, Map<String, Object> body) {
        try {
            return restTemplate.postForObject(url(path), body, JsonNode.class);
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Requête de stress test refusée par le service IA : " + e.getResponseBodyAsString());
        } catch (RestClientException e) {
            throw unavailable(e);
        }
    }

    private String url(String path) {
        return properties.getBaseUrl() + "/api/ai/stress" + path;
    }

    private AiServiceUnavailableException unavailable(RestClientException e) {
        return new AiServiceUnavailableException(
                "Service IA de stress testing indisponible (" + properties.getBaseUrl() + "). Lancez `py ai_server.py` dans ai/.", e);
    }
}
