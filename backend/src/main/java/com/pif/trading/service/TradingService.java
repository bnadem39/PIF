package com.pif.trading.service;

import com.pif.market.model.User;
import com.pif.market.repository.UserRepository;
import com.pif.trading.dto.*;
import com.pif.trading.exception.InsufficientFundsException;
import com.pif.trading.exception.InsufficientPositionException;
import com.pif.trading.model.OrderTransaction;
import com.pif.trading.model.OrderType;
import com.pif.trading.model.Position;
import com.pif.trading.repository.OrderTransactionRepository;
import com.pif.trading.repository.PositionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Moteur Transactionnel de Trading & Gestion du Risque.
 * Utilise strictement BigDecimal avec 3 décimales (RoundingMode.HALF_UP)
 * pour éliminer tout risque d'erreur d'arrondi sur les flux financiers.
 */
@Service
public class TradingService {

    private static final Logger log = LoggerFactory.getLogger(TradingService.class);

    // Frais de courtage institutionnels standard : 0.15% (15 bps)
    public static final BigDecimal FEE_RATE = new BigDecimal("0.0015");
    public static final BigDecimal INITIAL_CAPITAL = new BigDecimal("100000.000");

    private final UserRepository userRepository;
    private final PositionRepository positionRepository;
    private final OrderTransactionRepository transactionRepository;

    public TradingService(UserRepository userRepository,
                          PositionRepository positionRepository,
                          OrderTransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.positionRepository = positionRepository;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Exécute un ordre de trading de manière atomique (@Transactional).
     */
    @Transactional
    public OrderExecutionResponse executeOrder(User user, OrderRequest request) {
        // Recharger l'utilisateur pour garantir le solde transactionnel à jour
        User persistentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable : " + user.getId()));

        String symbol = request.symbol().toUpperCase().trim();
        Integer quantity = request.quantity();
        BigDecimal price = request.executionPrice().setScale(3, RoundingMode.HALF_UP);
        String simDate = request.simulatedDate();

        if (quantity <= 0) {
            throw new IllegalArgumentException("La quantité commandée doit être strictement positive.");
        }
        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Le cours d'exécution doit être strictement positif.");
        }

        if (request.type() == OrderType.BUY || request.type() == OrderType.LIMIT || request.type() == OrderType.MARKET) {
            return executeBuyOrder(persistentUser, symbol, quantity, price, simDate,
                    request.stopLossPrice(), request.takeProfitPrice(), request.trailingStopDistance());
        } else if (request.type() == OrderType.SELL) {
            return executeSellOrder(persistentUser, symbol, quantity, price, simDate);
        } else {
            throw new IllegalArgumentException("Type d'ordre non supporté : " + request.type());
        }
    }

