package com.pif.gamification.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "season_participants", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"season_id", "user_id"})
})
public class SeasonParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "season_id", nullable = false)
    private Season season;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "season_points", nullable = false)
    private Integer seasonPoints = 0;

    @Column(name = "matches_played", nullable = false)
    private Integer matchesPlayed = 0;

    @Column(nullable = false)
    private Integer wins = 0;

    @Column(name = "best_equity", precision = 15, scale = 3)
    private BigDecimal bestEquity = new BigDecimal("100000.000");

    @Column(name = "max_drawdown", precision = 8, scale = 2)
    private BigDecimal maxDrawdown = BigDecimal.ZERO;

    @Column(name = "rank_position")
    private Integer rankPosition = 0;

    @Column(name = "reward_claimed")
    private Boolean rewardClaimed = false;

    @Column(name = "reward_tier", length = 50)
    private String rewardTier;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public SeasonParticipant() {}

    public SeasonParticipant(Season season, User user) {
        this.season = season;
        this.user = user;
        this.seasonPoints = 0;
        this.matchesPlayed = 0;
        this.wins = 0;
        this.bestEquity = new BigDecimal("100000.000");
        this.maxDrawdown = BigDecimal.ZERO;
        this.rankPosition = 0;
        this.rewardClaimed = false;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Season getSeason() { return season; }
    public void setSeason(Season season) { this.season = season; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getSeasonPoints() { return seasonPoints; }
    public void setSeasonPoints(Integer seasonPoints) { this.seasonPoints = seasonPoints; }

    public Integer getMatchesPlayed() { return matchesPlayed; }
    public void setMatchesPlayed(Integer matchesPlayed) { this.matchesPlayed = matchesPlayed; }

    public Integer getWins() { return wins; }
    public void setWins(Integer wins) { this.wins = wins; }

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

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

