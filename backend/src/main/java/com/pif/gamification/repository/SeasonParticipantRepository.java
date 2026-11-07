package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.Season;
import com.pif.gamification.model.SeasonParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeasonParticipantRepository extends JpaRepository<SeasonParticipant, Long> {
    Optional<SeasonParticipant> findBySeasonAndUser(Season season, User user);

    @Query("SELECT sp FROM SeasonParticipant sp WHERE sp.season.id = :seasonId ORDER BY sp.seasonPoints DESC, sp.wins DESC")
    List<SeasonParticipant> findLeaderboardBySeasonId(@Param("seasonId") String seasonId);

    @Query("SELECT COUNT(sp) FROM SeasonParticipant sp WHERE sp.season.id = :seasonId")
    long countParticipantsBySeasonId(@Param("seasonId") String seasonId);

    List<SeasonParticipant> findByUserOrderByUpdatedAtDesc(User user);
}

