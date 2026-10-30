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
     */
    public AuthResponse login(AuthRequest request) {
        String email = normalizeEmail(request.getEmail());
        log.info("Tentative de connexion pour l'email : {}", email);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            request.getPassword()
                    )
            );
        } catch (AuthenticationException e) {
            auditService.record(null, email, AuditAction.LOGIN_FAILURE, false, e.getClass().getSimpleName());
            throw e;
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Identifiants de connexion invalides."));

        String token = jwtService.generateToken(user);
        log.info("Connexion réussie pour l'utilisateur : {} [Rôle : {}]", user.getEmail(), user.getRole());
        auditService.record(user, AuditAction.LOGIN_SUCCESS, true, null);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .virtualBalance(user.getVirtualBalance())
                .build();
    }

    /**
     * Enregistre un nouvel utilisateur avec le rôle par défaut ROLE_TRADER et un solde initial de 100 000 TND.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        log.info("Demande de création de compte trader pour : {}", email);

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Un compte avec cette adresse email existe déjà.");
        }

        User newUser = new User();
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setFullName(request.getFullName() != null ? request.getFullName().trim() : "");
        newUser.setRole(Role.ROLE_TRADER);
        newUser.setVirtualBalance(new BigDecimal("100000.00"));

        User savedUser = userRepository.save(newUser);
        log.info("Nouveau trader enregistré avec succès : id={}, email={}", savedUser.getId(), savedUser.getEmail());

        String token = jwtService.generateToken(savedUser);
        auditService.record(savedUser, AuditAction.REGISTER, true, null);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .email(savedUser.getEmail())
                .role(savedUser.getRole().name())
                .fullName(savedUser.getFullName())
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
