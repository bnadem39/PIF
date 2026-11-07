package com.pif.auth.dto;

import java.math.BigDecimal;

/**
 * DTO de réponse après authentification ou inscription réussie.
 */
public class AuthResponse {

    private Long id;
    private String token;
    private String type = "Bearer";
    private String email;
    private String username;
    private String role;
    private String fullName;
    private BigDecimal virtualBalance;
    private Integer level;
    private Integer exp;
    private Integer eloRating;
    private String tier;
    private String profileImageUrl;
    private String customBackgroundUrl;

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
        private Long id;
        private String token;
        private String type = "Bearer";
        private String email;
        private String username;
        private String role;
        private String fullName;
        private BigDecimal virtualBalance;
        private Integer level;
        private Integer exp;
        private Integer eloRating;
        private String tier;
        private String profileImageUrl;
        private String customBackgroundUrl;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

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

        public Builder username(String username) {
            this.username = username;
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

        public Builder level(Integer level) {
            this.level = level;
            return this;
        }

        public Builder exp(Integer exp) {
            this.exp = exp;
            return this;
        }

        public Builder eloRating(Integer eloRating) {
            this.eloRating = eloRating;
            return this;
        }

        public Builder tier(String tier) {
            this.tier = tier;
            return this;
        }

        public Builder profileImageUrl(String profileImageUrl) {
            this.profileImageUrl = profileImageUrl;
            return this;
        }

        public Builder customBackgroundUrl(String customBackgroundUrl) {
            this.customBackgroundUrl = customBackgroundUrl;
            return this;
        }

        public AuthResponse build() {
            AuthResponse res = new AuthResponse(token, type, email, role, fullName, virtualBalance);
            res.setId(id);
            res.setUsername(username);
            res.setLevel(level);
            res.setExp(exp);
            res.setEloRating(eloRating);
            res.setTier(tier);
            res.setProfileImageUrl(profileImageUrl);
            res.setCustomBackgroundUrl(customBackgroundUrl);
            return res;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public Integer getExp() {
        return exp;
    }

    public void setExp(Integer exp) {
        this.exp = exp;
    }

    public Integer getEloRating() {
        return eloRating;
    }

    public void setEloRating(Integer eloRating) {
        this.eloRating = eloRating;
    }

    public String getTier() {
        return tier;
    }

    public void setTier(String tier) {
        this.tier = tier;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public String getCustomBackgroundUrl() {
        return customBackgroundUrl;
    }

    public void setCustomBackgroundUrl(String customBackgroundUrl) {
        this.customBackgroundUrl = customBackgroundUrl;
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
