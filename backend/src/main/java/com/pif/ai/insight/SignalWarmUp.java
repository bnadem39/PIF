package com.pif.ai.insight;

import com.pif.marketdata.dto.WatchlistAssetDto;
import com.pif.marketdata.service.LocalCsvMarketDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Précalcule au démarrage les signaux XGBoost de tous les actifs locaux, en tâche de fond, pour que la watchlist
 * affiche ses signaux dès la première ouverture. Si le service IA est arrêté, le calcul se fera à la première demande.
 */
@Component
@ConditionalOnProperty(name = "ai.signals.warm-up", havingValue = "true", matchIfMissing = true)
public class SignalWarmUp {

    private static final Logger log = LoggerFactory.getLogger(SignalWarmUp.class);

    private final MarketInsightService insightService;
    private final LocalCsvMarketDataService localCsvService;

    public SignalWarmUp(MarketInsightService insightService, LocalCsvMarketDataService localCsvService) {
        this.insightService = insightService;
        this.localCsvService = localCsvService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warmUp() {
        Thread t = new Thread(() -> {
            List<String> symbols = localCsvService.getAllAssets(null).stream().map(WatchlistAssetDto::ticker).toList();
            int done = insightService.warmUp(symbols);
            log.info("[AI] Signaux précalculés pour {}/{} actifs", done, symbols.size());
        }, "ai-signal-warm-up");
        t.setDaemon(true);
        t.start();
    }
}
