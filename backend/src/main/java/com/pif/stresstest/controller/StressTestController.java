package com.pif.stresstest.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.auth.model.User;
import com.pif.stresstest.dto.RunRequest;
import com.pif.stresstest.dto.ScenarioDto;
import com.pif.stresstest.service.StressTestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AI Stress Testing des établissements bancaires (cahier §3.5) : utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/stress-test")
public class StressTestController {

    private final StressTestService service;

    public StressTestController(StressTestService service) {
        this.service = service;
    }

    @GetMapping("/scenarios")
    public ResponseEntity<List<ScenarioDto>> scenarios() {
        return ResponseEntity.ok(service.listScenarios());
    }

    @GetMapping("/banks")
    public ResponseEntity<JsonNode> banks() {
        return ResponseEntity.ok(service.banks());
    }

    @GetMapping("/models")
    public ResponseEntity<JsonNode> models() {
        return ResponseEntity.ok(service.models());
    }

    @PostMapping("/run")
    public ResponseEntity<JsonNode> run(@AuthenticationPrincipal User user, @Valid @RequestBody RunRequest request) {
        return ResponseEntity.ok(service.run(user, request));
    }
}
