package com.pif.multiplayer.dto;

import java.math.BigDecimal;

public class EloUpdateResultDto {

    private Long userId;
    private String username;
    private int oldElo;
    private int deltaElo;
    private int newElo;
    private String oldTier;
    private String newTier;
    private BigDecimal playerPnl;
    private BigDecimal tunindexPnl;
    private BigDecimal volatility;
    private BigDecimal alpha;
    private int finalRank;
    private boolean won;

    public EloUpdateResultDto() {
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

    public int getOldElo() {
        return oldElo;
    }

    public void setOldElo(int oldElo) {
        this.oldElo = oldElo;
    }

    public int getDeltaElo() {
        return deltaElo;
    }

    public void setDeltaElo(int deltaElo) {
        this.deltaElo = deltaElo;
    }

    public int getNewElo() {
        return newElo;
    }

    public void setNewElo(int newElo) {
        this.newElo = newElo;
    }

    public String getOldTier() {
        return oldTier;
    }

    public void setOldTier(String oldTier) {
        this.oldTier = oldTier;
    }

    public String getNewTier() {
        return newTier;
    }

    public void setNewTier(String newTier) {
        this.newTier = newTier;
    }

    public BigDecimal getPlayerPnl() {
        return playerPnl;
    }

    public void setPlayerPnl(BigDecimal playerPnl) {
        this.playerPnl = playerPnl;
    }

    public BigDecimal getTunindexPnl() {
        return tunindexPnl;
    }

    public void setTunindexPnl(BigDecimal tunindexPnl) {
        this.tunindexPnl = tunindexPnl;
    }

    public BigDecimal getVolatility() {
        return volatility;
    }

    public void setVolatility(BigDecimal volatility) {
        this.volatility = volatility;
    }

    public BigDecimal getAlpha() {
        return alpha;
    }

    public void setAlpha(BigDecimal alpha) {
        this.alpha = alpha;
    }

    public int getFinalRank() {
        return finalRank;
    }

    public void setFinalRank(int finalRank) {
        this.finalRank = finalRank;
    }

    public boolean isWon() {
        return won;
    }

    public void setWon(boolean won) {
        this.won = won;
    }
}

