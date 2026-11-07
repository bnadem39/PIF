package com.pif.gamification.model;

import jakarta.persistence.*;

@Entity
@Table(name = "skill_nodes")
public class SkillNode {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String branch; // TECHNICAL_ANALYSIS, RISK_MANAGEMENT, PORTFOLIO_MANAGEMENT, MARKET_ANALYSIS, ADVANCED_STRATEGIES

    @Column(length = 20)
    private String difficulty = "BEGINNER"; // BEGINNER, INTERMEDIATE, ADVANCED, EXPERT

    @Column(name = "required_level", nullable = false)
    private Integer requiredLevel = 1;

    @Column(name = "prerequisite_skill_id", length = 50)
    private String prerequisiteSkillId;

    @Column(name = "associated_course_id", length = 64)
    private String associatedCourseId;

    @Column(name = "exp_reward", nullable = false)
    private Integer expReward = 250;

    @Column(name = "icon_name", length = 50)
    private String iconName = "Zap";

    @Column(name = "order_index")
    private Integer orderIndex = 0;

    public SkillNode() {}

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
}

