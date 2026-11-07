package com.pif.multiplayer.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class RoomOrder {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RoomOrderSide side;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 20)
    private RoomOrderType orderType;

    @Column(nullable = false, precision = 15, scale = 4)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "stop_loss_price", precision = 15, scale = 4)
    private BigDecimal stopLossPrice;

    @Column(name = "take_profit_price", precision = 15, scale = 4)
    private BigDecimal takeProfitPrice;

    @Column(nullable = false, length = 20)
    private String status = "EXECUTED";

    @Column(name = "simulated_date", nullable = false)
    private LocalDate simulatedDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public RoomOrder() {
    }

    public RoomOrder(Room room, User user, String ticker, RoomOrderSide side, RoomOrderType orderType,
                     BigDecimal price, Integer quantity, LocalDate simulatedDate) {
        this.id = UUID.randomUUID();
        this.room = room;
        this.user = user;
        this.ticker = ticker;
        this.side = side;
        this.orderType = orderType;
        this.price = price;
        this.quantity = quantity;
        this.simulatedDate = simulatedDate;
        this.status = "EXECUTED";
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "EXECUTED";
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public RoomOrderSide getSide() {
        return side;
    }

    public void setSide(RoomOrderSide side) {
        this.side = side;
    }

    public RoomOrderType getOrderType() {
        return orderType;
    }

    public void setOrderType(RoomOrderType orderType) {
        this.orderType = orderType;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDate getSimulatedDate() {
        return simulatedDate;
    }

    public void setSimulatedDate(LocalDate simulatedDate) {
        this.simulatedDate = simulatedDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
