package com.pif.trading.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.trading.config.AlphaVantageProperties;
import com.pif.trading.dto.CandleDto;
import com.pif.trading.dto.GlobalQuoteDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;

@Component
public class AlphaVantageClient {

    private static final Logger log = LoggerFactory.getLogger(AlphaVantageClient.class);

    private final RestTemplate restTemplate;
    private final AlphaVantageProperties properties;
    private final ObjectMapper objectMapper;

    public AlphaVantageClient(RestTemplate restTemplate, AlphaVantageProperties properties, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    /**
     * Récupère les données journalières d'une action via TIME_SERIES_DAILY
     */
    public List<CandleDto> fetchDaily(String symbol) {
        String url = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .queryParam("function", "TIME_SERIES_DAILY")
                .queryParam("symbol", symbol)
                .queryParam("apikey", properties.getApiKey())
                .queryParam("outputsize", "compact")
                .toUriString();

        return parseTimeSeries(url, "Time Series (Daily)", "1. open", "2. high", "3. low", "4. close", "5. volume");
    }

    /**
     * Récupère les données intraday d'une action via TIME_SERIES_INTRADAY (1min, 5min, 15min, 60min)
     */
    public List<CandleDto> fetchIntraday(String symbol, String interval) {
        String avInterval = mapInterval(interval);
        String url = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .queryParam("function", "TIME_SERIES_INTRADAY")
                .queryParam("symbol", symbol)
                .queryParam("interval", avInterval)
                .queryParam("apikey", properties.getApiKey())
                .queryParam("outputsize", "compact")
                .toUriString();

        String seriesKey = "Time Series (" + avInterval + ")";
        return parseTimeSeries(url, seriesKey, "1. open", "2. high", "3. low", "4. close", "5. volume");
    }

    /**
     * Récupère les données quotidiennes pour une cryptomonnaie via DIGITAL_CURRENCY_DAILY
     */
    public List<CandleDto> fetchCryptoDaily(String symbol, String market) {
        String cleanSymbol = symbol.replace("-USD", "");
        String url = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .queryParam("function", "DIGITAL_CURRENCY_DAILY")
                .queryParam("symbol", cleanSymbol)
                .queryParam("market", market)
                .queryParam("apikey", properties.getApiKey())
                .toUriString();

        return parseTimeSeries(url, "Time Series (Digital Currency Daily)",
                "1a. open (" + market + ")",
                "2a. high (" + market + ")",
                "3a. low (" + market + ")",
                "4a. close (" + market + ")",
                "5. volume");
    }

    /**
     * Récupère la cotation en temps réel d'un actif via GLOBAL_QUOTE
     */
    public Optional<GlobalQuoteDto> fetchGlobalQuote(String symbol) {
        String url = UriComponentsBuilder.fromHttpUrl(properties.getBaseUrl())
                .queryParam("function", "GLOBAL_QUOTE")
                .queryParam("symbol", symbol)
                .queryParam("apikey", properties.getApiKey())
                .toUriString();

        try {
            log.info("Appel Alpha Vantage GLOBAL_QUOTE pour {}", symbol);
            String json = restTemplate.getForObject(url, String.class);
            if (json == null) return Optional.empty();

            JsonNode root = objectMapper.readTree(json);
            checkRateLimitOrError(root);

            JsonNode quote = root.get("Global Quote");
            if (quote == null || quote.isEmpty()) {
                log.warn("Aucune cotation Global Quote renvoyée par Alpha Vantage pour {}", symbol);
                return Optional.empty();
            }

            String sym = quote.path("01. symbol").asText(symbol);
            double price = quote.path("05. price").asDouble();
            double change = quote.path("09. change").asDouble();
            String changePctStr = quote.path("10. change percent").asText("0%").replace("%", "");
            double changePercent = Double.parseDouble(changePctStr);
            double high = quote.path("03. high").asDouble();
            double low = quote.path("04. low").asDouble();
            long volume = quote.path("06. volume").asLong();
            String latestTradingDay = quote.path("07. latest trading day").asText();

            return Optional.of(new GlobalQuoteDto(sym, price, change, changePercent, high, low, volume, latestTradingDay));
        } catch (Exception e) {
            log.error("Erreur lors de l'appel GLOBAL_QUOTE Alpha Vantage pour {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    private List<CandleDto> parseTimeSeries(String url, String seriesKey,
                                           String openKey, String highKey, String lowKey, String closeKey, String volKey) {
        try {
            log.info("Appel Alpha Vantage API : {}", url.replaceAll("apikey=[^&]+", "apikey=***"));
            String json = restTemplate.getForObject(url, String.class);
            if (json == null) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(json);
            checkRateLimitOrError(root);

            JsonNode timeSeries = root.get(seriesKey);
            if (timeSeries == null || !timeSeries.isObject()) {
                log.warn("Clé '{}' absente de la réponse Alpha Vantage.", seriesKey);
                return Collections.emptyList();
            }

            List<CandleDto> candles = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = timeSeries.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String timestampStr = entry.getKey();
                JsonNode point = entry.getValue();

                double open = point.path(openKey).asDouble();
                double high = point.path(highKey).asDouble();
                double low = point.path(lowKey).asDouble();
                double close = point.path(closeKey).asDouble();
                long volume = point.path(volKey).asLong();

                candles.add(new CandleDto(timestampStr, open, high, low, close, volume));
            }

            // Alpha Vantage renvoie par ordre anti-chronologique -> on trie chronologiquement (ancien -> récent)
            candles.sort(Comparator.comparing(CandleDto::time));
            return candles;
        } catch (Exception e) {
            log.error("Erreur lors de la désérialisation Alpha Vantage : {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private void checkRateLimitOrError(JsonNode root) {
        if (root.has("Note")) {
            log.warn("Avertissement Quota Alpha Vantage (Note) : {}", root.get("Note").asText());
        }
        if (root.has("Information")) {
            log.warn("Information Quota Alpha Vantage : {}", root.get("Information").asText());
        }
        if (root.has("Error Message")) {
            log.error("Erreur Alpha Vantage : {}", root.get("Error Message").asText());
        }
    }

    private String mapInterval(String interval) {
        return switch (interval.toLowerCase()) {
            case "1m" -> "1min";
            case "5m" -> "5min";
            case "15m" -> "15min";
            case "60m", "1h" -> "60min";
            default -> "60min";
        };
    }
}
