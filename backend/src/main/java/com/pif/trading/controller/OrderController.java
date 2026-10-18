package com.pif.trading.controller;

import com.pif.market.model.User;
import com.pif.market.repository.UserRepository;
import com.pif.trading.dto.*;
import com.pif.trading.service.TradingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final TradingService tradingService;
    private final UserRepository userRepository;
    private final com.pif.trading.service.AiClientService aiClientService;

    public OrderController(TradingService tradingService,
                           UserRepository userRepository,
                           com.pif.trading.service.AiClientService aiClientService) {
        this.tradingService = tradingService;
        this.userRepository = userRepository;
        this.aiClientService = aiClientService;
    }

    private User resolveUser(User principal) {
        if (principal != null) {
            return principal;
        }
        // Fallback pour environnement de test : premier compte admin disponible
        return userRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("Aucun utilisateur disponible pour exécuter l'ordre."));
    }

    /**
     * Exécute un ordre d'Achat ou de Vente
     * POST /api/v1/orders/execute
     */
    @PostMapping("/execute")
    public ResponseEntity<OrderExecutionResponse> executeOrder(
            @AuthenticationPrincipal User principal,
            @Valid @RequestBody OrderRequest request) {
        User user = resolveUser(principal);
        OrderExecutionResponse response = tradingService.executeOrder(user, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Récupère la synthèse du portefeuille (Cash, Valeur Marché, P&L Latent)
     * GET /api/v1/orders/portfolio?simulatedDate=2022-04-15&currentSymbol=BIAT&currentPrice=92.500
     */
    @GetMapping("/portfolio")
    public ResponseEntity<PortfolioSummaryDto> getPortfolio(
            @AuthenticationPrincipal User principal,
            @RequestParam(required = false, defaultValue = "") String simulatedDate,
            @RequestParam(required = false) String currentSymbol,
            @RequestParam(required = false) BigDecimal currentPrice) {
        User user = resolveUser(principal);

        Map<String, BigDecimal> priceMap = new HashMap<>();
        if (currentSymbol != null && currentPrice != null) {
            priceMap.put(currentSymbol.toUpperCase(), currentPrice);
        }

        PortfolioSummaryDto summary = tradingService.getPortfolioSummary(user, priceMap, simulatedDate);
        return ResponseEntity.ok(summary);
    }

    /**
     * Récupère l'historique tabulaire d'audit des transactions
     * GET /api/v1/orders/transactions
     */
    @GetMapping("/transactions")
    public ResponseEntity<List<OrderTransactionDto>> getTransactions(
            @AuthenticationPrincipal User principal) {
        User user = resolveUser(principal);
        return ResponseEntity.ok(tradingService.getTransactions(user));
    }

    /**
     * Récupère les métriques de performance et la courbe d'équité
     * GET /api/v1/orders/performance?currentSymbol=BIAT&currentPrice=92.500
     */
    @GetMapping("/performance")
    public ResponseEntity<AccountPerformanceDto> getPerformance(
            @AuthenticationPrincipal User principal,
            @RequestParam(required = false) String currentSymbol,
            @RequestParam(required = false) BigDecimal currentPrice) {
        User user = resolveUser(principal);

        Map<String, BigDecimal> priceMap = new HashMap<>();
        if (currentSymbol != null && currentPrice != null) {
            priceMap.put(currentSymbol.toUpperCase(), currentPrice);
        }

        return ResponseEntity.ok(tradingService.getPerformance(user, priceMap));
    }

    /**
     * Réinitialise le compte de trading
     * POST /api/v1/orders/reset
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> resetAccount(
            @AuthenticationPrincipal User principal) {
        User user = resolveUser(principal);
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
            @AuthenticationPrincipal User principal,
            @RequestBody(required = false) Map<String, Object> requestPayload) {
        User user = resolveUser(principal);

        Map<String, Object> payload = new HashMap<>(requestPayload != null ? requestPayload : Map.of());
        String simulatedDate = (String) payload.getOrDefault("simulated_date", "2022-01-03");

        // Si non renseigné par le client, extraire l'état réel actuel du portefeuille
        if (!payload.containsKey("cash_disponible") || !payload.containsKey("positions")) {
            PortfolioSummaryDto summary = tradingService.getPortfolioSummary(user, Map.of(), simulatedDate);
            payload.put("simulated_date", simulatedDate);
            payload.put("cash_disponible", summary.cashBalance());
            payload.put("valeur_totale", summary.totalPortfolioValue());
            payload.put("pnl_jour", summary.totalUnrealizedPnl());
            payload.put("positions", summary.positions());
        }

        Map<String, Object> analysis = aiClientService.explainPortfolio(payload);
        return ResponseEntity.ok(analysis);
    }
}
