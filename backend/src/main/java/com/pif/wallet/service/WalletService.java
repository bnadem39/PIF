package com.pif.wallet.service;

import com.pif.wallet.dto.WalletView;
import com.pif.wallet.model.PlayerWallet;
import com.pif.wallet.model.WalletTransaction;
import com.pif.wallet.model.WalletTransactionType;
import com.pif.wallet.repository.PlayerWalletRepository;
import com.pif.wallet.repository.WalletTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Portefeuille global du joueur.
 * <ul>
 *   <li>Chaque joueur reçoit START_BALANCE une seule fois, à la première utilisation.</li>
 *   <li>Entrer dans une salle débite son prix d'entrée, qui devient le capital de jeu dans la salle.</li>
 *   <li>Si le solde ne suffit pas, un crédit couvre la différence (dette plafonnée à CREDIT_LIMIT), avec l'accord du joueur.</li>
 *   <li>À la fin du match, le capital final revient au portefeuille ; la dette est remboursée en priorité dessus.</li>
 * </ul>
 */
@Service
public class WalletService {

    public static final BigDecimal START_BALANCE = new BigDecimal("100000.000");
    public static final BigDecimal CREDIT_LIMIT = new BigDecimal("100000.000");

    private final PlayerWalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    public WalletService(PlayerWalletRepository walletRepository, WalletTransactionRepository transactionRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public WalletView view(Long userId) {
        PlayerWallet w = lockOrCreate(userId);
        List<WalletView.Line> lines = transactionRepository.findTop30ByUserIdOrderByIdDesc(userId).stream()
                .map(t -> new WalletView.Line(t.getType().name(), t.getRoomId(), t.getAmount(), t.getBalanceAfter(),
                        t.getDebtAfter(), t.getLabel(), t.getCreatedAt()))
                .toList();
        return new WalletView(w.getBalance(), w.getDebt(), CREDIT_LIMIT, creditAvailable(w), lines);
    }

    /**
     * Débite le prix d'entrée d'une salle. Sans effet si ce joueur a déjà payé cette salle.
     *
     * @throws CreditRequiredException si le solde ne suffit pas et que le crédit n'a pas été accepté
     * @throws IllegalStateException   si même le crédit disponible ne suffit pas
     */
    @Transactional
    public void payEntry(Long userId, String roomId, BigDecimal price, boolean acceptCredit) {
        if (userId == null || price == null || price.signum() <= 0) {
            return;
        }
        if (transactionRepository.existsByUserIdAndRoomIdAndType(userId, roomId, WalletTransactionType.ENTRY)) {
            return;
        }
        BigDecimal entry = scale(price);
        PlayerWallet w = lockOrCreate(userId);

        if (w.getBalance().compareTo(entry) < 0) {
            BigDecimal shortfall = entry.subtract(w.getBalance());
            if (shortfall.compareTo(creditAvailable(w)) > 0) {
                throw new IllegalStateException("Solde insuffisant pour entrer dans cette salle : prix d'entrée "
                        + fmt(entry) + " TND, solde " + fmt(w.getBalance()) + " TND, crédit encore disponible "
                        + fmt(creditAvailable(w)) + " TND.");
            }
            if (!acceptCredit) {
                throw new CreditRequiredException("il te manque " + fmt(shortfall) + " TND pour entrer (prix d'entrée "
                        + fmt(entry) + " TND, solde " + fmt(w.getBalance()) + " TND). Un crédit de " + fmt(shortfall)
                        + " TND peut t'être accordé ; il sera remboursé en priorité sur ce que tu récupères en fin de match.");
            }
            w.setDebt(w.getDebt().add(shortfall));
            w.setBalance(w.getBalance().add(shortfall));
            record(w, roomId, WalletTransactionType.CREDIT, shortfall, "Crédit pour entrer dans la salle " + roomId);
        }

        w.setBalance(w.getBalance().subtract(entry));
        record(w, roomId, WalletTransactionType.ENTRY, entry.negate(), "Prix d'entrée de la salle " + roomId);
        walletRepository.save(w);
    }

    /**
     * Fin de match : le capital final revient au portefeuille, puis la dette est remboursée en priorité.
     * Sans effet si le joueur n'a pas payé l'entrée de cette salle, ou si le match est déjà réglé.
     * Transaction séparée : un échec ici n'annule jamais la clôture de la salle.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void settle(Long userId, String roomId, BigDecimal finalEquity) {
        if (userId == null || roomId == null) {
            return;
        }
        if (!transactionRepository.existsByUserIdAndRoomIdAndType(userId, roomId, WalletTransactionType.ENTRY)
                || transactionRepository.existsByUserIdAndRoomIdAndType(userId, roomId, WalletTransactionType.SETTLEMENT)) {
            return;
        }
        BigDecimal payout = finalEquity == null ? BigDecimal.ZERO : scale(finalEquity.max(BigDecimal.ZERO));
        PlayerWallet w = lockOrCreate(userId);

        w.setBalance(w.getBalance().add(payout));
        record(w, roomId, WalletTransactionType.SETTLEMENT, payout, "Capital récupéré à la fin de la salle " + roomId);

        BigDecimal repay = w.getDebt().min(payout);
        if (repay.signum() > 0) {
            w.setBalance(w.getBalance().subtract(repay));
            w.setDebt(w.getDebt().subtract(repay));
            record(w, roomId, WalletTransactionType.REPAYMENT, repay.negate(), "Remboursement du crédit");
        }
        walletRepository.save(w);
    }

    private PlayerWallet lockOrCreate(Long userId) {
        return walletRepository.findForUpdate(userId)
                .orElseGet(() -> walletRepository.saveAndFlush(new PlayerWallet(userId, START_BALANCE)));
    }

    private void record(PlayerWallet w, String roomId, WalletTransactionType type, BigDecimal amount, String label) {
        transactionRepository.save(new WalletTransaction(w.getUserId(), roomId, type, amount, w.getBalance(), w.getDebt(), label));
    }

    private static BigDecimal creditAvailable(PlayerWallet w) {
        return CREDIT_LIMIT.subtract(w.getDebt()).max(BigDecimal.ZERO);
    }

    private static BigDecimal scale(BigDecimal v) {
        return v.setScale(3, RoundingMode.HALF_UP);
    }

    private static String fmt(BigDecimal v) {
        return v.setScale(0, RoundingMode.HALF_UP).toPlainString();
    }
}
