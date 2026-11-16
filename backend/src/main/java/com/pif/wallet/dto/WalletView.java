package com.pif.wallet.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Vue renvoyée par GET /api/v1/wallet. Montants en TND. */
public record WalletView(BigDecimal balance, BigDecimal debt, BigDecimal creditLimit, BigDecimal creditAvailable,
                         List<Line> transactions) {

    public record Line(String type, String roomId, BigDecimal amount, BigDecimal balanceAfter, BigDecimal debtAfter,
                       String label, LocalDateTime createdAt) {
    }
}
