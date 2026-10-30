package com.pif.actuarial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.ai.config.AiServiceProperties;
import com.pif.common.exception.AiServiceUnavailableException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Client du module d'actuariat du service IA (ai/actuarial/api.py). Les calculs et la validation des
 * paramètres sont faits côté Python ; une erreur 4xx y est renvoyée en 400 avec son message.
 */
@Component
public class ActuarialAiClient {

    private final RestTemplate restTemplate;
    private final AiServiceProperties properties;
    private final ObjectMapper objectMapper;

    public ActuarialAiClient(RestTemplateBuilder builder, AiServiceProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(120))
                .build();
    }

    public JsonNode get(String path) {
        try {
            return restTemplate.getForObject(url(path), JsonNode.class);
        } catch (RestClientException e) {
            throw unavailable(e);
        }
    }

    public JsonNode post(String path, JsonNode body) {
        try {
            return restTemplate.postForObject(url(path), body, JsonNode.class);
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException(detail(e));
        } catch (RestClientException e) {
            throw unavailable(e);
        }
    }

    /** Message lisible à partir de la réponse FastAPI ({"detail": "..."} ou liste d'erreurs de validation). */
    private String detail(HttpClientErrorException e) {
        try {
            JsonNode d = objectMapper.readTree(e.getResponseBodyAsString()).path("detail");
            if (d.isTextual()) return d.asText();
            if (d.isArray() && !d.isEmpty()) {
                JsonNode first = d.get(0);
                JsonNode loc = first.path("loc");
                String field = loc.isArray() && !loc.isEmpty() ? loc.get(loc.size() - 1).asText() : "?";
                return "Paramètre « " + field + " » invalide : " + first.path("msg").asText();
            }
        } catch (Exception ignored) {
            // corps non JSON : message générique ci-dessous
        }
        return "Paramètres refusés par le module d'actuariat.";
    }

    private String url(String path) {
        return properties.getBaseUrl() + "/api/ai/actuarial" + path;
    }

    private AiServiceUnavailableException unavailable(RestClientException e) {
        return new AiServiceUnavailableException(
                "Service IA d'actuariat indisponible (" + properties.getBaseUrl() + "). Lancez `py ai_server.py` dans ai/.", e);
    }
}
