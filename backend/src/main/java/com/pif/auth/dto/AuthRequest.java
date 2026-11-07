package com.pif.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO pour la requête d'authentification (connexion par email ou pseudonyme).
 */
public class AuthRequest {

    private String email;
    private String identifier;
    private String username;

    @NotBlank(message = "Le mot de passe est requis")
    private String password;

    public AuthRequest() {
    }

    public AuthRequest(String email, String password) {
        this.email = email;
        this.identifier = email;
        this.password = password;
    }

    public String getEmail() {
        return getEffectiveIdentifier();
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getIdentifier() {
        return getEffectiveIdentifier();
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEffectiveIdentifier() {
        if (identifier != null && !identifier.isBlank()) return identifier.trim();
        if (username != null && !username.isBlank()) return username.trim();
        if (email != null && !email.isBlank()) return email.trim();
        return "";
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
