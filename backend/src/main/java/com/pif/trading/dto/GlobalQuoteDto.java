package com.pif.trading.dto;

public record GlobalQuoteDto(
        String symbol,
        double price,
        double change,
        double changePercent,
        double high,
        double low,
        long volume,
        String latestTradingDay
) {}
