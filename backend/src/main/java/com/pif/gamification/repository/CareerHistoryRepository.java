package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.CareerHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CareerHistoryRepository extends JpaRepository<CareerHistory, Long> {
    List<CareerHistory> findByUserOrderByPromotedAtDesc(User user);
}

