package com.pif.multiplayer.model;

import com.pif.auth.model.User;
import jakarta.persistence.*;
import org.springframework.data.domain.Persistable;
import java.math.BigDecimal;

@Entity
@Table(name = "room_participants")
public class RoomParticipant implements Persistable<RoomParticipantId> {

    @EmbeddedId
    private RoomParticipantId id;

    @Transient
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return this.isNew;
    }

    @PostPersist
    @PostLoad
    public void markNotNew() {
        this.isNew = false;
    }

    public void setNew(boolean isNew) {
        this.isNew = isNew;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roomId")
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("playerId")
    @JoinColumn(name = "player_id", nullable = false)
    private User user;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal cash;

    @Column(name = "total_equity", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalEquity;

    @Column(name = "pnl_percentage", precision = 8, scale = 2)
    private BigDecimal pnlPercentage = BigDecimal.ZERO;

    @Column(name = "is_ready", nullable = false)
    private Boolean isReady = false;

    @Transient
    private Integer rank = 0;

    public RoomParticipant() {
    }

    public RoomParticipant(Room room, User user, BigDecimal initialCash) {
        this.id = new RoomParticipantId(room.getId(), user.getId());
        this.room = room;
        this.user = user;
        this.cash = initialCash != null ? initialCash : new BigDecimal("100000.00");
        this.totalEquity = this.cash;
        this.pnlPercentage = BigDecimal.ZERO;
        this.isReady = false;
        this.rank = 0;
    }

    public RoomParticipantId getId() {
        return id;
    }

    public void setId(RoomParticipantId id) {
        this.id = id;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(Room room) {
        this.room = room;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public BigDecimal getCash() {
        return cash;
    }

    public void setCash(BigDecimal cash) {
        this.cash = cash;
    }

    public BigDecimal getTotalEquity() {
        return totalEquity;
    }

    public void setTotalEquity(BigDecimal totalEquity) {
        this.totalEquity = totalEquity;
    }

    public BigDecimal getPnlPercentage() {
        return pnlPercentage != null ? pnlPercentage : BigDecimal.ZERO;
    }

    public void setPnlPercentage(BigDecimal pnlPercentage) {
        this.pnlPercentage = pnlPercentage;
    }

    public Boolean getIsReady() {
        return isReady != null ? isReady : false;
    }

    public void setIsReady(Boolean isReady) {
        this.isReady = isReady;
    }

    public Integer getRank() {
        return rank != null ? rank : 0;
    }

    public void setRank(Integer rank) {
        this.rank = rank;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RoomParticipant that = (RoomParticipant) o;
        return java.util.Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(id);
    }
}
