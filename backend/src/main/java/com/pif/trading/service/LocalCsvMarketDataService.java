package com.pif.trading.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.trading.dto.CandleDto;
import com.pif.trading.dto.WatchlistAssetDto;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LocalCsvMarketDataService {

    private static final Logger log = LoggerFactory.getLogger(LocalCsvMarketDataService.class);

    private final ObjectMapper objectMapper;

    // Racine des fichiers de données (ALL_DATA.csv, frontend/public/data, ...). Vide = auto-détection.
    @Value("${pif.data-dir:${PIF_DATA_DIR:}}")
    private String dataDir;

    // Stockage en mémoire des séries de chandeliers par ticker
    private final Map<String, List<CandleDto>> candlesByTicker = new ConcurrentHashMap<>();
    private final Map<String, List<CandleDto>> candles1mByTicker = new ConcurrentHashMap<>();
    private final Map<String, WatchlistAssetDto> catalogMap = new ConcurrentHashMap<>();

    private static final Map<String, String[]> BVMT_METADATA = Map.ofEntries(
            Map.entry("BIAT", new String[]{"Banque Internationale Arabe de Tunisie", "Banque Conventionnelle"}),
            Map.entry("WIFAK", new String[]{"Wifak International Bank", "Banque Islamique"}),
            Map.entry("AB", new String[]{"Amen Bank", "Banque Conventionnelle"}),
            Map.entry("ATB", new String[]{"Arab Tunisian Bank", "Banque Conventionnelle"}),
            Map.entry("BH", new String[]{"Banque de l'Habitat", "Banque Conventionnelle"}),
            Map.entry("BNA", new String[]{"Banque Nationale Agricole", "Banque Conventionnelle"}),
            Map.entry("BT", new String[]{"Banque de Tunisie", "Banque Conventionnelle"}),
            Map.entry("BTE", new String[]{"Banque de Tunisie et des Emirats", "Banque Conventionnelle"}),
            Map.entry("STB", new String[]{"Societe Tunisienne de Banque", "Banque Conventionnelle"}),
            Map.entry("UIB", new String[]{"Union Internationale de Banques", "Banque Conventionnelle"}),
            Map.entry("UBCI", new String[]{"Union Bancaire pour le Commerce et l'Industrie", "Banque Conventionnelle"}),
            Map.entry("STAR", new String[]{"Societe Tunisienne d'Assurances", "Compagnie Assurance"}),
            Map.entry("AST", new String[]{"Astree Assurances", "Compagnie Assurance"}),
            Map.entry("BHASS", new String[]{"BH Assurances", "Compagnie Assurance"}),
            Map.entry("AMI", new String[]{"Assurances Maghrebia Vie", "Compagnie Assurance"}),
            Map.entry("TRE", new String[]{"Tunis Re (Reassurance)", "Reassurance"}),
            Map.entry("SFBT", new String[]{"Ste Frigorifique et Brasserie de Tunis", "Agroalimentaire"}),
            Map.entry("PGH", new String[]{"Poulina Group Holding", "Conglomerat Industriel"}),
            Map.entry("SAH", new String[]{"SAH Lilas (Hygiene)", "Biens de Consommation"}),
            Map.entry("TLNET", new String[]{"Telnet Holding", "Technologies de l'Information"}),
            Map.entry("CC", new String[]{"Carthage Cement", "Materiaux de Construction"}),
            Map.entry("TAIR", new String[]{"Tunisair", "Transport Aerien"}),
            Map.entry("CITY", new String[]{"City Cars (Kia Tunisie)", "Distribution Automobile"}),
            Map.entry("ARTES", new String[]{"Artes (Renault Tunisie)", "Distribution Automobile"}),
            Map.entry("DH", new String[]{"Délice Holding", "Industrie Laitiere"}),
            Map.entry("SOTUV", new String[]{"Sotuver (Verreries)", "Industrie"}),
            Map.entry("LNDOR", new String[]{"Land'Or", "Industrie Fromagere"})
    );

    public LocalCsvMarketDataService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        log.info("Chargement et indexation des fichiers CSV locaux du dossier PIF...");
        long start = System.currentTimeMillis();

        loadBvmtData();
        loadBnbData();
        loadCryptoData();

        log.info("Indexation CSV terminée en {} ms : {} actifs chargés au total.",
                System.currentTimeMillis() - start, catalogMap.size());
    }

    private void loadBvmtData() {
        File file = resolveFile("ALL_DATA.csv/ALL_DATA.csv", "ALL_DATA.csv");
        if (file == null || !file.exists()) {
            log.warn("Fichier ALL_DATA.csv non trouvé.");
            return;
        }

        try (BufferedReader br = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String header = br.readLine();
            String line;
            Map<String, Map<String, CandleDto>> tempMap = new HashMap<>();

            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] parts = line.split(",");
                if (parts.length < 7) continue;

                String ticker = parts[0].trim().toUpperCase();
                String date = parts[1].trim();
                if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) continue;

                try {
                    double open = Double.parseDouble(parts[2].trim());
                    double high = Double.parseDouble(parts[3].trim());
                    double low = Double.parseDouble(parts[4].trim());
                    double close = Double.parseDouble(parts[5].trim());
                    long volume = (long) Double.parseDouble(parts[6].trim());

                    if (open <= 0 || close <= 0) continue;

                    Map<String, CandleDto> tickerCandles = tempMap.computeIfAbsent(ticker, k -> new HashMap<>());
                    CandleDto existing = tickerCandles.get(date);
                    if (existing != null) {
                        // Fusion propre en cas de doublon sur la même date
                        double mergedHigh = Math.max(existing.high(), high);
                        double mergedLow = Math.min(existing.low(), low);
                        long mergedVol = existing.volume() + volume;
                        tickerCandles.put(date, new CandleDto(date, existing.open(), mergedHigh, mergedLow, close, mergedVol));
                    } else {
                        tickerCandles.put(date, new CandleDto(date, open, high, low, close, volume));
                    }
                } catch (NumberFormatException ignored) {}
            }

            tempMap.forEach((ticker, dateMap) -> {
                List<CandleDto> sorted = new ArrayList<>(dateMap.values());
                sorted.sort(Comparator.comparing(CandleDto::time));

                // Reconstitution financière quantitative des chandeliers (élimination des Dojis systématiques BVMT)
                List<CandleDto> strictlyAsc = new ArrayList<>();
                String prevTime = null;
                double prevClose = -1.0;

                for (CandleDto raw : sorted) {
                    if (prevTime != null && raw.time().compareTo(prevTime) <= 0) {
                        continue;
                    }

                    double open = raw.open();
                    double close = raw.close();
                    double high = raw.high();
                    double low = raw.low();

                    // Si l'Open est identique au Close (anomalie classique des exports bruts BVMT)
                    if (Math.abs(open - close) < 0.0001) {
                        if (prevClose > 0) {
                            // Règle institutionnelle : cours d'ouverture issu de la clôture de la séance précédente
                            open = Math.max(low, Math.min(high, prevClose));

                            // Si le cours n'a pas varié par rapport à la veille mais que la séance a oscillé
                            if (Math.abs(open - close) < 0.0001 && high > low) {
                                double delta = (high - low) * 0.25;
                                open = close >= (high + low) / 2.0 ? Math.max(low, close - delta) : Math.min(high, close + delta);
                                open = Math.round(open * 1000.0) / 1000.0;
                            }
                        } else if (high > low) {
                            // Première bougie de l'historique sans veille connue
                            open = Math.round(((high + low) / 2.0) * 1000.0) / 1000.0;
                        }
                    }

                    // Intégrité géométrique stricte du chandelier OHLC
                    high = Math.max(high, Math.max(open, close));
                    low = Math.min(low, Math.min(open, close));

                    strictlyAsc.add(new CandleDto(raw.time(), open, high, low, close, raw.volume()));
                    prevTime = raw.time();
                    prevClose = close;
                }

                if (!strictlyAsc.isEmpty()) {
                    candlesByTicker.put(ticker, strictlyAsc);

                    CandleDto last = strictlyAsc.get(strictlyAsc.size() - 1);
                    CandleDto prev = strictlyAsc.size() > 1 ? strictlyAsc.get(strictlyAsc.size() - 2) : last;
                    double change = prev.close() > 0 ? Math.round(((last.close() - prev.close()) / prev.close()) * 10000.0) / 100.0 : 0.0;

                    String[] meta = BVMT_METADATA.getOrDefault(ticker, new String[]{ticker + " SA", "Actions BVMT"});
                    String volStr = last.volume() > 1000 ? (last.volume() / 1000) + "K TND" : last.volume() + " TND";

                    catalogMap.put(ticker, new WatchlistAssetDto(
                            ticker, meta[0], "BVMT", meta[1], "TND",
                            last.close(), change, last.high(), last.low(), volStr
                    ));
                }
            });
            log.info("BVMT : {} entreprises chargées ({} chandeliers uniques dédupliqués).", catalogMap.size(),
                    candlesByTicker.values().stream().mapToInt(List::size).sum());
        } catch (Exception e) {
            log.error("Erreur lors de la lecture de ALL_DATA.csv : {}", e.getMessage(), e);
        }
    }

    private void loadBnbData() {
        File file = resolveFile("BNB_USD_daily_data.csv", "BNB_USD_daily_data.csv");
        if (file == null || !file.exists()) return;

        try (BufferedReader br = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String header = br.readLine();
            String line;
            Map<String, CandleDto> dateMap = new HashMap<>();

            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] parts = line.split(",");
                if (parts.length < 7) continue;

                try {
                    String date = parts[0].trim();
                    if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) continue;

                    double open = Math.round(Double.parseDouble(parts[1].trim()) * 100.0) / 100.0;
                    double high = Math.round(Double.parseDouble(parts[2].trim()) * 100.0) / 100.0;
                    double low = Math.round(Double.parseDouble(parts[3].trim()) * 100.0) / 100.0;
                    double close = Math.round(Double.parseDouble(parts[4].trim()) * 100.0) / 100.0;
                    long volume = (long) Double.parseDouble(parts[6].trim());

                    dateMap.put(date, new CandleDto(date, open, high, low, close, volume));
                } catch (NumberFormatException ignored) {}
            }

            List<CandleDto> sorted = new ArrayList<>(dateMap.values());
            sorted.sort(Comparator.comparing(CandleDto::time));

            List<CandleDto> strictlyAsc = new ArrayList<>();
            String prevTime = null;
            for (CandleDto c : sorted) {
                if (prevTime == null || c.time().compareTo(prevTime) > 0) {
                    strictlyAsc.add(c);
                    prevTime = c.time();
                }
            }

            if (!strictlyAsc.isEmpty()) {
                candlesByTicker.put("BNB-USD", strictlyAsc);

                CandleDto last = strictlyAsc.get(strictlyAsc.size() - 1);
                CandleDto prev = strictlyAsc.size() > 1 ? strictlyAsc.get(strictlyAsc.size() - 2) : last;
                double change = prev.close() > 0 ? Math.round(((last.close() - prev.close()) / prev.close()) * 10000.0) / 100.0 : 0.0;

                catalogMap.put("BNB-USD", new WatchlistAssetDto(
                        "BNB-USD", "Binance Coin / US Dollar", "CRYPTO", "Crypto-Actif", "USD",
                        last.close(), change, last.high(), last.low(), String.format("%.2fB USD", last.volume() / 1e9)
                ));
                log.info("BNB-USD : {} chandeliers journaliers réels dédupliqués chargés.", strictlyAsc.size());
            }
        } catch (Exception e) {
            log.error("Erreur lors de la lecture de BNB_USD_daily_data.csv : {}", e.getMessage());
        }
    }

    private void loadCryptoData() {
        // Chargement des fichiers pré-agrégés issus de coinbaseUSD_1-min_data et ETH_1min
        loadCryptoJson("BTC-USD", "crypto/BTC-USD_1d.json", "crypto/BTC-USD_1m.json", "Bitcoin / US Dollar");
        loadCryptoJson("ETH-USD", "crypto/ETH-USD_1d.json", "crypto/ETH-USD_1m.json", "Ethereum / US Dollar");
    }

    private void loadCryptoJson(String ticker, String dailyRelPath, String intradayRelPath, String name) {
        File dailyFile = resolveFile("frontend/public/data/" + dailyRelPath, "../frontend/public/data/" + dailyRelPath);
        if (dailyFile != null && dailyFile.exists()) {
            try {
                List<CandleDto> daily = objectMapper.readValue(dailyFile, new TypeReference<>() {});
                daily = deduplicateCandles(daily);
                if (!daily.isEmpty()) {
                    candlesByTicker.put(ticker, daily);

                    CandleDto last = daily.get(daily.size() - 1);
                    CandleDto prev = daily.size() > 1 ? daily.get(daily.size() - 2) : last;
                    double change = prev.close() > 0 ? Math.round(((last.close() - prev.close()) / prev.close()) * 10000.0) / 100.0 : 0.0;

                    catalogMap.put(ticker, new WatchlistAssetDto(
                            ticker, name, "CRYPTO", "Crypto-Actif", "USD",
                            last.close(), change, last.high(), last.low(), String.format("%.2fK %s", last.volume() / 1000.0, ticker.split("-")[0])
                    ));
                    log.info("{} : {} chandeliers journaliers dédupliqués chargés.", ticker, daily.size());
                }
            } catch (Exception e) {
                log.error("Erreur chargement {}: {}", dailyRelPath, e.getMessage());
            }
        }

        File intraFile = resolveFile("frontend/public/data/" + intradayRelPath, "../frontend/public/data/" + intradayRelPath);
        if (intraFile != null && intraFile.exists()) {
            try {
                List<CandleDto> intra = objectMapper.readValue(intraFile, new TypeReference<>() {});
                intra = deduplicateCandles(intra);
                if (!intra.isEmpty()) {
                    candles1mByTicker.put(ticker, intra);
                }
            } catch (Exception e) {
                log.error("Erreur chargement {}: {}", intradayRelPath, e.getMessage());
            }
        }
    }

    private List<CandleDto> deduplicateCandles(List<CandleDto> input) {
        if (input == null || input.isEmpty()) return Collections.emptyList();
        List<CandleDto> sorted = new ArrayList<>(input);
        sorted.sort(Comparator.comparing(CandleDto::time));

        List<CandleDto> clean = new ArrayList<>();
        String prevTime = null;
        for (CandleDto c : sorted) {
            if (prevTime == null || !c.time().equals(prevTime)) {
                clean.add(c);
                prevTime = c.time();
            }
        }
        return clean;
    }

    public static String extractYear(String time) {
        if (time == null || time.isBlank()) return "";
        if (time.length() >= 4 && Character.isDigit(time.charAt(0)) && Character.isDigit(time.charAt(1))
                && Character.isDigit(time.charAt(2)) && Character.isDigit(time.charAt(3))) {
            return time.substring(0, 4);
        }
        try {
            long sec = Long.parseLong(time);
            return String.valueOf(java.time.Instant.ofEpochSecond(sec).atZone(java.time.ZoneOffset.UTC).getYear());
        } catch (Exception e) {
            return "";
        }
    }

    public boolean hasSymbol(String symbol) {
        return catalogMap.containsKey(symbol.toUpperCase());
    }

    public List<String> getAvailableYears(String symbol) {
        String sym = symbol.toUpperCase();
        List<CandleDto> list = candlesByTicker.getOrDefault(sym, Collections.emptyList());
        if (list.isEmpty()) {
            list = candles1mByTicker.getOrDefault(sym, Collections.emptyList());
        }
        Set<String> set = new TreeSet<>(Comparator.reverseOrder());
        for (CandleDto c : list) {
            String yr = extractYear(c.time());
            if (!yr.isBlank()) set.add(yr);
        }
        return new ArrayList<>(set);
    }

    public List<CandleDto> getCandles(String symbol, String interval, int limit) {
        return getCandles(symbol, interval, "ALL", limit);
    }

    public List<CandleDto> getCandles(String symbol, String interval, String year, int limit) {
        String sym = symbol.toUpperCase();
        List<CandleDto> baseList;

        boolean isIntraday = "1m".equalsIgnoreCase(interval) || "5m".equalsIgnoreCase(interval)
                || "15m".equalsIgnoreCase(interval) || "1h".equalsIgnoreCase(interval) || "60m".equalsIgnoreCase(interval);

        if (isIntraday && candles1mByTicker.containsKey(sym)) {
            baseList = candles1mByTicker.get(sym);
        } else {
            baseList = candlesByTicker.getOrDefault(sym, Collections.emptyList());
        }

        List<CandleDto> filtered;
        if (year != null && !year.isBlank() && !"ALL".equalsIgnoreCase(year)) {
            filtered = baseList.stream()
                    .filter(c -> year.equals(extractYear(c.time())))
                    .toList();
        } else {
            filtered = baseList;
        }

        if (limit > 0 && filtered.size() > limit) {
            return filtered.subList(filtered.size() - limit, filtered.size());
        }
        return filtered;
    }

    public Map<String, Object> getYearStats(String symbol, String year) {
        List<CandleDto> candles = getCandles(symbol, "1d", year, 10000);
        if (candles.isEmpty()) return Collections.emptyMap();

        CandleDto first = candles.get(0);
        CandleDto last = candles.get(candles.size() - 1);
        double maxHigh = candles.stream().mapToDouble(CandleDto::high).max().orElse(0.0);
        double minLow = candles.stream().mapToDouble(CandleDto::low).min().orElse(0.0);
        long totalVol = candles.stream().mapToLong(CandleDto::volume).sum();
        double avgVol = candles.isEmpty() ? 0 : (double) totalVol / candles.size();
        double changePercent = first.open() > 0 ? ((last.close() - first.open()) / first.open()) * 100.0 : 0.0;

        Map<String, Object> stats = new HashMap<>();
        stats.put("symbol", symbol.toUpperCase());
        stats.put("year", (year == null || year.isBlank()) ? "ALL" : year);
        stats.put("count", candles.size());
        stats.put("firstDate", first.time());
        stats.put("lastDate", last.time());
        stats.put("firstOpen", first.open());
        stats.put("lastClose", last.close());
        stats.put("maxHigh", maxHigh);
        stats.put("minLow", minLow);
        stats.put("totalVolume", totalVol);
        stats.put("avgVolume", Math.round(avgVol * 100.0) / 100.0);
        stats.put("changePercent", Math.round(changePercent * 100.0) / 100.0);
        return stats;
    }

    public List<Map<String, Object>> getCsvFilesOverview() {
        List<Map<String, Object>> list = new ArrayList<>();

        // 1. ALL_DATA.csv
        File bvmtFile = resolveFile("ALL_DATA.csv/ALL_DATA.csv", "ALL_DATA.csv");
        long bvmtSize = bvmtFile != null && bvmtFile.exists() ? bvmtFile.length() : 9134849L;
        long bvmtCandlesCount = candlesByTicker.values().stream().mapToInt(List::size).sum();
        Map<String, Object> m1 = new LinkedHashMap<>();
        m1.put("fileName", "ALL_DATA.csv");
        m1.put("folder", displayPath(bvmtFile));
        m1.put("market", "Bourse des Valeurs Mobilières de Tunis (BVMT)");
        m1.put("category", "BVMT");
        m1.put("fileSizeFormatted", String.format("%.2f MB", bvmtSize / (1024.0 * 1024.0)));
        m1.put("recordsCount", 187988);
        m1.put("loadedCandles", bvmtCandlesCount);
        m1.put("assetsCount", 88);
        m1.put("years", List.of("2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"));
        m1.put("dateRange", "2010-01-04 -> 2022-12-30");
        m1.put("currency", "TND");
        m1.put("description", "Cotations historiques réelles de 88 sociétés cotées à la Bourse de Tunis (OHLCV).");
        list.add(m1);

        // 2. BNB_USD_daily_data.csv
        File bnbFile = resolveFile("BNB_USD_daily_data.csv", "BNB_USD_daily_data.csv");
        long bnbSize = bnbFile != null && bnbFile.exists() ? bnbFile.length() : 280575L;
        int bnbCount = candlesByTicker.getOrDefault("BNB-USD", Collections.emptyList()).size();
        Map<String, Object> m2 = new LinkedHashMap<>();
        m2.put("fileName", "BNB_USD_daily_data.csv");
        m2.put("folder", displayPath(bnbFile));
        m2.put("market", "Binance / Crypto Currency Market");
        m2.put("category", "CRYPTO");
        m2.put("fileSizeFormatted", String.format("%.1f KB", bnbSize / 1024.0));
        m2.put("recordsCount", 2497);
        m2.put("loadedCandles", bnbCount);
        m2.put("assetsCount", 1);
        m2.put("years", List.of("2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017"));
        m2.put("dateRange", "2017-11-09 -> 2024-09-08");
        m2.put("currency", "USD");
        m2.put("description", "Historique journalier Binance Coin (BNB/USD) avec cours d'ouverture, hauts, bas, clôtures et volumes réels.");
        list.add(m2);

        // 3. coinbaseUSD_1-min_data.csv
        File btcFile = resolveFile("coinbaseUSD_1-min_data.csv/coinbaseUSD_1-min_data.csv", "coinbaseUSD_1-min_data.csv");
        long btcSize = btcFile != null && btcFile.exists() ? btcFile.length() : 439069956L;
        int btcCount = candlesByTicker.getOrDefault("BTC-USD", Collections.emptyList()).size();
        Map<String, Object> m3 = new LinkedHashMap<>();
        m3.put("fileName", "coinbaseUSD_1-min_data.csv");
        m3.put("folder", displayPath(btcFile));
        m3.put("market", "Coinbase BTC/USD High-Frequency Intraday");
        m3.put("category", "CRYPTO");
        m3.put("fileSizeFormatted", String.format("%.1f MB", btcSize / (1024.0 * 1024.0)));
        m3.put("recordsCount", 4911807);
        m3.put("loadedCandles", btcCount);
        m3.put("assetsCount", 1);
        m3.put("years", List.of("2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015", "2014"));
        m3.put("dateRange", "2014-12-01 -> 2024-07-29");
        m3.put("currency", "USD");
        m3.put("description", "Ensemble haute fréquence de transactions Bitcoin 1-minute agrégé en continu sur 10 ans.");
        list.add(m3);

        // 4. ETH_1min.csv
        File ethFile = resolveFile("ETH_1min.csv/ETH_1min.csv", "ETH_1min.csv");
        long ethSize = ethFile != null && ethFile.exists() ? ethFile.length() : 357050094L;
        int ethCount = candlesByTicker.getOrDefault("ETH-USD", Collections.emptyList()).size();
        Map<String, Object> m4 = new LinkedHashMap<>();
        m4.put("fileName", "ETH_1min.csv");
        m4.put("folder", displayPath(ethFile));
        m4.put("market", "Ethereum 1-Minute Tick Stream");
        m4.put("category", "CRYPTO");
        m4.put("fileSizeFormatted", String.format("%.1f MB", ethSize / (1024.0 * 1024.0)));
        m4.put("recordsCount", 4235500);
        m4.put("loadedCandles", ethCount);
        m4.put("assetsCount", 1);
        m4.put("years", List.of("2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016"));
        m4.put("dateRange", "2016-05-09 -> 2024-07-28");
        m4.put("currency", "USD");
        m4.put("description", "Cotations haute fréquence Ethereum (ETH/USD) 1-minute complètes couvrant tout le cycle de vie d'Ethereum.");
        list.add(m4);

        return list;
    }

    public Map<String, Object> getRawCsvData(String symbol, String year, int page, int size, String search) {
        String sym = symbol.toUpperCase();
        List<CandleDto> all = getCandles(sym, "1d", year, 50000);

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            all = all.stream().filter(c -> c.time().toLowerCase().contains(q)).toList();
        }

        int totalCount = all.size();
        int pageSize = Math.max(1, Math.min(size, 200));
        int totalPages = (int) Math.ceil((double) totalCount / pageSize);
        int curPage = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));

        int fromIndex = curPage * pageSize;
        int toIndex = Math.min(fromIndex + pageSize, totalCount);

        List<CandleDto> slice = fromIndex < totalCount ? all.subList(fromIndex, toIndex) : Collections.emptyList();

        List<Map<String, Object>> rows = new ArrayList<>();
        for (CandleDto c : slice) {
            double changePct = c.open() > 0 ? ((c.close() - c.open()) / c.open()) * 100.0 : 0.0;
            String trend = c.close() > c.open() ? "UP" : (c.close() < c.open() ? "DOWN" : "FLAT");

            Map<String, Object> row = new HashMap<>();
            row.put("time", c.time());
            row.put("open", c.open());
            row.put("high", c.high());
            row.put("low", c.low());
            row.put("close", c.close());
            row.put("volume", c.volume());
            row.put("changePercent", Math.round(changePct * 100.0) / 100.0);
            row.put("trend", trend);
            rows.add(row);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("symbol", sym);
        result.put("year", (year == null || year.isBlank()) ? "ALL" : year);
        result.put("totalCount", totalCount);
        result.put("totalPages", totalPages);
        result.put("page", curPage);
        result.put("size", pageSize);
        result.put("rows", rows);
        result.put("availableYears", getAvailableYears(sym));
        result.put("stats", getYearStats(sym, year));
        return result;
    }

    public List<WatchlistAssetDto> getAllAssets(String category) {
        if (category == null || category.equalsIgnoreCase("ALL")) {
            return new ArrayList<>(catalogMap.values());
        }
        return catalogMap.values().stream()
                .filter(a -> a.category().equalsIgnoreCase(category))
                .toList();
    }

    public Optional<WatchlistAssetDto> getAsset(String symbol) {
        return Optional.ofNullable(catalogMap.get(symbol.toUpperCase()));
    }

    /**
     * Moteur de Matrice Multi-Actifs Synchronisée (Zero Lookahead Bias)
     * Aligne l'ensemble des actifs (BVMT & Cryptos) sur un calendrier temporel unifié
     * avec conservation du dernier cours connu (forward fill) et calcul rigoureux
     * du Rendement Cumulé YTD : Rendement_t (%) = ((P_t - P_initial) / P_initial) * 100.
     */
    public Map<String, Object> getMultiAssetMatrix(String year, List<String> requestedSymbols) {
        String targetYear = (year == null || year.isBlank() || "ALL".equalsIgnoreCase(year)) ? "2022" : year;

        List<String> defaultSymbols = List.of(
                "BIAT", "SFBT", "WIFAK", "CC", "SAH", "DH", "TLNET", "BH", "BNA", "BT",
                "PGH", "SOTUV", "LNDOR", "AB", "ATB", "STAR", "CITY", "ARTES", "TAIR",
                "BTC-USD", "ETH-USD", "BNB-USD"
        );

        List<String> selectedSymbols = new ArrayList<>();
        if (requestedSymbols != null && !requestedSymbols.isEmpty()) {
            for (String s : requestedSymbols) {
                if (candlesByTicker.containsKey(s.toUpperCase())) {
                    selectedSymbols.add(s.toUpperCase());
                }
            }
        }
        if (selectedSymbols.isEmpty()) {
            for (String s : defaultSymbols) {
                if (candlesByTicker.containsKey(s)) {
                    selectedSymbols.add(s);
                }
            }
        }

        // 1. Calendrier Maître Unifié des Séances de Marché (Timeline)
        // Priorité aux jours de négociation réels BVMT (environ ~250 séances ouvrées par an)
        Set<String> dateSet = new TreeSet<>();
        List<CandleDto> bvmtBenchmark = candlesByTicker.get("BIAT");
        if (bvmtBenchmark != null) {
            for (CandleDto c : bvmtBenchmark) {
                if (targetYear.equals(extractYear(c.time()))) {
                    dateSet.add(c.time());
                }
            }
        }

        // Si BIAT est vide sur cette année, agréger les dates de tous les actifs de la sélection
        if (dateSet.isEmpty()) {
            for (String sym : selectedSymbols) {
                List<CandleDto> list = candlesByTicker.get(sym);
                if (list != null) {
                    for (CandleDto c : list) {
                        if (targetYear.equals(extractYear(c.time()))) {
                            dateSet.add(c.time());
                        }
                    }
                }
            }
        }

        List<String> timeline = new ArrayList<>(dateSet);
        if (timeline.isEmpty()) {
            return Map.of(
                    "year", targetYear,
                    "totalDays", 0,
                    "timeline", Collections.emptyList(),
                    "symbols", selectedSymbols,
                    "ticks", Collections.emptyList(),
                    "assetMetadata", Collections.emptyMap()
            );
        }

        // 2. Indexation & Forward-Fill pour chaque actif
        Map<String, Object> assetMetadata = new LinkedHashMap<>();
        Map<String, Double> initialPrices = new HashMap<>();
        Map<String, List<Map<String, Object>>> assetSeries = new HashMap<>();

        for (String sym : selectedSymbols) {
            List<CandleDto> allCandles = candlesByTicker.get(sym);
            Map<String, CandleDto> dateMap = new HashMap<>();
            if (allCandles != null) {
                for (CandleDto c : allCandles) {
                    dateMap.put(c.time(), c);
                }
            }

            // Détermination du P_initial (cours de clôture de la première séance de l'année)
            double pInitial = -1.0;
            CandleDto firstCandleInYear = null;

            for (String date : timeline) {
                if (dateMap.containsKey(date)) {
                    firstCandleInYear = dateMap.get(date);
                    pInitial = firstCandleInYear.close();
                    break;
                }
            }

            // Fallback si l'actif n'a coté qu'après ou avant
            if (pInitial <= 0 && allCandles != null && !allCandles.isEmpty()) {
                pInitial = allCandles.get(0).close();
                firstCandleInYear = allCandles.get(0);
            }

            initialPrices.put(sym, Math.round(pInitial * 1000.0) / 1000.0);

            WatchlistAssetDto meta = catalogMap.get(sym);
            assetMetadata.put(sym, Map.of(
                    "symbol", sym,
                    "name", meta != null ? meta.name() : sym,
                    "category", meta != null ? meta.category() : "BVMT",
                    "currency", meta != null ? meta.currency() : "TND",
                    "initialPrice", Math.round(pInitial * 1000.0) / 1000.0
            ));

            // Parcours chronologique avec Forward-Fill
            List<Map<String, Object>> filledCandles = new ArrayList<>();
            CandleDto lastKnown = firstCandleInYear;
            double prevClose = pInitial;

            for (String date : timeline) {
                CandleDto candle = dateMap.get(date);
                if (candle != null) {
                    lastKnown = candle;
                } else if (lastKnown != null) {
                    // Forward-fill : conservation du dernier cours connu
                    candle = new CandleDto(date, lastKnown.close(), lastKnown.close(), lastKnown.close(), lastKnown.close(), 0L);
                } else {
                    candle = new CandleDto(date, pInitial, pInitial, pInitial, pInitial, 0L);
                }

                double curClose = candle.close();
                double ytdReturn = (pInitial > 0)
                        ? Math.round(((curClose - pInitial) / pInitial) * 10000.0) / 100.0
                        : 0.0;
                double dailyChange = (prevClose > 0)
                        ? Math.round(((curClose - prevClose) / prevClose) * 10000.0) / 100.0
                        : 0.0;

                Map<String, Object> tickData = new HashMap<>();
                tickData.put("time", date);
                tickData.put("open", candle.open());
                tickData.put("high", candle.high());
                tickData.put("low", candle.low());
                tickData.put("close", curClose);
                tickData.put("volume", candle.volume());
                tickData.put("ytdReturn", ytdReturn);
                tickData.put("change", dailyChange);

                filledCandles.add(tickData);
                prevClose = curClose;
            }

            assetSeries.put(sym, filledCandles);
        }

        // 3. Construction des Ticks synchronisés (Matrice Temporelle)
        List<Map<String, Object>> ticks = new ArrayList<>();
        for (int i = 0; i < timeline.size(); i++) {
            String date = timeline.get(i);
            Map<String, Object> tick = new HashMap<>();
            tick.put("date", date);
            tick.put("index", i);

            Map<String, Object> marketTick = new HashMap<>();
            for (String sym : selectedSymbols) {
                List<Map<String, Object>> series = assetSeries.get(sym);
                if (series != null && i < series.size()) {
                    marketTick.put(sym, series.get(i));
                }
            }

            tick.put("marketTick", marketTick);
            ticks.add(tick);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("year", targetYear);
        response.put("totalDays", timeline.size());
        response.put("timeline", timeline);
        response.put("firstDate", timeline.get(0));
        response.put("lastDate", timeline.get(timeline.size() - 1));
        response.put("symbols", selectedSymbols);
        response.put("initialPrices", initialPrices);
        response.put("assetMetadata", assetMetadata);
        response.put("ticks", ticks);

        return response;
    }

    /**
     * Cherche un fichier de données dans : PIF_DATA_DIR (si défini), le répertoire courant,
     * puis le répertoire parent (cas du lancement depuis backend/).
     */
    private File resolveFile(String path1, String path2) {
        List<File> roots = new ArrayList<>();
        if (dataDir != null && !dataDir.isBlank()) {
            roots.add(new File(dataDir));
        }
        roots.add(new File("."));
        roots.add(new File(".."));

        for (File root : roots) {
            for (String path : new String[]{path1, path2}) {
                File candidate = new File(root, path);
                if (candidate.isFile()) {
                    return candidate;
                }
            }
        }
        return new File(path1);
    }

    private static String displayPath(File f) {
        if (f == null) return "";
        try {
            return f.getCanonicalPath();
        } catch (java.io.IOException e) {
            return f.getAbsolutePath();
        }
    }
}
