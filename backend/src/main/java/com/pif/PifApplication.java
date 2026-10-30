package com.pif;

import com.pif.common.config.DotenvConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Point d'entrée du simulateur PIF.
 * Un package par module sous com.pif : auth, marketdata, trading, ai, common.
 * Le scan des composants, entités et repositories part de ce package racine.
 */
@SpringBootApplication
@EnableCaching
@ConfigurationPropertiesScan
public class PifApplication {

    public static void main(String[] args) {
        DotenvConfig.loadDotenv();
        SpringApplication.run(PifApplication.class, args);
    }
}
