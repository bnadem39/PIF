package com.pif.trading.service;

import com.pif.trading.dto.CandleDto;
import com.pif.trading.exception.PriceUnavailableException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/**
 * Source unique de vérité pour les cours utilisés par le moteur de trading.
 * Le prix d'exécution n'est JAMAIS fourni par le client : il est lu côté serveur
 * (clôture de la dernière bougie journalière à la date simulée ou avant).
 */
@Service
public class MarketPriceService {

    private final MarketDataService marketDataService;
    private final LocalCsvMarketDataService localCsvService;

    public MarketPriceService(MarketDataService marketDataService, LocalCsvMarketDataService localCsvService) {
        this.marketDataService = marketDataService;
        this.localCsvService = localCsvService;
    }

    /**
     * Cours de clôture de la dernière bougie journalière dont la date est <= simulatedDate.
     * Si simulatedDate est vide, renvoie le dernier cours connu.
     */
    public Optional<BigDecimal> findClosePrice(String symbol, String simulatedDate) {
        if (symbol == null || symbol.isBlank()) {
            return Optional.empty();
        }
        String sym = symbol.toUpperCase().trim();
        List<CandleDto> candles = localCsvService.hasSymbol(sym)
                ? localCsvService.getCandles(sym, "1d", "ALL", 0)
                : marketDataService.getHistory(sym, "1d", "ALL", 0).candles();
        if (candles == null || candles.isEmpty()) {
            return Optional.empty();
        }

        CandleDto match;
        if (simulatedDate == null || simulatedDate.isBlank()) {
            match = candles.get(candles.size() - 1);
        } else {
            String day = simulatedDate.length() > 10 ? simulatedDate.substring(0, 10) : simulatedDate;
            match = lastCandleOnOrBefore(candles, day);
        }

        if (match == null || match.close() <= 0) {
            return Optional.empty();
        }
        return Optional.of(BigDecimal.valueOf(match.close()).setScale(3, RoundingMode.HALF_UP));
    }

    /**
     * Variante stricte utilisée pour l'exécution des ordres : lève une exception si aucun cours n'est disponible.
     */
    public BigDecimal getClosePrice(String symbol, String simulatedDate) {
        return findClosePrice(symbol, simulatedDate)
                .orElseThrow(() -> new PriceUnavailableException(String.format(
                        "Aucun cours disponible pour %s à la date %s.", symbol, simulatedDate)));
    }

    /**
     * Recherche dichotomique : les bougies sont triées par date croissante (format ISO yyyy-MM-dd).
     */
    private static CandleDto lastCandleOnOrBefore(List<CandleDto> candles, String day) {
        int lo = 0;
        int hi = candles.size() - 1;
        CandleDto result = null;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;
            CandleDto c = candles.get(mid);
            if (c.time().compareTo(day) <= 0) {
                result = c;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return result;
    }
}
