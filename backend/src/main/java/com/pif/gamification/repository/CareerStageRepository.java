package com.pif.gamification.repository;

import com.pif.gamification.model.CareerStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CareerStageRepository extends JpaRepository<CareerStage, Integer> {
    List<CareerStage> findAllByOrderByStageOrderAsc();
}

