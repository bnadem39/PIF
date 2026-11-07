package com.pif.gamification.dto;

public class FeaturePermissionDto {
    private String featureKey;
    private String name;
    private String description;
    private int requiredLevel;
    private int currentLevel;
    private boolean unlocked;
    private int progressPercentage;
    private String unlockHint;

    public FeaturePermissionDto() {}

    public FeaturePermissionDto(String featureKey, String name, String description,
                                int requiredLevel, int currentLevel, boolean unlocked,
                                int progressPercentage, String unlockHint) {
        this.featureKey = featureKey;
        this.name = name;
        this.description = description;
        this.requiredLevel = requiredLevel;
        this.currentLevel = currentLevel;
        this.unlocked = unlocked;
        this.progressPercentage = progressPercentage;
        this.unlockHint = unlockHint;
    }

    public String getFeatureKey() { return featureKey; }
    public void setFeatureKey(String featureKey) { this.featureKey = featureKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public int getRequiredLevel() { return requiredLevel; }
    public void setRequiredLevel(int requiredLevel) { this.requiredLevel = requiredLevel; }

    public int getCurrentLevel() { return currentLevel; }
    public void setCurrentLevel(int currentLevel) { this.currentLevel = currentLevel; }

    public boolean isUnlocked() { return unlocked; }
    public void setUnlocked(boolean unlocked) { this.unlocked = unlocked; }

    public int getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(int progressPercentage) { this.progressPercentage = progressPercentage; }

    public String getUnlockHint() { return unlockHint; }
    public void setUnlockHint(String unlockHint) { this.unlockHint = unlockHint; }
}

