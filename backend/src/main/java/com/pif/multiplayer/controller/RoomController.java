package com.pif.multiplayer.controller;

import com.pif.auth.model.User;
import com.pif.multiplayer.dto.*;
import com.pif.multiplayer.model.RoomStatus;
import com.pif.multiplayer.service.InvitationService;
import com.pif.multiplayer.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rooms")
public class RoomController {

    private final RoomService roomService;
    private final InvitationService invitationService;

    public RoomController(RoomService roomService, InvitationService invitationService) {
        this.roomService = roomService;
        this.invitationService = invitationService;
    }

    /**
     * Création d'une salle de match privée (Accessible à TOUT trader connecté).
     */
    @PostMapping
    public ResponseEntity<RoomDto> createRoom(@Valid @RequestBody RoomCreateDto dto,
                                              @AuthenticationPrincipal User creator) {
        RoomDto created = roomService.createRoom(dto, creator);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Liste des salles disponibles dans le lobby.
     */
    @GetMapping
    public ResponseEntity<List<RoomDto>> listRooms(@RequestParam(required = false) RoomStatus status) {
        return ResponseEntity.ok(roomService.listRooms(status));
    }

    /**
     * Détails et participants d'une salle spécifique (ex: PIF-7842).
     */
    @GetMapping("/{id}")
    public ResponseEntity<RoomDto> getRoom(@PathVariable String id) {
        return ResponseEntity.ok(roomService.getRoom(id));
    }

    /**
     * Inscription d'un trader dans l'arène (avec mot de passe si requis).
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<RoomParticipantDto> joinRoom(@PathVariable String id,
                                                       @RequestBody(required = false) Map<String, String> payload,
                                                       @AuthenticationPrincipal User user) {
        String password = payload != null ? payload.get("password") : null;
        return ResponseEntity.ok(roomService.joinRoom(id, password, user));
    }

    /**
     * Clôture définitive de la salle (Par l'hôte créateur de la salle ou admin).
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<RoomDto> closeRoom(@PathVariable String id,
                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(roomService.closeRoom(id, user));
    }

    /**
     * Bascule du statut "Prêt" (Ready) dans la salle d'attente.
     */
    @PostMapping("/{id}/ready")
    public ResponseEntity<RoomParticipantDto> toggleReady(@PathVariable String id,
                                                         @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(roomService.toggleReady(id, user));
    }

    /**
     * Invitation directe d'un ami dans la salle (Notification WebSocket temps réel).
     */
    @PostMapping("/{id}/invite")
    public ResponseEntity<RoomInvitationDto> inviteFriend(@PathVariable String id,
                                                          @RequestBody Map<String, Long> payload,
                                                          @AuthenticationPrincipal User sender) {
        Long friendId = payload.get("friendId");
        if (friendId == null) {
            throw new IllegalArgumentException("Le champ 'friendId' est obligatoire.");
        }
        return ResponseEntity.ok(invitationService.sendInvitation(id, friendId, sender));
    }

    /**
     * Démarrage de la partie (Par l'hôte créateur de la salle).
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<RoomDto> startRoom(@PathVariable String id,
                                             @AuthenticationPrincipal User host) {
        return ResponseEntity.ok(roomService.startRoom(id, host));
    }

    /**
     * Pause de la simulation d'une salle (pour audit FinGPT ou interruption).
     */
    @PostMapping("/{id}/pause")
    public ResponseEntity<RoomDto> pauseRoom(@PathVariable String id,
                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(roomService.pauseRoom(id, user));
    }

    /**
     * Reprise de la simulation d'une salle en pause.
     */
    @PostMapping("/{id}/resume")
    public ResponseEntity<RoomDto> resumeRoom(@PathVariable String id,
                                              @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(roomService.resumeRoom(id, user));
    }

    /**
     * Soumission d'un ordre de trading pendant la manche active.
     */
    @PostMapping("/{id}/orders")
    public ResponseEntity<RoomOrderResponseDto> placeOrder(@PathVariable String id,
                                                           @Valid @RequestBody RoomOrderRequestDto orderDto,
                                                           @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roomService.placeOrder(id, orderDto, user));
    }

    /**
     * Classement dynamique en direct de la salle.
     */
    @GetMapping("/{id}/leaderboard")
    public ResponseEntity<RoomLeaderboardDto> getLeaderboard(@PathVariable String id) {
        return ResponseEntity.ok(roomService.getLeaderboard(id));
    }

    /**
     * Portefeuille et ordres du joueur dédiés exclusivement à cette arène.
     */
    @GetMapping("/{id}/my-portfolio")
    public ResponseEntity<Map<String, Object>> getMyRoomPortfolio(@PathVariable String id,
                                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(roomService.getMyRoomPortfolio(id, user));
    }
}
