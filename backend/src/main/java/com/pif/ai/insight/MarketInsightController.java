package com.pif.ai.insight;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.auth.model.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * Signaux IA et explications à la date simulée : utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/ai")
public class MarketInsightController {

    private final MarketInsightService service;
    private final PortfolioLabService labService;

    public MarketInsightController(MarketInsightService service, PortfolioLabService labService) {
        this.service = service;
        this.labService = labService;
    }

    /** Signal XGBoost de chaque actif à la date (dernière séance connue à cette date). */
    @GetMapping("/signals")
    public ResponseEntity<List<MarketInsightService.AssetSignal>> signals(@RequestParam String date, @RequestParam String symbols) {
        return ResponseEntity.ok(service.signals(date, Arrays.stream(symbols.split(",")).filter(s -> !s.isBlank()).toList()));
    }

    /** Indicateurs, probabilités et contributions de Shapley du signal d'un actif à la date. */
    @GetMapping("/explain")
    public ResponseEntity<JsonNode> explain(@RequestParam String symbol, @RequestParam String date) {
        return ResponseEntity.ok(service.explain(symbol, date));
    }

    /** Séances anormales (rendement, volume, amplitude) de l'actif jusqu'à la date. */
    @GetMapping("/anomalies")
    public ResponseEntity<JsonNode> anomalies(@RequestParam String symbol, @RequestParam String date) {
        return ResponseEntity.ok(labService.anomalies(symbol, date));
    }

    /** Portefeuilles de Markowitz sur les actifs choisis (par défaut, ceux détenus) avec les cours connus à la date. */
    @PostMapping("/optimize")
    public ResponseEntity<JsonNode> optimize(@AuthenticationPrincipal User user, @Valid @RequestBody PortfolioLabService.OptimizeRequest request) {
        return ResponseEntity.ok(labService.optimize(user, request));
    }
}
