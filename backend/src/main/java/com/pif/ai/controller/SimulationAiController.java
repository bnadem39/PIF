package com.pif.ai.controller;

import com.pif.ai.dto.AiAgentAnalysisDto;
import com.pif.ai.dto.AiChatDto;
import com.pif.ai.dto.AiPredictSignalDto;
import com.pif.ai.service.AiClientService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class SimulationAiController {

    private final AiClientService aiClientService;

    public SimulationAiController(AiClientService aiClientService) {
        this.aiClientService = aiClientService;
    }

    /**
     * Endpoint d'inférence directe pour les chandeliers (Tick / Bougie).
     */
    @PostMapping("/predict-signal")
    public ResponseEntity<AiPredictSignalDto> predictSignal(@RequestBody Map<String, Object> payload) {
        String ticker = (String) payload.getOrDefault("ticker", "BIAT");
        AiPredictSignalDto result = aiClientService.predictSignal(ticker, payload);
        return ResponseEntity.ok(result);
    }

    /**
     * Endpoint d'analyse complète FinGPT + RAG pour le rejeu de simulation.
     */
    @PostMapping("/agent-analysis")
    public ResponseEntity<AiAgentAnalysisDto> getAgentAnalysis(@RequestBody Map<String, Object> payload) {
        String ticker = (String) payload.getOrDefault("ticker", "BIAT");
        String simulationDate = (String) payload.getOrDefault("simulation_date", "2022-01-03");
        String bankType = (String) payload.getOrDefault("bank_type", "conventional");
        
        Double sentimentScore = 0.0;
        if (payload.get("sentiment_score") != null) {
            sentimentScore = Double.valueOf(payload.get("sentiment_score").toString());
        }

        String currentPosition = (String) payload.getOrDefault("current_position", "NONE");
        Double unrealizedPnl = 0.0;
        if (payload.get("unrealized_pnl") != null) {
            unrealizedPnl = Double.valueOf(payload.get("unrealized_pnl").toString());
        }

        AiAgentAnalysisDto analysis = aiClientService.analyzeMarket(
                ticker,
                simulationDate,
                payload,
                bankType,
                sentimentScore,
                currentPosition,
                unrealizedPnl
        );
        return ResponseEntity.ok(analysis);
    }

    /**
     * Endpoint pour le chatbot conversationnel FinGPT Copilot.
     */
    @PostMapping("/chat/ask")
    public ResponseEntity<AiChatDto.Response> askChatbot(@RequestBody AiChatDto.Request request) {
        AiChatDto.Response response = aiClientService.askChatbot(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint de monitoring de santé du sous-système IA.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getAiHealth() {
        return ResponseEntity.ok(aiClientService.getAiHealth());
    }

    /**
     * Endpoint pour l'audit de marché et recommandations portefeuille déclenché sur PAUSE.
     */
    @PostMapping("/market-pause-audit")
    public ResponseEntity<Map<String, Object>> auditMarketPause(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = aiClientService.auditMarketPause(payload);
        return ResponseEntity.ok(response);
    }
}
