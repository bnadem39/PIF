package com.pif.trading.dto;

import com.pif.trading.model.OrderType;
import java.math.BigDecimal;

public record OrderExecutionResponse(
        boolean success,
        String message,
        Long transactionId,
        String symbol,
        OrderType type,
        Integer quantity,
        BigDecimal executionPrice,
        BigDecimal fees,
        BigDecimal totalAmount,
        BigDecimal realizedPnl,
        BigDecimal newCashBalance,
        BigDecimal newBlockedCash,
        Integer newPositionQuantity,
        BigDecimal newPositionPru,
        String simulatedDate
) {}
