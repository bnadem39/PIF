package com.pif.gamification.dto;

import com.pif.gamification.model.SeasonParticipant;
import java.math.BigDecimal;

public class SeasonParticipantDto {
    private Long id;
    private String seasonId;
    private Long userId;
    private String username;
    private String tier;
    private Integer level;
    private String profileImageUrl;
    private Integer seasonPoints;
    private Integer matchesPlayed;
    private Integer wins;
    private BigDecimal winRate;
    private BigDecimal bestEquity;
    private BigDecimal maxDrawdown;
    private Integer rankPosition;
    private Boolean rewardClaimed;
    private String rewardTier;

    public SeasonParticipantDto() {}

    public static SeasonParticipantDto fromEntity(SeasonParticipant p) {
        SeasonParticipantDto dto = new SeasonParticipantDto();
        dto.setId(p.getId());
        dto.setSeasonId(p.getSeason() != null ? p.getSeason().getId() : null);
        if (p.getUser() != null) {
            dto.setUserId(p.getUser().getId());
            dto.setUsername(p.getUser().getUsernameAlias());
            dto.setTier(p.getUser().getTier());
            dto.setLevel(p.getUser().getLevel());
            dto.setProfileImageUrl(p.getUser().getProfileImageUrl());
        }
        dto.setSeasonPoints(p.getSeasonPoints());
        dto.setMatchesPlayed(p.getMatchesPlayed());
        dto.setWins(p.getWins());
        if (p.getMatchesPlayed() > 0) {
            double rate = ((double) p.getWins() / p.getMatchesPlayed()) * 100.0;
            dto.setWinRate(BigDecimal.valueOf(Math.round(rate * 10.0) / 10.0));
        } else {
            dto.setWinRate(BigDecimal.ZERO);
        }
        dto.setBestEquity(p.getBestEquity());
        dto.setMaxDrawdown(p.getMaxDrawdown());
        dto.setRankPosition(p.getRankPosition());
        dto.setRewardClaimed(p.getRewardClaimed());
        dto.setRewardTier(p.getRewardTier());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSeasonId() { return seasonId; }
    public void setSeasonId(String seasonId) { this.seasonId = seasonId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }

    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }

    public String getProfileImageUrl() { return profileImageUrl; }
    public void setProfileImageUrl(String profileImageUrl) { this.profileImageUrl = profileImageUrl; }

    public Integer getSeasonPoints() { return seasonPoints; }
    public void setSeasonPoints(Integer seasonPoints) { this.seasonPoints = seasonPoints; }

    public Integer getMatchesPlayed() { return matchesPlayed; }
    public void setMatchesPlayed(Integer matchesPlayed) { this.matchesPlayed = matchesPlayed; }

    public Integer getWins() { return wins; }
    public void setWins(Integer wins) { this.wins = wins; }

    public BigDecimal getWinRate() { return winRate; }
    public void setWinRate(BigDecimal winRate) { this.winRate = winRate; }

    public BigDecimal getBestEquity() { return bestEquity; }
    public void setBestEquity(BigDecimal bestEquity) { this.bestEquity = bestEquity; }

    public BigDecimal getMaxDrawdown() { return maxDrawdown; }
    public void setMaxDrawdown(BigDecimal maxDrawdown) { this.maxDrawdown = maxDrawdown; }

    public Integer getRankPosition() { return rankPosition; }
    public void setRankPosition(Integer rankPosition) { this.rankPosition = rankPosition; }

    public Boolean getRewardClaimed() { return rewardClaimed; }
    public void setRewardClaimed(Boolean rewardClaimed) { this.rewardClaimed = rewardClaimed; }

    public String getRewardTier() { return rewardTier; }
    public void setRewardTier(String rewardTier) { this.rewardTier = rewardTier; }
}

