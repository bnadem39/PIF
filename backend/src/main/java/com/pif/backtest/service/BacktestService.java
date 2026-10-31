package com.pif.backtest.service;

import com.pif.audit.model.AuditAction;
import com.pif.audit.service.AuditService;
import com.pif.auth.model.User;
import com.pif.backtest.dto.BacktestRequest;
import com.pif.backtest.dto.BacktestResponse;
import com.pif.backtest.dto.StrategyResult;
import com.pif.backtest.dto.StrategySpec;
import com.pif.backtest.dto.TradeDto;
import com.pif.backtest.model.StrategyType;
import com.pif.common.exception.AiServiceUnavailableException;
import com.pif.marketdata.dto.CandleDto;
import com.pif.marketdata.service.LocalCsvMarketDataService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Backtesting de stratégies sur l'historique journalier local (CSV BVMT et crypto).
 */
@Service
public class BacktestService {

    static final int MIN_DAYS = 30;
    static final int MAX_TRADES_RETURNED = 300;

    private final LocalCsvMarketDataService marketData;
    private final AiSignalClient aiSignalClient;
    private final AuditService auditService;

    public BacktestService(LocalCsvMarketDataService marketData, AiSignalClient aiSignalClient, AuditService auditService) {
        this.marketData = marketData;
        this.aiSignalClient = aiSignalClient;
        this.auditService = auditService;
    }

    public BacktestResponse run(User user, BacktestRequest req) {
        String symbol = req.symbol().trim().toUpperCase(Locale.ROOT);
        List<Bar> bars = loadBars(symbol);
        if (bars.isEmpty()) {
            throw new IllegalArgumentException("Aucun historique journalier pour " + symbol + ".");
        }

        String start = req.startDate() != null ? req.startDate() : bars.get(0).date();
        String end = req.endDate() != null ? req.endDate() : bars.get(bars.size() - 1).date();
        if (start.compareTo(end) > 0) {
            throw new IllegalArgumentException("La date de début doit précéder la date de fin.");
        }
        int from = firstIndexOnOrAfter(bars, start);
        int to = lastIndexOnOrBefore(bars, end);
        if (from < 0 || to < 0 || to - from + 1 < MIN_DAYS) {
            throw new IllegalArgumentException("Période trop courte : au moins " + MIN_DAYS + " séances sont nécessaires.");
        }
        // Les jours postérieurs à la fin ne sont jamais utilisés (pas de fuite d'information)
        bars = bars.subList(0, to + 1);

        double capital = value(req.initialCapital(), 100_000);
        double commission = value(req.commissionPct(), 0.4) / 100;
        double slippage = value(req.slippagePct(), 0.1) / 100;
        double rf = value(req.riskFreeRate(), 0);
        BacktestEngine.Costs costs = new BacktestEngine.Costs(commission, slippage);

        double[] close = bars.stream().mapToDouble(Bar::close).toArray();
        List<String> warnings = new ArrayList<>();
        double[][] ai = null;
        boolean aiFailed = false;

        List<StrategyResult> results = new ArrayList<>();
        Map<StrategyType, Integer> seen = new LinkedHashMap<>();
        for (StrategySpec spec : req.strategies()) {
            Map<String, Double> params = resolveParams(spec);
            if (spec.type() == StrategyType.AI_SIGNAL) {
                if (aiFailed) continue;
                if (ai == null) {
                    try {
                        ai = aiProbabilities(symbol, bars, bars.get(from).date(), warnings);
                    } catch (AiServiceUnavailableException | IllegalArgumentException e) {
                        aiFailed = true;
                        warnings.add(e.getMessage() + " La stratégie « Signal IA » n'a pas été calculée.");
                        continue;
                    }
                }
            }

            int[] targets = SignalGenerator.targets(spec.type(), params, close, ai);
            BacktestEngine.Run run = BacktestEngine.run(bars, targets, from, to, capital, costs, rf, !isCrypto(symbol));
            int idx = seen.merge(spec.type(), 1, Integer::sum);
            List<TradeDto> trades = run.trades();
            if (trades.size() > MAX_TRADES_RETURNED) {
                trades = trades.subList(trades.size() - MAX_TRADES_RETURNED, trades.size());
            }
            results.add(new StrategyResult(spec.type().name() + "_" + idx, label(spec.type(), params), spec.type(),
                    params, run.metrics(), run.equity(), trades));
        }

        auditService.record(user, AuditAction.BACKTEST_RUN, true, symbol + " " + bars.get(from).date() + " → "
                + bars.get(to).date() + " : " + results.stream().map(StrategyResult::label).toList());

        return new BacktestResponse(symbol, bars.get(from).date(), bars.get(to).date(), to - from + 1, capital,
                commission * 100, slippage * 100, results, warnings);
    }