    /**
     * Logique transactionnelle d'Achat (BUY) avec association optionnelle de Stop-Loss, Take-Profit et Trailing Stop.
     */
    private OrderExecutionResponse executeBuyOrder(User user, String symbol, Integer quantity,
                                                   BigDecimal price, String simDate,
                                                   BigDecimal stopLossPrice, BigDecimal takeProfitPrice,
                                                   BigDecimal trailingStopDistance) {
        BigDecimal qtyBd = new BigDecimal(quantity);
        BigDecimal grossAmount = price.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
        BigDecimal fees = grossAmount.multiply(FEE_RATE).setScale(3, RoundingMode.HALF_UP);
        BigDecimal totalRequired = grossAmount.add(fees).setScale(3, RoundingMode.HALF_UP);

        BigDecimal availableCash = user.getAvailableCash().setScale(3, RoundingMode.HALF_UP);

        // CONTRÔLE PRÉ-TRADE DE SOLVABILITÉ
        if (availableCash.compareTo(totalRequired) < 0) {
            log.warn("Rejet Pré-Trade Achat : Fonds insuffisants pour user {}. Requis: {} TND, Disponible: {} TND",
                    user.getEmail(), totalRequired, availableCash);
            throw new InsufficientFundsException(String.format(
                    "Fonds insuffisants : Solde disponible (%s TND) inférieur au coût total de l'ordre (%s TND incluant %s TND de frais).",
                    availableCash, totalRequired, fees));
        }

        // Débit du cash
        BigDecimal newCashBalance = user.getCashBalance().subtract(totalRequired).setScale(3, RoundingMode.HALF_UP);
        user.setCashBalance(newCashBalance);
        userRepository.save(user);

        // Mise à jour ou création de la position avec recalcul exact du PRU
        Optional<Position> optPos = positionRepository.findByUserAndSymbol(user, symbol);
        Position position;
        Integer newQuantity;
        BigDecimal newPru;

        if (optPos.isPresent()) {
            position = optPos.get();
            int oldQty = position.getQuantity();
            BigDecimal oldPru = position.getAverageCostPrice();

            newQuantity = oldQty + quantity;

            // Formule : PRU_nouveau = ((Q_ancien * PRU_ancien) + (Q_acheté * P_exécution)) / (Q_ancien + Q_acheté)
            BigDecimal oldTotalCost = oldPru.multiply(new BigDecimal(oldQty));
            BigDecimal newBuyCost = price.multiply(qtyBd);
            BigDecimal totalWeightedCost = oldTotalCost.add(newBuyCost);
            newPru = totalWeightedCost.divide(new BigDecimal(newQuantity), 3, RoundingMode.HALF_UP);

            position.setQuantity(newQuantity);
            position.setAverageCostPrice(newPru);
        } else {
            position = new Position(user, symbol, quantity, price);
            newQuantity = quantity;
            newPru = price;
        }

        // Enregistrement des seuils de protection SL/TP/Trailing Stop
        if (stopLossPrice != null) {
            position.setStopLossPrice(stopLossPrice.setScale(3, RoundingMode.HALF_UP));
        }
        if (takeProfitPrice != null) {
            position.setTakeProfitPrice(takeProfitPrice.setScale(3, RoundingMode.HALF_UP));
        }
        if (trailingStopDistance != null) {
            position.setTrailingStopDistance(trailingStopDistance.setScale(3, RoundingMode.HALF_UP));
        }
        position.setHighestPriceSeen(price);
        positionRepository.save(position);

        // Enregistrement de la transaction d'audit
        OrderTransaction tx = new OrderTransaction(
                user, symbol, OrderType.BUY, quantity, price, fees, BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP), simDate
        );
        OrderTransaction savedTx = transactionRepository.save(tx);

        log.info("Ordre ACHAT exécuté : User={}, Symbol={}, Qty={}, Price={} TND, Frais={} TND, SL={}, TP={}, TS={}, Nouveau Solde={} TND, Nouveau PRU={} TND",
                user.getEmail(), symbol, quantity, price, fees, stopLossPrice, takeProfitPrice, trailingStopDistance, newCashBalance, newPru);

