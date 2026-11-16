package com.pif.wallet.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Portefeuille global d'un joueur : un solde et une dette, communs à toutes les salles. */
@Entity
@Table(name = "player_wallets")
public class PlayerWallet {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal balance;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal debt = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PlayerWallet() {
    }

    public PlayerWallet(Long userId, BigDecimal balance) {
        this.userId = userId;
        this.balance = balance;
        this.debt = BigDecimal.ZERO;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    public Long getUserId() {
        return userId;
    }

    public BigDecimal getBalance() {
        return balance;
    }

    public void setBalance(BigDecimal balance) {
        this.balance = balance;
        this.updatedAt = LocalDateTime.now();
    }

    public BigDecimal getDebt() {
        return debt;
    }

    public void setDebt(BigDecimal debt) {
        this.debt = debt;
        this.updatedAt = LocalDateTime.now();
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
