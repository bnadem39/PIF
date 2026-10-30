package com.pif.stresstest.repository;

import com.pif.stresstest.model.StressScenario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StressScenarioRepository extends JpaRepository<StressScenario, Long> {

    boolean existsByCode(String code);

    List<StressScenario> findAllByOrderByPresetDescIdAsc();
}
