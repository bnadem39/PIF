package com.pif.market.bootstrap;

import com.pif.market.model.Role;
import com.pif.market.model.User;
import com.pif.market.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Initialisation automatique du compte Administrateur par défaut (Data Seeding)
 * au démarrage de l'application Spring Boot.
 */
@Component
public class AdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${application.security.admin.email:${DEFAULT_ADMIN_EMAIL:}}")
    private String adminEmail;

    @Value("${application.security.admin.password:${DEFAULT_ADMIN_PASSWORD:}}")
    private String adminPassword;

    public AdminInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (adminEmail == null || adminEmail.isBlank() || adminPassword == null || adminPassword.isBlank()) {
            log.warn("DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD non définis : aucun compte administrateur créé au démarrage.");
            return;
        }
        if (adminPassword.length() < 12) {
            log.warn("DEFAULT_ADMIN_PASSWORD trop court (12 caractères minimum) : compte administrateur non créé.");
            return;
        }
        adminEmail = adminEmail.trim().toLowerCase();

        log.info("Vérification de l'existence du compte Administrateur initial [{}]...", adminEmail);

        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setFullName("System Administrator");
            admin.setRole(Role.ROLE_ADMIN);
            admin.setCashBalance(new BigDecimal("100000.000"));
            admin.setBlockedCash(new BigDecimal("0.000"));

            userRepository.save(admin);
            log.info("====================================================================");
            log.info(" [SUCCESS] Compte Administrateur initial créé avec succès !");
            log.info(" Email : {}", adminEmail);
            log.info(" Rôle  : ROLE_ADMIN");
            log.info(" Solde Virtuel : 100 000.000 TND");
            log.info(" Mot de passe chiffré via BCrypt (stockage sécurisé en base)");
            log.info("====================================================================");
        } else {
            log.info("Compte Administrateur [{}] déjà existant en base de données. Aucune action requise.", adminEmail);
        }
    }
}
