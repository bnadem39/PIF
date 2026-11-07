package com.pif.multiplayer.controller;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.multiplayer.dto.RoomOrderRequestDto;
import com.pif.multiplayer.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class RoomWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(RoomWebSocketController.class);

    private final RoomService roomService;
    private final UserRepository userRepository;

    public RoomWebSocketController(RoomService roomService, UserRepository userRepository) {
        this.roomService = roomService;
        this.userRepository = userRepository;
    }

    /**
     * Réception d'un ordre de trading haute fréquence via STOMP : /app/room/{roomId}/order
     */
    @MessageMapping("/room/{roomId}/order")
    public void handleOrder(@DestinationVariable String roomId,
                            @Payload RoomOrderRequestDto orderDto,
                            Principal principal) {
        if (principal == null) {
            log.warn("Ordre rejeté : utilisateur non authentifié via WebSocket.");
            return;
        }

        userRepository.findByEmail(principal.getName()).ifPresent(user -> {
            try {
                roomService.placeOrder(roomId, orderDto, user);
            } catch (Exception e) {
                log.error("Échec du traitement de l'ordre WebSocket: " + e.getMessage());
            }
        });
    }
}
