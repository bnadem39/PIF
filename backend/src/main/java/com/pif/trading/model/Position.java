package com.pif.trading.model;

import com.pif.market.model.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité Position représentant un actif détenu en portefeuille avec son PRU (Prix de Revient Unitaire).
 * Précision financière stricte BigDecimal(15,3).
 */
@Entity
@Table(name = "positions", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "symbol"})
})
public class Position {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String symbol;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "average_cost_price", nullable = false, precision = 15, scale = 3)
    private BigDecimal averageCostPrice; // PRU

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Position() {
    }

    public Position(User user, String symbol, Integer quantity, BigDecimal averageCostPrice) {
        this.user = user;
        this.symbol = symbol;
        this.quantity = quantity;
        this.averageCostPrice = averageCostPrice;
    }

    @PrePersist
    @PreUpdate
    protected void onPersistOrUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getAverageCostPrice() {
        return averageCostPrice;
    }

    public void setAverageCostPrice(BigDecimal averageCostPrice) {
        this.averageCostPrice = averageCostPrice;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
