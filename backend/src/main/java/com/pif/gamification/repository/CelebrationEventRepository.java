package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.CelebrationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CelebrationEventRepository extends JpaRepository<CelebrationEvent, String> {
    List<CelebrationEvent> findByUserAndIsDisplayedFalseOrderByCreatedAtAsc(User user);
    List<CelebrationEvent> findTop20ByUserOrderByCreatedAtDesc(User user);
}

