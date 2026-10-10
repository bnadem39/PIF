package com.pif.trading.dto;

public record CandleDto(
        String time,
        double open,
        double high,
        double low,
        double close,
        long volume
) {}
