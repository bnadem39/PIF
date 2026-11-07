package com.pif.multiplayer.dto;

import com.pif.multiplayer.model.RoomOrder;
import com.pif.multiplayer.model.RoomOrderSide;
import com.pif.multiplayer.model.RoomOrderType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class RoomOrderResponseDto {

    private UUID id;
    private String roomId;
    private Long userId;
    private String username;
    private String ticker;
    private RoomOrderSide side;
    private RoomOrderType orderType;
    private BigDecimal price;
    private Integer quantity;
    private LocalDate simulatedDate;
    private LocalDateTime createdAt;

    public RoomOrderResponseDto() {
    }

    public static RoomOrderResponseDto fromEntity(RoomOrder order) {
        RoomOrderResponseDto dto = new RoomOrderResponseDto();
        dto.setId(order.getId());
        dto.setRoomId(order.getRoom().getId());
        dto.setUserId(order.getUser().getId());
        dto.setUsername(order.getUser().getUsernameAlias());
        dto.setTicker(order.getTicker());
        dto.setSide(order.getSide());
        dto.setOrderType(order.getOrderType());
        dto.setPrice(order.getPrice());
        dto.setQuantity(order.getQuantity());
        dto.setSimulatedDate(order.getSimulatedDate());
        dto.setCreatedAt(order.getCreatedAt());
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public LocalDate getSimulatedDate() {
        return simulatedDate;
    }

    public void setSimulatedDate(LocalDate simulatedDate) {
        this.simulatedDate = simulatedDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
