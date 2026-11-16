package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.RoomSpectator;
import com.pif.multiplayer.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomSpectatorRepository extends JpaRepository<RoomSpectator, Long> {
    List<RoomSpectator> findByRoom(Room room);
    long countByRoom(Room room);
    Optional<RoomSpectator> findByRoomAndUser(Room room, User user);
    void deleteByRoomAndUser(Room room, User user);
    void deleteByRoom(Room room);

    /**
     * Inscription idempotente : si deux requêtes arrivent en même temps (double appel, double clic),
     * la seconde ne fait rien au lieu de violer la contrainte unique uk_room_spectator.
     */
    @Modifying
    @Query(value = "INSERT INTO room_spectators (joined_at, room_id, user_id) "
            + "VALUES (CURRENT_TIMESTAMP, :roomId, :userId) ON CONFLICT DO NOTHING", nativeQuery = true)
    void insertIfAbsent(@Param("roomId") String roomId, @Param("userId") Long userId);
}

