package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.gamification.dto.SpectatorSessionDto;
import com.pif.gamification.model.RoomSpectator;
import com.pif.gamification.repository.RoomSpectatorRepository;
import com.pif.multiplayer.dto.RoomDto;
import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomStatus;
import com.pif.multiplayer.repository.RoomRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class SpectatorService {

    private static final Logger log = LoggerFactory.getLogger(SpectatorService.class);

    private final RoomRepository roomRepository;
    private final RoomSpectatorRepository spectatorRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public SpectatorService(RoomRepository roomRepository,
                            RoomSpectatorRepository spectatorRepository,
                            SimpMessagingTemplate messagingTemplate) {
        this.roomRepository = roomRepository;
        this.spectatorRepository = spectatorRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Rejoindre une arène en tant que SPECTATEUR (Accès en lecture seule, ne prend pas de slot de trading).
     */
    @Transactional
    public SpectatorSessionDto joinAsSpectator(String roomId, User user) {
        if (user == null) {
            throw new IllegalArgumentException("Vous devez être connecté pour observer une compétition.");
        }

        Room room = roomRepository.findByIdWithParticipants(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Arène introuvable: " + roomId));

        if (!Boolean.TRUE.equals(room.getAllowSpectators())) {
            throw new IllegalStateException("L'hôte de cette salle a désactivé le mode spectateur.");
        }

        long currentCount = spectatorRepository.countByRoom(room);
        int max = room.getMaxSpectators() != null ? room.getMaxSpectators() : 50;
        if (currentCount >= max) {
            throw new IllegalStateException("Capacité maximale de spectateurs atteinte (" + max + " max).");
        }

        // Si l'utilisateur n'est pas encore enregistré comme spectateur
        if (spectatorRepository.findByRoomAndUser(room, user).isEmpty()) {
            RoomSpectator spec = new RoomSpectator(room, user);
            spectatorRepository.save(spec);
        }

        long updatedCount = spectatorRepository.countByRoom(room);

        // Diffuser la mise à jour du compteur de spectateurs
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/spectators", updatedCount);

        SpectatorSessionDto dto = new SpectatorSessionDto();
        dto.setRoomId(roomId);
        dto.setSpectatorId(user.getId());
        dto.setSpectatorUsername(user.getUsernameAlias());
        dto.setTotalSpectators(updatedCount);
        dto.setSpectator(true);
        dto.setJoinedAt(LocalDateTime.now());
        dto.setRoom(RoomDto.fromEntity(room, true));

        log.info("[SPECTATOR] {} observe maintenant l'arène {} (Total spectateurs: {})", user.getUsernameAlias(), roomId, updatedCount);
        return dto;
    }

    /**
     * Quitter le mode spectateur.
     */
    @Transactional
    public void leaveSpectator(String roomId, User user) {
        if (user == null) return;
        roomRepository.findById(roomId).ifPresent(room -> {
            spectatorRepository.deleteByRoomAndUser(room, user);
            long count = spectatorRepository.countByRoom(room);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/spectators", count);
            log.info("[SPECTATOR] {} a quitté le mode spectateur de l'arène {}", user.getUsernameAlias(), roomId);
        });
    }

    /**
     * Nombre de spectateurs en direct dans une arène.
     */
    @Transactional(readOnly = true)
    public long getSpectatorCount(String roomId) {
        return roomRepository.findById(roomId)
                .map(spectatorRepository::countByRoom)
                .orElse(0L);
    }
}

