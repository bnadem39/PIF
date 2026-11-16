package com.pif.wallet;

import com.pif.wallet.dto.WalletView;
import com.pif.wallet.service.CreditRequiredException;
import com.pif.wallet.service.WalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Chaque test utilise un identifiant de joueur neuf : les portefeuilles ne se mélangent pas. */
@SpringBootTest(classes = com.pif.PifApplication.class)
class WalletServiceTest {

    private static final AtomicLong NEXT_USER = new AtomicLong(9_100_000L);

    @Autowired
    private WalletService wallet;

    private static long newUser() {
        return NEXT_USER.incrementAndGet();
    }

    private static BigDecimal tnd(String v) {
        return new BigDecimal(v);
    }

    @Test
    void aNewPlayerStartsWithTheStartingBalanceAndNoDebt() {
        WalletView v = wallet.view(newUser());
        assertThat(v.balance()).isEqualByComparingTo(WalletService.START_BALANCE);
        assertThat(v.debt()).isEqualByComparingTo("0");
        assertThat(v.creditAvailable()).isEqualByComparingTo(WalletService.CREDIT_LIMIT);
    }

    @Test
    void enteringARoomDebitsItsPriceOnlyOnce() {
        long user = newUser();
        wallet.payEntry(user, "PIF-T1", tnd("25000"), false);
        wallet.payEntry(user, "PIF-T1", tnd("25000"), false);
        assertThat(wallet.view(user).balance()).isEqualByComparingTo("75000");
    }

    @Test
    void aGainOrALossComesBackToTheWalletAtTheEndOfTheMatch() {
        long winner = newUser();
        wallet.payEntry(winner, "PIF-T2", tnd("25000"), false);
        wallet.settle(winner, "PIF-T2", tnd("30000"));
        assertThat(wallet.view(winner).balance()).isEqualByComparingTo("105000");

        long loser = newUser();
        wallet.payEntry(loser, "PIF-T2", tnd("25000"), false);
        wallet.settle(loser, "PIF-T2", tnd("20000"));
        assertThat(wallet.view(loser).balance()).isEqualByComparingTo("95000");
    }

    @Test
    void aMatchIsSettledOnlyOnceAndOnlyIfTheEntryWasPaid() {
        long user = newUser();
        wallet.settle(user, "PIF-T3", tnd("50000"));
        assertThat(wallet.view(user).balance()).isEqualByComparingTo("100000");

        wallet.payEntry(user, "PIF-T3", tnd("10000"), false);
        wallet.settle(user, "PIF-T3", tnd("12000"));
        wallet.settle(user, "PIF-T3", tnd("12000"));
        assertThat(wallet.view(user).balance()).isEqualByComparingTo("102000");
    }

    @Test
    void aCreditMustBeAcceptedWhenTheBalanceIsTooLow() {
        long user = newUser();
        wallet.payEntry(user, "PIF-T4", tnd("80000"), false);

        assertThatThrownBy(() -> wallet.payEntry(user, "PIF-T5", tnd("50000"), false))
                .isInstanceOf(CreditRequiredException.class)
                .hasMessageStartingWith(CreditRequiredException.PREFIX);
        assertThat(wallet.view(user).balance()).isEqualByComparingTo("20000");

        wallet.payEntry(user, "PIF-T5", tnd("50000"), true);
        WalletView v = wallet.view(user);
        assertThat(v.balance()).isEqualByComparingTo("0");
        assertThat(v.debt()).isEqualByComparingTo("30000");
    }

    @Test
    void theDebtIsRepaidFirstOnWhatIsRecovered() {
        long user = newUser();
        wallet.payEntry(user, "PIF-T6", tnd("100000"), false);
        wallet.payEntry(user, "PIF-T7", tnd("40000"), true);
        assertThat(wallet.view(user).debt()).isEqualByComparingTo("40000");

        // Il récupère 30 000 : tout part au remboursement, il reste 10 000 de dette
        wallet.settle(user, "PIF-T7", tnd("30000"));
        WalletView afterLoss = wallet.view(user);
        assertThat(afterLoss.balance()).isEqualByComparingTo("0");
        assertThat(afterLoss.debt()).isEqualByComparingTo("10000");

        // Il récupère 120 000 de l'autre salle : la dette est soldée, le reste est à lui
        wallet.settle(user, "PIF-T6", tnd("120000"));
        WalletView afterWin = wallet.view(user);
        assertThat(afterWin.debt()).isEqualByComparingTo("0");
        assertThat(afterWin.balance()).isEqualByComparingTo("110000");
    }

    @Test
    void theCreditIsCapped() {
        long user = newUser();
        assertThatThrownBy(() -> wallet.payEntry(user, "PIF-T8", tnd("250000"), true))
                .isInstanceOf(IllegalStateException.class)
                .isNotInstanceOf(CreditRequiredException.class);
        assertThat(wallet.view(user).balance()).isEqualByComparingTo("100000");
    }
}
