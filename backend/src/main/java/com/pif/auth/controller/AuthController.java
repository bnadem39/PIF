package com.pif.auth.controller;

import com.pif.auth.dto.AuthRequest;
import com.pif.auth.dto.AuthResponse;
import com.pif.auth.dto.RegisterRequest;
import com.pif.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import com.pif.auth.model.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

/**
 * Contrôleur REST pour l'authentification et l'inscription des utilisateurs.
 * Expose les endpoints publics et privés sous /api/v1/auth et /api/auth.
 */
@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Authentification utilisateur (Login).
     * POST /api/v1/auth/login ou /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Inscription d'un nouvel utilisateur (Register).
     * POST /api/v1/auth/register ou /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Récupère le profil du trader actuellement authentifié.
     * GET /api/v1/auth/me ou /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getAuthMe(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", HttpStatus.UNAUTHORIZED.value(),
                    "message", "Aucun utilisateur authentifié."
            ));
        }

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("id", user.getId());
        data.put("email", user.getEmail());
        data.put("username", user.getUsernameAlias());
        data.put("fullName", user.getFullName());
        data.put("role", user.getRole().name());
        data.put("level", user.getLevel());
        data.put("exp", user.getExp());
        data.put("eloRating", user.getEloRating());
        data.put("tier", user.getTier());
        data.put("wins", user.getWins());
        data.put("totalMatches", user.getTotalMatches());
        data.put("profileImageUrl", user.getProfileImageUrl());
        data.put("customBackgroundUrl", user.getCustomBackgroundUrl());
        data.put("backgroundDarkness", user.getBackgroundDarkness());
        data.put("backgroundBlur", user.getBackgroundBlur());
        data.put("backgroundPosition", user.getBackgroundPosition());
        data.put("themeMode", user.getThemeMode());
        data.put("themeAccentColor", user.getThemeAccentColor());
        data.put("themeSecondaryColor", user.getThemeSecondaryColor());
        data.put("virtualBalance", user.getVirtualBalance());
        data.put("cashBalance", user.getCashBalance());
        return ResponseEntity.ok(data);
    }

    /**
     * Déconnexion sécurisée (invalidation côté client).
     * POST /api/v1/auth/logout ou /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Déconnexion réussie."
        ));
    }

    /**
     * Gestionnaire d'exception pour identifiants invalides (401).
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", HttpStatus.UNAUTHORIZED.value(),
                "error", "Unauthorized",
                "message", "Identifiants invalides. Veuillez vérifier votre adresse email et mot de passe."
        ));
    }

    /**
     * Compte désactivé par un administrateur (403).
     */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<Map<String, Object>> handleDisabled(DisabledException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "status", HttpStatus.FORBIDDEN.value(),
                "error", "Forbidden",
                "message", "Ce compte a été désactivé par un administrateur."
        ));
    }

    /**
     * Gestionnaire d'exception pour conflits et arguments invalides (400).
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "status", HttpStatus.BAD_REQUEST.value(),
                "error", "Bad Request",
                "message", ex.getMessage()
        ));
    }
}
