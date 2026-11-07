package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.Achievement;
import com.pif.gamification.model.PlayerAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerAchievementRepository extends JpaRepository<PlayerAchievement, Long> {
    List<PlayerAchievement> findByUser(User user);
    List<PlayerAchievement> findByUserAndUnlockedTrue(User user);
    List<PlayerAchievement> findByUserAndIsPinnedTrue(User user);
    Optional<PlayerAchievement> findByUserAndAchievement(User user, Achievement achievement);
    long countByUserAndUnlockedTrue(User user);
}

