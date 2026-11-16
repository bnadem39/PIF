package com.pif.backtest.service;

import com.pif.backtest.dto.BenchmarkStats;
import com.pif.backtest.dto.EquityPoint;
import com.pif.backtest.dto.Metrics;
import com.pif.backtest.dto.PeriodStats;
import com.pif.backtest.dto.Validation;

import java.util.List;
import java.util.Map;

/**
 * Analyses complémentaires d'un backtest : validation hors échantillon (70/30) et comparaison à un indice.
 */
public final class BacktestAnalysis {

    public static final double TEST_SHARE = 0.30;
    static final int MIN_SEGMENT_DAYS = 30;
    static final double PERIODS_PER_YEAR = 252;

    public static final String FIABLE = "FIABLE";
    public static final String A_SURVEILLER = "A_SURVEILLER";
    public static final String FRAGILE = "FRAGILE";

    private BacktestAnalysis() {
    }

    /** Rejoue la même stratégie sur les 70 % premiers jours puis sur les 30 % derniers. Null si un segment est trop court. */
    public static Validation validate(List<Bar> bars, int[] targets, int from, int to, double capital,
                                      BacktestEngine.Costs costs, double rf, boolean wholeUnits) {
        int days = to - from + 1;
        int split = from + (int) Math.round(days * (1 - TEST_SHARE));   // premier jour de test
        if (split - from < MIN_SEGMENT_DAYS || to - split + 1 < MIN_SEGMENT_DAYS) {
            return null;
        }
        BacktestEngine.Run ref = BacktestEngine.run(bars, targets, from, split - 1, capital, costs, rf, wholeUnits);
        BacktestEngine.Run test = BacktestEngine.run(bars, targets, split, to, capital, costs, rf, wholeUnits);
        PeriodStats a = stats(bars, from, split - 1, ref.metrics());
        PeriodStats b = stats(bars, split, to, test.metrics());
        return verdict(a, b);
    }

    private static PeriodStats stats(List<Bar> bars, int from, int to, Metrics m) {
        return new PeriodStats(bars.get(from).date(), bars.get(to).date(), to - from + 1,
                m.totalReturn(), m.sharpe(), m.maxDrawdown());
    }

    /** Règles volontairement simples, expliquées à l'utilisateur dans l'interface. */
    static Validation verdict(PeriodStats ref, PeriodStats test) {
        if (test.totalReturn() <= 0) {
            return new Validation(ref, test, FRAGILE,
                    "Elle perd de l'argent sur la période de test : le bon résultat passé ne s'est pas confirmé.");
        }
        boolean solid = ref.totalReturn() > 0 && ref.sharpe() != null && test.sharpe() != null
                && test.sharpe() >= 0.5 * ref.sharpe();
        if (solid) {
            return new Validation(ref, test, FIABLE,
                    "Elle reste efficace sur une période qu'elle n'avait jamais vue : bon signe de robustesse.");
        }
        return new Validation(ref, test, A_SURVEILLER,
                "Elle gagne sur la période de test, mais moins bien qu'avant (ou sans avoir fait ses preuves avant) : à confirmer.");
    }

    /**
     * Compare la valeur du portefeuille à l'indice de référence sur les mêmes dates.
     * @param benchReturns rendement journalier de l'indice par date (une date absente compte pour 0)
     */
    public static BenchmarkStats compare(List<EquityPoint> equity, double initial, Map<String, Double> benchReturns) {
        int n = equity.size();
        double[] r = new double[n];
        double[] m = new double[n];
        double prev = initial;
        double benchLevel = 1;
        for (int i = 0; i < n; i++) {
            double v = equity.get(i).equity();
            r[i] = v / prev - 1;
            prev = v;
            m[i] = benchReturns.getOrDefault(equity.get(i).date(), 0.0);
            benchLevel *= 1 + m[i];
        }
        double benchReturn = benchLevel - 1;
        double stratReturn = equity.get(n - 1).equity() / initial - 1;

        double rMean = mean(r);
        double mMean = mean(m);
        double cov = 0;
        double var = 0;
        for (int i = 0; i < n; i++) {
            cov += (r[i] - rMean) * (m[i] - mMean);
            var += (m[i] - mMean) * (m[i] - mMean);
        }
        Double beta = var > 1e-12 ? cov / var : null;
        Double alpha = beta != null ? (rMean - beta * mMean) * PERIODS_PER_YEAR : null;
        return new BenchmarkStats(benchReturn, stratReturn - benchReturn, beta, alpha);
    }

    private static double mean(double[] x) {
        double s = 0;
        for (double v : x) s += v;
        return x.length > 0 ? s / x.length : 0;
    }
}
