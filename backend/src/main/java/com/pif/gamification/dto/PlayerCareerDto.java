package com.pif.gamification.dto;

import com.pif.gamification.model.CareerHistory;
import com.pif.gamification.model.CareerStage;
import com.pif.gamification.model.PlayerCareer;

import java.time.LocalDateTime;
import java.util.List;

public class PlayerCareerDto {
    private Long id;
    private Long userId;
    private String username;
    private Integer currentStageOrder;
    private String currentTitle;
    private Integer level;
    private Integer exp;
    private Integer careerPoints;
    private LocalDateTime promotedAt;

    // Current & Next Stage requirements
    private CareerStage currentStage;
    private CareerStage nextStage;
    private Integer progressToNextStagePercentage = 100;
    private List<CareerHistoryDto> history;
    private List<CareerStage> allStages;

    public PlayerCareerDto() {}

    public static class CareerHistoryDto {
        private Integer stageOrder;
        private String title;
        private LocalDateTime promotedAt;
        private String details;

        public static CareerHistoryDto fromEntity(CareerHistory h) {
            CareerHistoryDto dto = new CareerHistoryDto();
            dto.setStageOrder(h.getStageOrder());
            dto.setTitle(h.getTitle());
            dto.setPromotedAt(h.getPromotedAt());
            dto.setDetails(h.getDetails());
            return dto;
        }

        public Integer getStageOrder() { return stageOrder; }
        public void setStageOrder(Integer stageOrder) { this.stageOrder = stageOrder; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public LocalDateTime getPromotedAt() { return promotedAt; }
        public void setPromotedAt(LocalDateTime promotedAt) { this.promotedAt = promotedAt; }

        public String getDetails() { return details; }
        public void setDetails(String details) { this.details = details; }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Integer getCurrentStageOrder() { return currentStageOrder; }
    public void setCurrentStageOrder(Integer currentStageOrder) { this.currentStageOrder = currentStageOrder; }

    public String getCurrentTitle() { return currentTitle; }
    public void setCurrentTitle(String currentTitle) { this.currentTitle = currentTitle; }

    public Integer getLevel() { return level; }
    public void setLevel(Integer level) { this.level = level; }

    public Integer getExp() { return exp; }
    public void setExp(Integer exp) { this.exp = exp; }

    public Integer getCareerPoints() { return careerPoints; }
    public void setCareerPoints(Integer careerPoints) { this.careerPoints = careerPoints; }

    public LocalDateTime getPromotedAt() { return promotedAt; }
    public void setPromotedAt(LocalDateTime promotedAt) { this.promotedAt = promotedAt; }

    public CareerStage getCurrentStage() { return currentStage; }
    public void setCurrentStage(CareerStage currentStage) { this.currentStage = currentStage; }

    public CareerStage getNextStage() { return nextStage; }
    public void setNextStage(CareerStage nextStage) { this.nextStage = nextStage; }

    public Integer getProgressToNextStagePercentage() { return progressToNextStagePercentage; }
    public void setProgressToNextStagePercentage(Integer progressToNextStagePercentage) { this.progressToNextStagePercentage = progressToNextStagePercentage; }

    public List<CareerHistoryDto> getHistory() { return history; }
    public void setHistory(List<CareerHistoryDto> history) { this.history = history; }

    public List<CareerStage> getAllStages() { return allStages; }
    public void setAllStages(List<CareerStage> allStages) { this.allStages = allStages; }
}

