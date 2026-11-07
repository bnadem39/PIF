package com.pif.multiplayer.controller;

import com.pif.auth.model.User;
import com.pif.multiplayer.dto.RoomInvitationDto;
import com.pif.multiplayer.service.InvitationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/invitations")
public class InvitationController {

    private final InvitationService invitationService;

    public InvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @GetMapping("/pending")
    public ResponseEntity<List<RoomInvitationDto>> getPendingInvitations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(invitationService.getPendingInvitations(user.getId()));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Void> acceptInvitation(@PathVariable UUID id) {
        invitationService.respondInvitation(id, true);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/decline")
    public ResponseEntity<Void> declineInvitation(@PathVariable UUID id) {
        invitationService.respondInvitation(id, false);
        return ResponseEntity.ok().build();
    }
}

