package com.pif.multiplayer.dto;

import com.pif.multiplayer.model.RoomInvitation;
import java.time.LocalDateTime;
import java.util.UUID;

public class RoomInvitationDto {

    private UUID id;
    private String roomId;
    private String roomName;
    private Long senderId;
    private String senderUsername;
    private Integer senderElo;
    private String senderTier;
    private String status;
    private LocalDateTime createdAt;

    public RoomInvitationDto() {
    }

    public static RoomInvitationDto fromEntity(RoomInvitation inv) {
        RoomInvitationDto dto = new RoomInvitationDto();
        dto.setId(inv.getId());
        dto.setRoomId(inv.getRoom().getId());
        dto.setRoomName(inv.getRoom().getName());
        dto.setSenderId(inv.getSender().getId());
        dto.setSenderUsername(inv.getSender().getUsernameAlias());
        dto.setSenderElo(inv.getSender().getEloRating());
        dto.setSenderTier(inv.getSender().getTier());
        dto.setStatus(inv.getStatus());
        dto.setCreatedAt(inv.getCreatedAt());
        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public Integer getSenderElo() {
        return senderElo;
    }

    public void setSenderElo(Integer senderElo) {
        this.senderElo = senderElo;
    }

    public String getSenderTier() {
        return senderTier;
    }

    public void setSenderTier(String senderTier) {
        this.senderTier = senderTier;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

