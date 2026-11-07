package com.pif.multiplayer.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.multiplayer.dto.RoomInvitationDto;
import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomInvitation;
import com.pif.multiplayer.repository.RoomInvitationRepository;
import com.pif.multiplayer.repository.RoomRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class InvitationService {

    private final RoomInvitationRepository invitationRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public InvitationService(RoomInvitationRepository invitationRepository,
                             RoomRepository roomRepository,
                             UserRepository userRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.invitationRepository = invitationRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public RoomInvitationDto sendInvitation(String roomId, Long receiverId, User sender) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Destinataire introuvable: " + receiverId));

        RoomInvitation invitation = new RoomInvitation(room, sender, receiver);
        RoomInvitation saved = invitationRepository.save(invitation);

        RoomInvitationDto dto = RoomInvitationDto.fromEntity(saved);

        // Notification temps réel envoyée sur la file WebSocket dédiée au destinataire
        messagingTemplate.convertAndSend("/topic/invitations/" + receiver.getUsernameAlias(), dto);
        messagingTemplate.convertAndSend("/topic/invitations/" + receiver.getEmail(), dto);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<RoomInvitationDto> getPendingInvitations(Long userId) {
        return invitationRepository.findPendingByReceiverId(userId).stream()
                .map(RoomInvitationDto::fromEntity)
                .collect(Collectors.toList());
    }

    public void respondInvitation(UUID invitationId, boolean accept) {
        RoomInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new IllegalArgumentException("Invitation introuvable: " + invitationId));

        invitation.setStatus(accept ? "ACCEPTED" : "DECLINED");
        invitationRepository.save(invitation);
    }
}

