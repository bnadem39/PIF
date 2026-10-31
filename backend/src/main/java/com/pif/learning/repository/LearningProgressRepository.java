package com.pif.learning.repository;

import com.pif.learning.model.ItemType;
import com.pif.learning.model.LearningProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, Long> {

    List<LearningProgress> findByUserId(Long userId);

    Optional<LearningProgress> findByUserIdAndItemTypeAndItemId(Long userId, ItemType itemType, String itemId);

    /** [userId, total des points], du meilleur au moins bon. */
    @Query("select p.userId, sum(p.points) from LearningProgress p group by p.userId having sum(p.points) > 0 order by sum(p.points) desc")
    List<Object[]> leaderboard(org.springframework.data.domain.Pageable page);
}
