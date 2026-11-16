package com.pif.backtest.service;

import com.pif.backtest.dto.BenchmarkStats;
import com.pif.backtest.dto.EquityPoint;
import com.pif.backtest.dto.PeriodStats;
import com.pif.backtest.dto.Validation;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class BacktestAnalysisTest {

    private static final BacktestEngine.Costs NO_COSTS = new BacktestEngine.Costs(0, 0);

    private static List<Bar> risingBars(int n, double dailyGrowth) {
        List<Bar> out = new ArrayList<>();
        double price = 100;
        LocalDate d = LocalDate.of(2022, 1, 1);
        for (int i = 0; i < n; i++) {
            double open = price;
            price *= 1 + dailyGrowth;
            out.add(new Bar(d.plusDays(i).toString(), open, Math.max(open, price), Math.min(open, price), price));
        }
        return out;
    }

    @Test
    void verdictIsFragileWhenTestPeriodLoses() {
        Validation v = BacktestAnalysis.verdict(new PeriodStats("a", "b", 70, 0.10, 1.2, -0.05),
                new PeriodStats("c", "d", 30, -0.03, -0.4, -0.08));
        assertThat(v.verdict()).isEqualTo(BacktestAnalysis.FRAGILE);
    }

    @Test
    void verdictIsReliableWhenTestSharpeHoldsUp() {
        Validation v = BacktestAnalysis.verdict(new PeriodStats("a", "b", 70, 0.10, 1.0, -0.05),
                new PeriodStats("c", "d", 30, 0.04, 0.8, -0.03));
        assertThat(v.verdict()).isEqualTo(BacktestAnalysis.FIABLE);
    }

    @Test
    void verdictIsToWatchWhenTestWinsButWeaker() {
        Validation v = BacktestAnalysis.verdict(new PeriodStats("a", "b", 70, 0.10, 1.0, -0.05),
                new PeriodStats("c", "d", 30, 0.01, 0.2, -0.03));
        assertThat(v.verdict()).isEqualTo(BacktestAnalysis.A_SURVEILLER);
    }

    @Test
    void validateSplitsSeventyThirtyAndSkipsShortPeriods() {
        List<Bar> bars = risingBars(200, 0.001);
        int[] always = new int[200];
        java.util.Arrays.fill(always, 1);
        Validation v = BacktestAnalysis.validate(bars, always, 0, 199, 100_000, NO_COSTS, 0, false);
        assertThat(v).isNotNull();
        assertThat(v.reference().days()).isEqualTo(140);
        assertThat(v.test().days()).isEqualTo(60);
        assertThat(v.reference().endDate()).isLessThan(v.test().startDate());
        assertThat(v.verdict()).isNotEqualTo(BacktestAnalysis.FRAGILE);

        assertThat(BacktestAnalysis.validate(bars.subList(0, 60), new int[60], 0, 59, 100_000, NO_COSTS, 0, false)).isNull();
    }

    @Test
    void compareMeasuresExcessReturnAndBeta() {
        // Stratégie = exactement 2 x l'indice chaque jour : bêta 2, alpha nul
        List<EquityPoint> equity = new ArrayList<>();
        Map<String, Double> bench = new HashMap<>();
        double level = 1000;
        for (int i = 0; i < 50; i++) {
            String date = LocalDate.of(2022, 1, 1).plusDays(i).toString();
            double m = (i % 2 == 0) ? 0.01 : -0.005;
            bench.put(date, m);
            level *= 1 + 2 * m;
            equity.add(new EquityPoint(date, level, 0, 1));
        }
        BenchmarkStats s = BacktestAnalysis.compare(equity, 1000, bench);
        assertThat(s.beta()).isCloseTo(2.0, within(1e-9));
        assertThat(s.alpha()).isCloseTo(0.0, within(1e-9));
        assertThat(s.excessReturn()).isEqualTo(level / 1000 - 1 - s.benchmarkReturn());
    }
}
