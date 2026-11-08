package com.pif.actuarial.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.ai.config.AiServiceProperties;
import com.pif.common.exception.AiServiceUnavailableException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;

/**
 * Client du module d'actuariat du service IA (ai/actuarial/api.py). Les calculs sont faits côté Python.
 */
@Component
public class ActuarialAiClient {

    private final RestTemplate restTemplate;
    private final AiServiceProperties properties;

    public ActuarialAiClient(RestTemplateBuilder builder, AiServiceProperties properties) {
        this.properties = properties;
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(3))
                .setReadTimeout(Duration.ofSeconds(60))
                .build();
    }

    public JsonNode analyze(Map<String, Object> body) {
        try {
            return restTemplate.postForObject(properties.getBaseUrl() + "/api/ai/actuarial/analyze", body, JsonNode.class);
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Analyse actuarielle refusée par le service IA : " + e.getResponseBodyAsString(), e);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException(
                    "Service IA d'actuariat indisponible (" + properties.getBaseUrl() + "). Lancez `py ai_server.py` dans ai/.", e);
        }
    }
}
