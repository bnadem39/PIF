package com.pif.gamification.controller;

import com.pif.auth.model.User;
import com.pif.gamification.dto.CustomizationPermissionsResponseDto;
import com.pif.gamification.service.CustomizationPermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contrôleur REST pour la gestion et la vérification des permissions de personnalisation visuelle.
 */
@RestController
@RequestMapping({"/api/v1/customization", "/api/customization"})
public class CustomizationController {

    private final CustomizationPermissionService permissionService;

    public CustomizationController(CustomizationPermissionService permissionService) {
        this.permissionService = permissionService;
    }

    /**
     * Récupère la matrice des fonctionnalités de personnalisation et leur état de déblocage
     * pour le trader actuellement authentifié.
     */
    @GetMapping("/permissions")
    public ResponseEntity<CustomizationPermissionsResponseDto> getPermissions(@AuthenticationPrincipal User user) {
        CustomizationPermissionsResponseDto response = permissionService.getPermissionsForUser(user);
        return ResponseEntity.ok(response);
    }
}

