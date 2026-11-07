package com.pif.multiplayer.dto;

import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class RoomDto {

    private String id;
    private String name;
    private String creatorUsername;
    private String creatorProfileImageUrl;
    private Integer creatorLevel;
    private String creatorTier;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal initialCash;
    private Integer gameDurationMinutes;
    private Integer tickRateMs;
    private RoomStatus status;
    private LocalDate currentSimulatedDate;
    private LocalDateTime createdAt;
    private int participantCount;
    private List<RoomParticipantDto> participants;
    private Boolean isPasswordProtected;
    private LocalDateTime startedAt;
    private Long remainingSeconds;

    public RoomDto() {
    }

    public static RoomDto fromEntity(Room room, boolean includeParticipants) {
        RoomDto dto = new RoomDto();
        dto.setId(room.getId());
        dto.setName(room.getName());
        if (room.getCreatedBy() != null) {
            dto.setCreatorUsername(room.getCreatedBy().getUsernameAlias());
            dto.setCreatorProfileImageUrl(room.getCreatedBy().getProfileImageUrl());
            dto.setCreatorLevel(room.getCreatedBy().getLevel());
            dto.setCreatorTier(room.getCreatedBy().getTier());
        }
        dto.setStartDate(room.getStartDate());
        dto.setEndDate(room.getEndDate());
        dto.setInitialCash(room.getInitialCash());
        dto.setGameDurationMinutes(room.getGameDurationMinutes());
        dto.setTickRateMs(room.getTickRateMs());
        dto.setStatus(room.getStatus());
        dto.setCurrentSimulatedDate(room.getCurrentSimulatedDate());
        dto.setCreatedAt(room.getCreatedAt());
        dto.setIsPasswordProtected(room.isPasswordProtected());
        dto.setStartedAt(room.getStartedAt());
        if (room.getStartedAt() != null) {
            long totalSecs = (room.getGameDurationMinutes() != null ? room.getGameDurationMinutes() : 15) * 60L;
            long elapsedSecs = java.time.Duration.between(room.getStartedAt(), java.time.LocalDateTime.now()).getSeconds();
            dto.setRemainingSeconds(Math.max(0, totalSecs - elapsedSecs));
        } else {
            dto.setRemainingSeconds((room.getGameDurationMinutes() != null ? room.getGameDurationMinutes() : 15) * 60L);
        }
        if (room.getParticipants() != null) {
            dto.setParticipantCount(room.getParticipants().size());
            if (includeParticipants) {
                dto.setParticipants(room.getParticipants().stream()
                        .map(RoomParticipantDto::fromEntity)
                        .collect(Collectors.toList()));
            }
        }
        return dto;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCreatorUsername() {
        return creatorUsername;
    }

    public void setCreatorUsername(String creatorUsername) {
        this.creatorUsername = creatorUsername;
    }

    public String getCreatorProfileImageUrl() {
        return creatorProfileImageUrl;
    }

    public void setCreatorProfileImageUrl(String creatorProfileImageUrl) {
        this.creatorProfileImageUrl = creatorProfileImageUrl;
    }

    public Integer getCreatorLevel() {
        return creatorLevel;
    }

    public void setCreatorLevel(Integer creatorLevel) {
        this.creatorLevel = creatorLevel;
    }

    public String getCreatorTier() {
        return creatorTier;
    }

    public void setCreatorTier(String creatorTier) {
        this.creatorTier = creatorTier;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public BigDecimal getInitialCash() {
        return initialCash;
    }

    public void setInitialCash(BigDecimal initialCash) {
        this.initialCash = initialCash;
    }

    public Integer getGameDurationMinutes() {
        return gameDurationMinutes;
    }

    public void setGameDurationMinutes(Integer gameDurationMinutes) {
        this.gameDurationMinutes = gameDurationMinutes;
    }

    public Integer getTickRateMs() {
        return tickRateMs;
    }

    public void setTickRateMs(Integer tickRateMs) {
        this.tickRateMs = tickRateMs;
    }

    public RoomStatus getStatus() {
        return status;
    }

    public void setStatus(RoomStatus status) {
        this.status = status;
    }

    public LocalDate getCurrentSimulatedDate() {
        return currentSimulatedDate;
    }

    public void setCurrentSimulatedDate(LocalDate currentSimulatedDate) {
        this.currentSimulatedDate = currentSimulatedDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public int getParticipantCount() {
        return participantCount;
    }

    public void setParticipantCount(int participantCount) {
        this.participantCount = participantCount;
    }

    public List<RoomParticipantDto> getParticipants() {
        return participants;
    }

    public void setParticipants(List<RoomParticipantDto> participants) {
        this.participants = participants;
    }

    public Boolean getIsPasswordProtected() {
        return isPasswordProtected;
    }

    public void setIsPasswordProtected(Boolean isPasswordProtected) {
        this.isPasswordProtected = isPasswordProtected;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public Long getRemainingSeconds() {
        return remainingSeconds;
    }

    public void setRemainingSeconds(Long remainingSeconds) {
        this.remainingSeconds = remainingSeconds;
    }
}
