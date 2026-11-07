package com.pif.multiplayer.dto;

import com.pif.multiplayer.model.RoomOrder;
import com.pif.multiplayer.model.RoomOrderSide;
import com.pif.multiplayer.model.RoomOrderType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class RoomOrderRequestDto {

    @NotBlank(message = "Le ticker est obligatoire")
    private String ticker;

    @NotNull(message = "Le sens d'ordre (BUY/SELL) est obligatoire")
    private RoomOrderSide side;

    @NotNull(message = "Le type d'ordre est obligatoire")
    private RoomOrderType orderType;

    @NotNull(message = "Le prix d'exécution est obligatoire")
    private BigDecimal price;

    @NotNull(message = "La quantité est obligatoire")
    @Min(value = 1, message = "La quantité minimale est 1")
    private Integer quantity;

    private BigDecimal stopLoss;
    private BigDecimal takeProfit;

    public RoomOrderRequestDto() {
    }

    public BigDecimal getStopLoss() {
        return stopLoss;
    }

    public void setStopLoss(BigDecimal stopLoss) {
        this.stopLoss = stopLoss;
    }

    public BigDecimal getTakeProfit() {
        return takeProfit;
    }

    public void setTakeProfit(BigDecimal takeProfit) {
        this.takeProfit = takeProfit;
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
}

