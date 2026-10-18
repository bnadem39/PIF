package com.pif.trading.service;

import com.pif.market.model.Role;
import com.pif.market.model.User;
import com.pif.market.repository.UserRepository;
import com.pif.trading.dto.OrderExecutionResponse;
import com.pif.trading.dto.OrderRequest;
import com.pif.trading.exception.InsufficientFundsException;
import com.pif.trading.exception.InsufficientPositionException;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradingServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private OrderTransactionRepository transactionRepository;

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
        lenient().when(transactionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("Test Unitaire : Recalcul exact du PRU après plusieurs achats successifs")
    void testSuccessiveBuysRecalculatePruAccurately() {
        // Achat 1 : 10 actions @ 100.000 TND (Pas de position existante)
        when(positionRepository.findByUserAndSymbol(testUser, "BIAT")).thenReturn(Optional.empty());

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
}
