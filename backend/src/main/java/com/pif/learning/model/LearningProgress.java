package com.pif.learning.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "learning_progress",
        uniqueConstraints = @UniqueConstraint(name = "uk_learning_progress", columnNames = {"user_id", "item_type", "item_id"}))
public class LearningProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private ItemType itemType;

    @Column(name = "item_id", nullable = false, length = 64)
    private String itemId;

    private Double score;

    @Column(nullable = false)
    private int points;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private boolean completed;

    @Column(length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected LearningProgress() {
    }

    public LearningProgress(Long userId, ItemType itemType, String itemId) {
        this.userId = userId;
        this.itemType = itemType;
        this.itemId = itemId;
    }

    @PrePersist
    void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public ItemType getItemType() { return itemType; }
    public String getItemId() { return itemId; }
    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
    public int getPoints() { return points; }
    public void setPoints(int points) { this.points = points; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
