package com.pif.trading.model;

import com.pif.market.model.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité OrderTransaction représentant une transaction d'exécution boursière passée.
 * Traçabilité et piste d'audit financière avec précision BigDecimal(15,3).
 */
@Entity
@Table(name = "order_transactions")
public class OrderTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String symbol;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderType type;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "execution_price", nullable = false, precision = 15, scale = 3)
    private BigDecimal executionPrice;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal fees;

    @Column(name = "realized_pnl", precision = 15, scale = 3)
    private BigDecimal realizedPnl;

    @Column(name = "simulated_date", nullable = false, length = 30)
    private String simulatedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public OrderTransaction() {
    }

    public OrderTransaction(User user, String symbol, OrderType type, Integer quantity,
                            BigDecimal executionPrice, BigDecimal fees, BigDecimal realizedPnl,
                            String simulatedDate) {
        this.user = user;
        this.symbol = symbol;
        this.type = type;
        this.quantity = quantity;
        this.executionPrice = executionPrice;
        this.fees = fees;
        this.realizedPnl = realizedPnl;
        this.simulatedDate = simulatedDate;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.fees == null) {
            this.fees = BigDecimal.ZERO;
        }
        if (this.realizedPnl == null) {
            this.realizedPnl = BigDecimal.ZERO;
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

    public OrderType getType() {
        return type;
    }

    public void setType(OrderType type) {
        this.type = type;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getExecutionPrice() {
        return executionPrice;
    }

    public void setExecutionPrice(BigDecimal executionPrice) {
        this.executionPrice = executionPrice;
    }

    public BigDecimal getFees() {
        return fees;
    }

    public void setFees(BigDecimal fees) {
        this.fees = fees;
    }

    public BigDecimal getRealizedPnl() {
        return realizedPnl;
    }

    public void setRealizedPnl(BigDecimal realizedPnl) {
        this.realizedPnl = realizedPnl;
    }

    public String getSimulatedDate() {
        return simulatedDate;
    }

    public void setSimulatedDate(String simulatedDate) {
        this.simulatedDate = simulatedDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
