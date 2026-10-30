package com.pif.actuarial.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.actuarial.service.ActuarialAiClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Module d'actuariat (cahier §3.7) : tarification fréquence × sévérité, probabilité de sinistre,
 * marges de prime et provisionnement. Utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/actuarial")
public class ActuarialController {

    private final ActuarialAiClient client;

    public ActuarialController(ActuarialAiClient client) {
        this.client = client;
    }

    @GetMapping("/portfolio")
    public ResponseEntity<JsonNode> portfolio() {
        return ResponseEntity.ok(client.get("/portfolio"));
    }

    @GetMapping("/models")
    public ResponseEntity<JsonNode> models() {
        return ResponseEntity.ok(client.get("/models"));
    }

    /** Body : {"profile": {...}, "duration": 1, "expense_ratio": 0.25, "profit_margin": 0.05} */
    @PostMapping("/quote")
    public ResponseEntity<JsonNode> quote(@RequestBody JsonNode body) {
        return ResponseEntity.ok(client.post("/quote", body));
    }

    /** Body : {"segment_by": "age_band", "mode": "conventional|takaful", ...} */
    @PostMapping("/margins")
    public ResponseEntity<JsonNode> margins(@RequestBody JsonNode body) {
        return ResponseEntity.ok(client.post("/margins", body));
    }

    @GetMapping("/reserving")
    public ResponseEntity<JsonNode> defaultReserving() {
        return ResponseEntity.ok(client.get("/reserving"));
    }

    /** Body : {"triangle": [[...], ...], "tail_factor": 1.0} (montants incrémentaux) */
    @PostMapping("/reserving")
    public ResponseEntity<JsonNode> reserving(@RequestBody JsonNode body) {
        return ResponseEntity.ok(client.post("/reserving", body));
    }
}
