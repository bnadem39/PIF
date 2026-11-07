package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.PlayerCareer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlayerCareerRepository extends JpaRepository<PlayerCareer, Long> {
    Optional<PlayerCareer> findByUser(User user);
}

