package com.pif.trading.dto;

import java.math.BigDecimal;

public record UpdateRiskThresholdsRequest(
        BigDecimal stopLossPrice,
        BigDecimal takeProfitPrice,
        BigDecimal trailingStopDistance
) {}