    private double[][] aiProbabilities(String symbol, List<Bar> bars, String start, List<String> warnings) {
        AiSignalClient.AiSignals signals = aiSignalClient.fetch(symbol, bars);
        double[][] out = new double[bars.size()][];
        for (int i = 0; i < bars.size(); i++) {
            double[] p = signals.byDate().get(bars.get(i).date());
            out[i] = p != null ? p : new double[]{Double.NaN, Double.NaN};
        }
        String validation = signals.validationStartDate();
        if (validation == null) {
            warnings.add("Date d'entraînement du modèle IA inconnue : le signal IA a peut-être été testé sur des données vues à l'entraînement.");
        } else if (start.compareTo(validation) < 0) {
            warnings.add("Le modèle IA a été entraîné sur les données antérieures au " + validation
                    + " : avant cette date, sa performance est surestimée (test sur données d'entraînement). "
                    + "Choisissez une date de début postérieure pour une évaluation honnête.");
        }
        return out;
    }

    /** Les crypto-actifs (cotés en paire « XXX-USD ») sont divisibles, contrairement aux actions. */
    static boolean isCrypto(String symbol) {
        return symbol.endsWith("-USD");
    }

    public List<Bar> loadBars(String symbol) {
        List<CandleDto> candles = marketData.getCandles(symbol, "1d", "ALL", 0);
        List<Bar> bars = new ArrayList<>(candles.size());
        String last = "";
        for (CandleDto c : candles) {
            if (c.time() == null || c.time().length() < 10 || c.close() <= 0) continue;
            String date = c.time().substring(0, 10);
            if (date.compareTo(last) <= 0) continue;   // ordre strict, sans doublon
            bars.add(new Bar(date, c.open(), c.high(), c.low(), c.close(), c.volume()));
            last = date;
        }
        return bars;
    }

    static Map<String, Double> resolveParams(StrategySpec spec) {
        Map<String, Double> given = spec.params() != null ? spec.params() : Map.of();
        Map<String, Double> out = new LinkedHashMap<>();
        for (StrategyType.ParamDef def : spec.type().params()) {
            double v = given.getOrDefault(def.name(), def.defaultValue());
            if (Double.isNaN(v) || v < def.min() || v > def.max()) {
                throw new IllegalArgumentException(spec.type().label() + " : « " + def.label() + " » doit être entre "
                        + fmt(def.min()) + " et " + fmt(def.max()) + ".");
            }
            out.put(def.name(), def.integer() ? Math.rint(v) : v);
        }
        if (spec.type() == StrategyType.SMA_CROSSOVER && out.get("fast") >= out.get("slow")
                || spec.type() == StrategyType.MACD_CROSSOVER && out.get("fast") >= out.get("slow")) {
            throw new IllegalArgumentException(spec.type().label() + " : la période courte doit être inférieure à la période longue.");
        }
        if (spec.type() == StrategyType.RSI_REVERSION && out.get("lower") >= out.get("upper")) {
            throw new IllegalArgumentException("RSI : le seuil d'achat doit être inférieur au seuil de vente.");
        }
        return out;
    }

    static String label(StrategyType type, Map<String, Double> p) {
        return switch (type) {
            case BUY_AND_HOLD -> "Achat-conservation";
            case SMA_CROSSOVER -> "SMA " + fmt(p.get("fast")) + "/" + fmt(p.get("slow"));
            case RSI_REVERSION -> "RSI " + fmt(p.get("period")) + " (" + fmt(p.get("lower")) + "/" + fmt(p.get("upper")) + ")";
            case MACD_CROSSOVER -> "MACD " + fmt(p.get("fast")) + "/" + fmt(p.get("slow")) + "/" + fmt(p.get("signal"));
            case BOLLINGER_REVERSION -> "Bollinger " + fmt(p.get("period")) + " ± " + fmt(p.get("k")) + "σ";
            case AI_SIGNAL -> "IA XGBoost (seuil " + fmt(p.get("threshold")) + ", " + fmt(p.get("holdDays")) + " j)";
        };
    }

    private static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }

    private static double value(BigDecimal v, double def) {
        return v != null ? v.doubleValue() : def;
    }

    private static int firstIndexOnOrAfter(List<Bar> bars, String date) {
        for (int i = 0; i < bars.size(); i++) if (bars.get(i).date().compareTo(date) >= 0) return i;
        return -1;
    }

    private static int lastIndexOnOrBefore(List<Bar> bars, String date) {
        for (int i = bars.size() - 1; i >= 0; i--) if (bars.get(i).date().compareTo(date) <= 0) return i;
        return -1;
    }

    public List<StrategyType> strategies() {
        return Arrays.asList(StrategyType.values());
    }
}
