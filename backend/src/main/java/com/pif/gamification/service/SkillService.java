package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.gamification.dto.SkillNodeDto;
import com.pif.gamification.model.PlayerSkill;
import com.pif.gamification.model.SkillNode;
import com.pif.gamification.repository.PlayerSkillRepository;
import com.pif.gamification.repository.SkillNodeRepository;
import com.pif.learning.model.ItemType;
import com.pif.learning.model.LearningProgress;
import com.pif.learning.repository.LearningProgressRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SkillService {

    private static final Logger log = LoggerFactory.getLogger(SkillService.class);

    private final SkillNodeRepository skillRepository;
    private final PlayerSkillRepository playerSkillRepository;
    private final UserRepository userRepository;
    private final CelebrationService celebrationService;
    private final LearningProgressRepository learningProgressRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public SkillService(SkillNodeRepository skillRepository,
                        PlayerSkillRepository playerSkillRepository,
                        UserRepository userRepository,
                        CelebrationService celebrationService,
                        LearningProgressRepository learningProgressRepository,
                        SimpMessagingTemplate messagingTemplate) {
        this.skillRepository = skillRepository;
        this.playerSkillRepository = playerSkillRepository;
        this.userRepository = userRepository;
        this.celebrationService = celebrationService;
        this.learningProgressRepository = learningProgressRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Récupère l'Arbre de Compétences complet après évaluation autoritaire automatique du joueur.
     */
    @Transactional
    public List<SkillNodeDto> getSkillTreeForUser(User user) {
        if (user == null) {
            return skillRepository.findAllByOrderByBranchAscOrderIndexAsc().stream()
                    .map(n -> SkillNodeDto.fromEntity(n, null, false))
                    .collect(Collectors.toList());
        }
        return evaluateAndProgressSkills(user);
    }

    /**
     * MOTEUR AUTORITAIRE D'ÉVALUATION ET DE PROGRESSION ÉVÉNEMENTIELLE DES COMPÉTENCES.
     * Évalue les prérequis, valide automatiquement les compétences accomplies,
     * fait progresser les états (LOCKED -> AVAILABLE -> IN_PROGRESS -> COMPLETED -> MASTERED),
     * cascade les déblocages dépendants et émet les événements WebSocket et célébrations 3D.
     */
    @Transactional
    public List<SkillNodeDto> evaluateAndProgressSkills(User user) {
        if (user == null) return Collections.emptyList();

        User freshUser = userRepository.findById(user.getId()).orElse(user);
        int userLevel = freshUser.getLevel() != null ? freshUser.getLevel() : 1;
        int totalWins = freshUser.getWins() != null ? freshUser.getWins() : 0;

        List<SkillNode> allNodes = skillRepository.findAllByOrderByBranchAscOrderIndexAsc();
        List<PlayerSkill> existingSkills = playerSkillRepository.findByUser(freshUser);
        Map<String, PlayerSkill> playerSkillsMap = new HashMap<>();
        for (PlayerSkill ps : existingSkills) {
            playerSkillsMap.put(ps.getSkill().getId(), ps);
        }

        // Récupération des cours et modules validés dans l'Académie
        Set<String> completedCourseIds = learningProgressRepository.findByUserId(freshUser.getId()).stream()
                .filter(LearningProgress::isCompleted)
                .map(LearningProgress::getItemId)
                .collect(Collectors.toSet());

        boolean anyStateChanged = false;
        boolean hasCascadingUnlocks = true;
        int maxPasses = 5;

        while (hasCascadingUnlocks && maxPasses-- > 0) {
            hasCascadingUnlocks = false;

            for (SkillNode node : allNodes) {
                PlayerSkill ps = playerSkillsMap.get(node.getId());
                boolean isNewRecord = false;
                if (ps == null) {
                    ps = new PlayerSkill(freshUser, node, "LOCKED");
                    playerSkillsMap.put(node.getId(), ps);
                    isNewRecord = true;
                }

                String currentStatus = ps.getStatus();

                // 1. Contrôle des prérequis
                boolean prereqMet = true;
                if (node.getPrerequisiteSkillId() != null && !node.getPrerequisiteSkillId().isBlank()) {
                    PlayerSkill prereq = playerSkillsMap.get(node.getPrerequisiteSkillId());
                    prereqMet = prereq != null && ("COMPLETED".equals(prereq.getStatus()) || "MASTERED".equals(prereq.getStatus()));
                }
                boolean levelMet = userLevel >= (node.getRequiredLevel() != null ? node.getRequiredLevel() : 1);

                // 2. Transition automatique LOCKED -> AVAILABLE
                if (prereqMet && levelMet) {
                    if ("LOCKED".equals(currentStatus)) {
                        ps.setStatus("AVAILABLE");
                        anyStateChanged = true;
                        notifySkillEvent(freshUser, "SKILL_UNLOCKED", node, ps);
                        log.info("[SKILL AUTO] Compétence {} déverrouillée (AVAILABLE) pour {}", node.getId(), freshUser.getUsernameAlias());
                    }
                } else if (!"COMPLETED".equals(currentStatus) && !"MASTERED".equals(currentStatus) && !"IN_PROGRESS".equals(currentStatus)) {
                    if (!"LOCKED".equals(currentStatus)) {
                        ps.setStatus("LOCKED");
                        anyStateChanged = true;
                    }
                }

                // 3. Validation et complétion automatique (COMPLETED)
                boolean canAutoValidate = "AVAILABLE".equals(ps.getStatus()) || "IN_PROGRESS".equals(ps.getStatus());
                if (canAutoValidate && prereqMet && levelMet) {
                    boolean learningFulfilled = false;

                    // Si la compétence requiert un cours académique spécifique
                    if (node.getAssociatedCourseId() != null && !node.getAssociatedCourseId().isBlank()) {
                        learningFulfilled = completedCourseIds.contains(node.getAssociatedCourseId());
                    } else {
                        // Compétence sans module externe requis : validée dès niveau & prérequis atteints
                        learningFulfilled = true;
                    }

                    if (learningFulfilled) {
                        ps.setStatus("COMPLETED");
                        if (ps.getMasteryTier() == null || "NONE".equals(ps.getMasteryTier())) {
                            ps.setMasteryTier("BASIC");
                        }

                        // Attribution d'EXP idempotente (strictement une seule fois)
                        if (ps.getCompletedAt() == null) {
                            ps.setCompletedAt(LocalDateTime.now());
                            int expGain = node.getExpReward() != null ? node.getExpReward() : 250;
                            freshUser.setExp((freshUser.getExp() != null ? freshUser.getExp() : 0) + expGain);
                            userRepository.save(freshUser);

                            celebrationService.triggerCelebration(
                                    freshUser,
                                    "SKILL_UNLOCKED",
                                    "Compétence Débloquée : " + node.getName(),
                                    "Branche " + node.getBranch().replace("_", " ") + " · +" + expGain + " EXP",
                                    "UNCOMMON",
                                    expGain,
                                    "{\"skillId\": \"" + node.getId() + "\", \"branch\": \"" + node.getBranch() + "\"}"
                            );
                        }

                        anyStateChanged = true;
                        hasCascadingUnlocks = true; // Déclenche un passage supplémentaire pour débloquer les nœuds suivants
                        notifySkillEvent(freshUser, "SKILL_COMPLETED", node, ps);
                        log.info("[SKILL AUTO] Compétence {} AUTOMATIQUEMENT COMPLÉTÉE pour {}", node.getId(), freshUser.getUsernameAlias());
                    }
                }

                // 4. Maîtrise automatique de la compétence (MASTERED)
                if ("COMPLETED".equals(ps.getStatus())) {
                    boolean masteryCriteriaMet = (userLevel >= node.getRequiredLevel() + 5) || (totalWins >= 3);
                    if (masteryCriteriaMet) {
                        ps.setStatus("MASTERED");
                        ps.setMasteryTier("EXPERT");

                        if (ps.getMasteredAt() == null) {
                            ps.setMasteredAt(LocalDateTime.now());
                            int bonusExp = 350;
                            freshUser.setExp((freshUser.getExp() != null ? freshUser.getExp() : 0) + bonusExp);
                            userRepository.save(freshUser);

                            celebrationService.triggerCelebration(
                                    freshUser,
                                    "SKILL_MASTERED",
                                    "Maîtrise Suprême : " + node.getName(),
                                    "Maîtrise Expert Validée · +" + bonusExp + " EXP",
                                    "EPIC",
                                    bonusExp,
                                    "{\"skillId\": \"" + node.getId() + "\", \"masteryTier\": \"EXPERT\"}"
                            );
                        }

                        anyStateChanged = true;
                        notifySkillEvent(freshUser, "SKILL_MASTERED", node, ps);
                        log.info("[SKILL AUTO] Compétence {} ÉLEVÉE AU RANG MASTERED pour {}", node.getId(), freshUser.getUsernameAlias());
                    }
                }

                if (isNewRecord) {
                    playerSkillRepository.save(ps);
                }
            }
        }

        if (anyStateChanged) {
            playerSkillRepository.saveAll(playerSkillsMap.values());
        }

        return allNodes.stream().map(node -> {
            PlayerSkill ps = playerSkillsMap.get(node.getId());
            boolean prereqMet = true;
            if (node.getPrerequisiteSkillId() != null) {
                PlayerSkill prereq = playerSkillsMap.get(node.getPrerequisiteSkillId());
                prereqMet = prereq != null && ("COMPLETED".equals(prereq.getStatus()) || "MASTERED".equals(prereq.getStatus()));
            }
            boolean levelMet = userLevel >= node.getRequiredLevel();
            boolean canUnlock = prereqMet && levelMet;
            return SkillNodeDto.fromEntity(node, ps, canUnlock);
        }).collect(Collectors.toList());
    }

    /**
     * Démarre l'apprentissage d'une compétence disponible (AVAILABLE -> IN_PROGRESS).
     */
    @Transactional
    public SkillNodeDto startSkill(String skillId, User user) {
        if (user == null) throw new IllegalArgumentException("Utilisateur non connecté.");

        SkillNode node = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Compétence introuvable: " + skillId));

        PlayerSkill ps = playerSkillRepository.findByUserAndSkill(user, node)
                .orElseGet(() -> new PlayerSkill(user, node, "LOCKED"));

        if ("LOCKED".equals(ps.getStatus())) {
            // Réévaluer d'abord
            evaluateAndProgressSkills(user);
            ps = playerSkillRepository.findByUserAndSkill(user, node).orElse(ps);
        }

        if ("AVAILABLE".equals(ps.getStatus())) {
            ps.setStatus("IN_PROGRESS");
            PlayerSkill saved = playerSkillRepository.save(ps);
            notifySkillEvent(user, "SKILL_PROGRESS_UPDATED", node, saved);
            return SkillNodeDto.fromEntity(node, saved, true);
        }

        return SkillNodeDto.fromEntity(node, ps, true);
    }

    /**
     * Perfectionnement de maîtrise manuelle (pour les paliers optionnels supplémentaires).
     */
    @Transactional
    public SkillNodeDto improveMastery(String skillId, String targetTier, User user) {
        if (user == null) throw new IllegalArgumentException("Utilisateur non connecté.");

        SkillNode node = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Compétence introuvable: " + skillId));

        PlayerSkill ps = playerSkillRepository.findByUserAndSkill(user, node)
                .orElseThrow(() -> new IllegalStateException("Vous devez d'abord valider cette compétence."));

        ps.setMasteryTier(targetTier);
        if ("EXPERT".equalsIgnoreCase(targetTier)) {
            ps.setStatus("MASTERED");
            if (ps.getMasteredAt() == null) {
                ps.setMasteredAt(LocalDateTime.now());
            }
        }
        PlayerSkill saved = playerSkillRepository.save(ps);

        celebrationService.triggerCelebration(
                user,
                "SKILL_MASTERED",
                "Palier de Maîtrise Amélioré : " + node.getName(),
                "Niveau " + targetTier + " atteint !",
                "EPIC",
                150,
                "{\"skillId\": \"" + node.getId() + "\", \"tier\": \"" + targetTier + "\"}"
        );

        notifySkillEvent(user, "SKILL_PROGRESS_UPDATED", node, saved);
        return SkillNodeDto.fromEntity(node, saved, false);
    }

    /**
     * Méthode de secours compatible pour validation manuelle si nécessaire.
     */
    @Transactional
    public SkillNodeDto unlockSkill(String skillId, User user) {
        evaluateAndProgressSkills(user);
        SkillNode node = skillRepository.findById(skillId)
                .orElseThrow(() -> new IllegalArgumentException("Compétence introuvable: " + skillId));
        PlayerSkill ps = playerSkillRepository.findByUserAndSkill(user, node).orElse(null);
        return SkillNodeDto.fromEntity(node, ps, false);
    }

    private void notifySkillEvent(User user, String eventType, SkillNode node, PlayerSkill ps) {
        if (user == null || messagingTemplate == null) return;
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", eventType);
            payload.put("skillId", node.getId());
            payload.put("skillName", node.getName());
            payload.put("status", ps.getStatus());
            payload.put("masteryTier", ps.getMasteryTier());
            messagingTemplate.convertAndSend("/topic/user/" + user.getUsernameAlias() + "/skills", payload);
        } catch (Exception e) {
            log.debug("Impossible d'envoyer la notification WebSocket de compétence: {}", e.getMessage());
        }
    }
}
