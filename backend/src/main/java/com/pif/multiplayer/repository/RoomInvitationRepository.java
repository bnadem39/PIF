package com.pif.multiplayer.repository;

import com.pif.multiplayer.model.RoomInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RoomInvitationRepository extends JpaRepository<RoomInvitation, UUID> {

    @Query("SELECT i FROM RoomInvitation i JOIN FETCH i.room JOIN FETCH i.sender " +
           "WHERE i.receiver.id = :receiverId AND i.status = 'PENDING' ORDER BY i.createdAt DESC")
    List<RoomInvitation> findPendingByReceiverId(@Param("receiverId") Long receiverId);

    List<RoomInvitation> findByRoomIdAndReceiverIdAndStatus(String roomId, Long receiverId, String status);

    @Modifying
    @Query("DELETE FROM RoomInvitation i WHERE i.room.id = :roomId")
    void deleteByRoomId(@Param("roomId") String roomId);
}


