package com.pif.gamification.dto;

import com.pif.gamification.model.CelebrationEvent;
import java.time.LocalDateTime;

public class CelebrationEventDto {
    private String eventId;
    private Long userId;
    private String eventType;
    private String title;
    private String subtitle;
    private String rarity;
    private Integer rewardExp;
    private String payloadJson;
    private Boolean isDisplayed;
    private LocalDateTime createdAt;

    public CelebrationEventDto() {}

    public static CelebrationEventDto fromEntity(CelebrationEvent ce) {
        CelebrationEventDto dto = new CelebrationEventDto();
        dto.setEventId(ce.getEventId());
        dto.setUserId(ce.getUser() != null ? ce.getUser().getId() : null);
        dto.setEventType(ce.getEventType());
        dto.setTitle(ce.getTitle());
        dto.setSubtitle(ce.getSubtitle());
        dto.setRarity(ce.getRarity());
        dto.setRewardExp(ce.getRewardExp());
        dto.setPayloadJson(ce.getPayloadJson());
        dto.setIsDisplayed(ce.getIsDisplayed());
        dto.setCreatedAt(ce.getCreatedAt());
        return dto;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

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

