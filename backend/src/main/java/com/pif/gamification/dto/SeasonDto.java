package com.pif.gamification.dto;

import com.pif.gamification.model.Season;
import com.pif.gamification.model.SeasonParticipant;

import java.time.LocalDateTime;
import java.util.List;

public class SeasonDto {
    private String id;
    private String name;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status;
    private String rulesJson;
    private String rewardsJson;
    private long participantCount;
    private SeasonParticipantDto myParticipation;
    private List<SeasonParticipantDto> leaderboard;

    public SeasonDto() {}

    public static SeasonDto fromEntity(Season season, long participantCount, SeasonParticipant myPart) {
        SeasonDto dto = new SeasonDto();
        dto.setId(season.getId());
        dto.setName(season.getName());
        dto.setDescription(season.getDescription());
        dto.setStartDate(season.getStartDate());
        dto.setEndDate(season.getEndDate());
        dto.setStatus(season.getStatus());
        dto.setRulesJson(season.getRulesJson());
        dto.setRewardsJson(season.getRewardsJson());
        dto.setParticipantCount(participantCount);
        if (myPart != null) {
            dto.setMyParticipation(SeasonParticipantDto.fromEntity(myPart));
        }
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRulesJson() { return rulesJson; }
    public void setRulesJson(String rulesJson) { this.rulesJson = rulesJson; }

    public String getRewardsJson() { return rewardsJson; }
    public void setRewardsJson(String rewardsJson) { this.rewardsJson = rewardsJson; }

    public long getParticipantCount() { return participantCount; }
    public void setParticipantCount(long participantCount) { this.participantCount = participantCount; }

    public SeasonParticipantDto getMyParticipation() { return myParticipation; }
    public void setMyParticipation(SeasonParticipantDto myParticipation) { this.myParticipation = myParticipation; }

    public List<SeasonParticipantDto> getLeaderboard() { return leaderboard; }
    public void setLeaderboard(List<SeasonParticipantDto> leaderboard) { this.leaderboard = leaderboard; }
}

