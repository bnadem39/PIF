package com.pif.actuarial.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.actuarial.dto.ActuarialRequest;
import com.pif.actuarial.service.ActuarialService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Analyse actuarielle des actifs (risque et prévision) : utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/actuarial")
public class ActuarialController {

    private final ActuarialService service;

    public ActuarialController(ActuarialService service) {
        this.service = service;
    }

    @PostMapping("/analyze")
    public ResponseEntity<JsonNode> analyze(@Valid @RequestBody ActuarialRequest request) {
        return ResponseEntity.ok(service.analyze(request));
    }
}
