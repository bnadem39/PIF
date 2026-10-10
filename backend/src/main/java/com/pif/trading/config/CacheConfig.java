package com.pif.trading.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    private final AlphaVantageProperties properties;

    public CacheConfig(AlphaVantageProperties properties) {
        this.properties = properties;
    }

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("alphaVantageHistory", "alphaVantageQuotes");
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(properties.getCacheTtlMinutes(), TimeUnit.MINUTES)
                .maximumSize(500)
                .recordStats());
        return cacheManager;
    }
}
