package com.pif.marketdata.service;

import com.pif.marketdata.client.AlphaVantageClient;
import com.pif.marketdata.config.AlphaVantageProperties;
import com.pif.marketdata.dto.CandleDto;
import com.pif.marketdata.dto.IndicatorPointDto;
import com.pif.marketdata.dto.MarketHistoryResponse;
import com.pif.marketdata.dto.OrderBookDto;
import com.pif.marketdata.dto.WatchlistAssetDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private final AlphaVantageClient alphaVantageClient;
    private final LocalCsvMarketDataService localCsvService;

    // Titres internationaux fournis par Alpha Vantage
    private static final List<WatchlistAssetDto> ALPHA_VANTAGE_ASSETS = List.of(
            new WatchlistAssetDto("IBM", "International Business Machines", "US_EQUITY", "Tech Blue Chip", "USD", 191.80, 1.05, 192.50, 189.70, "3.2M USD"),
            new WatchlistAssetDto("AAPL", "Apple Inc.", "US_EQUITY", "Tech Titan", "USD", 228.40, 1.85, 230.10, 226.50, "48.5M USD"),
            new WatchlistAssetDto("MSFT", "Microsoft Corporation", "US_EQUITY", "Tech & Cloud", "USD", 425.20, -0.42, 428.00, 422.10, "22.1M USD"),
            new WatchlistAssetDto("NVDA", "NVIDIA Corporation", "US_EQUITY", "Semi-conducteurs IA", "USD", 124.50, 3.40, 126.80, 121.20, "65.4M USD"),
            new WatchlistAssetDto("TSLA", "Tesla Inc.", "US_EQUITY", "Vehicules Electriques", "USD", 255.80, -1.20, 260.00, 252.30, "31.8M USD"),
            new WatchlistAssetDto("SPY", "SPDR S&P 500 ETF Trust", "INDEX", "Indice US S&P 500", "USD", 575.20, 0.35, 577.10, 573.50, "52.0M USD")
    );

    private final AlphaVantageProperties alphaVantageProperties;

    public MarketDataService(AlphaVantageClient alphaVantageClient, LocalCsvMarketDataService localCsvService,
                             AlphaVantageProperties alphaVantageProperties) {
        this.alphaVantageClient = alphaVantageClient;
        this.localCsvService = localCsvService;
        this.alphaVantageProperties = alphaVantageProperties;
    }

    /** Les titres internationaux ne sont proposés qu'avec une vraie clé Alpha Vantage (« demo » ne sert que IBM). */
    boolean alphaVantageConfigured() {
        String key = alphaVantageProperties.getApiKey();
        return key != null && !key.isBlank() && !key.equalsIgnoreCase("demo") && !key.startsWith("votre_");
    }

    /**
     * Renvoie la liste complète unifiée : Données CSV locales (BVMT, Cryptos) + Actions Alpha Vantage
     */
    public List<WatchlistAssetDto> getSymbols(String category) {
        List<WatchlistAssetDto> combined = new ArrayList<>();

        // 1. Actifs réels issus des fichiers CSV locaux (BVMT & Crypto)
        combined.addAll(localCsvService.getAllAssets(category));

        // 2. Actifs internationaux Alpha Vantage
        if (alphaVantageConfigured() && (category == null || category.equalsIgnoreCase("ALL")
                || category.equalsIgnoreCase("US_EQUITY") || category.equalsIgnoreCase("INDEX"))) {
            for (var us : ALPHA_VANTAGE_ASSETS) {
                if (category == null || category.equalsIgnoreCase("ALL") || us.category().equalsIgnoreCase(category)) {
                    combined.add(us);
                }
            }
        }

        return combined;
    }

    public MarketHistoryResponse getHistory(String symbol, String interval, int limit) {
        return getHistory(symbol, interval, "ALL", limit);
    }

    /**
     * Récupère l'historique complet d'un actif par année choisie (routage intelligent CSV local vs Alpha Vantage avec fallback)
     */
    @Cacheable(value = "alphaVantageHistory", key = "#symbol + '-' + #interval + '-' + (#year != null ? #year : 'ALL') + '-' + #limit")
    public MarketHistoryResponse getHistory(String symbol, String interval, String year, int limit) {
        String sym = symbol.toUpperCase();
        List<CandleDto> candles = new ArrayList<>();
        String source;

        // 1. Si l'actif est présent dans les fichiers CSV locaux (BVMT, Cryptos réels)
        if (localCsvService.hasSymbol(sym)) {
            log.info("Chargement historique depuis les fichiers CSV locaux PIF pour {} (Année: {}, Intervalle: {})", sym, year, interval);
            candles = localCsvService.getCandles(sym, interval, year, limit);
            source = "Fichiers Historiques Réels Locaux PIF (BVMT/Crypto)";
        } else {
            // 2. Sinon, appel Alpha Vantage API avec tolérance de panne
            log.info("Chargement historique depuis Alpha Vantage pour {} (intervalle: {})", sym, interval);
            try {
                if ("1d".equalsIgnoreCase(interval)) {
                    candles = alphaVantageClient.fetchDaily(sym);
                } else {
                    candles = alphaVantageClient.fetchIntraday(sym, interval);
                }
            } catch (Exception e) {
                log.warn("Erreur d'accès à Alpha Vantage API pour {}: {}", sym, e.getMessage());
            }

            if (candles != null && !candles.isEmpty()) {
                source = "Alpha Vantage Financial API (Live)";
            } else {
                // Pas de série inventée : sans réponse d'Alpha Vantage, l'historique est vide
                candles = new ArrayList<>();
                source = "Alpha Vantage indisponible (clé API absente ou quota atteint)";
            }

            // Filtrage par année pour les actifs Alpha Vantage si demandé
            if (year != null && !year.isBlank() && !"ALL".equalsIgnoreCase(year)) {
                candles = candles.stream()
                        .filter(c -> year.equals(LocalCsvMarketDataService.extractYear(c.time())))
                        .toList();
            }
        }

        // Tri et déduplication stricte (garantit time > prev_time pour TradingView Lightweight Charts)
        List<CandleDto> strictlyAscending = new ArrayList<>();
        String prevTime = null;
        for (CandleDto c : candles) {
            if (prevTime == null || c.time().compareTo(prevTime) > 0) {
                strictlyAscending.add(c);
                prevTime = c.time();
            }
        }
        candles = strictlyAscending;

        if (limit > 0 && candles.size() > limit) {
            candles = candles.subList(candles.size() - limit, candles.size());
        }

        // Calcul des SMA 20 et SMA 50
        List<IndicatorPointDto> sma20 = new ArrayList<>();
        List<IndicatorPointDto> sma50 = new ArrayList<>();
        for (int i = 0; i < candles.size(); i++) {
            if (i >= 19) {
                double sum20 = 0;
                for (int j = 0; j < 20; j++) sum20 += candles.get(i - j).close();
                sma20.add(new IndicatorPointDto(candles.get(i).time(), Math.round((sum20 / 20.0) * 1000.0) / 1000.0));
            }
            if (i >= 49) {
                double sum50 = 0;
                for (int j = 0; j < 50; j++) sum50 += candles.get(i - j).close();
                sma50.add(new IndicatorPointDto(candles.get(i).time(), Math.round((sum50 / 50.0) * 1000.0) / 1000.0));
            }
        }

        CandleDto last = candles.isEmpty() ? null : candles.get(candles.size() - 1);
        double high24h = candles.stream().mapToDouble(CandleDto::high).max().orElse(0);
        double low24h = candles.stream().mapToDouble(CandleDto::low).min().orElse(0);

        List<String> availableYears = localCsvService.hasSymbol(sym)
                ? localCsvService.getAvailableYears(sym)
                : extractYearsFromCandles(candles);

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("lastPrice", last != null ? last.close() : 0);
        metadata.put("high24h", high24h);
        metadata.put("low24h", low24h);
        metadata.put("source", source);
        metadata.put("availableYears", availableYears);
        metadata.put("selectedYear", (year == null || year.isBlank()) ? "ALL" : year);
        if (localCsvService.hasSymbol(sym)) {
            metadata.put("yearStats", localCsvService.getYearStats(sym, year));
        }

        return new MarketHistoryResponse(sym, interval, candles.size(), candles, sma20, sma50, metadata);
    }

    public List<String> getAvailableYears(String symbol) {
        if (localCsvService.hasSymbol(symbol)) {
            return localCsvService.getAvailableYears(symbol);
        }
        return List.of("2024", "2023", "2022");
    }

    public List<Map<String, Object>> getCsvFilesOverview() {
        return localCsvService.getCsvFilesOverview();
    }

    public Map<String, Object> getRawCsvData(String symbol, String year, int page, int size, String search) {
        return localCsvService.getRawCsvData(symbol, year, page, size, search);
    }

    private List<String> extractYearsFromCandles(List<CandleDto> candles) {
        Set<String> set = new TreeSet<>(Comparator.reverseOrder());
        for (CandleDto c : candles) {
            String yr = LocalCsvMarketDataService.extractYear(c.time());
            if (!yr.isBlank()) set.add(yr);
        }
        return new ArrayList<>(set);
    }

    /**
     * Génère un carnet d'ordres L2 simulé autour du cours à la date simulée (la BVMT ne publie pas le carnet
     * historique) ; sans cours fourni, autour du dernier cours connu.
     */
    public OrderBookDto getOrderBook(String symbol, Double price) {
        String sym = symbol.toUpperCase();
        WatchlistAssetDto asset = localCsvService.getAsset(sym)
                .orElseGet(() -> ALPHA_VANTAGE_ASSETS.stream()
                        .filter(a -> a.ticker().equalsIgnoreCase(sym))
                        .findFirst()
                        .orElse(ALPHA_VANTAGE_ASSETS.get(0)));

        double midPrice = price != null && price > 0 ? price : asset.price();
        boolean isCrypto = "CRYPTO".equalsIgnoreCase(asset.category());
        double tickSize = isCrypto ? (midPrice > 1000 ? 0.5 : 0.05) : 0.050;

        List<OrderBookDto.OrderBookLevel> asks = new ArrayList<>();
        List<OrderBookDto.OrderBookLevel> bids = new ArrayList<>();
        long cumAsk = 0;
        long cumBid = 0;

        for (int i = 1; i <= 8; i++) {
            double askP = Math.round((midPrice + i * tickSize) * 1000.0) / 1000.0;
            long askS = 50 + (i * 30L);
            cumAsk += askS;
            asks.add(new OrderBookDto.OrderBookLevel(askP, askS, cumAsk, 0));

            double bidP = Math.round((midPrice - i * tickSize) * 1000.0) / 1000.0;
            long bidS = 50 + (i * 30L);
            cumBid += bidS;
            bids.add(new OrderBookDto.OrderBookLevel(bidP, bidS, cumBid, 0));
        }

        long maxTot = Math.max(cumAsk, cumBid);
        List<OrderBookDto.OrderBookLevel> normalizedAsks = new ArrayList<>();
        for (var a : asks) {
            normalizedAsks.add(new OrderBookDto.OrderBookLevel(a.price(), a.size(), a.total(), (int) Math.round((a.total() * 100.0) / maxTot)));
        }
        Collections.reverse(normalizedAsks);

        List<OrderBookDto.OrderBookLevel> normalizedBids = new ArrayList<>();
        for (var b : bids) {
            normalizedBids.add(new OrderBookDto.OrderBookLevel(b.price(), b.size(), b.total(), (int) Math.round((b.total() * 100.0) / maxTot)));
        }

        double spread = Math.round((asks.get(0).price() - bids.get(0).price()) * 1000.0) / 1000.0;
        double spreadPercent = Math.round(((spread / midPrice) * 100.0) * 100.0) / 100.0;

        return new OrderBookDto(sym, midPrice, spread, spreadPercent, normalizedAsks, normalizedBids);
    }

    /**
     * Initialise la simulation Time-Lapse pour un actif et une année donnée.
     * ZERO LOOKAHEAD BIAS : renvoie uniquement le calendrier des dates ouvrées et la bougie initiale (Jour 1).
     * Aucune bougie future n'est transmise au client.
     */
    public Map<String, Object> initSimulation(String symbol, String year) {
        String sym = symbol.toUpperCase();
        MarketHistoryResponse hist = getHistory(sym, "1d", year, 10000);
        List<CandleDto> allCandles = hist.candles();

        List<String> tradingDates = allCandles.stream()
                .map(CandleDto::time)
                .toList();

        CandleDto initialCandle = allCandles.isEmpty() ? null : allCandles.get(0);
        String firstDate = tradingDates.isEmpty() ? null : tradingDates.get(0);
        String lastDate = tradingDates.isEmpty() ? null : tradingDates.get(tradingDates.size() - 1);

        Map<String, Object> res = new HashMap<>();
        res.put("symbol", sym);
        res.put("year", year);
        res.put("totalTradingDays", tradingDates.size());
        res.put("tradingDates", tradingDates);
        res.put("firstDate", firstDate);
        res.put("lastDate", lastDate);
        res.put("initialCandle", initialCandle);
        return res;
    }

    /**
     * Délivre les données strictement jusqu'à la date simulée courante T_courant.
     * ZERO LOOKAHEAD BIAS STRICT : bloque techniquement toute bougie postérieure à currentDate.
     */
    public Map<String, Object> getSimulationSlice(String symbol, String year, String currentDate) {
        String sym = symbol.toUpperCase();
        MarketHistoryResponse hist = getHistory(sym, "1d", year, 10000);
        List<CandleDto> allCandles = hist.candles();

        List<String> tradingDates = allCandles.stream()
                .map(CandleDto::time)
                .toList();

        String effectiveDate = (currentDate == null || currentDate.isBlank())
                ? (tradingDates.isEmpty() ? "" : tradingDates.get(0))
                : currentDate;

        // Filtrage STRICT sans aucun regard vers le futur : time <= effectiveDate
        List<CandleDto> visibleCandles = allCandles.stream()
                .filter(c -> c.time().compareTo(effectiveDate) <= 0)
                .toList();

        int currentIndex = 0;
        for (int i = 0; i < tradingDates.size(); i++) {
            if (tradingDates.get(i).equals(effectiveDate)) {
                currentIndex = i + 1;
                break;
            }
        }
        if (currentIndex == 0 && !visibleCandles.isEmpty()) {
            currentIndex = visibleCandles.size();
        }

        String nextDate = (currentIndex < tradingDates.size()) ? tradingDates.get(currentIndex) : null;
        boolean isCompleted = currentIndex >= tradingDates.size() && !tradingDates.isEmpty();

        CandleDto currentCandle = visibleCandles.isEmpty() ? null : visibleCandles.get(visibleCandles.size() - 1);

        // Recalcul dynamique des SMA 20 et SMA 50 UNIQUEMENT sur les chandeliers visibles
        List<IndicatorPointDto> sma20 = new ArrayList<>();
        List<IndicatorPointDto> sma50 = new ArrayList<>();
        for (int i = 0; i < visibleCandles.size(); i++) {
            if (i >= 19) {
                double sum20 = 0;
                for (int j = 0; j < 20; j++) sum20 += visibleCandles.get(i - j).close();
                sma20.add(new IndicatorPointDto(visibleCandles.get(i).time(), Math.round((sum20 / 20.0) * 1000.0) / 1000.0));
            }
            if (i >= 49) {
                double sum50 = 0;
                for (int j = 0; j < 50; j++) sum50 += visibleCandles.get(i - j).close();
                sma50.add(new IndicatorPointDto(visibleCandles.get(i).time(), Math.round((sum50 / 50.0) * 1000.0) / 1000.0));
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("symbol", sym);
        res.put("year", year);
        res.put("currentDate", effectiveDate);
        res.put("currentIndex", currentIndex);
        res.put("totalDays", tradingDates.size());
        res.put("nextDate", nextDate);
        res.put("isCompleted", isCompleted);
        res.put("currentCandle", currentCandle);
        res.put("candlesCount", visibleCandles.size());
        res.put("candles", visibleCandles);
        res.put("sma20", sma20);
        res.put("sma50", sma50);
        return res;
    }

    /**
     * Délégation de la matrice multi-actifs synchronisée
     */
    public Map<String, Object> getMultiAssetMatrix(String year, List<String> symbols) {
        return localCsvService.getMultiAssetMatrix(year, symbols);
    }
}
