package com.pif.marketdata.service;

import com.pif.marketdata.dto.CandleDto;
import com.pif.marketdata.dto.WatchlistAssetDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Vue de marché à la date simulée, calculée sur les historiques locaux (aucune valeur figée) :
 * indice équipondéré des actions BVMT disponibles, crypto-actifs, et étendue du marché (hausses / baisses).
 * L'indice est construit par PIF (base 1 000 au premier jour) : ce n'est pas le TUNINDEX officiel,
 * dont l'historique ne figure pas dans les données.
 */
@Service
public class MarketOverviewService {

    static final double INDEX_BASE = 1000.0;
    /** Variation journalière au-delà de laquelle une cotation est considérée comme une erreur de données. */
    static final double MAX_DAILY_MOVE = 0.20;
    static final List<String> CRYPTOS = List.of("BTC-USD", "ETH-USD", "BNB-USD");

    public record Tile(String symbol, String name, double value, double change, double changePercent, String currency) {
    }

    public record Breadth(String date, int advancers, int decliners, int unchanged, String topGainer,
                          Double topGainerPct, String topLoser, Double topLoserPct) {
    }

    public record Overview(String date, List<Tile> tiles, Breadth breadth) {
    }

    private final LocalCsvMarketDataService local;
    private volatile Map<String, TreeMap<String, Double>> closes;   // ticker -> date -> clôture (actions BVMT)
    private volatile TreeMap<String, Double> index;              // date -> niveau de l'indice

    public MarketOverviewService(LocalCsvMarketDataService local) {
        this.local = local;
    }

    public Overview overview(String date) {
        ensureLoaded();
        List<Tile> tiles = new ArrayList<>();
        Map.Entry<String, Double> today = index.floorEntry(date);
        if (today != null) {
            Map.Entry<String, Double> before = index.lowerEntry(today.getKey());
            double prev = before != null ? before.getValue() : today.getValue();
            tiles.add(new Tile("PIF-BVMT", "Indice BVMT équipondéré (calculé par PIF)", round(today.getValue(), 2),
                    round(today.getValue() - prev, 2), round((today.getValue() / prev - 1) * 100, 2), "PTS"));
        }
        for (String c : CRYPTOS) {
            List<CandleDto> candles = local.getCandles(c, "1d", "ALL", 0);
            int i = lastOnOrBefore(candles, date);
            if (i <= 0) continue;
            double close = candles.get(i).close();
            double prev = candles.get(i - 1).close();
            tiles.add(new Tile(c.replace("-USD", "/USD"), c, round(close, 2), round(close - prev, 2),
                    round((close / prev - 1) * 100, 2), "USD"));
        }
        return new Overview(today != null ? today.getKey() : date, tiles, breadth(today != null ? today.getKey() : date));
    }

    private Breadth breadth(String date) {
        int up = 0, down = 0, flat = 0;
        String best = null, worst = null;
        double bestPct = Double.NEGATIVE_INFINITY, worstPct = Double.POSITIVE_INFINITY;
        for (Map.Entry<String, TreeMap<String, Double>> e : closes.entrySet()) {
            Double r = dailyReturn(e.getValue(), date);
            if (r == null) continue;
            if (r > 0) up++;
            else if (r < 0) down++;
            else flat++;
            if (r > bestPct) { bestPct = r; best = e.getKey(); }
            if (r < worstPct) { worstPct = r; worst = e.getKey(); }
        }
        return new Breadth(date, up, down, flat, best, best != null ? round(bestPct * 100, 2) : null,
                worst, worst != null ? round(worstPct * 100, 2) : null);
    }

    /** Rendement du jour exact (null si le titre n'a pas coté ce jour-là ou si la variation est aberrante). */
    static Double dailyReturn(TreeMap<String, Double> series, String date) {
        Double close = series.get(date);
        Map.Entry<String, Double> prev = series.lowerEntry(date);
        if (close == null || prev == null || prev.getValue() <= 0) return null;
        double r = close / prev.getValue() - 1;
        return Math.abs(r) > MAX_DAILY_MOVE ? null : r;
    }

    private synchronized void ensureLoaded() {
        if (index != null) return;
        Map<String, TreeMap<String, Double>> byTicker = new LinkedHashMap<>();
        TreeSet<String> dates = new TreeSet<>();
        for (WatchlistAssetDto a : local.getAllAssets("ALL")) {
            if ("CRYPTO".equalsIgnoreCase(a.category())) continue;
            TreeMap<String, Double> series = new TreeMap<>();
            for (CandleDto c : local.getCandles(a.ticker(), "1d", "ALL", 0)) {
                if (c.time() != null && c.time().length() >= 10 && c.close() > 0) series.put(c.time().substring(0, 10), c.close());
            }
            if (!series.isEmpty()) {
                byTicker.put(a.ticker(), series);
                dates.addAll(series.keySet());
            }
        }
        closes = byTicker;
        index = buildIndex(byTicker, dates);
    }

    /** Indice équipondéré : chaque jour, moyenne des rendements des titres qui ont coté ce jour et la séance précédente. */
    static TreeMap<String, Double> buildIndex(Map<String, TreeMap<String, Double>> byTicker, TreeSet<String> dates) {
        TreeMap<String, Double> out = new TreeMap<>();
        double level = INDEX_BASE;
        for (String d : dates) {
            double sum = 0;
            int n = 0;
            for (TreeMap<String, Double> s : byTicker.values()) {
                Double r = dailyReturn(s, d);
                if (r != null) {
                    sum += r;
                    n++;
                }
            }
            if (n > 0) level *= 1 + sum / n;
            out.put(d, level);
        }
        return out;
    }

    private static int lastOnOrBefore(List<CandleDto> candles, String date) {
        int found = -1;
        for (int i = 0; i < candles.size(); i++) {
            String t = candles.get(i).time();
            if (t != null && t.substring(0, Math.min(10, t.length())).compareTo(date) <= 0) found = i;
        }
        return found;
    }

    private static double round(double v, int d) {
        double f = Math.pow(10, d);
        return Math.round(v * f) / f;
    }
}
