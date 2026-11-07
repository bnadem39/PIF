package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.PlayerSkill;
import com.pif.gamification.model.SkillNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerSkillRepository extends JpaRepository<PlayerSkill, Long> {
    List<PlayerSkill> findByUser(User user);
    Optional<PlayerSkill> findByUserAndSkill(User user, SkillNode skill);
    long countByUserAndStatus(User user, String status);
}

