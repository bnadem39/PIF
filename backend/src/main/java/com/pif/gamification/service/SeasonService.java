package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.gamification.dto.SeasonDto;
import com.pif.gamification.dto.SeasonParticipantDto;
import com.pif.gamification.model.Season;
import com.pif.gamification.model.SeasonParticipant;
import com.pif.gamification.repository.SeasonParticipantRepository;
import com.pif.gamification.repository.SeasonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SeasonService {

    private static final Logger log = LoggerFactory.getLogger(SeasonService.class);

    private final SeasonRepository seasonRepository;
    private final SeasonParticipantRepository participantRepository;
    private final CelebrationService celebrationService;

    public SeasonService(SeasonRepository seasonRepository,
                         SeasonParticipantRepository participantRepository,
                         CelebrationService celebrationService) {
        this.seasonRepository = seasonRepository;
        this.participantRepository = participantRepository;
        this.celebrationService = celebrationService;
    }

    /**
     * Récupère la saison active actuelle avec son classement.
     */
    @Transactional(readOnly = true)
    public Optional<SeasonDto> getActiveSeason(User currentUser) {
        Optional<Season> activeOpt = seasonRepository.findFirstByStatusOrderByStartDateDesc("ACTIVE");
        if (activeOpt.isEmpty()) return Optional.empty();

        Season season = activeOpt.get();
        long count = participantRepository.countParticipantsBySeasonId(season.getId());
        SeasonParticipant myPart = null;
        if (currentUser != null) {
            myPart = participantRepository.findBySeasonAndUser(season, currentUser).orElse(null);
        }

        SeasonDto dto = SeasonDto.fromEntity(season, count, myPart);

        // Top 50 du Leaderboard
        List<SeasonParticipantDto> leaderboard = participantRepository.findLeaderboardBySeasonId(season.getId())
                .stream()
                .limit(50)
                .map(SeasonParticipantDto::fromEntity)
                .collect(Collectors.toList());

        for (int i = 0; i < leaderboard.size(); i++) {
            leaderboard.get(i).setRankPosition(i + 1);
        }
        dto.setLeaderboard(leaderboard);

        return Optional.of(dto);
    }

    /**
     * Liste des saisons (Actives, terminées, archivées).
     */
    @Transactional(readOnly = true)
    public List<SeasonDto> getAllSeasons() {
        return seasonRepository.findAllByOrderByStartDateDesc().stream()
                .map(s -> {
                    long count = participantRepository.countParticipantsBySeasonId(s.getId());
                    return SeasonDto.fromEntity(s, count, null);
                })
                .collect(Collectors.toList());
    }

    /**
     * Enregistre le résultat d'un match multijoueur terminé dans la saison active.
     */
    @Transactional
    public void recordMatchResult(User user, boolean isWinner, BigDecimal finalEquity, BigDecimal maxDrawdown) {
        if (user == null) return;
        Optional<Season> activeOpt = seasonRepository.findFirstByStatusOrderByStartDateDesc("ACTIVE");
        if (activeOpt.isEmpty()) return;

        Season season = activeOpt.get();
        SeasonParticipant part = participantRepository.findBySeasonAndUser(season, user)
                .orElseGet(() -> new SeasonParticipant(season, user));

        // Formule de points de saison transparente :
        // Victoire = 100 pts, Participation = 25 pts, Bonus Drawdown contrôlé (<5%) = 30 pts
        int pointsGain = 25;
        if (isWinner) {
            pointsGain += 100;
            part.setWins(part.getWins() + 1);
        }
        if (maxDrawdown != null && maxDrawdown.compareTo(new BigDecimal("5.00")) <= 0) {
            pointsGain += 30; // Récompense la rigueur de risque
        }

        part.setMatchesPlayed(part.getMatchesPlayed() + 1);
        part.setSeasonPoints(part.getSeasonPoints() + pointsGain);

        if (finalEquity != null && finalEquity.compareTo(part.getBestEquity()) > 0) {
            part.setBestEquity(finalEquity);
        }
        if (maxDrawdown != null && maxDrawdown.compareTo(part.getMaxDrawdown()) > 0) {
            part.setMaxDrawdown(maxDrawdown);
        }
        part.setUpdatedAt(LocalDateTime.now());

        participantRepository.save(part);
        log.info("[SEASON] {} points de saison attribués à {} (Total: {})", pointsGain, user.getUsernameAlias(), part.getSeasonPoints());
    }

    /**
     * Clôture administrative d'une saison et distribution transactionnelle des récompenses.
     */
    @Transactional
    public SeasonDto finalizeSeason(String seasonId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new IllegalArgumentException("Saison introuvable: " + seasonId));

        if (!"ACTIVE".equals(season.getStatus())) {
            throw new IllegalStateException("Seule une saison active peut être finalisée.");
        }

        List<SeasonParticipant> participants = participantRepository.findLeaderboardBySeasonId(seasonId);
        for (int i = 0; i < participants.size(); i++) {
            SeasonParticipant sp = participants.get(i);
            int rank = i + 1;
            sp.setRankPosition(rank);

            String tier = (rank == 1) ? "TOP_1" : (rank <= 3) ? "TOP_3" : (rank <= 10) ? "TOP_10" : "PARTICIPATION";
            sp.setRewardTier(tier);

            if (rank == 1) {
                // Célébration 3D de Champion de Saison
                celebrationService.triggerCelebration(
                        sp.getUser(),
                        "SEASON_CHAMPION",
                        "Grand Champion de Saison BVMT !",
                        "1ère place sur le podium officiel · Trophée Mythique 3D accordé",
                        "MYTHIC",
                        2500,
                        "{\"seasonId\": \"" + seasonId + "\", \"rank\": 1}"
                );
            }
            participantRepository.save(sp);
        }

        season.setStatus("FINISHED");
        Season saved = seasonRepository.save(season);
        log.info("[SEASON] Saison {} finalisée avec succès. {} participants récompensés.", seasonId, participants.size());
        return SeasonDto.fromEntity(saved, participants.size(), null);
    }
}

