package com.pif.gamification.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "player_skills", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "skill_id"})
})
public class PlayerSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "skill_id", nullable = false)
    private SkillNode skill;

    @Column(nullable = false, length = 20)
    private String status = "LOCKED"; // LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED, MASTERED

    @Column(name = "mastery_tier", length = 20)
    private String masteryTier = "NONE"; // NONE, BASIC, INTERMEDIATE, ADVANCED, EXPERT

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "mastered_at")
    private LocalDateTime masteredAt;

    public PlayerSkill() {}

    public PlayerSkill(User user, SkillNode skill, String status) {
        this.user = user;
        this.skill = skill;
        this.status = status;
        this.masteryTier = "NONE";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public SkillNode getSkill() { return skill; }
    public void setSkill(SkillNode skill) { this.skill = skill; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMasteryTier() { return masteryTier; }
    public void setMasteryTier(String masteryTier) { this.masteryTier = masteryTier; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getMasteredAt() { return masteredAt; }
    public void setMasteredAt(LocalDateTime masteredAt) { this.masteredAt = masteredAt; }
}

