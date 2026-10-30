package com.pif.marketdata.dto;

public record WatchlistAssetDto(
        String ticker,
        String name,
        String category,
        String type,
        String currency,
        double price,
        double change24h,
        double high24h,
        double low24h,
        String volume24h
) {}
