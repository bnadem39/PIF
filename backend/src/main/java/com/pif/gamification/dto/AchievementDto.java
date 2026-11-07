package com.pif.gamification.dto;

import com.pif.gamification.model.Achievement;
import com.pif.gamification.model.PlayerAchievement;

import java.time.LocalDateTime;

public class AchievementDto {
    private String id;
    private String name;
    private String description;
    private String category;
    private String rarity;
    private Integer targetCount;
    private Integer expReward;
    private String iconName;
    private Boolean isSecret;

    // Player progress
    private Integer currentProgress = 0;
    private Integer percentage = 0;
    private Boolean unlocked = false;
    private LocalDateTime unlockedAt;
    private Boolean isPinned = false;

    public AchievementDto() {}

    public static AchievementDto fromEntity(Achievement ach, PlayerAchievement pa) {
        AchievementDto dto = new AchievementDto();
        dto.setId(ach.getId());
        dto.setName(ach.getName());
        dto.setDescription(ach.getDescription());
        dto.setCategory(ach.getCategory());
        dto.setRarity(ach.getRarity());
        dto.setTargetCount(ach.getTargetCount());
        dto.setExpReward(ach.getExpReward());
        dto.setIconName(ach.getIconName());
        dto.setIsSecret(ach.getIsSecret());

        if (pa != null) {
            dto.setCurrentProgress(pa.getCurrentProgress());
            dto.setUnlocked(pa.getUnlocked());
            dto.setUnlockedAt(pa.getUnlockedAt());
            dto.setIsPinned(pa.getIsPinned());
            int target = ach.getTargetCount() > 0 ? ach.getTargetCount() : 1;
            dto.setPercentage(Math.min(100, (int) Math.round(((double) pa.getCurrentProgress() / target) * 100.0)));
        } else {
            dto.setCurrentProgress(0);
            dto.setPercentage(0);
            dto.setUnlocked(false);
            dto.setIsPinned(false);
        }
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getRarity() { return rarity; }
    public void setRarity(String rarity) { this.rarity = rarity; }

    public Integer getTargetCount() { return targetCount; }
    public void setTargetCount(Integer targetCount) { this.targetCount = targetCount; }

    public Integer getExpReward() { return expReward; }
    public void setExpReward(Integer expReward) { this.expReward = expReward; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public Boolean getIsSecret() { return isSecret; }
    public void setIsSecret(Boolean isSecret) { this.isSecret = isSecret; }

    public Integer getCurrentProgress() { return currentProgress; }
    public void setCurrentProgress(Integer currentProgress) { this.currentProgress = currentProgress; }

    public Integer getPercentage() { return percentage; }
    public void setPercentage(Integer percentage) { this.percentage = percentage; }

    public Boolean getUnlocked() { return unlocked; }
    public void setUnlocked(Boolean unlocked) { this.unlocked = unlocked; }

    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public void setUnlockedAt(LocalDateTime unlockedAt) { this.unlockedAt = unlockedAt; }

    public Boolean getIsPinned() { return isPinned; }
    public void setIsPinned(Boolean isPinned) { this.isPinned = isPinned; }
}

