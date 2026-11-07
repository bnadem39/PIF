package com.pif.gamification.model;

import jakarta.persistence.*;

@Entity
@Table(name = "career_stages")
public class CareerStage {

    @Id
    @Column(name = "stage_order")
    private Integer stageOrder;

    @Column(nullable = false, length = 60)
    private String title;

    @Column(name = "required_level", nullable = false)
    private Integer requiredLevel;

    @Column(name = "required_exp", nullable = false)
    private Integer requiredExp;

    @Column(name = "required_wins")
    private Integer requiredWins = 0;

    @Column(name = "required_skills_count")
    private Integer requiredSkillsCount = 0;

    @Column(name = "badge_color", length = 30)
    private String badgeColor = "#0284c7";

    @Column(name = "icon_name", length = 50)
    private String iconName = "Briefcase";

    @Column(name = "cosmetic_reward_title", length = 80)
    private String cosmeticRewardTitle;

    public CareerStage() {}

    public Integer getStageOrder() { return stageOrder; }
    public void setStageOrder(Integer stageOrder) { this.stageOrder = stageOrder; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public Integer getRequiredLevel() { return requiredLevel; }
    public void setRequiredLevel(Integer requiredLevel) { this.requiredLevel = requiredLevel; }

    public Integer getRequiredExp() { return requiredExp; }
    public void setRequiredExp(Integer requiredExp) { this.requiredExp = requiredExp; }

    public Integer getRequiredWins() { return requiredWins; }
    public void setRequiredWins(Integer requiredWins) { this.requiredWins = requiredWins; }

    public Integer getRequiredSkillsCount() { return requiredSkillsCount; }
    public void setRequiredSkillsCount(Integer requiredSkillsCount) { this.requiredSkillsCount = requiredSkillsCount; }

    public String getBadgeColor() { return badgeColor; }
    public void setBadgeColor(String badgeColor) { this.badgeColor = badgeColor; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public String getCosmeticRewardTitle() { return cosmeticRewardTitle; }
    public void setCosmeticRewardTitle(String cosmeticRewardTitle) { this.cosmeticRewardTitle = cosmeticRewardTitle; }
}

