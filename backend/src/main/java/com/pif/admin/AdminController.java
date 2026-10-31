package com.pif.admin;

import com.pif.admin.AdminDtos.*;
import com.pif.auth.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Console d'administration (cahier §5) : réservée à ROLE_ADMIN par la configuration de sécurité (/api/v1/admin/**).
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService service;

    public AdminController(AdminService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public ResponseEntity<PlatformStats> stats() {
        return ResponseEntity.ok(service.stats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserRow>> users(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(service.users(search));
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<UserRow> updateUser(@AuthenticationPrincipal User admin, @PathVariable Long id,
                                              @RequestBody UserUpdate update) {
        return ResponseEntity.ok(service.updateUser(admin, id, update));
    }

    @PostMapping("/users/{id}/reset-portfolio")
    public ResponseEntity<Void> resetPortfolio(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        service.resetPortfolio(admin, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/learning/stats")
    public ResponseEntity<List<ItemStats>> learningStats() {
        return ResponseEntity.ok(service.learningStats());
    }
}
