package com.pif.backtest.model;

import java.util.List;

/**
 * Stratégies disponibles pour le backtesting (cahier §3.2). Toutes sont « long ou liquide » :
 * la vente à découvert n'existe pas à la BVMT.
 */
public enum StrategyType {
    BUY_AND_HOLD("Achat-conservation",
            "Achète au début de la période et conserve jusqu'à la fin. Référence de comparaison.",
            List.of()),
    SMA_CROSSOVER("Croisement de moyennes mobiles",
            "Investi tant que la moyenne courte est au-dessus de la moyenne longue.",
            List.of(new ParamDef("fast", "Moyenne courte (jours)", 20, 2, 100, true),
                    new ParamDef("slow", "Moyenne longue (jours)", 50, 5, 300, true))),
    RSI_REVERSION("Retour à la moyenne RSI",
            "Achète quand le RSI passe sous le seuil bas (survente), revend au-dessus du seuil haut.",
            List.of(new ParamDef("period", "Période RSI", 14, 2, 50, true),
                    new ParamDef("lower", "Seuil d'achat", 30, 5, 50, false),
                    new ParamDef("upper", "Seuil de vente", 70, 50, 95, false))),
    MACD_CROSSOVER("Croisement MACD",
            "Investi tant que la ligne MACD est au-dessus de sa ligne de signal.",
            List.of(new ParamDef("fast", "EMA rapide", 12, 2, 50, true),
                    new ParamDef("slow", "EMA lente", 26, 5, 100, true),
                    new ParamDef("signal", "Ligne de signal", 9, 2, 30, true))),
    BOLLINGER_REVERSION("Rebond sur bande de Bollinger",
            "Achète sous la bande basse, revend au retour à la moyenne mobile.",
            List.of(new ParamDef("period", "Période", 20, 5, 100, true),
                    new ParamDef("k", "Écarts-types", 2, 1, 4, false))),
    AI_SIGNAL("Signal IA (XGBoost)",
            "Achète quand le modèle prédit une hausse avec une probabilité au moins égale au seuil, "
                    + "conserve pendant l'horizon du modèle (5 jours) puis revend, ou plus tôt sur un signal de baisse.",
            List.of(new ParamDef("threshold", "Seuil de probabilité", 0.5, 0.34, 0.9, false),
                    new ParamDef("holdDays", "Durée de détention (jours)", 5, 1, 30, true)));

    private final String label;
    private final String description;
    private final List<ParamDef> params;

    StrategyType(String label, String description, List<ParamDef> params) {
        this.label = label;
        this.description = description;
        this.params = params;
    }

    public String label() {
        return label;
    }

    public String description() {
        return description;
    }

    public List<ParamDef> params() {
        return params;
    }

    public record ParamDef(String name, String label, double defaultValue, double min, double max, boolean integer) {
    }
}
