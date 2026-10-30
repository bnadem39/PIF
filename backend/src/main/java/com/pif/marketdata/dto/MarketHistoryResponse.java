package com.pif.marketdata.dto;

import java.util.List;
import java.util.Map;

public record MarketHistoryResponse(
        String symbol,
        String interval,
        int count,
        List<CandleDto> candles,
        List<IndicatorPointDto> sma20,
        List<IndicatorPointDto> sma50,
        Map<String, Object> metadata
) {}
