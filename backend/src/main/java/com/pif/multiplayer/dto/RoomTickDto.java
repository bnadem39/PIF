package com.pif.multiplayer.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public class RoomTickDto {

    private String roomId;
    private LocalDate simulatedDate;
    private int tickIndex;
    private int totalTicks;
    private Map<String, BigDecimal> marketPrices;
    private BigDecimal tunindexValue;
    private BigDecimal tunindexPnl;
    private boolean isLastTick;

    public RoomTickDto() {
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public LocalDate getSimulatedDate() {
        return simulatedDate;
    }

    public void setSimulatedDate(LocalDate simulatedDate) {
        this.simulatedDate = simulatedDate;
    }

    public int getTickIndex() {
        return tickIndex;
    }

    public void setTickIndex(int tickIndex) {
        this.tickIndex = tickIndex;
    }

    public int getTotalTicks() {
        return totalTicks;
    }

    public void setTotalTicks(int totalTicks) {
        this.totalTicks = totalTicks;
    }

    public Map<String, BigDecimal> getMarketPrices() {
        return marketPrices;
    }

    public void setMarketPrices(Map<String, BigDecimal> marketPrices) {
        this.marketPrices = marketPrices;
    }

    public BigDecimal getTunindexValue() {
        return tunindexValue;
    }

    public void setTunindexValue(BigDecimal tunindexValue) {
        this.tunindexValue = tunindexValue;
    }

    public BigDecimal getTunindexPnl() {
        return tunindexPnl;
    }

    public void setTunindexPnl(BigDecimal tunindexPnl) {
        this.tunindexPnl = tunindexPnl;
    }

    public boolean isLastTick() {
        return isLastTick;
    }

    public void setLastTick(boolean lastTick) {
        isLastTick = lastTick;
    }
}
