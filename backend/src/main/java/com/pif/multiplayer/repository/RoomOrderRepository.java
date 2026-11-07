package com.pif.multiplayer.repository;

import com.pif.multiplayer.model.RoomOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomOrderRepository extends JpaRepository<RoomOrder, UUID> {

    @Query("SELECT o FROM RoomOrder o JOIN FETCH o.user WHERE o.room.id = :roomId ORDER BY o.createdAt DESC")
    List<RoomOrder> findByRoomIdOrderByCreatedAtDesc(@Param("roomId") String roomId);

    @Query("SELECT o FROM RoomOrder o WHERE o.room.id = :roomId AND o.user.id = :userId ORDER BY o.createdAt DESC")
    List<RoomOrder> findByRoomIdAndUserIdOrderByCreatedAtDesc(@Param("roomId") String roomId, @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM RoomOrder o WHERE o.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") String roomId);

    long countByUserId(Long userId);
}


