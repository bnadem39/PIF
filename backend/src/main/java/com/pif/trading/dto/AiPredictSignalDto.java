package com.pif.trading.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AiPredictSignalDto {

    private String ticker;
    private String signal; // BULLISH / BEARISH / NEUTRAL
    private String action; // BUY / SELL / HOLD
    private int prediction; // -1, 0, 1
    
    @JsonProperty("confidence_pct")
    private Double confidencePct;
    
    @JsonProperty("probability_up")
    private Double probabilityUp;
    
    private Map<String, Double> probabilities;
    private String confidence; // LOW / MEDIUM / HIGH
    
    @JsonProperty("inference_ms")
    private Double inferenceMs;

    public AiPredictSignalDto() {}

    public AiPredictSignalDto(String ticker, String action, String signal, int prediction, Double confidencePct) {
        this.ticker = ticker;
        this.action = action;
        this.signal = signal;
        this.prediction = prediction;
        this.confidencePct = confidencePct;
    }

    public static AiPredictSignalDto neutralFallback(String ticker) {
        AiPredictSignalDto dto = new AiPredictSignalDto(ticker, "HOLD", "NEUTRAL", 0, 0.5);
        dto.setConfidence("MEDIUM");
        dto.setProbabilityUp(0.33);
        dto.setInferenceMs(0.0);
        return dto;
    }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getSignal() { return signal; }
    public void setSignal(String signal) { this.signal = signal; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public int getPrediction() { return prediction; }
    public void setPrediction(int prediction) { this.prediction = prediction; }

    public Double getConfidencePct() { return confidencePct; }
    public void setConfidencePct(Double confidencePct) { this.confidencePct = confidencePct; }

    public Double getProbabilityUp() { return probabilityUp; }
    public void setProbabilityUp(Double probabilityUp) { this.probabilityUp = probabilityUp; }

    public Map<String, Double> getProbabilities() { return probabilities; }
    public void setProbabilities(Map<String, Double> probabilities) { this.probabilities = probabilities; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public Double getInferenceMs() { return inferenceMs; }
    public void setInferenceMs(Double inferenceMs) { this.inferenceMs = inferenceMs; }
}
