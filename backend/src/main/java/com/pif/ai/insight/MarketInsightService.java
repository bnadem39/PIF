package com.pif.ai.insight;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.ai.config.AiServiceProperties;
import com.pif.backtest.service.AiSignalClient;
import com.pif.backtest.service.BacktestService;
import com.pif.backtest.service.Bar;
import com.pif.common.exception.AiServiceUnavailableException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Signaux XGBoost calculés sur l'historique réel jusqu'à la date simulée (cahier §3.4.1), et leur explication
 * par valeurs de Shapley (§3.6.1). Les indicateurs sont recalculés par le service IA à partir des chandeliers :
 * le client ne fournit aucune variable, et aucun cours postérieur à la date n'est transmis.
 */
@Service
public class MarketInsightService {

    /** Seuil de confiance utilisé à l'entraînement pour classer un signal Achat ou Vente. */
    static final double THRESHOLD = 0.60;
    /** Historique transmis pour une explication : couvre le préchauffage des indicateurs (MM50, volatilité 30 j). */
    static final int EXPLAIN_HISTORY = 300;
    static final int MAX_SYMBOLS = 40;

    public record AssetSignal(String symbol, String date, double close, Double changePct, double volume, int signal,
                              Double pBuy, Double pSell) {
    }

    private final BacktestService backtestService;
    private final AiSignalClient aiSignalClient;
    private final AiServiceProperties properties;
    private final RestTemplate restTemplate;
    // Probabilités de tout l'historique d'un actif, calculées une fois : chaque jour n'utilise que les données connues ce jour-là
    private final Map<String, AiSignalClient.AiSignals> signalCache = new ConcurrentHashMap<>();

    public MarketInsightService(BacktestService backtestService, AiSignalClient aiSignalClient,
                                AiServiceProperties properties, RestTemplateBuilder builder) {
        this.backtestService = backtestService;
        this.aiSignalClient = aiSignalClient;
        this.properties = properties;
        this.restTemplate = builder.setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(30)).build();
    }

    public List<AssetSignal> signals(String date, List<String> symbols) {
        requireDate(date);
        if (symbols.size() > MAX_SYMBOLS) {
            throw new IllegalArgumentException("Au plus " + MAX_SYMBOLS + " actifs par requête.");
        }
        List<AssetSignal> out = new ArrayList<>();
        boolean aiAvailable = true;
        for (String raw : symbols) {
            String symbol = raw.trim().toUpperCase();
            List<Bar> bars = backtestService.loadBars(symbol);
            int i = lastIndexOnOrBefore(bars, date);
            if (i < 0) continue;
            Bar bar = bars.get(i);
            Double change = i > 0 ? bar.close() / bars.get(i - 1).close() - 1 : null;
            double[] p = null;
            if (aiAvailable) {
                try {
                    p = signalCache.computeIfAbsent(symbol, s -> fetchOrEmpty(s, bars)).byDate().get(bar.date());
                } catch (AiServiceUnavailableException e) {
                    aiAvailable = false;   // les cours restent servis, sans probabilités
                }
            }
            out.add(new AssetSignal(symbol, bar.date(), bar.close(), change, bar.volume(), p == null ? 0 : signalOf(p[0], p[1]),
                    p == null ? null : p[0], p == null ? null : p[1]));
        }
        return out;
    }

    /** Calcule et met en cache les signaux de tout l'historique des actifs donnés ; s'arrête si le service IA ne répond pas. */
    public int warmUp(List<String> symbols) {
        int done = 0;
        for (String symbol : symbols) {
            try {
                List<Bar> bars = backtestService.loadBars(symbol);
                if (bars.isEmpty()) continue;
                signalCache.computeIfAbsent(symbol, s -> fetchOrEmpty(s, bars));
                done++;
            } catch (AiServiceUnavailableException e) {
                break;
            } catch (RuntimeException e) {
                // actif à l'historique trop court ou invalide : ignoré
            }
        }
        return done;
    }

    /** Un actif dont l'historique est trop court n'a pas de signal ; on le mémorise pour ne pas le redemander. */
    private AiSignalClient.AiSignals fetchOrEmpty(String symbol, List<Bar> bars) {
        try {
            return aiSignalClient.fetch(symbol, bars);
        } catch (IllegalArgumentException e) {
            return new AiSignalClient.AiSignals(Map.of(), null);
        }
    }

    static int signalOf(double pBuy, double pSell) {
        if (pBuy >= THRESHOLD && pBuy > pSell) return 1;
        if (pSell >= THRESHOLD && pSell > pBuy) return -1;
        return 0;
    }

    public JsonNode explain(String symbol, String date) {
        requireDate(date);
        String s = symbol.trim().toUpperCase();
        List<Bar> bars = backtestService.loadBars(s);
        int i = lastIndexOnOrBefore(bars, date);
        if (i < 60) {
            throw new NoSuchElementException("Historique insuffisant pour " + s + " au " + date + ".");
        }
        List<Map<String, Object>> candles = bars.subList(Math.max(0, i - EXPLAIN_HISTORY + 1), i + 1).stream()
                .map(b -> Map.<String, Object>of("time", b.date(), "open", b.open(), "high", b.high(), "low", b.low(),
                        "close", b.close(), "volume", b.volume()))
                .toList();
        try {
            return restTemplate.postForObject(properties.getBaseUrl() + "/api/ai/insight/explain",
                    Map.of("ticker", s, "candles", candles, "threshold", THRESHOLD), JsonNode.class);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Service IA indisponible pour l'explication du signal (" + properties.getBaseUrl() + ").", e);
        }
    }

    static String requireDate(String date) {
        if (date == null || !date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException("Date attendue au format AAAA-MM-JJ.");
        }
        return date;
    }

    static int lastIndexOnOrBefore(List<Bar> bars, String date) {
        int found = -1;
        for (int i = 0; i < bars.size(); i++) {
            if (bars.get(i).date().compareTo(date) <= 0) found = i;
            else break;
        }
        return found;
    }
}
