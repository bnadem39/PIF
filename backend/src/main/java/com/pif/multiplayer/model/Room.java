package com.pif.multiplayer.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Entity
@Table(name = "game_rooms")
public class Room {

    @Id
    @Column(length = 20, nullable = false, updatable = false)
    private String id; // e.g. PIF-7842

    @Column(name = "room_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id")
    private User createdBy;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "initial_cash", nullable = false, precision = 15, scale = 2)
    private BigDecimal initialCash;

    @Column(name = "game_duration_minutes", nullable = false)
    private Integer gameDurationMinutes = 15;

    @Column(name = "tick_rate_ms", nullable = false)
    private Integer tickRateMs = 1000;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoomStatus status = RoomStatus.LOBBY;

    @Column(name = "current_simulated_date")
    private LocalDate currentSimulatedDate;

    @Column(name = "password", length = 100)
    private String password;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "allow_spectators")
    private Boolean allowSpectators = true;

    @Column(name = "max_spectators")
    private Integer maxSpectators = 50;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "room")
    private List<RoomParticipant> participants = new ArrayList<>();

    public Room() {
    }

    public Room(String name, LocalDate startDate, LocalDate endDate, BigDecimal initialCash,
                Integer gameDurationMinutes, Integer tickRateMs) {
        this.id = generateRoomCode();
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
        this.initialCash = initialCash != null ? initialCash : new BigDecimal("100000.00");
        this.gameDurationMinutes = gameDurationMinutes != null ? gameDurationMinutes : 15;
        this.tickRateMs = tickRateMs != null && tickRateMs >= 100 ? tickRateMs : 1000;
        this.status = RoomStatus.LOBBY;
        this.currentSimulatedDate = startDate;
        this.createdAt = LocalDateTime.now();
    }

    public static String generateRoomCode() {
        int code = 1000 + new Random().nextInt(9000);
        return "PIF-" + code;
    }

    @PrePersist
    protected void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = generateRoomCode();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = RoomStatus.LOBBY;
        }
        if (this.currentSimulatedDate == null) {
            this.currentSimulatedDate = this.startDate;
        }
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

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
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
        return gameDurationMinutes != null ? gameDurationMinutes : 15;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public boolean isPasswordProtected() {
        return password != null && !password.isBlank();
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public List<RoomParticipant> getParticipants() {
        return participants;
    }

    public void setParticipants(List<RoomParticipant> participants) {
        this.participants = participants;
    }

    public Boolean getAllowSpectators() {
        return allowSpectators != null ? allowSpectators : true;
    }

    public void setAllowSpectators(Boolean allowSpectators) {
        this.allowSpectators = allowSpectators;
    }

    public Integer getMaxSpectators() {
        return maxSpectators != null ? maxSpectators : 50;
    }

    public void setMaxSpectators(Integer maxSpectators) {
        this.maxSpectators = maxSpectators;
    }
}
