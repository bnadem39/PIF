package com.pif.multiplayer.dto;

import com.pif.multiplayer.model.RoomParticipant;
import java.math.BigDecimal;

public class RoomParticipantDto {

    private Long userId;
    private String username;
    private Integer eloRating;
    private String tier;
    private Integer level;
    private String themeAccentColor;
    private BigDecimal cash;
    private BigDecimal totalEquity;
    private BigDecimal pnlPercentage;
    private Boolean isReady;
    private Integer rank;
    private String profileImageUrl;

    public RoomParticipantDto() {
    }

    public static RoomParticipantDto fromEntity(RoomParticipant participant) {
        RoomParticipantDto dto = new RoomParticipantDto();
        dto.setUserId(participant.getUser().getId());
        dto.setUsername(participant.getUser().getUsernameAlias());
        dto.setProfileImageUrl(participant.getUser().getProfileImageUrl());
        dto.setEloRating(participant.getUser().getEloRating());
        dto.setTier(participant.getUser().getTier());
        dto.setLevel(participant.getUser().getLevel());
        dto.setThemeAccentColor(participant.getUser().getThemeAccentColor());
        dto.setCash(participant.getCash());
        dto.setTotalEquity(participant.getTotalEquity());
        dto.setPnlPercentage(participant.getPnlPercentage());
        dto.setIsReady(participant.getIsReady());
        dto.setRank(participant.getRank());
        return dto;
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

    public Integer getEloRating() {
        return eloRating;
    }

    public void setEloRating(Integer eloRating) {
        this.eloRating = eloRating;
    }

    public String getTier() {
        return tier;
    }

    public void setTier(String tier) {
        this.tier = tier;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public String getThemeAccentColor() {
        return themeAccentColor;
    }

    public void setThemeAccentColor(String themeAccentColor) {
        this.themeAccentColor = themeAccentColor;
    }

    public BigDecimal getCash() {
        return cash;
    }

    public void setCash(BigDecimal cash) {
        this.cash = cash;
    }

    public BigDecimal getTotalEquity() {
        return totalEquity;
    }

    public void setTotalEquity(BigDecimal totalEquity) {
        this.totalEquity = totalEquity;
    }

    public BigDecimal getPnlPercentage() {
        return pnlPercentage;
    }

    public void setPnlPercentage(BigDecimal pnlPercentage) {
        this.pnlPercentage = pnlPercentage;
    }

    public Boolean getIsReady() {
        return isReady;
    }

    public void setIsReady(Boolean isReady) {
        this.isReady = isReady;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }
}
