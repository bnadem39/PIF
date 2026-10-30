package com.pif.trading.controller;

import com.pif.market.model.User;
import com.pif.trading.dto.*;
import com.pif.trading.service.AiClientService;
import com.pif.trading.service.TradingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoints de trading. Toutes les routes exigent un JWT valide (voir SecurityConfig) :
 * l'utilisateur est toujours celui du token, jamais un compte de repli.
 *
 * Les cours utilisés (exécution, valorisation, déclenchement SL/TP) sont lus côté serveur
 * à partir de la date simulée : aucun prix fourni par le client n'est pris en compte.
 */
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final TradingService tradingService;
    private final AiClientService aiClientService;

    public OrderController(TradingService tradingService, AiClientService aiClientService) {
        this.tradingService = tradingService;
        this.aiClientService = aiClientService;
    }

    /**
     * Exécute un ordre d'Achat ou de Vente
     * POST /api/v1/orders/execute
     */
    @PostMapping("/execute")
    public ResponseEntity<OrderExecutionResponse> executeOrder(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody OrderRequest request) {
        return ResponseEntity.ok(tradingService.executeOrder(user, request));
    }

    /**
     * Récupère la synthèse du portefeuille (Cash, Valeur Marché, P&L Latent) valorisée à la date simulée
     * GET /api/v1/orders/portfolio?simulatedDate=2022-04-15
     */
    @GetMapping("/portfolio")
    public ResponseEntity<PortfolioSummaryDto> getPortfolio(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "") String simulatedDate) {
        return ResponseEntity.ok(tradingService.getPortfolioSummary(user, simulatedDate));
    }

    /**
     * Récupère l'historique tabulaire d'audit des transactions
     * GET /api/v1/orders/transactions
     */
    @GetMapping("/transactions")
    public ResponseEntity<List<OrderTransactionDto>> getTransactions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(tradingService.getTransactions(user));
    }

    /**
     * Récupère les métriques de performance et la courbe d'équité
     * GET /api/v1/orders/performance?simulatedDate=2022-04-15
     */
    @GetMapping("/performance")
    public ResponseEntity<AccountPerformanceDto> getPerformance(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "") String simulatedDate) {
        return ResponseEntity.ok(tradingService.getPerformance(user, simulatedDate));
    }

    /**
     * Réinitialise le compte de trading
     * POST /api/v1/orders/reset
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetAccount(@AuthenticationPrincipal User user) {
        tradingService.resetAccount(user);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Portefeuille réinitialisé avec succès : 100 000.000 TND de liquidités.",
                "initialCash", TradingService.INITIAL_CAPITAL
        ));
    }

    /**
     * Audit stratégique du portefeuille à la demande généré par FinGPT / LLM local
     * POST /api/v1/orders/portfolio/explain
     */
    @PostMapping("/portfolio/explain")
    public ResponseEntity<Map<String, Object>> explainPortfolio(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) Map<String, Object> requestPayload) {
        Map<String, Object> payload = new HashMap<>(requestPayload != null ? requestPayload : Map.of());
        Object rawDate = payload.get("simulated_date");
        String simulatedDate = rawDate != null ? rawDate.toString() : "2022-01-03";

        // L'état du portefeuille est toujours lu côté serveur (le client ne peut pas le falsifier)
        PortfolioSummaryDto summary = tradingService.getPortfolioSummary(user, simulatedDate);
        payload.put("simulated_date", simulatedDate);
        payload.put("cash_disponible", summary.cashBalance());
        payload.put("valeur_totale", summary.totalPortfolioValue());
        payload.put("pnl_jour", summary.totalUnrealizedPnl());
        payload.put("positions", summary.positions());

        return ResponseEntity.ok(aiClientService.explainPortfolio(payload));
    }

    /**
     * Modifie à la volée les seuils de risque (Stop-Loss, Take-Profit, Trailing Stop) d'une position ouverte.
     * PATCH /api/v1/orders/positions/{id}/risk
     */
    @PatchMapping("/positions/{id}/risk")
    public ResponseEntity<PositionDto> updatePositionRisk(
            @AuthenticationPrincipal User user,
            @PathVariable Long id,
            @RequestBody UpdateRiskThresholdsRequest req) {
        return ResponseEntity.ok(tradingService.updatePositionRiskThresholds(user, id, req));
    }

    /**
     * Moteur de surveillance continue : vérifie si le cours serveur de la date simulée franchit un seuil SL/TP/TS
     * et exécute automatiquement la liquidation OCO correspondante.
     * POST /api/v1/orders/check-risk  body: {"simulatedDate": "2022-04-15"}
     */
    @PostMapping("/check-risk")
    public ResponseEntity<List<OrderExecutionResponse>> checkRisk(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> body) {
        Object rawDate = body.get("simulatedDate");
        String simDate = rawDate != null ? rawDate.toString() : "";
        return ResponseEntity.ok(tradingService.checkAndTriggerRiskOrders(user, simDate));
    }
}
