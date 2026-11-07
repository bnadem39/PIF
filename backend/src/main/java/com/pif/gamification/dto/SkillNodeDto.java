package com.pif.gamification.dto;

import com.pif.gamification.model.PlayerSkill;
import com.pif.gamification.model.SkillNode;

import java.time.LocalDateTime;

public class SkillNodeDto {
    private String id;
    private String name;
    private String description;
    private String branch;
    private String difficulty;
    private Integer requiredLevel;
    private String prerequisiteSkillId;
    private String associatedCourseId;
    private Integer expReward;
    private String iconName;
    private Integer orderIndex;

    // Player specific status
    private String status = "LOCKED"; // LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED, MASTERED
    private String masteryTier = "NONE";
    private LocalDateTime completedAt;
    private LocalDateTime masteredAt;
    private boolean canUnlock = false;

    public SkillNodeDto() {}

    public static SkillNodeDto fromEntity(SkillNode node, PlayerSkill ps, boolean canUnlock) {
        SkillNodeDto dto = new SkillNodeDto();
        dto.setId(node.getId());
        dto.setName(node.getName());
        dto.setDescription(node.getDescription());
        dto.setBranch(node.getBranch());
        dto.setDifficulty(node.getDifficulty());
        dto.setRequiredLevel(node.getRequiredLevel());
        dto.setPrerequisiteSkillId(node.getPrerequisiteSkillId());
        dto.setAssociatedCourseId(node.getAssociatedCourseId());
        dto.setExpReward(node.getExpReward());
        dto.setIconName(node.getIconName());
        dto.setOrderIndex(node.getOrderIndex());
        if (ps != null) {
            dto.setStatus(ps.getStatus());
            dto.setMasteryTier(ps.getMasteryTier());
            dto.setCompletedAt(ps.getCompletedAt());
            dto.setMasteredAt(ps.getMasteredAt());
        } else {
            dto.setStatus(canUnlock ? "AVAILABLE" : "LOCKED");
            dto.setMasteryTier("NONE");
        }
        dto.setCanUnlock(canUnlock);
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public Integer getRequiredLevel() { return requiredLevel; }
    public void setRequiredLevel(Integer requiredLevel) { this.requiredLevel = requiredLevel; }

    public String getPrerequisiteSkillId() { return prerequisiteSkillId; }
    public void setPrerequisiteSkillId(String prerequisiteSkillId) { this.prerequisiteSkillId = prerequisiteSkillId; }

    public String getAssociatedCourseId() { return associatedCourseId; }
    public void setAssociatedCourseId(String associatedCourseId) { this.associatedCourseId = associatedCourseId; }

    public Integer getExpReward() { return expReward; }
    public void setExpReward(Integer expReward) { this.expReward = expReward; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMasteryTier() { return masteryTier; }
    public void setMasteryTier(String masteryTier) { this.masteryTier = masteryTier; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getMasteredAt() { return masteredAt; }
    public void setMasteredAt(LocalDateTime masteredAt) { this.masteredAt = masteredAt; }

    public boolean isCanUnlock() { return canUnlock; }
    public void setCanUnlock(boolean canUnlock) { this.canUnlock = canUnlock; }
}

