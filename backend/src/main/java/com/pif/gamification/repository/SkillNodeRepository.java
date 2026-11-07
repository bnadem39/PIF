package com.pif.gamification.repository;

import com.pif.gamification.model.SkillNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SkillNodeRepository extends JpaRepository<SkillNode, String> {
    List<SkillNode> findAllByOrderByBranchAscOrderIndexAsc();
    List<SkillNode> findByBranchOrderByOrderIndexAsc(String branch);
}

