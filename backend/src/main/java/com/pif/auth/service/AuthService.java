package com.pif.auth.service;

import com.pif.audit.model.AuditAction;
import com.pif.audit.service.AuditService;
import com.pif.auth.dto.AuthRequest;
import com.pif.auth.dto.AuthResponse;
import com.pif.auth.dto.RegisterRequest;
import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.auth.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Service métier gérant les opérations d'authentification et d'enregistrement des utilisateurs.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuthenticationManager authenticationManager,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.auditService = auditService;
    }

    /**
     * Authentifie un utilisateur via l'AuthenticationManager et émet un JWT.
     * Accepte indifféremment l'adresse email ou le pseudonyme du trader.
     */
    public AuthResponse login(AuthRequest request) {
        String identifier = request.getEmail() != null ? request.getEmail().trim() : "";
        log.info("Tentative de connexion pour l'identifiant : {}", identifier);

        User user = userRepository.findByEmail(identifier.toLowerCase(java.util.Locale.ROOT))
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new BadCredentialsException("Identifiants de connexion invalides."));

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getEmail(),
                            request.getPassword()
                    )
            );
        } catch (AuthenticationException e) {
            auditService.record(null, user.getEmail(), AuditAction.LOGIN_FAILURE, false, e.getClass().getSimpleName());
            throw e;
        }

        String token = jwtService.generateToken(user);
        log.info("Connexion réussie pour le trader : {} [Niveau : {}, Rôle : {}]",
                user.getUsernameAlias(), user.getLevel(), user.getRole());
        auditService.record(user, AuditAction.LOGIN_SUCCESS, true, null);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .id(user.getId())
                .email(user.getEmail())
                .username(user.getUsernameAlias())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .level(user.getLevel())
                .exp(user.getExp())
                .eloRating(user.getEloRating())
                .tier(user.getTier())
                .profileImageUrl(user.getProfileImageUrl())
                .customBackgroundUrl(user.getCustomBackgroundUrl())
                .virtualBalance(user.getVirtualBalance())
                .build();
    }

    /**
     * Enregistre un nouvel utilisateur trader avec pseudonyme unique et statistiques isolées.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        log.info("Demande de création de compte trader pour : {}", email);

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Un compte avec cette adresse email existe déjà.");
        }

        String username = request.getUsername() != null ? request.getUsername().trim() : null;
        if (username != null && !username.isBlank()) {
            if (userRepository.existsByUsername(username)) {
                throw new IllegalArgumentException("Le pseudonyme '" + username + "' est déjà pris par un autre trader.");
            }
        } else {
            String candidate = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "");
            if (candidate.isBlank()) candidate = "trader";
            username = candidate;
            int counter = 1;
            while (userRepository.existsByUsername(username)) {
                username = candidate + "_" + counter++;
            }
        }

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setUsername(username);
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setFullName(request.getFullName() != null ? request.getFullName().trim() : username);
        newUser.setRole(Role.ROLE_TRADER);
        newUser.setLevel(1);
        newUser.setExp(0);
        newUser.setEloRating(1000);
        newUser.setTier("BRONZE");
        newUser.setTotalMatches(0);
        newUser.setWins(0);
        newUser.setVirtualBalance(new BigDecimal("100000.00"));
        newUser.setCashBalance(new BigDecimal("100000.000"));
        newUser.setThemeAccentColor("#10b981");
        newUser.setThemeSecondaryColor("#06b6d4");
        newUser.setThemeMode("AUTOMATIC");
        newUser.setBackgroundDarkness(60);
        newUser.setBackgroundBlur(0);
        newUser.setBackgroundPosition("center");

        User savedUser = userRepository.save(newUser);
        log.info("Nouveau trader enregistré avec succès : id={}, username={}, email={}",
                savedUser.getId(), savedUser.getUsernameAlias(), savedUser.getEmail());

        String token = jwtService.generateToken(savedUser);
        auditService.record(savedUser, AuditAction.REGISTER, true, null);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .id(savedUser.getId())
                .email(savedUser.getEmail())
                .username(savedUser.getUsernameAlias())
                .role(savedUser.getRole().name())
                .fullName(savedUser.getFullName())
                .level(savedUser.getLevel())
                .exp(savedUser.getExp())
                .eloRating(savedUser.getEloRating())
                .tier(savedUser.getTier())
                .profileImageUrl(savedUser.getProfileImageUrl())
                .customBackgroundUrl(savedUser.getCustomBackgroundUrl())
                .virtualBalance(savedUser.getVirtualBalance())
                .build();
    }

    /**
     * Les emails sont stockés et comparés en minuscules, sans espaces.
     */
    static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
