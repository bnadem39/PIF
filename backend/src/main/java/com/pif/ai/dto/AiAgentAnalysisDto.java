package com.pif.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAgentAnalysisDto {

    private String ticker;
    
    @JsonProperty("simulation_date")
    private String simulationDate;
    
    @JsonProperty("bank_type")
    private String bankType = "conventional";
    
    private String recommendation; // BUY / SELL / HOLD
    private String action;         // BUY / SELL / HOLD
    private String confidence;     // LOW / MEDIUM / HIGH
    
    @JsonProperty("confidence_pct")
    private Double confidencePct;
    
    @JsonProperty("risk_level")
    private String riskLevel;
    
    @JsonProperty("ml_signal")
    private String mlSignal;
    
    @JsonProperty("ml_probability")
    private Double mlProbability;
    
    private Map<String, Double> probabilities = new HashMap<>();
    private List<String> sources = new ArrayList<>();
    private String analysis;
    
    @JsonProperty("compliance_note")
    private String complianceNote;
    
    @JsonProperty("rag_context")
    private String ragContext;
    
    @JsonProperty("total_ms")
    private Double totalMs;
    
    @JsonProperty("llm_ms")
    private Double llmMs;
    
    @JsonProperty("llm_available")
    private Boolean llmAvailable;
    
    private String error;

    public AiAgentAnalysisDto() {}

    public static AiAgentAnalysisDto fallback(String ticker, String simulationDate, String signal, Double confidencePct) {
        AiAgentAnalysisDto dto = new AiAgentAnalysisDto();
        dto.setTicker(ticker);
        dto.setSimulationDate(simulationDate);
        dto.setRecommendation("HOLD");
        dto.setAction("HOLD");
        dto.setConfidence("MEDIUM");
        dto.setConfidencePct(confidencePct != null ? confidencePct : 0.5);
        dto.setRiskLevel("MODERATE");
        dto.setMlSignal(signal != null ? signal : "NEUTRAL");
        dto.setMlProbability(0.33);
        dto.setAnalysis("Le moteur d'inférence FinGPT est temporairement hors ligne ou en attente. " +
                "Recommandation conservative HOLD appliquée pour protéger le capital virtuel.");
        dto.setLlmAvailable(false);
        dto.setTotalMs(1.5);
        return dto;
    }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getSimulationDate() { return simulationDate; }
    public void setSimulationDate(String simulationDate) { this.simulationDate = simulationDate; }

    public String getBankType() { return bankType; }
    public void setBankType(String bankType) { this.bankType = bankType; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getConfidence() { return confidence; }
    public void setConfidence(String confidence) { this.confidence = confidence; }

    public Double getConfidencePct() { return confidencePct; }
    public void setConfidencePct(Double confidencePct) { this.confidencePct = confidencePct; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getMlSignal() { return mlSignal; }
    public void setMlSignal(String mlSignal) { this.mlSignal = mlSignal; }

    public Double getMlProbability() { return mlProbability; }
    public void setMlProbability(Double mlProbability) { this.mlProbability = mlProbability; }

    public Map<String, Double> getProbabilities() { return probabilities; }
    public void setProbabilities(Map<String, Double> probabilities) { this.probabilities = probabilities; }

    public List<String> getSources() { return sources; }
    public void setSources(List<String> sources) { this.sources = sources; }

    public String getAnalysis() { return analysis; }
    public void setAnalysis(String analysis) { this.analysis = analysis; }

    public String getComplianceNote() { return complianceNote; }
    public void setComplianceNote(String complianceNote) { this.complianceNote = complianceNote; }

    public String getRagContext() { return ragContext; }
    public void setRagContext(String ragContext) { this.ragContext = ragContext; }

    public Double getTotalMs() { return totalMs; }
    public void setTotalMs(Double totalMs) { this.totalMs = totalMs; }

    public Double getLlmMs() { return llmMs; }
    public void setLlmMs(Double llmMs) { this.llmMs = llmMs; }

    public Boolean getLlmAvailable() { return llmAvailable; }
    public void setLlmAvailable(Boolean llmAvailable) { this.llmAvailable = llmAvailable; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
