package com.pif.gamification.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "celebration_events")
public class CelebrationEvent {

    @Id
    @Column(name = "event_id", length = 120)
    private String eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType; // LEVEL_UP, ACHIEVEMENT_UNLOCKED, TROPHY_UNLOCKED, CAREER_PROMOTION, SEASON_CHAMPION, ROOM_VICTORY, SKILL_MASTERED

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String subtitle;

    @Column(length = 20)
    private String rarity = "COMMON";

    @Column(name = "reward_exp")
    private Integer rewardExp = 0;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "is_displayed")
    private Boolean isDisplayed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public CelebrationEvent() {}

    public CelebrationEvent(String eventId, User user, String eventType, String title, String subtitle, String rarity, Integer rewardExp, String payloadJson) {
        this.eventId = eventId;
        this.user = user;
        this.eventType = eventType;
        this.title = title;
        this.subtitle = subtitle;
        this.rarity = rarity != null ? rarity : "COMMON";
        this.rewardExp = rewardExp != null ? rewardExp : 0;
        this.payloadJson = payloadJson;
        this.isDisplayed = false;
        this.createdAt = LocalDateTime.now();
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String subtitle) { this.subtitle = subtitle; }

    public String getRarity() { return rarity; }
    public void setRarity(String rarity) { this.rarity = rarity; }

    public Integer getRewardExp() { return rewardExp; }
    public void setRewardExp(Integer rewardExp) { this.rewardExp = rewardExp; }

    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }

    public Boolean getIsDisplayed() { return isDisplayed; }
    public void setIsDisplayed(Boolean isDisplayed) { this.isDisplayed = isDisplayed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
