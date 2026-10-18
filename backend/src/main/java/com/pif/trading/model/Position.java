package com.pif.trading.model;

import com.pif.market.model.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité Position représentant un actif détenu en portefeuille avec son PRU (Prix de Revient Unitaire)
 * et ses paramètres avancés de gestion des risques (Stop-Loss, Take-Profit, Trailing Stop).
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

    @Column(name = "stop_loss_price", precision = 15, scale = 3)
    private BigDecimal stopLossPrice;

    @Column(name = "take_profit_price", precision = 15, scale = 3)
    private BigDecimal takeProfitPrice;

    @Column(name = "trailing_stop_distance", precision = 15, scale = 3)
    private BigDecimal trailingStopDistance;

    @Column(name = "highest_price_seen", precision = 15, scale = 3)
    private BigDecimal highestPriceSeen;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Position() {
    }

    public Position(User user, String symbol, Integer quantity, BigDecimal averageCostPrice) {
        this.user = user;
        this.symbol = symbol;
        this.quantity = quantity;
        this.averageCostPrice = averageCostPrice;
        this.highestPriceSeen = averageCostPrice;
    }

    @PrePersist
    @PreUpdate
    protected void onPersistOrUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.highestPriceSeen == null && this.averageCostPrice != null) {
            this.highestPriceSeen = this.averageCostPrice;
        }
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

    public BigDecimal getStopLossPrice() {
        return stopLossPrice;
    }

    public void setStopLossPrice(BigDecimal stopLossPrice) {
        this.stopLossPrice = stopLossPrice;
    }

    public BigDecimal getTakeProfitPrice() {
        return takeProfitPrice;
    }

    public void setTakeProfitPrice(BigDecimal takeProfitPrice) {
        this.takeProfitPrice = takeProfitPrice;
    }

    public BigDecimal getTrailingStopDistance() {
        return trailingStopDistance;
    }

    public void setTrailingStopDistance(BigDecimal trailingStopDistance) {
        this.trailingStopDistance = trailingStopDistance;
    }

    public BigDecimal getHighestPriceSeen() {
        return highestPriceSeen;
    }

    public void setHighestPriceSeen(BigDecimal highestPriceSeen) {
        this.highestPriceSeen = highestPriceSeen;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
