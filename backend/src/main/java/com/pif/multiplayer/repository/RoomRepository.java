package com.pif.multiplayer.repository;

import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, String> {

    List<Room> findByStatusOrderByCreatedAtDesc(RoomStatus status);

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.createdBy LEFT JOIN FETCH r.participants p LEFT JOIN FETCH p.user WHERE r.id = :id")
    Optional<Room> findByIdWithParticipants(@Param("id") String id);

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.createdBy LEFT JOIN FETCH r.participants")
    List<Room> findAllWithCreatorAndParticipants();

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.createdBy LEFT JOIN FETCH r.participants WHERE r.status = :status ORDER BY r.createdAt DESC")
    List<Room> findByStatusWithCreatorAndParticipants(@Param("status") RoomStatus status);

    List<Room> findByStatus(RoomStatus status);
}
