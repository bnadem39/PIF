package com.pif.gamification.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "player_careers")
public class PlayerCareer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "current_stage_order", nullable = false)
    private CareerStage currentStage;

    @Column(name = "current_title", nullable = false, length = 60)
    private String currentTitle;

    @Column(name = "promoted_at")
    private LocalDateTime promotedAt = LocalDateTime.now();

    @Column(name = "career_points", nullable = false)
    private Integer careerPoints = 0;

    public PlayerCareer() {}

    public PlayerCareer(User user, CareerStage stage) {
        this.user = user;
        this.currentStage = stage;
        this.currentTitle = stage != null ? stage.getTitle() : "Novice des Marchés";
        this.promotedAt = LocalDateTime.now();
        this.careerPoints = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public CareerStage getCurrentStage() { return currentStage; }
    public void setCurrentStage(CareerStage currentStage) { this.currentStage = currentStage; }

    public String getCurrentTitle() { return currentTitle; }
    public void setCurrentTitle(String currentTitle) { this.currentTitle = currentTitle; }

    public LocalDateTime getPromotedAt() { return promotedAt; }
    public void setPromotedAt(LocalDateTime promotedAt) { this.promotedAt = promotedAt; }

    public Integer getCareerPoints() { return careerPoints; }
    public void setCareerPoints(Integer careerPoints) { this.careerPoints = careerPoints; }
}

