package com.pif.stresstest.controller;

import com.pif.auth.model.User;
import com.pif.stresstest.dto.ScenarioDto;
import com.pif.stresstest.dto.ScenarioRequest;
import com.pif.stresstest.service.StressTestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Gestion des scénarios de stress par l'administrateur (cahier §5). Protégé par la règle /api/v1/admin/**.
 */
@RestController
@RequestMapping("/api/v1/admin/stress-test/scenarios")
public class AdminStressScenarioController {

    private final StressTestService service;

    public AdminStressScenarioController(StressTestService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ScenarioDto> create(@AuthenticationPrincipal User admin, @Valid @RequestBody ScenarioRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(admin, req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScenarioDto> update(@AuthenticationPrincipal User admin, @PathVariable Long id,
                                              @Valid @RequestBody ScenarioRequest req) {
        return ResponseEntity.ok(service.update(admin, id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        service.delete(admin, id);
        return ResponseEntity.noContent().build();
    }
}
