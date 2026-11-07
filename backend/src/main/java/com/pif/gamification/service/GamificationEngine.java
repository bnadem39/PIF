package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.gamification.model.SkillNode;
import com.pif.gamification.repository.PlayerSkillRepository;
import com.pif.gamification.repository.SkillNodeRepository;
import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomParticipant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Moteur Central d'Orchestration Gamifiée.
 * Fait communiquer et interagir de manière synchrone et autoritaire :
 * - Mode Spectateur
 * - Saisons Compétitives
 * - Arbre de Compétences RPG
 * - Succès & Trophées
 * - Carrière Professionnelle
 * - Célébrations 3D
 */
@Service
public class GamificationEngine {

    private static final Logger log = LoggerFactory.getLogger(GamificationEngine.class);

    private final SeasonService seasonService;
    private final SkillService skillService;
    private final AchievementService achievementService;
    private final CareerService careerService;
    private final CelebrationService celebrationService;
    private final SkillNodeRepository skillRepository;
    private final PlayerSkillRepository playerSkillRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final com.pif.learning.repository.LearningProgressRepository learningProgressRepository;

    public GamificationEngine(SeasonService seasonService,
                              SkillService skillService,
                              AchievementService achievementService,
                              CareerService careerService,
                              CelebrationService celebrationService,
                              SkillNodeRepository skillRepository,
                              PlayerSkillRepository playerSkillRepository,
                              SimpMessagingTemplate messagingTemplate,
                              com.pif.learning.repository.LearningProgressRepository learningProgressRepository) {
        this.seasonService = seasonService;
        this.skillService = skillService;
        this.achievementService = achievementService;
        this.careerService = careerService;
        this.celebrationService = celebrationService;
        this.skillRepository = skillRepository;
        this.playerSkillRepository = playerSkillRepository;
        this.messagingTemplate = messagingTemplate;
        this.learningProgressRepository = learningProgressRepository;
    }

    /**
     * Déclenché lors de la clôture officielle d'une arène multijoueur.
     */
    @Transactional
    public void onMatchFinished(Room room, RoomParticipant winner, List<RoomParticipant> participants) {
        if (room == null) return;
        log.info("[GAMIFICATION ENGINE] Match {} clôturé. Orchestration de la progression des {} participants...", room.getId(), participants != null ? participants.size() : 0);

        if (winner != null && winner.getUser() != null) {
            User winnerUser = winner.getUser();

            // 1. Enregistrement des points dans la Saison active
            seasonService.recordMatchResult(winnerUser, true, winner.getTotalEquity(), BigDecimal.valueOf(2.5));

            // 2. Évaluation des succès compétitifs
            achievementService.evaluateProgress(winnerUser, "ach_first_win", 1);
            achievementService.evaluateProgress(winnerUser, "ach_five_wins", 1);

            // 3. Déclenchement de la célébration 3D de victoire
            celebrationService.triggerCelebration(
                    winnerUser,
                    "ROOM_VICTORY",
                    "Victoire dans l'Arène " + room.getId() + " !",
                    "Félicitations pour votre 1ère place · +" + 500 + " EXP",
                    "RARE",
                    500,
                    "{\"roomId\": \"" + room.getId() + "\", \"roomName\": \"" + room.getName() + "\"}"
            );

            // 4. Diffusion WebSocket aux spectateurs et joueurs de la salle
            try {
                messagingTemplate.convertAndSend("/topic/room/" + room.getId() + "/celebration",
                        "{\"type\": \"ROOM_VICTORY\", \"winner\": \"" + winnerUser.getUsernameAlias() + "\", \"equity\": " + winner.getTotalEquity() + "}");
            } catch (Exception ignored) {}

            // 5. Évaluation de la promotion de carrière et compétences
            skillService.evaluateAndProgressSkills(winnerUser);
            careerService.evaluatePromotion(winnerUser);
        }

        // Progression de saison et rigueur de risque pour tous les participants
        if (participants != null) {
            for (RoomParticipant p : participants) {
                if (p.getUser() == null || (winner != null && p.getUser().getId().equals(winner.getUser().getId()))) {
                    continue;
                }
                // Enregistrement participation saisonnière
                seasonService.recordMatchResult(p.getUser(), false, p.getTotalEquity(), BigDecimal.valueOf(3.0));

                // Évaluation discipline de drawdown (<5%) et compétences
                achievementService.evaluateProgress(p.getUser(), "ach_risk_master", 1);
                skillService.evaluateAndProgressSkills(p.getUser());
            }
        }
    }

    /**
     * Déclenché lors du passage d'un ordre dans l'arène.
     */
    @Transactional
    public void onOrderPlaced(User user, int totalOrders, int distinctAssets, boolean hasStopLoss) {
        if (user == null) return;

        achievementService.evaluateProgress(user, "ach_first_trade", 1);
        achievementService.evaluateProgress(user, "ach_master_orders", 1);

        if (distinctAssets >= 3) {
            achievementService.evaluateProgress(user, "ach_multi_asset", 3);
        }
        if (hasStopLoss) {
            achievementService.evaluateProgress(user, "ach_stop_loss_hero", 1);
        }
    }

    /**
     * Déclenché lors de la validation d'un cours de l'Académie.
     */
    @Transactional
    public void onCourseCompleted(User user, String courseId) {
        if (user == null || courseId == null) return;

        // 1. Enregistrement persistant de l'accomplissement du cours
        if (learningProgressRepository != null) {
            com.pif.learning.model.LearningProgress progress = learningProgressRepository
                    .findByUserIdAndItemTypeAndItemId(user.getId(), com.pif.learning.model.ItemType.LESSON, courseId)
                    .orElseGet(() -> new com.pif.learning.model.LearningProgress(user.getId(), com.pif.learning.model.ItemType.LESSON, courseId));
            progress.setCompleted(true);
            progress.setPoints(100);
            learningProgressRepository.save(progress);
        }

        achievementService.evaluateProgress(user, "ach_academy_novice", 1);
        achievementService.evaluateProgress(user, "ach_academy_master", 1);

        // 2. Déclenchement autoritaire du moteur de progression d'arbre de compétences
        skillService.evaluateAndProgressSkills(user);

        long completedSkills = playerSkillRepository.countByUserAndStatus(user, "COMPLETED") +
                playerSkillRepository.countByUserAndStatus(user, "MASTERED");

        if (completedSkills >= 5) {
            achievementService.evaluateProgress(user, "ach_skill_tree_unlocked", (int) completedSkills);
        }

        // 3. Évaluation de promotion de carrière après acquisition de savoir
        careerService.evaluatePromotion(user);
    }

    /**
     * Déclenché lorsqu'un utilisateur observe un match en tant que spectateur.
     */
    @Transactional
    public void onSpectatorWatched(User user) {
        if (user == null) return;
        achievementService.evaluateProgress(user, "ach_spectator_watch", 1);
    }

    /**
     * Déclenché lors de l'ajout d'un ami.
     */
    @Transactional
    public void onFriendAdded(User user) {
        if (user == null) return;
        achievementService.evaluateProgress(user, "ach_first_friend", 1);
    }

    /**
     * Déclenché lors de la création d'une arène.
     */
    @Transactional
    public void onRoomCreated(User user) {
        if (user == null) return;
        achievementService.evaluateProgress(user, "ach_room_creator", 1);
    }
}

