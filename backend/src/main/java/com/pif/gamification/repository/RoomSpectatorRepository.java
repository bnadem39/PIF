package com.pif.gamification.repository;

import com.pif.auth.model.User;
import com.pif.gamification.model.RoomSpectator;
import com.pif.multiplayer.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
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
}

