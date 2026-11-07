package com.pif.multiplayer.dto;

import java.time.LocalDate;
import java.util.List;

public class RoomLeaderboardDto {

    private String roomId;
    private String roomName;
    private LocalDate simulatedDate;
    private List<RoomParticipantDto> rankings;

    public RoomLeaderboardDto() {
    }

    public RoomLeaderboardDto(String roomId, String roomName, LocalDate simulatedDate, List<RoomParticipantDto> rankings) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.simulatedDate = simulatedDate;
        this.rankings = rankings;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public LocalDate getSimulatedDate() {
        return simulatedDate;
    }

    public void setSimulatedDate(LocalDate simulatedDate) {
        this.simulatedDate = simulatedDate;
    }

    public List<RoomParticipantDto> getRankings() {
        return rankings;
    }

    public void setRankings(List<RoomParticipantDto> rankings) {
        this.rankings = rankings;
    }
}
