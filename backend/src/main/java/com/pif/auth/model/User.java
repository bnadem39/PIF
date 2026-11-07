package com.pif.auth.model;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;

/**
 * Entité Utilisateur représentant un trader ou un administrateur sur la plateforme de simulation.
 * Implémente UserDetails pour une intégration native et sécurisée avec Spring Security 6.
 */
@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "elo_rating", nullable = false)
    private Integer eloRating = 1000;

    @Column(nullable = false, length = 20)
    private String tier = "BRONZE";

    @Column(nullable = false)
    private Integer level = 1;

    @Column(nullable = false)
    private Integer exp = 0;

    @Column(name = "total_matches", nullable = false)
    private Integer totalMatches = 0;

    @Column(nullable = false)
    private Integer wins = 0;

    @Column(name = "custom_background_url", columnDefinition = "TEXT")
    private String customBackgroundUrl;

    @Column(name = "profile_image_url", columnDefinition = "TEXT")
    private String profileImageUrl;

    @Column(name = "background_darkness")
    private Integer backgroundDarkness = 60;

    @Column(name = "background_blur")
    private Integer backgroundBlur = 0;

    @Column(name = "background_position", length = 30)
    private String backgroundPosition = "center";

    @Column(name = "theme_mode", length = 20)
    private String themeMode = "AUTOMATIC";

    @Column(name = "theme_accent_color", length = 30)
    private String themeAccentColor = "#10b981";

    @Column(name = "theme_secondary_color", length = 30)
    private String themeSecondaryColor = "#06b6d4";

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Column(name = "cash_balance", nullable = false, precision = 15, scale = 3)
    private BigDecimal cashBalance = new BigDecimal("100000.000");

    @Column(name = "blocked_cash", nullable = false, precision = 15, scale = 3)
    private BigDecimal blockedCash = new BigDecimal("0.000");

    @Column(name = "virtual_balance", precision = 15, scale = 3)
    private BigDecimal virtualBalance = new BigDecimal("100000.000");

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public User() {
    }

    public User(String email, String password, String fullName, Role role, BigDecimal cashBalance) {
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.role = role;
        this.cashBalance = cashBalance != null ? cashBalance : new BigDecimal("100000.000");
        this.virtualBalance = this.cashBalance;
        this.blockedCash = new BigDecimal("0.000");
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.username == null || this.username.isBlank()) {
            this.username = this.email != null ? this.email.split("@")[0] : "player_" + System.currentTimeMillis();
        }
        if (this.eloRating == null) {
            this.eloRating = 1000;
        }
        if (this.totalMatches == null) {
            this.totalMatches = 0;
        }
        if (this.wins == null) {
            this.wins = 0;
        }
        this.tier = calculateTier(this.eloRating);
        if (this.cashBalance == null) {
            this.cashBalance = new BigDecimal("100000.000");
        }
        if (this.blockedCash == null) {
            this.blockedCash = new BigDecimal("0.000");
        }
        this.virtualBalance = this.cashBalance;
    }

    public static String calculateTier(int elo) {
        if (elo < 1000) return "BRONZE";
        if (elo < 1500) return "SILVER";
        if (elo < 2000) return "GOLD";
        if (elo < 2500) return "PLATINUM";
        return "MASTER";
    }

    public void addExp(int amount) {
        if (this.exp == null) this.exp = 0;
        if (this.level == null) this.level = 1;
        this.exp += amount;
        while (this.exp >= this.level * 500) {
            this.exp -= this.level * 500;
            this.level += 1;
        }
    }

    public Integer getLevel() {
        return level != null ? level : 1;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public Integer getExp() {
        return exp != null ? exp : 0;
    }

    public void setExp(Integer exp) {
        this.exp = exp;
    }

    public String getCustomBackgroundUrl() {
        return customBackgroundUrl;
    }

    public void setCustomBackgroundUrl(String customBackgroundUrl) {
        this.customBackgroundUrl = customBackgroundUrl;
    }

    public String getThemeAccentColor() {
        return themeAccentColor != null ? themeAccentColor : "#10b981";
    }

    public void setThemeAccentColor(String themeAccentColor) {
        this.themeAccentColor = themeAccentColor;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public Integer getBackgroundDarkness() {
        return backgroundDarkness != null ? backgroundDarkness : 60;
    }

    public void setBackgroundDarkness(Integer backgroundDarkness) {
        this.backgroundDarkness = backgroundDarkness;
    }

    public Integer getBackgroundBlur() {
        return backgroundBlur != null ? backgroundBlur : 0;
    }

    public void setBackgroundBlur(Integer backgroundBlur) {
        this.backgroundBlur = backgroundBlur;
    }

    public String getBackgroundPosition() {
        return backgroundPosition != null ? backgroundPosition : "center";
    }

    public void setBackgroundPosition(String backgroundPosition) {
        this.backgroundPosition = backgroundPosition;
    }

    public String getThemeMode() {
        return themeMode != null ? themeMode : "AUTOMATIC";
    }

    public void setThemeMode(String themeMode) {
        this.themeMode = themeMode;
    }

    public String getThemeSecondaryColor() {
        return themeSecondaryColor != null ? themeSecondaryColor : "#06b6d4";
    }

    public void setThemeSecondaryColor(String themeSecondaryColor) {
        this.themeSecondaryColor = themeSecondaryColor;
    }

    public void updateTierFromElo() {
        this.tier = calculateTier(this.eloRating != null ? this.eloRating : 1000);
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        this.virtualBalance = this.cashBalance;
    }

    // --- Implémentation Spring Security UserDetails ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (role == null) {
            return Collections.emptyList();
        }
        return Collections.singletonList(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    // --- Getters & Setters ---

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public BigDecimal getCashBalance() {
        return cashBalance;
    }

    public void setCashBalance(BigDecimal cashBalance) {
        this.cashBalance = cashBalance;
    }

    public BigDecimal getBlockedCash() {
        return blockedCash != null ? blockedCash : BigDecimal.ZERO;
    }

    public void setBlockedCash(BigDecimal blockedCash) {
        this.blockedCash = blockedCash;
    }

    public BigDecimal getAvailableCash() {
        BigDecimal cash = cashBalance != null ? cashBalance : BigDecimal.ZERO;
        BigDecimal blocked = blockedCash != null ? blockedCash : BigDecimal.ZERO;
        return cash.subtract(blocked);
    }

    public BigDecimal getVirtualBalance() {
        return getCashBalance();
    }

    public void setVirtualBalance(BigDecimal virtualBalance) {
        setCashBalance(virtualBalance);
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String getUsernameAlias() {
        return username != null ? username : (email != null ? email.split("@")[0] : "player");
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Integer getEloRating() {
        return eloRating != null ? eloRating : 1000;
    }

    public void setEloRating(Integer eloRating) {
        this.eloRating = eloRating;
        updateTierFromElo();
    }

    public String getTier() {
        return tier != null ? tier : "Silver";
    }

    public void setTier(String tier) {
        this.tier = tier;
    }

    public Integer getTotalMatches() {
        return totalMatches != null ? totalMatches : 0;
    }

    public void setTotalMatches(Integer totalMatches) {
        this.totalMatches = totalMatches;
    }

    public Integer getWins() {
        return wins != null ? wins : 0;
    }

    public void setWins(Integer wins) {
        this.wins = wins;
    }
}
