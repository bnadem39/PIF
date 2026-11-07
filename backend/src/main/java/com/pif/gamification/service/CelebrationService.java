package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.gamification.dto.CelebrationEventDto;
import com.pif.gamification.model.CelebrationEvent;
import com.pif.gamification.repository.CelebrationEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CelebrationService {

    private static final Logger log = LoggerFactory.getLogger(CelebrationService.class);

    private final CelebrationEventRepository celebrationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public CelebrationService(CelebrationEventRepository celebrationRepository,
                              SimpMessagingTemplate messagingTemplate) {
        this.celebrationRepository = celebrationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Publie un événement de célébration 3D avec déduplication stricte (idempotent).
     */
    @Transactional
    public CelebrationEventDto triggerCelebration(User user, String eventType, String title,
                                                   String subtitle, String rarity, Integer rewardExp, String payloadJson) {
        if (user == null) return null;

        String cleanTitle = (title != null) ? title.replaceAll("[^a-zA-Z0-9]", "").toLowerCase() : "event";
        if (cleanTitle.length() > 24) cleanTitle = cleanTitle.substring(0, 24);
        String eventId = "celeb_" + user.getId() + "_" + eventType.toLowerCase() + "_" + cleanTitle + "_" + Math.abs((user.getId() + "_" + eventType + "_" + title).hashCode());
        if (eventId.length() > 100) eventId = eventId.substring(0, 100);

        // Vérification de déduplication : si l'événement a déjà été émis, ne pas doubler
        if (celebrationRepository.existsById(eventId)) {
            log.debug("[CELEBRATION] Événement déjà accordé pour l'utilisateur {}: {}", user.getUsernameAlias(), eventId);
            return CelebrationEventDto.fromEntity(celebrationRepository.findById(eventId).get());
        }

        CelebrationEvent event = new CelebrationEvent(
                eventId,
                user,
                eventType,
                title,
                subtitle,
                rarity != null ? rarity : "COMMON",
                rewardExp != null ? rewardExp : 0,
                payloadJson
        );

        CelebrationEvent saved = celebrationRepository.save(event);
        CelebrationEventDto dto = CelebrationEventDto.fromEntity(saved);

        // Diffusion WebSocket en temps réel sur la destination privée du joueur
        try {
            messagingTemplate.convertAndSend("/topic/user/" + user.getUsernameAlias() + "/celebrations", dto);
        } catch (Exception e) {
            log.warn("[CELEBRATION] Échec de diffusion WebSocket: {}", e.getMessage());
        }

        log.info("[CELEBRATION 3D] Événement '{}' déclenché pour {} (Rareté: {})", title, user.getUsernameAlias(), rarity);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<CelebrationEventDto> getPendingCelebrations(User user) {
        if (user == null) return List.of();
        return celebrationRepository.findByUserAndIsDisplayedFalseOrderByCreatedAtAsc(user)
                .stream()
                .map(CelebrationEventDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markCelebrationDisplayed(String eventId) {
        celebrationRepository.findById(eventId).ifPresent(event -> {
            event.setIsDisplayed(true);
            celebrationRepository.save(event);
        });
    }
}