        return new OrderExecutionResponse(
                true,
                String.format("Achat de %d %s exécuté à %s TND (Frais: %s TND). Nouveau PRU: %s TND.",
                        quantity, symbol, price, fees, newPru),
                savedTx.getId(),
                symbol,
                OrderType.BUY,
                quantity,
                price,
                fees,
                totalRequired,
                BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP),
                newCashBalance,
                user.getBlockedCash(),
                newQuantity,
                newPru,
                simDate
        );
    }

    /**
     * Logique transactionnelle de Vente (SELL).
     */
    private OrderExecutionResponse executeSellOrder(User user, String symbol, Integer quantity,
                                                   BigDecimal price, String simDate) {
        // CONTRÔLE PRÉ-TRADE : Vérifier existence de la position et interdire la vente à découvert
        Position position = positionRepository.findByUserAndSymbol(user, symbol)
                .orElseThrow(() -> new InsufficientPositionException(
                        String.format("Vente rejetée : Vous ne détenez aucune action %s en portefeuille (Vente à découvert interdite).", symbol)));

        int heldQuantity = position.getQuantity();
        if (heldQuantity < quantity) {
            log.warn("Rejet Pré-Trade Vente : Quantité détenue ({}) < Quantité voulue ({}) pour {}",
                    heldQuantity, quantity, symbol);
            throw new InsufficientPositionException(String.format(
                    "Vente rejetée : Quantité voulue (%d) supérieure à la position détenue (%d %s).",
                    quantity, heldQuantity, symbol));
        }

        BigDecimal qtyBd = new BigDecimal(quantity);
        BigDecimal pru = position.getAverageCostPrice();

        BigDecimal grossProceeds = price.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
        BigDecimal fees = grossProceeds.multiply(FEE_RATE).setScale(3, RoundingMode.HALF_UP);
        BigDecimal netProceeds = grossProceeds.subtract(fees).setScale(3, RoundingMode.HALF_UP);

        // Calcul du P&L Réalisé : Q_vendue * (P_exécution - PRU) - Frais_vente
        BigDecimal priceDiff = price.subtract(pru);
        BigDecimal grossPnl = priceDiff.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
        BigDecimal realizedPnl = grossPnl.subtract(fees).setScale(3, RoundingMode.HALF_UP);

        // Crédit du compte cash
        BigDecimal newCashBalance = user.getCashBalance().add(netProceeds).setScale(3, RoundingMode.HALF_UP);
        user.setCashBalance(newCashBalance);
        userRepository.save(user);

        // Décrémentation de la position ou suppression si solde = 0
        int remainingQuantity = heldQuantity - quantity;
        BigDecimal resultingPru;
        if (remainingQuantity == 0) {
            positionRepository.delete(position);
            resultingPru = BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP);
        } else {
            position.setQuantity(remainingQuantity);
            positionRepository.save(position);
            resultingPru = pru;
        }

        // Enregistrement de la transaction d'audit
        OrderTransaction tx = new OrderTransaction(
                user, symbol, OrderType.SELL, quantity, price, fees, realizedPnl, simDate
        );
        OrderTransaction savedTx = transactionRepository.save(tx);

        log.info("Ordre VENTE exécuté : User={}, Symbol={}, Qty={}, Price={} TND, Frais={} TND, Net Perçu={} TND, P&L Réalisé={} TND",
                user.getEmail(), symbol, quantity, price, fees, netProceeds, realizedPnl);

        return new OrderExecutionResponse(
                true,
                String.format("Vente de %d %s exécutée à %s TND. Net perçu: %s TND (Frais: %s TND). P&L Réalisé: %s TND.",
                        quantity, symbol, price, netProceeds, fees, realizedPnl),
                savedTx.getId(),
                symbol,
                OrderType.SELL,
                quantity,
                price,
                fees,
                netProceeds,
                realizedPnl,
                newCashBalance,
                user.getBlockedCash(),
                remainingQuantity,
                resultingPru,
                simDate
        );
    }

    /**
     * Synthèse complète du portefeuille pour un utilisateur avec calcul du P&L Latent.
     */
    @Transactional(readOnly = true)
    public PortfolioSummaryDto getPortfolioSummary(User user, Map<String, BigDecimal> currentPrices, String simulatedDate) {
        User persistentUser = userRepository.findById(user.getId())
                .orElse(user);

        List<Position> positions = positionRepository.findByUser(persistentUser);
        List<PositionDto> positionDtos = new ArrayList<>();

        BigDecimal totalPositionsMarketValue = BigDecimal.ZERO;
        BigDecimal totalUnrealizedPnl = BigDecimal.ZERO;
        BigDecimal totalInvestedCost = BigDecimal.ZERO;

        for (Position pos : positions) {
            String sym = pos.getSymbol().toUpperCase();
            BigDecimal pru = pos.getAverageCostPrice();
            int qty = pos.getQuantity();
            BigDecimal qtyBd = new BigDecimal(qty);

            BigDecimal currPrice = currentPrices != null && currentPrices.containsKey(sym)
                    ? currentPrices.get(sym).setScale(3, RoundingMode.HALF_UP)
                    : pru;

            BigDecimal marketValue = currPrice.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
            BigDecimal costBasis = pru.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
            BigDecimal unrealizedPnl = marketValue.subtract(costBasis).setScale(3, RoundingMode.HALF_UP);

            BigDecimal unrealizedPnlPercent = costBasis.compareTo(BigDecimal.ZERO) > 0
                    ? unrealizedPnl.divide(costBasis, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

            totalPositionsMarketValue = totalPositionsMarketValue.add(marketValue);
            totalUnrealizedPnl = totalUnrealizedPnl.add(unrealizedPnl);
            totalInvestedCost = totalInvestedCost.add(costBasis);

            positionDtos.add(new PositionDto(
                    pos.getId(),
                    sym,
                    qty,
                    pru,
                    currPrice,
                    marketValue,
                    unrealizedPnl,
                    unrealizedPnlPercent,
                    pos.getStopLossPrice(),
                    pos.getTakeProfitPrice(),
                    pos.getTrailingStopDistance(),
                    pos.getHighestPriceSeen()
            ));
        }

        BigDecimal cashBalance = persistentUser.getCashBalance().setScale(3, RoundingMode.HALF_UP);
        BigDecimal blockedCash = persistentUser.getBlockedCash().setScale(3, RoundingMode.HALF_UP);
        BigDecimal availableCash = persistentUser.getAvailableCash().setScale(3, RoundingMode.HALF_UP);
        BigDecimal totalPortfolioValue = cashBalance.add(totalPositionsMarketValue).setScale(3, RoundingMode.HALF_UP);

        BigDecimal totalUnrealizedPnlPercent = totalInvestedCost.compareTo(BigDecimal.ZERO) > 0
                ? totalUnrealizedPnl.divide(totalInvestedCost, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        // Calcul du P&L Réalisé cumulé de toutes les ventes passées
        List<OrderTransaction> txs = transactionRepository.findByUserOrderByCreatedAtDesc(persistentUser);
        BigDecimal totalRealizedPnl = txs.stream()
                .filter(t -> t.getType() == OrderType.SELL && t.getRealizedPnl() != null)
                .map(OrderTransaction::getRealizedPnl)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(3, RoundingMode.HALF_UP);

        return new PortfolioSummaryDto(
                cashBalance,
                blockedCash,
                availableCash,
                totalPositionsMarketValue.setScale(3, RoundingMode.HALF_UP),
                totalPortfolioValue,
                totalUnrealizedPnl.setScale(3, RoundingMode.HALF_UP),
                totalUnrealizedPnlPercent,
                totalRealizedPnl,
                positions.size(),
                positionDtos,
                simulatedDate
        );
    }

    /**
     * Récupère l'historique de toutes les transactions auditées.
     */
    @Transactional(readOnly = true)
    public List<OrderTransactionDto> getTransactions(User user) {
        User persistentUser = userRepository.findById(user.getId()).orElse(user);
        List<OrderTransaction> list = transactionRepository.findByUserOrderByCreatedAtDesc(persistentUser);
        return list.stream()
                .map(tx -> new OrderTransactionDto(
                        tx.getId(),
                        tx.getSymbol(),
                        tx.getType().name(),
                        tx.getQuantity(),
                        tx.getExecutionPrice(),
                        tx.getFees(),
                        tx.getRealizedPnl(),
                        tx.getSimulatedDate(),
                        tx.getCreatedAt()
                ))
                .toList();
    }

    /**
     * Métriques de performance : Max Drawdown, Win Rate, Courbe d'équité.
     */
    @Transactional(readOnly = true)
    public AccountPerformanceDto getPerformance(User user, Map<String, BigDecimal> currentPrices) {
        PortfolioSummaryDto summary = getPortfolioSummary(user, currentPrices, "");
        List<OrderTransaction> txs = transactionRepository.findByUserOrderByCreatedAtDesc(user);

        List<OrderTransaction> sells = txs.stream()
                .filter(t -> t.getType() == OrderType.SELL)
                .toList();

        int totalTrades = sells.size();
        int winningTrades = 0;
        int losingTrades = 0;

        for (OrderTransaction s : sells) {
            if (s.getRealizedPnl() != null && s.getRealizedPnl().compareTo(BigDecimal.ZERO) > 0) {
                winningTrades++;
            } else {
                losingTrades++;
            }
        }

        BigDecimal winRate = totalTrades > 0
                ? new BigDecimal(winningTrades).divide(new BigDecimal(totalTrades), 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        BigDecimal initialCash = INITIAL_CAPITAL;
        BigDecimal currentValue = summary.totalPortfolioValue();
        BigDecimal totalReturn = currentValue.subtract(initialCash).setScale(3, RoundingMode.HALF_UP);
        BigDecimal totalReturnPercent = totalReturn.divide(initialCash, 4, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);

        // Construction de la courbe d'équité (Equity Curve)
        List<Map<String, Object>> equityCurve = new ArrayList<>();
        equityCurve.add(Map.of("date", "Départ", "value", initialCash.doubleValue()));

        BigDecimal runningCash = initialCash;
        BigDecimal peak = initialCash;
        BigDecimal maxDrawdown = BigDecimal.ZERO;

        // Tri chronologique des transactions
        List<OrderTransaction> chronoTxs = new ArrayList<>(txs);
        chronoTxs.sort(Comparator.comparing(OrderTransaction::getId));

        for (OrderTransaction tx : chronoTxs) {
            if (tx.getType() == OrderType.BUY) {
                BigDecimal cost = tx.getExecutionPrice().multiply(new BigDecimal(tx.getQuantity())).add(tx.getFees());
                runningCash = runningCash.subtract(cost);
            } else {
                BigDecimal proceeds = tx.getExecutionPrice().multiply(new BigDecimal(tx.getQuantity())).subtract(tx.getFees());
                runningCash = runningCash.add(proceeds);
            }

            BigDecimal totalVal = runningCash.add(summary.positionsMarketValue());
            if (totalVal.compareTo(peak) > 0) {
                peak = totalVal;
            } else if (peak.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal dd = peak.subtract(totalVal).divide(peak, 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP);
                if (dd.compareTo(maxDrawdown) > 0) {
                    maxDrawdown = dd;
                }
            }

            equityCurve.add(Map.of(
                    "date", tx.getSimulatedDate() != null ? tx.getSimulatedDate() : "Tx #" + tx.getId(),
                    "value", totalVal.setScale(2, RoundingMode.HALF_UP).doubleValue()
            ));
        }

        // Point actuel
        equityCurve.add(Map.of("date", "Actuel", "value", currentValue.setScale(2, RoundingMode.HALF_UP).doubleValue()));

        return new AccountPerformanceDto(
                initialCash,
                currentValue,
                totalReturn,
                totalReturnPercent,
                maxDrawdown,
                totalTrades,
                winningTrades,
                losingTrades,
                winRate,
                equityCurve
        );
    }

    /**
     * Réinitialise le compte utilisateur (Positions remises à zéro, solde remis à 100 000.000 TND).
     */
    @Transactional
    public void resetAccount(User user) {
        User persistentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Utilisateur introuvable : " + user.getId()));

        transactionRepository.deleteByUser(persistentUser);
        positionRepository.deleteByUser(persistentUser);

        persistentUser.setCashBalance(INITIAL_CAPITAL);
        persistentUser.setBlockedCash(BigDecimal.ZERO.setScale(3, RoundingMode.HALF_UP));
        userRepository.save(persistentUser);

        log.info("Compte réinitialisé pour l'utilisateur {} : Solde restauré à {} TND.",
                user.getEmail(), INITIAL_CAPITAL);
    }

    /**
     * Modifie ou supprime à la volée les seuils de risque (Stop-Loss, Take-Profit, Trailing-Stop) d'une position.
     */
    @Transactional
    public PositionDto updatePositionRiskThresholds(User user, Long positionId, UpdateRiskThresholdsRequest req) {
        Position position = positionRepository.findById(positionId)
                .orElseThrow(() -> new IllegalArgumentException("Position introuvable : " + positionId));

        if (!position.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Action non autorisée sur cette position.");
        }

        position.setStopLossPrice(req.stopLossPrice() != null ? req.stopLossPrice().setScale(3, RoundingMode.HALF_UP) : null);
        position.setTakeProfitPrice(req.takeProfitPrice() != null ? req.takeProfitPrice().setScale(3, RoundingMode.HALF_UP) : null);
        position.setTrailingStopDistance(req.trailingStopDistance() != null ? req.trailingStopDistance().setScale(3, RoundingMode.HALF_UP) : null);

        Position saved = positionRepository.save(position);

        BigDecimal pru = saved.getAverageCostPrice();
        BigDecimal currentPrice = pru;
        BigDecimal qtyBd = new BigDecimal(saved.getQuantity());
        BigDecimal marketVal = currentPrice.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
        BigDecimal costBasis = pru.multiply(qtyBd).setScale(3, RoundingMode.HALF_UP);
        BigDecimal unrealized = marketVal.subtract(costBasis).setScale(3, RoundingMode.HALF_UP);
        BigDecimal unrealizedPct = costBasis.compareTo(BigDecimal.ZERO) > 0
                ? unrealized.divide(costBasis, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        log.info("Seuils de risque mis à jour pour position #{} ({}): SL={}, TP={}, TS={}",
                positionId, saved.getSymbol(), saved.getStopLossPrice(), saved.getTakeProfitPrice(), saved.getTrailingStopDistance());

        return new PositionDto(
                saved.getId(),
                saved.getSymbol(),
                saved.getQuantity(),
                pru,
                currentPrice,
                marketVal,
                unrealized,
                unrealizedPct,
                saved.getStopLossPrice(),
                saved.getTakeProfitPrice(),
                saved.getTrailingStopDistance(),
                saved.getHighestPriceSeen()
        );
    }

    /**
     * Moteur de surveillance continue des risques lors de l'avancement temporel (Time-Lapse).
     * Vérifie si le cours franchit un Stop-Loss, Take-Profit, Trailing Stop ou OCO.
     * En cas de franchissement, liquide automatiquement la position au cours du marché avec OCO.
     */
    @Transactional
    public List<OrderExecutionResponse> checkAndTriggerRiskOrders(User user, Map<String, BigDecimal> currentPrices, String simulatedDate) {
        User persistentUser = userRepository.findById(user.getId()).orElse(user);
        List<Position> positions = positionRepository.findByUser(persistentUser);
        List<OrderExecutionResponse> triggeredOrders = new ArrayList<>();

        if (currentPrices == null || currentPrices.isEmpty()) {
            return triggeredOrders;
        }

        for (Position pos : positions) {
            String sym = pos.getSymbol().toUpperCase();
            if (!currentPrices.containsKey(sym)) continue;

            BigDecimal currentPrice = currentPrices.get(sym).setScale(3, RoundingMode.HALF_UP);
            BigDecimal highestSeen = pos.getHighestPriceSeen() != null ? pos.getHighestPriceSeen() : pos.getAverageCostPrice();

            // Mise à jour du plus haut historique observé pour le Trailing Stop
            if (currentPrice.compareTo(highestSeen) > 0) {
                pos.setHighestPriceSeen(currentPrice);
                highestSeen = currentPrice;
                positionRepository.save(pos);
            }

            BigDecimal sl = pos.getStopLossPrice();
            BigDecimal tp = pos.getTakeProfitPrice();
            BigDecimal tsDist = pos.getTrailingStopDistance();

            // Calcul du seuil dynamique de Trailing Stop : Seuil = HighestSeen - Distance
            BigDecimal trailingStopThreshold = null;
            if (tsDist != null && tsDist.compareTo(BigDecimal.ZERO) > 0) {
                trailingStopThreshold = highestSeen.subtract(tsDist).setScale(3, RoundingMode.HALF_UP);
            }

            boolean isSlTriggered = sl != null && currentPrice.compareTo(sl) <= 0;
            boolean isTpTriggered = tp != null && currentPrice.compareTo(tp) >= 0;
            boolean isTsTriggered = trailingStopThreshold != null && currentPrice.compareTo(trailingStopThreshold) <= 0;

            if (isSlTriggered || isTpTriggered || isTsTriggered) {
                String reason = isTpTriggered ? "TAKE-PROFIT" : (isTsTriggered ? "TRAILING-STOP" : "STOP-LOSS");
                log.info("DÉCLENCHEMENT AUTOMATIQUE RISK MANAGEMENT [{} - OCO] pour {} : Cours={} TND (SL={}, TP={}, TS_Seuil={})",
                        reason, sym, currentPrice, sl, tp, trailingStopThreshold);

                // Exécution automatique de la vente pour liquider la position
                OrderExecutionResponse sellResp = executeSellOrder(
                        persistentUser,
                        sym,
                        pos.getQuantity(),
                        currentPrice,
                        simulatedDate
                );
                triggeredOrders.add(sellResp);
            }
        }

        return triggeredOrders;
    }
}

