package com.pif.backtest.service;

import com.pif.backtest.model.StrategyType;

import java.util.Map;

/**
 * Traduit une stratégie en position souhaitée (1 = investi, 0 = liquide) à la clôture de chaque jour.
 * La décision du jour i n'utilise que les données jusqu'à i ; le moteur l'exécute à l'ouverture de i + 1.
 */
public final class SignalGenerator {

    private SignalGenerator() {
    }

    /**
     * @param aiProbabilities pour AI_SIGNAL : [i][0] = P(hausse), [i][1] = P(baisse), NaN si inconnu
     */
    public static int[] targets(StrategyType type, Map<String, Double> p, double[] close, double[][] aiProbabilities) {
        int n = close.length;
        int[] t = new int[n];
        switch (type) {
            case BUY_AND_HOLD -> java.util.Arrays.fill(t, 1);
            case SMA_CROSSOVER -> {
                double[] fast = Indicators.sma(close, p.get("fast").intValue());
                double[] slow = Indicators.sma(close, p.get("slow").intValue());
                for (int i = 0; i < n; i++) t[i] = fast[i] > slow[i] ? 1 : 0;   // NaN -> false
            }
            case RSI_REVERSION -> {
                double[] rsi = Indicators.rsi(close, p.get("period").intValue());
                double lower = p.get("lower"), upper = p.get("upper");
                int pos = 0;
                for (int i = 0; i < n; i++) {
                    if (pos == 0 && rsi[i] < lower) pos = 1;
                    else if (pos == 1 && rsi[i] > upper) pos = 0;
                    t[i] = pos;
                }
            }
            case MACD_CROSSOVER -> {
                double[] fast = Indicators.ema(close, p.get("fast").intValue());
                double[] slow = Indicators.ema(close, p.get("slow").intValue());
                double[] macd = new double[n];
                for (int i = 0; i < n; i++) macd[i] = fast[i] - slow[i];
                double[] signal = Indicators.ema(macd, p.get("signal").intValue());
                int warmup = p.get("slow").intValue();
                for (int i = 0; i < n; i++) t[i] = i >= warmup && macd[i] > signal[i] ? 1 : 0;
            }
            case BOLLINGER_REVERSION -> {
                int period = p.get("period").intValue();
                double k = p.get("k");
                double[] mid = Indicators.sma(close, period);
                double[] sd = Indicators.rollingStd(close, period);
                int pos = 0;
                for (int i = 0; i < n; i++) {
                    if (pos == 0 && close[i] < mid[i] - k * sd[i]) pos = 1;
                    else if (pos == 1 && close[i] >= mid[i]) pos = 0;
                    t[i] = pos;
                }
            }
            case AI_SIGNAL -> {
                double threshold = p.get("threshold");
                int hold = p.get("holdDays").intValue();
                int remaining = 0;
                for (int i = 0; i < n; i++) {
                    double pBuy = aiProbabilities[i][0], pSell = aiProbabilities[i][1];
                    boolean buy = pBuy >= threshold && pBuy > pSell;
                    boolean sell = pSell >= threshold && pSell > pBuy;
                    if (buy) remaining = hold;
                    else if (sell) remaining = 0;
                    else if (remaining > 0) remaining--;
                    t[i] = remaining > 0 ? 1 : 0;
                }
            }
        }
        return t;
    }
}
