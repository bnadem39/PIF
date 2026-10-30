package com.pif.auth.dto;

import java.math.BigDecimal;

/**
 * DTO de réponse après authentification ou inscription réussie.
 */
public class AuthResponse {

    private String token;
    private String type = "Bearer";
    private String email;
    private String role;
    private String fullName;
    private BigDecimal virtualBalance;

    public AuthResponse() {
    }

    public AuthResponse(String token, String type, String email, String role, String fullName, BigDecimal virtualBalance) {
        this.token = token;
        this.type = type != null ? type : "Bearer";
        this.email = email;
        this.role = role;
        this.fullName = fullName;
        this.virtualBalance = virtualBalance;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String token;
        private String type = "Bearer";
        private String email;
        private String role;
        private String fullName;
        private BigDecimal virtualBalance;

        public Builder token(String token) {
            this.token = token;
            return this;
        }

        public Builder type(String type) {
            this.type = type;
            return this;
        }

        public Builder email(String email) {
            this.email = email;
            return this;
        }

        public Builder role(String role) {
            this.role = role;
            return this;
        }

        public Builder fullName(String fullName) {
            this.fullName = fullName;
            return this;
        }

        public Builder virtualBalance(BigDecimal virtualBalance) {
            this.virtualBalance = virtualBalance;
            return this;
        }

        public AuthResponse build() {
            return new AuthResponse(token, type, email, role, fullName, virtualBalance);
        }
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public BigDecimal getVirtualBalance() {
        return virtualBalance;
    }

    public void setVirtualBalance(BigDecimal virtualBalance) {
        this.virtualBalance = virtualBalance;
    }
}
