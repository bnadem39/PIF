package com.pif.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO pour l'inscription d'un nouvel utilisateur (trader).
 */
public class RegisterRequest {

    @NotBlank(message = "L'adresse email est requise")
    @Email(message = "Format d'adresse email invalide")
    private String email;

    @NotBlank(message = "Le mot de passe est requis")
    @Size(min = 6, message = "Le mot de passe doit comporter au moins 6 caractères")
    private String password;

    private String fullName;

    @Size(min = 3, max = 30, message = "Le pseudonyme doit comporter entre 3 et 30 caractères")
    private String username;

    public RegisterRequest() {
    }

    public RegisterRequest(String email, String password, String fullName) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
    }

    public RegisterRequest(String email, String password, String fullName, String username) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
