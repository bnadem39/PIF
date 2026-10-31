package com.pif.marketdata.controller;

import com.pif.marketdata.dto.MarketHistoryResponse;
import com.pif.marketdata.dto.OrderBookDto;
import com.pif.marketdata.dto.WatchlistAssetDto;
import com.pif.marketdata.service.MarketDataService;
import com.pif.marketdata.service.MarketOverviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/market", "/api/v1/market"})
public class MarketDataController {

    private final MarketDataService marketDataService;
    private final MarketOverviewService marketOverviewService;

    public MarketDataController(MarketDataService marketDataService, MarketOverviewService marketOverviewService) {
        this.marketDataService = marketDataService;
        this.marketOverviewService = marketOverviewService;
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
    public ResponseEntity<OrderBookDto> getOrderBook(@RequestParam String symbol, @RequestParam(required = false) Double price) {
        return ResponseEntity.ok(marketDataService.getOrderBook(symbol, price));
    }

    /**
     * Vue de marché pour le bandeau : indice BVMT équipondéré, crypto-actifs et étendue du marché à la date simulée.
     * GET /api/market/indices?date=2022-01-25
     */
    @GetMapping("/indices")
    public ResponseEntity<MarketOverviewService.Overview> getIndices(@RequestParam(required = false) String date) {
        return ResponseEntity.ok(marketOverviewService.overview(date != null && !date.isBlank() ? date : "9999-12-31"));
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
