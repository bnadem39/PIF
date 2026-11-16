package com.pif.wallet.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Une ligne du journal du portefeuille. Le montant est signé : négatif pour une sortie. */
@Entity
@Table(name = "wallet_transactions",
        uniqueConstraints = @UniqueConstraint(name = "uk_wallet_tx_room_type", columnNames = {"user_id", "room_id", "type"}))
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "room_id", length = 20)
    private String roomId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WalletTransactionType type;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal amount;

    @Column(name = "balance_after", nullable = false, precision = 15, scale = 3)
    private BigDecimal balanceAfter;

    @Column(name = "debt_after", nullable = false, precision = 15, scale = 3)
    private BigDecimal debtAfter;

    @Column(length = 200)
    private String label;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected WalletTransaction() {
    }

    public WalletTransaction(Long userId, String roomId, WalletTransactionType type, BigDecimal amount,
                             BigDecimal balanceAfter, BigDecimal debtAfter, String label) {
        this.userId = userId;
        this.roomId = roomId;
        this.type = type;
        this.amount = amount;
        this.balanceAfter = balanceAfter;
        this.debtAfter = debtAfter;
        this.label = label;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getRoomId() {
        return roomId;
    }

    public WalletTransactionType getType() {
        return type;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public BigDecimal getBalanceAfter() {
        return balanceAfter;
    }

    public BigDecimal getDebtAfter() {
        return debtAfter;
    }

    public String getLabel() {
        return label;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
