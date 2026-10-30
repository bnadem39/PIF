package com.pif.trading.service;

import com.pif.marketdata.service.MarketPriceService;

import com.pif.audit.model.AuditAction;
import com.pif.audit.service.AuditService;
import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.trading.dto.OrderExecutionResponse;
import com.pif.trading.dto.OrderRequest;
import com.pif.trading.exception.InsufficientFundsException;
import com.pif.trading.exception.InsufficientPositionException;
import com.pif.trading.model.ExecutionType;
import com.pif.trading.model.OrderTransaction;
import com.pif.trading.model.OrderType;
import com.pif.trading.model.Position;
import com.pif.trading.repository.OrderTransactionRepository;
import com.pif.trading.repository.PositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradingServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private OrderTransactionRepository transactionRepository;

    @Mock
    private MarketPriceService marketPriceService;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private TradingService tradingService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("trader@test.com");
        testUser.setRole(Role.ROLE_TRADER);
        testUser.setCashBalance(new BigDecimal("100000.000"));
        testUser.setBlockedCash(new BigDecimal("0.000"));

        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        lenient().when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(testUser));
        lenient().when(transactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Test Unitaire : Recalcul exact du PRU après plusieurs achats successifs")
    void testSuccessiveBuysRecalculatePruAccurately() {
        // Achat 1 : 10 actions @ 100.000 TND (Pas de position existante)
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.empty());
        serverPrice("BIAT", "2022-01-05", "100.000");
        serverPrice("BIAT", "2022-01-10", "130.000");
        serverPrice("BIAT", "2022-01-15", "160.000");

        OrderRequest buy1 = new OrderRequest("BIAT", OrderType.BUY, 10, new BigDecimal("100.000"), "2022-01-05");
        OrderExecutionResponse resp1 = tradingService.executeOrder(testUser, buy1);

        assertThat(resp1.success()).isTrue();
        assertThat(resp1.newPositionQuantity()).isEqualTo(10);
        assertThat(resp1.newPositionPru()).isEqualByComparingTo("100.000");

        // Position simulée après achat 1
        Position positionAfterBuy1 = new Position(testUser, "BIAT", 10, new BigDecimal("100.000"));
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.of(positionAfterBuy1));

        // Achat 2 : 20 actions @ 130.000 TND
        // PRU attendu = ((10 * 100) + (20 * 130)) / (10 + 20) = (1000 + 2600) / 30 = 3600 / 30 = 120.000 TND
        OrderRequest buy2 = new OrderRequest("BIAT", OrderType.BUY, 20, new BigDecimal("130.000"), "2022-01-10");
        OrderExecutionResponse resp2 = tradingService.executeOrder(testUser, buy2);

        assertThat(resp2.success()).isTrue();
        assertThat(resp2.newPositionQuantity()).isEqualTo(30);
        assertThat(resp2.newPositionPru()).isEqualByComparingTo("120.000");

        // Achat 3 : 10 actions @ 160.000 TND
        // PRU attendu = ((30 * 120) + (10 * 160)) / (30 + 10) = (3600 + 1600) / 40 = 5200 / 40 = 130.000 TND
        OrderRequest buy3 = new OrderRequest("BIAT", OrderType.BUY, 10, new BigDecimal("160.000"), "2022-01-15");
        OrderExecutionResponse resp3 = tradingService.executeOrder(testUser, buy3);

        assertThat(resp3.success()).isTrue();
        assertThat(resp3.newPositionQuantity()).isEqualTo(40);
        assertThat(resp3.newPositionPru()).isEqualByComparingTo("130.000");
    }

    @Test
    @DisplayName("Test Pré-Trade : Rejet immédiat de l'achat si cash disponible insuffisant")
    void testBuyRejectedWhenInsufficientCash() {
        testUser.setCashBalance(new BigDecimal("500.000")); // Seulement 500 TND
        serverPrice("SFBT", "2022-02-01", "100.000");

        // Tente d'acheter 10 actions à 100 TND = 1 000 TND + frais (1.500) = 1 001.500 TND
        OrderRequest bigBuy = new OrderRequest("SFBT", OrderType.BUY, 10, new BigDecimal("100.000"), "2022-02-01");

        assertThatThrownBy(() -> tradingService.executeOrder(testUser, bigBuy))
                .isInstanceOf(InsufficientFundsException.class)
                .hasMessageContaining("Fonds insuffisants");

        verify(positionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test Pré-Trade : Rejet immédiat de la vente si aucune position détenue (Vente à découvert interdite)")
    void testSellRejectedWhenNoPositionHeld() {
        when(positionRepository.findByUserAndSymbol(testUser, "SFBT")).thenReturn(Optional.empty());
        serverPrice("SFBT", "2022-02-01", "150.000");

        OrderRequest shortSell = new OrderRequest("SFBT", OrderType.SELL, 5, new BigDecimal("150.000"), "2022-02-01");

        assertThatThrownBy(() -> tradingService.executeOrder(testUser, shortSell))
                .isInstanceOf(InsufficientPositionException.class)
                .hasMessageContaining("Vente à découvert interdite");
    }

    @Test
    @DisplayName("Test Pré-Trade : Rejet si quantité voulue supérieure à quantité détenue")
    void testSellRejectedWhenQuantityExceedsHeld() {
        Position pos = new Position(testUser, "BIAT", 5, new BigDecimal("90.000"));
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.of(pos));
        serverPrice("BIAT", "2022-02-01", "100.000");

        OrderRequest oversell = new OrderRequest("BIAT", OrderType.SELL, 10, new BigDecimal("100.000"), "2022-02-01");

        assertThatThrownBy(() -> tradingService.executeOrder(testUser, oversell))
                .isInstanceOf(InsufficientPositionException.class)
                .hasMessageContaining("supérieure à la position détenue");
    }

    @Test
    @DisplayName("Test Métier : Calcul exact du P&L réalisé net de frais lors d'une vente")
    void testSellCalculatesRealizedPnlNetOfFees() {
        // Position initiale : 10 actions à PRU = 100.000 TND
        Position pos = new Position(testUser, "BIAT", 10, new BigDecimal("100.000"));
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.of(pos));
        serverPrice("BIAT", "2022-03-01", "150.000");

        BigDecimal initialCash = testUser.getCashBalance(); // 100 000.000 TND

        // Vente de 4 actions @ 150.000 TND
        // Montant brut = 4 * 150.000 = 600.000 TND
        // Frais de vente (0.15%) = 600.000 * 0.0015 = 0.900 TND
        // Net perçu = 600.000 - 0.900 = 599.100 TND
        // P&L Brut = 4 * (150.000 - 100.000) = 200.000 TND
        // P&L Réalisé Net = 200.000 - 0.900 = 199.100 TND
        OrderRequest sellRequest = new OrderRequest("BIAT", OrderType.SELL, 4, new BigDecimal("150.000"), "2022-03-01");
        OrderExecutionResponse resp = tradingService.executeOrder(testUser, sellRequest);

        assertThat(resp.success()).isTrue();
        assertThat(resp.fees()).isEqualByComparingTo("0.900");
        assertThat(resp.realizedPnl()).isEqualByComparingTo("199.100");
        assertThat(resp.newPositionQuantity()).isEqualTo(6);
        assertThat(resp.newPositionPru()).isEqualByComparingTo("100.000"); // Le PRU reste inchangé

        // Vérifier crédit du compte
        BigDecimal expectedCash = initialCash.add(new BigDecimal("599.100")).setScale(3, RoundingMode.HALF_UP);
        assertThat(testUser.getCashBalance()).isEqualByComparingTo(expectedCash);
    }

    // ------------------------------------------------------------------
    // Phase 0 : prix serveur, sens/mode d'ordre, seuils, drawdown
    // ------------------------------------------------------------------

    private void serverPrice(String symbol, String date, String price) {
        lenient().when(marketPriceService.getClosePrice(symbol, date)).thenReturn(new BigDecimal(price));
        lenient().when(marketPriceService.findClosePrice(symbol, date)).thenReturn(Optional.of(new BigDecimal(price)));
    }

    @Test
    @DisplayName("Sécurité : le prix envoyé par le client est ignoré, l'ordre s'exécute au cours serveur")
    void testClientPriceIsIgnored() {
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.empty());
        serverPrice("BIAT", "2022-04-15", "92.500");

        // Le client prétend acheter à 0.001 TND
        OrderRequest cheat = new OrderRequest("BIAT", OrderType.BUY, 100, new BigDecimal("0.001"), "2022-04-15");
        OrderExecutionResponse resp = tradingService.executeOrder(testUser, cheat);

        assertThat(resp.executionPrice()).isEqualByComparingTo("92.500");
        // 100 * 92.500 = 9 250.000 + frais 13.875 = 9 263.875
        assertThat(testUser.getCashBalance()).isEqualByComparingTo("90736.125");
    }

    @Test
    @DisplayName("Ordre : LIMIT/MARKET ne sont plus acceptés comme sens d'ordre")
    void testLegacyLimitTypeAsSideIsRejected() {
        OrderRequest legacy = new OrderRequest("BIAT", OrderType.LIMIT, 10, null, "2022-04-15");

        assertThatThrownBy(() -> tradingService.executeOrder(testUser, legacy))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("BUY ou SELL");
        verify(positionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ordre LIMIT : achat rejeté si le cours serveur dépasse la limite")
    void testBuyLimitNotMarketableIsRejected() {
        serverPrice("BIAT", "2022-04-15", "92.500");
        OrderRequest limitBuy = new OrderRequest("BIAT", OrderType.BUY, 10, null, "2022-04-15",
                null, null, null, ExecutionType.LIMIT, new BigDecimal("90.000"));

        assertThatThrownBy(() -> tradingService.executeOrder(testUser, limitBuy))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LIMIT non exécutable");
        verify(positionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Ordre LIMIT : achat exécuté au cours serveur si celui-ci respecte la limite")
    void testBuyLimitMarketableExecutesAtServerPrice() {
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.empty());
        serverPrice("BIAT", "2022-04-15", "92.500");
        OrderRequest limitBuy = new OrderRequest("BIAT", OrderType.BUY, 10, null, "2022-04-15",
                null, null, null, ExecutionType.LIMIT, new BigDecimal("95.000"));

        OrderExecutionResponse resp = tradingService.executeOrder(testUser, limitBuy);

        assertThat(resp.executionPrice()).isEqualByComparingTo("92.500");
    }

    @Test
    @DisplayName("Risque : Stop-Loss au-dessus du cours d'achat rejeté")
    void testStopLossAbovePriceIsRejected() {
        serverPrice("BIAT", "2022-04-15", "92.500");
        OrderRequest badSl = new OrderRequest("BIAT", OrderType.BUY, 10, null, "2022-04-15",
                new BigDecimal("95.000"), null, null, null, null);

        assertThatThrownBy(() -> tradingService.executeOrder(testUser, badSl))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Stop-Loss");
    }

    @Test
    @DisplayName("Risque : le Stop-Loss se déclenche au cours serveur de la date simulée")
    void testCheckRiskUsesServerPrice() {
        Position pos = new Position(testUser, "BIAT", 10, new BigDecimal("100.000"));
        pos.setStopLossPrice(new BigDecimal("95.000"));
        when(positionRepository.findByUser(testUser)).thenReturn(List.of(pos));
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.of(pos));
        serverPrice("BIAT", "2022-05-02", "94.000");

        List<OrderExecutionResponse> triggered = tradingService.checkAndTriggerRiskOrders(testUser, "2022-05-02");

        assertThat(triggered).hasSize(1);
        assertThat(triggered.get(0).executionPrice()).isEqualByComparingTo("94.000");
        assertThat(triggered.get(0).type()).isEqualTo(OrderType.SELL);
    }

    @Test
    @DisplayName("Risque : aucun déclenchement si le cours serveur reste au-dessus du Stop-Loss")
    void testCheckRiskNoTriggerAboveStopLoss() {
        Position pos = new Position(testUser, "BIAT", 10, new BigDecimal("100.000"));
        pos.setStopLossPrice(new BigDecimal("95.000"));
        when(positionRepository.findByUser(testUser)).thenReturn(List.of(pos));
        serverPrice("BIAT", "2022-05-02", "99.000");

        assertThat(tradingService.checkAndTriggerRiskOrders(testUser, "2022-05-02")).isEmpty();
    }

    @Test
    @DisplayName("Performance : Max Drawdown calculé sur la série de valeurs")
    void testMaxDrawdown() {
        List<BigDecimal> values = List.of(
                new BigDecimal("100000"), new BigDecimal("110000"),
                new BigDecimal("88000"), new BigDecimal("120000"), new BigDecimal("114000"));

        // Pic 110 000 -> creux 88 000 = -20 %
        assertThat(TradingService.computeMaxDrawdownPercent(values)).isEqualByComparingTo("20.00");
    }

    @Test
    @DisplayName("Performance : la courbe d'équité valorise les positions au cours de chaque date, pas au cours actuel")
    void testEquityCurveUsesHistoricalPrices() {
        // Achat de 100 BIAT à 100 le 2022-01-03 (frais 15), puis on valorise le 2022-06-01 à 50
        OrderTransaction buy = new OrderTransaction(testUser, "BIAT", OrderType.BUY, 100,
                new BigDecimal("100.000"), new BigDecimal("15.000"), BigDecimal.ZERO, "2022-01-03");
        buy.setId(1L);
        when(transactionRepository.findByUserOrderByCreatedAtDesc(testUser)).thenReturn(List.of(buy));

        testUser.setCashBalance(new BigDecimal("89985.000"));
        Position pos = new Position(testUser, "BIAT", 100, new BigDecimal("100.000"));
        when(positionRepository.findByUser(testUser)).thenReturn(List.of(pos));
        serverPrice("BIAT", "2022-01-03", "100.000");
        serverPrice("BIAT", "2022-06-01", "50.000");

        var perf = tradingService.getPerformance(testUser, "2022-06-01");

        // Point de la transaction : 89 985 + 100 * 100 = 99 985 (et non 89 985 + 100 * 50)
        assertThat(perf.equityCurve().get(1).get("value")).isEqualTo(99985.0);
        // Point actuel : 89 985 + 5 000 = 94 985 ; drawdown depuis 100 000 = 5.02 %
        assertThat(perf.currentValue()).isEqualByComparingTo("94985.000");
        assertThat(perf.maxDrawdownPercent()).isEqualByComparingTo("5.02");
    }

    @Test
    @DisplayName("Audit : chaque ordre exécuté est tracé dans le journal")
    void testExecutedOrderIsAudited() {
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.empty());
        serverPrice("BIAT", "2022-04-15", "92.500");

        tradingService.executeOrder(testUser, new OrderRequest("BIAT", OrderType.BUY, 10, null, "2022-04-15"));

        verify(auditService).record(eq(testUser), eq(AuditAction.ORDER_EXECUTED), eq(true),
                argThat((String d) -> d.contains("BUY 10 BIAT @ 92.500")));
    }
}
