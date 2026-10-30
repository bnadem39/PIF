package com.pif.backtest.service;

import java.util.Arrays;

/**
 * Indicateurs techniques calculés uniquement avec les données passées (valeur i = connue à la clôture de i).
 * Les valeurs non encore définies (historique trop court) valent NaN.
 */
public final class Indicators {

    private Indicators() {
    }

    public static double[] sma(double[] x, int period) {
        double[] out = nan(x.length);
        double sum = 0;
        for (int i = 0; i < x.length; i++) {
            sum += x[i];
            if (i >= period) sum -= x[i - period];
            if (i >= period - 1) out[i] = sum / period;
        }
        return out;
    }

    public static double[] ema(double[] x, int period) {
        double[] out = new double[x.length];
        double alpha = 2.0 / (period + 1);
        for (int i = 0; i < x.length; i++) {
            out[i] = i == 0 ? x[0] : alpha * x[i] + (1 - alpha) * out[i - 1];
        }
        return out;
    }

    /** RSI de Wilder. */
    public static double[] rsi(double[] x, int period) {
        double[] out = nan(x.length);
        double avgGain = 0, avgLoss = 0;
        for (int i = 1; i < x.length; i++) {
            double d = x[i] - x[i - 1];
            double gain = Math.max(d, 0), loss = Math.max(-d, 0);
            if (i <= period) {
                avgGain += gain / period;
                avgLoss += loss / period;
                if (i < period) continue;
            } else {
                avgGain = (avgGain * (period - 1) + gain) / period;
                avgLoss = (avgLoss * (period - 1) + loss) / period;
            }
            out[i] = avgLoss == 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        }
        return out;
    }

    public static double[] rollingStd(double[] x, int period) {
        double[] out = nan(x.length);
        for (int i = period - 1; i < x.length; i++) {
            double mean = 0;
            for (int j = i - period + 1; j <= i; j++) mean += x[j];
            mean /= period;
            double var = 0;
            for (int j = i - period + 1; j <= i; j++) var += (x[j] - mean) * (x[j] - mean);
            out[i] = Math.sqrt(var / (period - 1));
        }
        return out;
    }

    private static double[] nan(int n) {
        double[] out = new double[n];
        Arrays.fill(out, Double.NaN);
        return out;
    }
}
