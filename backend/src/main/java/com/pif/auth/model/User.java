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
        if (this.cashBalance == null) {
            this.cashBalance = new BigDecimal("100000.000");
        }
        if (this.blockedCash == null) {
            this.blockedCash = new BigDecimal("0.000");
        }
        this.virtualBalance = this.cashBalance;
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
}
