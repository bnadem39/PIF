package com.pif.ai.insight;

import com.fasterxml.jackson.databind.JsonNode;
import com.pif.ai.config.AiServiceProperties;
import com.pif.auth.model.User;
import com.pif.backtest.service.BacktestService;
import com.pif.backtest.service.Bar;
import com.pif.common.exception.AiServiceUnavailableException;
import com.pif.trading.dto.PositionDto;
import com.pif.trading.service.TradingService;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Optimisation de portefeuille (Markowitz) et détection d'anomalies (cahier §3.4.1), sur les cours connus à la date
 * simulée. Le backend découpe l'historique à la date et aligne les séances ; le service IA fait le calcul.
 */
@Service
public class PortfolioLabService {

    static final int MIN_OBSERVATIONS = 60;
    static final int MAX_ASSETS = 15;

    public record OptimizeRequest(
            @NotBlank String date,
            @Size(max = MAX_ASSETS) List<String> symbols,
            @Min(60) @Max(1500) Integer lookbackDays,
            @DecimalMin("0.05") @DecimalMax("1.0") Double maxWeight,
            @DecimalMin("0.0") @DecimalMax("0.5") Double riskFree) {
    }

    private final BacktestService backtestService;
    private final TradingService tradingService;
    private final AiServiceProperties properties;
    private final RestTemplate restTemplate;

    public PortfolioLabService(BacktestService backtestService, TradingService tradingService,
                               AiServiceProperties properties, RestTemplateBuilder builder) {
        this.backtestService = backtestService;
        this.tradingService = tradingService;
        this.properties = properties;
        this.restTemplate = builder.setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(60)).build();
    }

    public JsonNode optimize(User user, OptimizeRequest req) {
        String date = MarketInsightService.requireDate(req.date());
        // Poids actuels : valeur de marché de chaque position au cours de la date simulée
        Map<String, Double> current = new LinkedHashMap<>();
        for (PositionDto p : tradingService.getPortfolioSummary(user, date).positions()) {
            if (p.marketValue() != null && p.marketValue().signum() > 0) {
                current.merge(p.symbol(), p.marketValue().doubleValue(), Double::sum);
            }
        }
        LinkedHashSet<String> symbols = new LinkedHashSet<>();
        if (req.symbols() != null) {
            req.symbols().stream().map(s -> s.trim().toUpperCase()).filter(s -> !s.isBlank()).forEach(symbols::add);
        }
        if (symbols.isEmpty()) symbols.addAll(current.keySet());
        if (symbols.size() < 2) {
            throw new IllegalArgumentException("Choisissez au moins deux actifs (ou détenez-en au moins deux dans le portefeuille).");
        }
        if (symbols.size() > MAX_ASSETS) {
            throw new IllegalArgumentException("Au plus " + MAX_ASSETS + " actifs.");
        }
        int lookback = req.lookbackDays() == null ? 365 : req.lookbackDays();
        LocalDate end = LocalDate.parse(date);
        String start = end.minusDays(lookback).toString();

        // Séances communes à tous les actifs dans la fenêtre [date - lookback, date]
        Map<String, Map<String, Double>> series = new LinkedHashMap<>();
        TreeSet<String> common = null;
        for (String s : symbols) {
            Map<String, Double> byDate = new HashMap<>();
            for (Bar b : backtestService.loadBars(s)) {
                if (b.date().compareTo(start) >= 0 && b.date().compareTo(date) <= 0 && b.close() > 0) {
                    byDate.put(b.date(), b.close());
                }
            }
            if (byDate.size() < MIN_OBSERVATIONS) {
                throw new IllegalArgumentException(s + " : historique insuffisant avant le " + date + " (" + byDate.size() + " séances).");
            }
            series.put(s, byDate);
            if (common == null) common = new TreeSet<>(byDate.keySet());
            else common.retainAll(byDate.keySet());
        }
        if (common == null || common.size() < MIN_OBSERVATIONS) {
            throw new IllegalArgumentException("Trop peu de séances communes à ces actifs (" + (common == null ? 0 : common.size()) + ").");
        }
        List<String> syms = new ArrayList<>(symbols);
        List<List<Double>> closes = new ArrayList<>(common.size());
        for (String d : common) {
            List<Double> row = new ArrayList<>(syms.size());
            for (String s : syms) row.add(series.get(s).get(d));
            closes.add(row);
        }
        // Fréquence réelle des séances communes, pour annualiser
        long span = ChronoUnit.DAYS.between(LocalDate.parse(common.first()), LocalDate.parse(common.last()));
        int ppy = (int) Math.max(1, Math.round((common.size() - 1) * 365.25 / Math.max(span, 1)));

        Map<String, Object> body = new HashMap<>();
        body.put("symbols", syms);
        body.put("closes", closes);
        body.put("periods_per_year", Collections.nCopies(syms.size(), ppy));
        body.put("risk_free", req.riskFree() == null ? 0.0 : req.riskFree());
        body.put("max_weight", req.maxWeight() == null ? 0.4 : req.maxWeight());
        if (!current.isEmpty()) body.put("current_weights", current);
        JsonNode result = post("/api/ai/optimize", body);
        ((com.fasterxml.jackson.databind.node.ObjectNode) result).put("date", date)
                .put("from", common.first()).put("periods_per_year", ppy);
        return result;
    }

    public JsonNode anomalies(String symbol, String date) {
        String d = MarketInsightService.requireDate(date);
        String s = symbol.trim().toUpperCase();
        List<Map<String, Object>> candles = backtestService.loadBars(s).stream()
                .filter(b -> b.date().compareTo(d) <= 0)
                .map(b -> Map.<String, Object>of("time", b.date(), "open", b.open(), "high", b.high(), "low", b.low(),
                        "close", b.close(), "volume", b.volume()))
                .toList();
        if (candles.size() < MIN_OBSERVATIONS + 1) {
            throw new IllegalArgumentException(s + " : historique insuffisant avant le " + d + ".");
        }
        return post("/api/ai/anomalies", Map.of("ticker", s, "candles", candles));
    }

    private JsonNode post(String path, Object body) {
        try {
            return restTemplate.postForObject(properties.getBaseUrl() + path, body, JsonNode.class);
        } catch (HttpClientErrorException e) {
            throw new IllegalArgumentException("Requête refusée par le service IA : " + e.getResponseBodyAsString(), e);
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Service IA indisponible (" + properties.getBaseUrl() + ").", e);
        }
    }
}
