package com.pif.trading.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AiChatDto {

    public static class Request {
        private String question;
        private String ticker = "BIAT";
        private String domain = "market";
        
        @JsonProperty("simulation_date")
        private String simulationDate;
        
        @JsonProperty("bank_type")
        private String bankType = "conventional";

        public Request() {}
        public Request(String question, String ticker, String domain) {
            this.question = question;
            this.ticker = ticker;
            this.domain = domain;
        }

        public String getQuestion() { return question; }
        public void setQuestion(String question) { this.question = question; }

        public String getTicker() { return ticker; }
        public void setTicker(String ticker) { this.ticker = ticker; }

        public String getDomain() { return domain; }
        public void setDomain(String domain) { this.domain = domain; }

        public String getSimulationDate() { return simulationDate; }
        public void setSimulationDate(String simulationDate) { this.simulationDate = simulationDate; }

        public String getBankType() { return bankType; }
        public void setBankType(String bankType) { this.bankType = bankType; }
    }

    public static class Response {
        private String answer;
        private List<String> sources = new ArrayList<>();
        
        @JsonProperty("domain_used")
        private String domainUsed;
        
        @JsonProperty("latency_ms")
        private Double latencyMs;
        
        private String timestamp;

        public Response() {}
        public Response(String answer, List<String> sources, String domainUsed) {
            this.answer = answer;
            this.sources = sources;
            this.domainUsed = domainUsed;
        }

        public String getAnswer() { return answer; }
        public void setAnswer(String answer) { this.answer = answer; }

        public List<String> getSources() { return sources; }
        public void setSources(List<String> sources) { this.sources = sources; }

        public String getDomainUsed() { return domainUsed; }
        public void setDomainUsed(String domainUsed) { this.domainUsed = domainUsed; }

        public Double getLatencyMs() { return latencyMs; }
        public void setLatencyMs(Double latencyMs) { this.latencyMs = latencyMs; }

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
    }
}
