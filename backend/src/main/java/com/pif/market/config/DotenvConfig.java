package com.pif.market.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;

/**
 * Configuration et chargement automatisé des variables d'environnement (.env).
 * Injecte les clés de sécurité, paramètres de base de données et identifiants admin
 * dans les propriétés système de la JVM avant la configuration de Spring Boot.
 */
@Configuration
public class DotenvConfig {

    private static final Logger log = LoggerFactory.getLogger(DotenvConfig.class);

    static {
        loadDotenv();
    }

    public static Dotenv loadDotenv() {
        Dotenv dotenv = null;
        try {
            // Recherche du fichier .env dans le répertoire courant, backend/, ou racine parent
            if (new File(".env").exists()) {
                dotenv = Dotenv.configure().ignoreIfMissing().load();
            } else if (new File("backend/.env").exists()) {
                dotenv = Dotenv.configure().directory("backend").ignoreIfMissing().load();
            } else if (new File("../.env").exists()) {
                dotenv = Dotenv.configure().directory("../").ignoreIfMissing().load();
            } else {
                dotenv = Dotenv.configure().ignoreIfMissing().load();
            }

            dotenv.entries().forEach(entry -> {
                if (System.getProperty(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue());
                }
            });
            log.info("Chargement sécurisé des variables d'environnement (.env) initialisé.");
        } catch (Exception e) {
            log.warn("Fichier .env non détecté ou erreur de chargement : {}", e.getMessage());
        }
        return dotenv;
    }

    @Bean
    public Dotenv dotenv() {
        return loadDotenv();
    }
}
