package com.pif.news;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class NewsDtos {

    private NewsDtos() {
    }

    public record NewsRequest(
            @NotBlank @Pattern(regexp = "\\d{4}-\\d{2}-\\d{2}", message = "Date attendue au format AAAA-MM-JJ") String publishedDate,
            @NotBlank @Size(max = 300) String title,
            @Size(max = 120) String source,
            @Size(max = 500) @Pattern(regexp = "^$|https?://.*", message = "Lien http(s) attendu") String url,
            @Size(max = 4000) String body,
            @Size(max = 20) List<@Pattern(regexp = "[A-Z0-9\\-]{1,12}") String> symbols) {
    }

    public record Term(String term, double polarity, boolean negated) {
    }

    public record NewsView(Long id, String publishedDate, String title, String source, String url, String body,
                           List<String> symbols, double sentimentScore, String sentimentLabel, List<Term> terms) {
    }

    public record SentimentPreview(double score, String label, List<Term> terms, String method) {
    }

    /** Sentiment agrégé : moyenne des articles de la fenêtre, pondérée par l'ancienneté (demi-vie de 7 jours). */
    public record AggregateSentiment(String symbol, String date, int windowDays, int articles, Double score, String label) {
    }

    public record AnalyzeRequest(@NotBlank @Size(max = 8000) String text) {
    }
}
