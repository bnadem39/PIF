package com.pif.gamification.dto;

import java.util.List;
import java.util.Map;

public class CustomizationPermissionsResponseDto {
    private Long userId;
    private String username;
    private int currentLevel;
    private int currentExp;
    private String tier;
    private List<FeaturePermissionDto> permissions;
    private Map<String, Boolean> featuresUnlocked;

    public CustomizationPermissionsResponseDto() {}

    public CustomizationPermissionsResponseDto(Long userId, String username, int currentLevel,
                                              int currentExp, String tier,
                                              List<FeaturePermissionDto> permissions,
                                              Map<String, Boolean> featuresUnlocked) {
        this.userId = userId;
        this.username = username;
        this.currentLevel = currentLevel;
        this.currentExp = currentExp;
        this.tier = tier;
        this.permissions = permissions;
        this.featuresUnlocked = featuresUnlocked;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public int getCurrentLevel() { return currentLevel; }
    public void setCurrentLevel(int currentLevel) { this.currentLevel = currentLevel; }

    public int getCurrentExp() { return currentExp; }
    public void setCurrentExp(int currentExp) { this.currentExp = currentExp; }

    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }

    public List<FeaturePermissionDto> getPermissions() { return permissions; }
    public void setPermissions(List<FeaturePermissionDto> permissions) { this.permissions = permissions; }

    public Map<String, Boolean> getFeaturesUnlocked() { return featuresUnlocked; }
    public void setFeaturesUnlocked(Map<String, Boolean> featuresUnlocked) { this.featuresUnlocked = featuresUnlocked; }
}

