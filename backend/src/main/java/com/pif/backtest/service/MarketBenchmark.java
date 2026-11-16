package com.pif.backtest.service;

import com.pif.marketdata.dto.CandleDto;
import com.pif.marketdata.dto.WatchlistAssetDto;
import com.pif.marketdata.service.LocalCsvMarketDataService;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * Indice de référence : moyenne équipondérée des rendements journaliers de toutes les actions BVMT disponibles.
 * Ce n'est pas le TUNINDEX officiel (non présent dans les données) mais un indice « maison » comparable.
 */
@Component
public class MarketBenchmark {

    public static final String LABEL = "Indice BVMT équipondéré";
    static final int MIN_STOCKS_PER_DAY = 5;

    private final LocalCsvMarketDataService marketData;
    private volatile Map<String, Double> cache;

    public MarketBenchmark(LocalCsvMarketDataService marketData) {
        this.marketData = marketData;
    }

    /** Rendement journalier de l'indice par date ("yyyy-MM-dd"), calculé une seule fois. */
    public Map<String, Double> dailyReturns() {
        Map<String, Double> local = cache;
        if (local == null) {
            synchronized (this) {
                if (cache == null) {
                    cache = compute();
                }
                local = cache;
            }
        }
        return local;
    }

    private Map<String, Double> compute() {
        Map<String, double[]> sums = new HashMap<>();   // date -> {somme des rendements, nombre d'actions}
        for (WatchlistAssetDto asset : marketData.getAllAssets("BVMT")) {
            double prevClose = 0;
            String prevDate = "";
            for (CandleDto c : marketData.getCandles(asset.ticker(), "1d", "ALL", 0)) {
                if (c.time() == null || c.time().length() < 10 || c.close() <= 0) continue;
                String date = c.time().substring(0, 10);
                if (date.compareTo(prevDate) <= 0) continue;
                if (prevClose > 0) {
                    double r = c.close() / prevClose - 1;
                    if (Math.abs(r) < 0.5) {                // écarte les ruptures de série (regroupements, erreurs)
                        double[] s = sums.computeIfAbsent(date, d -> new double[2]);
                        s[0] += r;
                        s[1]++;
                    }
                }
                prevClose = c.close();
                prevDate = date;
            }
        }
        Map<String, Double> out = new TreeMap<>();
        sums.forEach((d, s) -> {
            if (s[1] >= MIN_STOCKS_PER_DAY) out.put(d, s[0] / s[1]);
        });
        return out;
    }
}
