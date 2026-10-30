package com.pif.backtest.service;

import com.pif.backtest.dto.EquityPoint;
import com.pif.backtest.dto.Metrics;
import com.pif.backtest.dto.TradeDto;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Simulation « long ou liquide » d'une série de positions souhaitées, sans biais d'anticipation :
 * la décision prise à la clôture du jour i est exécutée au cours d'ouverture du jour i + 1,
 * corrigé du slippage, et chaque transaction paie une commission proportionnelle.
 * Le portefeuille démarre liquide au premier jour de la période et n'achète que des titres entiers.
 */
public final class BacktestEngine {

    public record Costs(double commission, double slippage) {
    }

    public record Run(List<EquityPoint> equity, List<TradeDto> trades, Metrics metrics) {
    }

    private BacktestEngine() {
    }

    /**
     * @param bars    historique complet (le préchauffage des indicateurs utilise les jours avant {@code from})
     * @param targets position souhaitée à la clôture de chaque jour
     * @param from    premier jour simulé (inclus)
     * @param to      dernier jour simulé (inclus)
     */
    public static Run run(List<Bar> bars, int[] targets, int from, int to, double initialCapital, Costs costs, double riskFreeRate) {
        double cash = initialCapital;
        long qty = 0;
        double totalCosts = 0;
        String entryDate = null;
        double entryCost = 0;     // montant décaissé à l'achat, frais compris
        double entryPrice = 0;
        int daysInvested = 0;

        List<EquityPoint> equity = new ArrayList<>();
        List<TradeDto> trades = new ArrayList<>();
        double peak = initialCapital;

        for (int i = from; i <= to; i++) {
            Bar bar = bars.get(i);
            int desired = i > from ? targets[i - 1] : 0;
            double open = bar.open() > 0 ? bar.open() : bars.get(i - 1 >= 0 ? i - 1 : i).close();

            if (desired == 1 && qty == 0) {
                double price = open * (1 + costs.slippage());
                long n = (long) Math.floor(cash / (price * (1 + costs.commission())));
                if (n > 0) {
                    double notional = n * price;
                    double fee = notional * costs.commission();
                    cash -= notional + fee;
                    totalCosts += fee + n * open * costs.slippage();
                    qty = n;
                    entryDate = bar.date();
                    entryCost = notional + fee;
                    entryPrice = price;
                }
            } else if (desired == 0 && qty > 0) {
                double price = open * (1 - costs.slippage());
                double notional = qty * price;
                double fee = notional * costs.commission();
                cash += notional - fee;
                totalCosts += fee + qty * open * costs.slippage();
                double pnl = notional - fee - entryCost;
                trades.add(new TradeDto(entryDate, entryPrice, bar.date(), price, qty, pnl, pnl / entryCost, false));
                qty = 0;
            }

            if (qty > 0) daysInvested++;
            double value = cash + qty * bar.close();
            peak = Math.max(peak, value);
            equity.add(new EquityPoint(bar.date(), value, value / peak - 1, qty > 0 ? 1 : 0));
        }

        if (qty > 0) {
            Bar last = bars.get(to);
            double pnl = qty * last.close() - entryCost;
            trades.add(new TradeDto(entryDate, entryPrice, last.date(), last.close(), qty, pnl, pnl / entryCost, true));
        }

        int days = to - from + 1;
        return new Run(equity, trades, metrics(equity, trades, initialCapital, riskFreeRate, bars, from, to,
                (double) daysInvested / days, totalCosts));
    }

    static Metrics metrics(List<EquityPoint> equity, List<TradeDto> trades, double initial, double rf,
                           List<Bar> bars, int from, int to, double exposure, double totalCosts) {
        int n = equity.size();
        double[] r = new double[n];
        double[] market = new double[n];
        double prev = initial;
        double maxDd = 0;
        for (int i = 0; i < n; i++) {
            double v = equity.get(i).equity();
            r[i] = v / prev - 1;
            prev = v;
            maxDd = Math.min(maxDd, equity.get(i).drawdown());
            int b = from + i;
            market[i] = b > 0 ? bars.get(b).close() / bars.get(b - 1).close() - 1 : 0;
        }
        double finalEquity = equity.get(n - 1).equity();
        double totalReturn = finalEquity / initial - 1;

        double years = ChronoUnit.DAYS.between(LocalDate.parse(bars.get(from).date()), LocalDate.parse(bars.get(to).date())) / 365.25;
        double periodsPerYear = years > 0 ? n / years : 252;
        Double cagr = years >= 0.25 && finalEquity > 0 ? Math.pow(finalEquity / initial, 1 / years) - 1 : null;

        double mean = mean(r);
        double sd = std(r, mean);
        double rfDaily = rf / periodsPerYear;
        Double volatility = n > 1 ? sd * Math.sqrt(periodsPerYear) : null;
        Double sharpe = sd > 1e-12 ? (mean - rfDaily) / sd * Math.sqrt(periodsPerYear) : null;
        double downside = 0;
        for (double x : r) downside += Math.pow(Math.min(0, x - rfDaily), 2);
        downside = Math.sqrt(downside / n);
        Double sortino = downside > 1e-12 ? (mean - rfDaily) / downside * Math.sqrt(periodsPerYear) : null;
        Double calmar = cagr != null && maxDd < 0 ? cagr / -maxDd : null;

        double mMean = mean(market), cov = 0, var = 0;
        for (int i = 0; i < n; i++) {
            cov += (r[i] - mean) * (market[i] - mMean);
            var += (market[i] - mMean) * (market[i] - mMean);
        }
        Double beta = var > 1e-12 ? cov / var : null;

        int wins = 0;
        double gains = 0, losses = 0, sumRet = 0;
        for (TradeDto t : trades) {
            if (t.pnl() > 0) {
                wins++;
                gains += t.pnl();
            } else {
                losses -= t.pnl();
            }
            sumRet += t.returnPct();
        }
        int count = trades.size();
        return new Metrics(finalEquity, totalReturn, cagr, volatility, sharpe, sortino, maxDd, calmar, beta, count,
                count > 0 ? (double) wins / count : null,
                losses > 0 ? gains / losses : null,
                count > 0 ? sumRet / count : null,
                exposure, totalCosts);
    }

    private static double mean(double[] x) {
        double s = 0;
        for (double v : x) s += v;
        return x.length > 0 ? s / x.length : 0;
    }

    private static double std(double[] x, double mean) {
        if (x.length < 2) return 0;
        double s = 0;
        for (double v : x) s += (v - mean) * (v - mean);
        return Math.sqrt(s / (x.length - 1));
    }
}
