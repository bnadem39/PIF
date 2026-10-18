package com.pif.trading;

import com.pif.market.config.DotenvConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = {"com.pif.trading", "com.pif.market"})
@EnableJpaRepositories(basePackages = {"com.pif.market.repository", "com.pif.trading.repository"})
@EntityScan(basePackages = {"com.pif.market.model", "com.pif.trading.model"})
@EnableCaching
@ConfigurationPropertiesScan
public class TradingSimulatorApplication {

    static {
        DotenvConfig.loadDotenv();
    }

    public static void main(String[] args) {
        DotenvConfig.loadDotenv();
        SpringApplication.run(TradingSimulatorApplication.class, args);
    }
}

