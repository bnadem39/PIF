package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.gamification.dto.AchievementDto;
import com.pif.gamification.model.Achievement;
import com.pif.gamification.model.PlayerAchievement;
import com.pif.gamification.repository.AchievementRepository;
import com.pif.gamification.repository.PlayerAchievementRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AchievementService {

    private static final Logger log = LoggerFactory.getLogger(AchievementService.class);

    private final AchievementRepository achievementRepository;
    private final PlayerAchievementRepository playerAchievementRepository;
    private final UserRepository userRepository;
    private final CelebrationService celebrationService;

    public AchievementService(AchievementRepository achievementRepository,
                              PlayerAchievementRepository playerAchievementRepository,
                              UserRepository userRepository,
                              CelebrationService celebrationService) {
        this.achievementRepository = achievementRepository;
        this.playerAchievementRepository = playerAchievementRepository;
        this.userRepository = userRepository;
        this.celebrationService = celebrationService;
    }

    /**
     * Récupère la liste de tous les succès avec la progression du joueur.
     */
    @Transactional(readOnly = true)
    public List<AchievementDto> getAchievementsForUser(User user) {
        List<Achievement> all = achievementRepository.findAll();
        if (user == null) {
            return all.stream().map(a -> AchievementDto.fromEntity(a, null)).collect(Collectors.toList());
        }

        Map<String, PlayerAchievement> map = playerAchievementRepository.findByUser(user).stream()
                .collect(Collectors.toMap(pa -> pa.getAchievement().getId(), pa -> pa));

        return all.stream()
                .map(a -> AchievementDto.fromEntity(a, map.get(a.getId())))
                .collect(Collectors.toList());
    }

    /**
     * Récupère la Salle des Trophées publique d'un utilisateur.
     */
    @Transactional(readOnly = true)
    public List<AchievementDto> getPublicTrophyRoom(User targetUser) {
        if (targetUser == null) return List.of();
        return playerAchievementRepository.findByUserAndUnlockedTrue(targetUser).stream()
                .map(pa -> AchievementDto.fromEntity(pa.getAchievement(), pa))
                .collect(Collectors.toList());
    }

    /**
     * Évalue et incrémente la progression d'un succès (Backend Authoritative).
     */
    @Transactional
    public void evaluateProgress(User user, String achievementId, int count) {
        if (user == null || achievementId == null) return;

        Achievement ach = achievementRepository.findById(achievementId).orElse(null);
        if (ach == null) return;

        PlayerAchievement pa = playerAchievementRepository.findByUserAndAchievement(user, ach)
                .orElseGet(() -> new PlayerAchievement(user, ach));

        if (Boolean.TRUE.equals(pa.getUnlocked())) {
            return; // Déjà débloqué et récompensé
        }

        pa.setCurrentProgress(pa.getCurrentProgress() + count);

        if (pa.getCurrentProgress() >= ach.getTargetCount()) {
            pa.setCurrentProgress(ach.getTargetCount());
            pa.setUnlocked(true);
            pa.setUnlockedAt(LocalDateTime.now());
            playerAchievementRepository.save(pa);

            // Récompense en EXP
            int expGain = ach.getExpReward() != null ? ach.getExpReward() : 150;
            user.setExp((user.getExp() != null ? user.getExp() : 0) + expGain);
            userRepository.save(user);

            // Déclenchement de la célébration 3D avec déballage de trophée
            celebrationService.triggerCelebration(
                    user,
                    "TROPHY_UNLOCKED",
                    ach.getName(),
                    ach.getDescription() + " · +" + expGain + " EXP",
                    ach.getRarity(),
                    expGain,
                    "{\"achievementId\": \"" + ach.getId() + "\", \"rarity\": \"" + ach.getRarity() + "\"}"
            );

            log.info("[ACHIEVEMENT] Succès débloqué : '{}' pour {} (Rareté: {})", ach.getName(), user.getUsernameAlias(), ach.getRarity());
        } else {
            playerAchievementRepository.save(pa);
        }
    }

    /**
     * Épingler un trophée sur le profil public du joueur.
     */
    @Transactional
    public AchievementDto togglePinTrophy(String achievementId, User user) {
        if (user == null) throw new IllegalArgumentException("Non authentifié.");

        Achievement ach = achievementRepository.findById(achievementId)
                .orElseThrow(() -> new IllegalArgumentException("Succès introuvable."));

        PlayerAchievement pa = playerAchievementRepository.findByUserAndAchievement(user, ach)
                .orElseThrow(() -> new IllegalStateException("Succès non encore débloqué."));

        if (!Boolean.TRUE.equals(pa.getUnlocked())) {
            throw new IllegalStateException("Vous ne pouvez épingler qu'un trophée débloqué.");
        }

        pa.setIsPinned(!Boolean.TRUE.equals(pa.getIsPinned()));
        PlayerAchievement saved = playerAchievementRepository.save(pa);
        return AchievementDto.fromEntity(ach, saved);
    }
}

