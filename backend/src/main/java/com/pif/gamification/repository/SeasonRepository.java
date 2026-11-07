package com.pif.gamification.repository;

import com.pif.gamification.model.Season;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeasonRepository extends JpaRepository<Season, String> {
    Optional<Season> findFirstByStatusOrderByStartDateDesc(String status);
    List<Season> findAllByOrderByStartDateDesc();
}

