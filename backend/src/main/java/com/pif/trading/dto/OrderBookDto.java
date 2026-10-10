package com.pif.trading.dto;

import java.util.List;

public record OrderBookDto(
        String symbol,
        double midPrice,
        double spread,
        double spreadPercent,
        List<OrderBookLevel> asks,
        List<OrderBookLevel> bids
) {
    public record OrderBookLevel(
            double price,
            long size,
            long total,
            int depthPercent
    ) {}
}
