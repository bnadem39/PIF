package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.gamification.dto.PlayerCareerDto;
import com.pif.gamification.model.CareerHistory;
import com.pif.gamification.model.CareerStage;
import com.pif.gamification.model.PlayerCareer;
import com.pif.gamification.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CareerService {

    private static final Logger log = LoggerFactory.getLogger(CareerService.class);

    private final PlayerCareerRepository playerCareerRepository;
    private final CareerStageRepository careerStageRepository;
    private final CareerHistoryRepository careerHistoryRepository;
    private final PlayerSkillRepository playerSkillRepository;
    private final CelebrationService celebrationService;

    public CareerService(PlayerCareerRepository playerCareerRepository,
                         CareerStageRepository careerStageRepository,
                         CareerHistoryRepository careerHistoryRepository,
                         PlayerSkillRepository playerSkillRepository,
                         CelebrationService celebrationService) {
        this.playerCareerRepository = playerCareerRepository;
        this.careerStageRepository = careerStageRepository;
        this.careerHistoryRepository = careerHistoryRepository;
        this.playerSkillRepository = playerSkillRepository;
        this.celebrationService = celebrationService;
    }

    /**
     * Récupère le tableau de bord de carrière d'un trader.
     */
    @Transactional(readOnly = true)
    public PlayerCareerDto getCareerDashboard(User user) {
        if (user == null) return null;

        List<CareerStage> allStages = careerStageRepository.findAllByOrderByStageOrderAsc();
        CareerStage stage1 = allStages.isEmpty() ? null : allStages.get(0);

        PlayerCareer career = playerCareerRepository.findByUser(user)
                .orElseGet(() -> new PlayerCareer(user, stage1));

        PlayerCareerDto dto = new PlayerCareerDto();
        dto.setId(career.getId());
        dto.setUserId(user.getId());
        dto.setUsername(user.getUsernameAlias());
        dto.setLevel(user.getLevel() != null ? user.getLevel() : 1);
        dto.setExp(user.getExp() != null ? user.getExp() : 0);
        dto.setCareerPoints(career.getCareerPoints());
        dto.setPromotedAt(career.getPromotedAt());
        dto.setAllStages(allStages);

        CareerStage current = career.getCurrentStage() != null ? career.getCurrentStage() : stage1;
        dto.setCurrentStage(current);
        dto.setCurrentStageOrder(current != null ? current.getStageOrder() : 1);
        dto.setCurrentTitle(career.getCurrentTitle());

        // Prochain palier de carrière
        int nextOrder = (current != null ? current.getStageOrder() : 1) + 1;
        CareerStage next = allStages.stream()
                .filter(s -> s.getStageOrder() == nextOrder)
                .findFirst()
                .orElse(null);
        dto.setNextStage(next);

        if (next != null) {
            int currentExp = user.getExp() != null ? user.getExp() : 0;
            int needed = next.getRequiredExp();
            int base = current != null ? current.getRequiredExp() : 0;
            int progress = Math.max(0, Math.min(100, (int) Math.round(((double) (currentExp - base) / Math.max(1, needed - base)) * 100.0)));
            dto.setProgressToNextStagePercentage(progress);
        } else {
            dto.setProgressToNextStagePercentage(100);
        }

        // Historique des promotions
        List<PlayerCareerDto.CareerHistoryDto> history = careerHistoryRepository.findByUserOrderByPromotedAtDesc(user)
                .stream()
                .map(PlayerCareerDto.CareerHistoryDto::fromEntity)
                .collect(Collectors.toList());
        dto.setHistory(history);

        return dto;
    }

    /**
     * Évalue et promeut le trader au palier supérieur si les conditions sont remplies.
     */
    @Transactional
    public boolean evaluatePromotion(User user) {
        if (user == null) return false;

        List<CareerStage> allStages = careerStageRepository.findAllByOrderByStageOrderAsc();
        CareerStage stage1 = allStages.isEmpty() ? null : allStages.get(0);

        PlayerCareer career = playerCareerRepository.findByUser(user)
                .orElseGet(() -> playerCareerRepository.save(new PlayerCareer(user, stage1)));

        int currentOrder = career.getCurrentStage() != null ? career.getCurrentStage().getStageOrder() : 1;
        int nextOrder = currentOrder + 1;

        CareerStage nextStage = allStages.stream()
                .filter(s -> s.getStageOrder() == nextOrder)
                .findFirst()
                .orElse(null);

        if (nextStage == null) return false; // Déjà au sommet ("Légende Vivante du Trading")

        int userLevel = user.getLevel() != null ? user.getLevel() : 1;
        int userExp = user.getExp() != null ? user.getExp() : 0;
        int userWins = user.getWins() != null ? user.getWins() : 0;
        long skillsCount = playerSkillRepository.countByUserAndStatus(user, "COMPLETED") +
                playerSkillRepository.countByUserAndStatus(user, "MASTERED");

        boolean canPromote = userLevel >= nextStage.getRequiredLevel() &&
                userExp >= nextStage.getRequiredExp() &&
                userWins >= nextStage.getRequiredWins() &&
                skillsCount >= nextStage.getRequiredSkillsCount();

        if (canPromote) {
            String oldTitle = career.getCurrentTitle();
            career.setCurrentStage(nextStage);
            career.setCurrentTitle(nextStage.getTitle());
            career.setPromotedAt(LocalDateTime.now());
            career.setCareerPoints(career.getCareerPoints() + 500);
            playerCareerRepository.save(career);

            // Enregistrement historique
            CareerHistory history = new CareerHistory(
                    user,
                    nextStage.getStageOrder(),
                    nextStage.getTitle(),
                    "Promotion méritée : Niveau " + userLevel + ", " + userWins + " victoires, " + skillsCount + " compétences validées."
            );
            careerHistoryRepository.save(history);

            // Célébration 3D de Promotion de Carrière
            celebrationService.triggerCelebration(
                    user,
                    "CAREER_PROMOTION",
                    "Promotion : " + nextStage.getTitle(),
                    "Félicitations pour votre ascension professionnelle · Nouveau Titre accordé",
                    "LEGENDARY",
                    1000,
                    "{\"oldTitle\": \"" + oldTitle + "\", \"newTitle\": \"" + nextStage.getTitle() + "\", \"stage\": " + nextStage.getStageOrder() + "}"
            );

            log.info("[CAREER] {} promu avec succès au rang de '{}' (Palier {})", user.getUsernameAlias(), nextStage.getTitle(), nextStage.getStageOrder());
            return true;
        }

        return false;
    }
}

