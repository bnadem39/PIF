package com.pif.gamification.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "career_history")
public class CareerHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "stage_order", nullable = false)
    private Integer stageOrder;

    @Column(nullable = false, length = 60)
    private String title;

    @Column(name = "promoted_at")
    private LocalDateTime promotedAt = LocalDateTime.now();

    @Column(columnDefinition = "TEXT")
    private String details;

    public CareerHistory() {}

    public CareerHistory(User user, Integer stageOrder, String title, String details) {
        this.user = user;
        this.stageOrder = stageOrder;
        this.title = title;
        this.details = details;
        this.promotedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Integer getStageOrder() { return stageOrder; }
    public void setStageOrder(Integer stageOrder) { this.stageOrder = stageOrder; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public LocalDateTime getPromotedAt() { return promotedAt; }
    public void setPromotedAt(LocalDateTime promotedAt) { this.promotedAt = promotedAt; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}

