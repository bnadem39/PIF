package com.pif.multiplayer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class RoomCreateDto {

    @NotBlank(message = "Le nom de la room est obligatoire")
    private String name;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDate endDate;

    private BigDecimal initialCash = new BigDecimal("100000.00");

    private Integer gameDurationMinutes = 15;

    private Integer tickRateMs = 1000;

    private String password;

    public RoomCreateDto() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
