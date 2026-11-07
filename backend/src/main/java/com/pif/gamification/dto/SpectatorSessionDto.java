package com.pif.gamification.dto;

import com.pif.multiplayer.dto.RoomDto;
import java.time.LocalDateTime;

public class SpectatorSessionDto {
    private String roomId;
    private Long spectatorId;
    private String spectatorUsername;
    private long totalSpectators;
    private boolean isSpectator;
    private LocalDateTime joinedAt;
    private RoomDto room;

    public SpectatorSessionDto() {}

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public Long getSpectatorId() { return spectatorId; }
    public void setSpectatorId(Long spectatorId) { this.spectatorId = spectatorId; }

    public String getSpectatorUsername() { return spectatorUsername; }
    public void setSpectatorUsername(String spectatorUsername) { this.spectatorUsername = spectatorUsername; }

    public long getTotalSpectators() { return totalSpectators; }
    public void setTotalSpectators(long totalSpectators) { this.totalSpectators = totalSpectators; }

    public boolean isSpectator() { return isSpectator; }
    public void setSpectator(boolean spectator) { isSpectator = spectator; }

    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }

    public RoomDto getRoom() { return room; }
    public void setRoom(RoomDto room) { this.room = room; }
}

