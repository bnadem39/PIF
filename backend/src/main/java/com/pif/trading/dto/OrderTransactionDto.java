package com.pif.trading.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderTransactionDto(
        Long id,
        String symbol,
        String type,
        Integer quantity,
        BigDecimal executionPrice,
        BigDecimal fees,
        BigDecimal realizedPnl,
        String simulatedDate,
        LocalDateTime createdAt
) {}
