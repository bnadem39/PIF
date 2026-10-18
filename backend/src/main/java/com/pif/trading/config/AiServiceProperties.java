package com.pif.trading.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "ai.service")
public class AiServiceProperties {

    private String baseUrl = "http://localhost:8000";
    private int predictTimeoutSeconds = 5;
    private int analyzeTimeoutSeconds = 35;
    private int cacheTtlMinutes = 30;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getPredictTimeoutSeconds() {
        return predictTimeoutSeconds;
    }

    public void setPredictTimeoutSeconds(int predictTimeoutSeconds) {
        this.predictTimeoutSeconds = predictTimeoutSeconds;
    }

    public int getAnalyzeTimeoutSeconds() {
        return analyzeTimeoutSeconds;
    }

    public void setAnalyzeTimeoutSeconds(int analyzeTimeoutSeconds) {
        this.analyzeTimeoutSeconds = analyzeTimeoutSeconds;
    }

    public int getCacheTtlMinutes() {
        return cacheTtlMinutes;
    }

    public void setCacheTtlMinutes(int cacheTtlMinutes) {
        this.cacheTtlMinutes = cacheTtlMinutes;
    }
}
