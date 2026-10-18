package com.pif.trading.controller;

import com.pif.trading.dto.*;
import com.pif.trading.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/market", "/api/v1/market"})
public class MarketDataController {

    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    /**
     * Liste des symboles d'actifs disponibles
     * GET /api/market/symbols?category=ALL|US_EQUITY|CRYPTO|BVMT
     */
    @GetMapping("/symbols")
    public ResponseEntity<List<WatchlistAssetDto>> getSymbols(
            @RequestParam(required = false, defaultValue = "ALL") String category) {
        return ResponseEntity.ok(marketDataService.getSymbols(category));
    }

    /**
     * Historique des cours en chandeliers japonais OHLCV avec filtrage par année
     * GET /api/market/history?symbol=BIAT&interval=1d&year=2021&limit=10000
     */
    @GetMapping("/history")
    public ResponseEntity<MarketHistoryResponse> getHistory(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(required = false, defaultValue = "ALL") String year,
            @RequestParam(defaultValue = "10000") int limit) {
        return ResponseEntity.ok(marketDataService.getHistory(symbol, interval, year, limit));
    }

    /**
     * Liste des années disponibles pour un instrument
     * GET /api/market/years?symbol=BIAT
     */
    @GetMapping("/years")
    public ResponseEntity<List<String>> getYears(@RequestParam String symbol) {
        return ResponseEntity.ok(marketDataService.getAvailableYears(symbol));
    }

    /**
     * Vue d'ensemble détaillée des fichiers CSV locaux
     * GET /api/market/csv-overview
     */
    @GetMapping("/csv-overview")
    public ResponseEntity<List<Map<String, Object>>> getCsvOverview() {
        return ResponseEntity.ok(marketDataService.getCsvFilesOverview());
    }

    /**
     * Consultation paginée des données brutes CSV d'un actif par année
     * GET /api/market/raw-data?symbol=BIAT&year=2021&page=0&size=50&search=
     */
    @GetMapping("/raw-data")
    public ResponseEntity<Map<String, Object>> getRawCsvData(
            @RequestParam String symbol,
            @RequestParam(required = false, defaultValue = "ALL") String year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false, defaultValue = "") String search) {
        return ResponseEntity.ok(marketDataService.getRawCsvData(symbol, year, page, size, search));
    }

    /**
     * Carnet d'ordres L2 et profondeur
     * GET /api/market/orderbook?symbol=IBM
     */
    @GetMapping("/orderbook")
    public ResponseEntity<OrderBookDto> getOrderBook(@RequestParam String symbol) {
        return ResponseEntity.ok(marketDataService.getOrderBook(symbol));
    }

    /**
     * Indices boursiers majeurs pour le Ticker Tape
     * GET /api/market/indices
     */
    @GetMapping("/indices")
    public ResponseEntity<List<Map<String, Object>>> getIndices() {
        return ResponseEntity.ok(List.of(
                Map.of("symbol", "S&P 500", "name", "US Index", "value", 5780.40, "change", 17.80, "changePercent", 0.31, "currency", "USD"),
                Map.of("symbol", "TUNINDEX", "name", "Bourse de Tunis", "value", 9845.20, "change", 41.35, "changePercent", 0.42, "currency", "PTS"),
                Map.of("symbol", "BTC/USD", "name", "Bitcoin Real", "value", 64500.00, "change", 1360.00, "changePercent", 2.15, "currency", "USD"),
                Map.of("symbol", "EUR/TND", "name", "Euro / Dinar", "value", 3.3420, "change", -0.0018, "changePercent", -0.05, "currency", "TND"),
                Map.of("symbol", "USD/TND", "name", "Dollar / Dinar", "value", 3.0850, "change", 0.0035, "changePercent", 0.11, "currency", "TND")
        ));
    }

    /**
     * Initialisation Time-Lapse (Zero Lookahead Bias)
     * GET /api/market/simulation/init?symbol=BIAT&year=2021
     */
    @GetMapping("/simulation/init")
    public ResponseEntity<Map<String, Object>> initSimulation(
            @RequestParam String symbol,
            @RequestParam String year) {
        return ResponseEntity.ok(marketDataService.initSimulation(symbol, year));
    }

    /**
     * Rejeu chronologique d'une tranche de chandeliers jusqu'à T_courant
     * GET /api/market/simulation/slice?symbol=BIAT&year=2021&currentDate=2021-04-15
     */
    @GetMapping("/simulation/slice")
    public ResponseEntity<Map<String, Object>> getSimulationSlice(
            @RequestParam String symbol,
            @RequestParam String year,
            @RequestParam(required = false, defaultValue = "") String currentDate) {
        return ResponseEntity.ok(marketDataService.getSimulationSlice(symbol, year, currentDate));
    }

    /**
     * Matrice multi-actifs synchronisée pour rejeu simultané et classement dynamique
     * GET /api/market/simulation/multi-matrix?year=2022&symbols=BIAT,SFBT,BTC-USD
     */
    @GetMapping("/simulation/multi-matrix")
    public ResponseEntity<Map<String, Object>> getMultiAssetMatrix(
            @RequestParam(required = false, defaultValue = "2022") String year,
            @RequestParam(required = false) List<String> symbols) {
        return ResponseEntity.ok(marketDataService.getMultiAssetMatrix(year, symbols));
    }
}
