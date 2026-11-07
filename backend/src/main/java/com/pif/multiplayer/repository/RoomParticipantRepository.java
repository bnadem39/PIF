package com.pif.multiplayer.repository;

import com.pif.multiplayer.model.RoomParticipant;
import com.pif.multiplayer.model.RoomParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, RoomParticipantId> {

    @Query("SELECT p FROM RoomParticipant p JOIN FETCH p.user WHERE p.id.roomId = :roomId ORDER BY p.totalEquity DESC")
    List<RoomParticipant> findByRoomIdOrderByTotalEquityDesc(@Param("roomId") String roomId);

    @Query("SELECT p FROM RoomParticipant p JOIN FETCH p.user WHERE p.id.roomId = :roomId AND p.id.playerId = :playerId")
    Optional<RoomParticipant> findByRoomIdAndPlayerId(@Param("roomId") String roomId, @Param("playerId") Long playerId);

    long countByIdRoomId(String roomId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM RoomParticipant p WHERE p.id.roomId = :roomId")
    void deleteByRoomId(@Param("roomId") String roomId);
}
