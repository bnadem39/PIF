package com.pif.backtest.service;

import com.pif.backtest.dto.StrategySpec;
import com.pif.backtest.model.StrategyType;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

class BacktestEngineTest {

    private static final BacktestEngine.Costs NO_COSTS = new BacktestEngine.Costs(0, 0);

    /** Chandeliers quotidiens : ouverture = clôture de la veille. */
    private static List<Bar> bars(double... closes) {
        List<Bar> out = new ArrayList<>();
        for (int i = 0; i < closes.length; i++) {
            double open = i == 0 ? closes[0] : closes[i - 1];
            out.add(new Bar(String.format("2022-01-%02d", i + 1), open, Math.max(open, closes[i]), Math.min(open, closes[i]), closes[i]));
        }
        return out;
    }

    @Test
    void buyAndHoldBuysAtNextOpenWithWholeShares() {
        List<Bar> b = bars(10, 10, 12, 15);
        int[] t = {1, 1, 1, 1};
        BacktestEngine.Run run = BacktestEngine.run(b, t, 0, 3, 1005, NO_COSTS, 0, true);

        // Jour 1 liquide ; achat de 100 titres à l'ouverture du jour 2 (10), 5 de cash restant
        assertThat(run.equity().get(0).position()).isZero();
        assertThat(run.equity().get(3).equity()).isEqualTo(1505.0);
        assertThat(run.trades()).hasSize(1);
        assertThat(run.trades().get(0).open()).isTrue();
        assertThat(run.metrics().totalReturn()).isCloseTo(500.0 / 1005, within(1e-9));
    }

    @Test
    void divisibleAssetIsFullyInvestedEvenWhenPriceExceedsCapital() {
        // Un bitcoin à 60 000 avec 100 000 de capital : en titres entiers, 40 % du capital resterait liquide
        List<Bar> b = bars(60_000, 60_000, 30_000, 30_000);
        int[] t = {1, 1, 1, 1};
        BacktestEngine.Run whole = BacktestEngine.run(b, t, 0, 3, 100_000, NO_COSTS, 0, true);
        BacktestEngine.Run fractional = BacktestEngine.run(b, t, 0, 3, 100_000, NO_COSTS, 0, false);

        assertThat(whole.metrics().totalReturn()).isCloseTo(-0.3, within(1e-9));
        assertThat(fractional.metrics().totalReturn()).isCloseTo(-0.5, within(1e-9));
        assertThat(fractional.trades().get(0).quantity()).isCloseTo(100_000.0 / 60_000, within(1e-9));
    }

    @Test
    void decisionsAreExecutedOnTheNextDayOnly() {
        // Le cours double le jour 3 : une stratégie qui décide d'acheter à la clôture du jour 3 ne doit pas en profiter
        List<Bar> b = bars(10, 10, 20, 20);
        int[] t = {0, 0, 1, 1};
        BacktestEngine.Run run = BacktestEngine.run(b, t, 0, 3, 1000, NO_COSTS, 0, true);
        assertThat(run.metrics().totalReturn()).isCloseTo(0.0, within(1e-9));
    }

    @Test
    void costsReduceReturnAndDrawdownIsTracked() {
        List<Bar> b = bars(10, 10, 8, 12, 12);
        int[] t = {1, 1, 1, 0, 0};
        BacktestEngine.Run free = BacktestEngine.run(b, t, 0, 4, 10_000, NO_COSTS, 0, true);
        BacktestEngine.Run costly = BacktestEngine.run(b, t, 0, 4, 10_000, new BacktestEngine.Costs(0.01, 0.005), 0, true);

        assertThat(costly.metrics().finalEquity()).isLessThan(free.metrics().finalEquity());
        assertThat(costly.metrics().totalCosts()).isPositive();
        assertThat(free.metrics().maxDrawdown()).isCloseTo(-0.2, within(1e-9));
        assertThat(free.trades()).hasSize(1);
        assertThat(free.trades().get(0).open()).isFalse();
        assertThat(free.metrics().winRate()).isEqualTo(1.0);
    }

    @Test
    void rsiIsBoundedAndSmaMatchesManualAverage() {
        double[] x = {1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 6, 7, 8, 7, 6};
        double[] sma = Indicators.sma(x, 4);
        assertThat(sma[2]).isNaN();
        assertThat(sma[3]).isEqualTo(2.5);
        for (double r : Indicators.rsi(x, 5)) {
            if (!Double.isNaN(r)) assertThat(r).isBetween(0.0, 100.0);
        }
    }

    @Test
    void smaCrossoverIsInvestedOnlyWhenFastAboveSlow() {
        double[] up = new double[60];
        for (int i = 0; i < 60; i++) up[i] = 100 + i;
        int[] t = SignalGenerator.targets(StrategyType.SMA_CROSSOVER, Map.of("fast", 5.0, "slow", 20.0), up, null);
        assertThat(t[10]).isZero();      // moyenne longue pas encore définie
        assertThat(t[59]).isEqualTo(1);
    }

    @Test
    void aiSignalHoldsForTheModelHorizon() {
        double[][] p = new double[10][];
        for (int i = 0; i < 10; i++) p[i] = new double[]{0.1, 0.1};
        p[2] = new double[]{0.7, 0.1};
        int[] t = SignalGenerator.targets(StrategyType.AI_SIGNAL, Map.of("threshold", 0.5, "holdDays", 3.0), new double[10], p);
        assertThat(t).containsExactly(0, 0, 1, 1, 1, 0, 0, 0, 0, 0);
    }

    @Test
    void parametersAreValidated() {
        assertThat(BacktestService.resolveParams(new StrategySpec(StrategyType.SMA_CROSSOVER, null)))
                .containsEntry("fast", 20.0).containsEntry("slow", 50.0);
        assertThatThrownBy(() -> BacktestService.resolveParams(
                new StrategySpec(StrategyType.SMA_CROSSOVER, Map.of("fast", 60.0, "slow", 50.0))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> BacktestService.resolveParams(
                new StrategySpec(StrategyType.AI_SIGNAL, Map.of("threshold", 0.99))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
