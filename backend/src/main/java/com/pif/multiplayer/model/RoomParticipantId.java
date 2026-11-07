package com.pif.multiplayer.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class RoomParticipantId implements Serializable {

    @Column(name = "room_id", length = 20, nullable = false)
    private String roomId;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    public RoomParticipantId() {
    }

    public RoomParticipantId(String roomId, Long playerId) {
        this.roomId = roomId;
        this.playerId = playerId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoomParticipantId that = (RoomParticipantId) o;
        return Objects.equals(roomId, that.roomId) && Objects.equals(playerId, that.playerId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roomId, playerId);
    }
}
