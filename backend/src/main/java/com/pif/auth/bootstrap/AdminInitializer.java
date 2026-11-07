package com.pif.auth.bootstrap;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Initialisation automatique et sécurisée du compte Administrateur et des comptes de test
 * au démarrage de l'application Spring Boot (idempotent, sans violation de contrainte unique).
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
        initAdminAccount();
        initAdemTestAccount();
    }

    private void initAdminAccount() {
        String targetEmail = (adminEmail != null && !adminEmail.isBlank())
                ? adminEmail.trim().toLowerCase()
                : "admin@gmail.com";
        String targetPass = (adminPassword != null && adminPassword.length() >= 12)
                ? adminPassword
                : "Admin2026!Secure";

        Optional<User> existing = userRepository.findByEmail(targetEmail)
                .or(() -> userRepository.findByUsername("admin"));

        User admin;
        if (existing.isPresent()) {
            admin = existing.get();
            admin.setRole(Role.ROLE_ADMIN);
            if (admin.getPassword() == null || admin.getPassword().isBlank()) {
                admin.setPassword(passwordEncoder.encode(targetPass));
            }
            log.info("Compte Administrateur [{}] mis à jour avec le rôle ROLE_ADMIN.", admin.getEmail());
        } else {
            admin = new User();
            admin.setUsername("admin");
            admin.setEmail(targetEmail);
            admin.setPassword(passwordEncoder.encode(targetPass));
            admin.setFullName("System Administrator");
            admin.setRole(Role.ROLE_ADMIN);
            admin.setCashBalance(new BigDecimal("100000.000"));
            admin.setBlockedCash(new BigDecimal("0.000"));
            log.info("Création d'un nouveau compte Administrateur initial [{}].", targetEmail);
        }
        userRepository.save(admin);
    }

    private void initAdemTestAccount() {
        String ademEmail = "adem@gmail.com";
        String ademPass = "Adem2026!";

        Optional<User> existing = userRepository.findByEmail(ademEmail)
                .or(() -> userRepository.findByUsername("adem"));

        User adem;
        if (existing.isPresent()) {
            adem = existing.get();
        } else {
            adem = new User();
            adem.setEmail(ademEmail);
            adem.setUsername("adem");
        }

        adem.setPassword(passwordEncoder.encode(ademPass));
        adem.setFullName("Adem Pro Trader");
        adem.setRole(Role.ROLE_TRADER);
        if (adem.getLevel() == null || adem.getLevel() < 25) {
            adem.setLevel(25);
        }
        if (adem.getExp() == null || adem.getExp() < 15000) {
            adem.setExp(15000);
        }
        if (adem.getEloRating() == null || adem.getEloRating() < 1950) {
            adem.setEloRating(1950);
        }
        adem.setTier("DIAMOND");
        if (adem.getCashBalance() == null) {
            adem.setCashBalance(new BigDecimal("250000.000"));
        }
        adem.setVirtualBalance(adem.getCashBalance());
        if (adem.getBackgroundDarkness() == null) {
            adem.setBackgroundDarkness(60);
        }
        if (adem.getBackgroundBlur() == null) {
            adem.setBackgroundBlur(0);
        }
        if (adem.getBackgroundPosition() == null) {
            adem.setBackgroundPosition("center");
        }
        if (adem.getThemeMode() == null) {
            adem.setThemeMode("AUTOMATIC");
        }
        if (adem.getThemeAccentColor() == null) {
            adem.setThemeAccentColor("#10b981");
        }

        userRepository.save(adem);
        log.info("Compte de test Gamifié [adem@gmail.com] synchronisé : Mot de passe 'Adem2026!', Niveau 25 (Diamond), ELO 1950.");
    }
}