package com.pif.gamification.model;

import jakarta.persistence.*;

@Entity
@Table(name = "achievements")
public class Achievement {

    @Id
    @Column(length = 60)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 30)
    private String category; // TRADING, RISK_MANAGEMENT, COMPETITIVE, EDUCATIONAL, CAREER, SOCIAL

    @Column(nullable = false, length = 20)
    private String rarity = "COMMON"; // COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC

    @Column(name = "target_count", nullable = false)
    private Integer targetCount = 1;

    @Column(name = "exp_reward", nullable = false)
    private Integer expReward = 150;

    @Column(name = "icon_name", length = 50)
    private String iconName = "Trophy";

    @Column(name = "is_secret")
    private Boolean isSecret = false;

    public Achievement() {}

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
}

