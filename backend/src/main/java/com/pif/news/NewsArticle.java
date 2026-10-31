package com.pif.news;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/** Actualité financière datée, notée par l'analyse de sentiment du service IA. */
@Entity
@Table(name = "news_articles")
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "published_date", nullable = false, length = 10)
    private String publishedDate;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 120)
    private String source;

    @Column(length = 500)
    private String url;

    @Column(length = 4000)
    private String body;

    /** Tickers concernés, séparés par des virgules ; vide = actualité de marché. */
    @Column(length = 300)
    private String symbols;

    @Column(name = "sentiment_score", nullable = false)
    private double sentimentScore;

    @Column(name = "sentiment_label", nullable = false, length = 10)
    private String sentimentLabel;

    @Column(name = "sentiment_terms", length = 1000)
    private String sentimentTerms;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getPublishedDate() { return publishedDate; }
    public void setPublishedDate(String publishedDate) { this.publishedDate = publishedDate; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getSymbols() { return symbols; }
    public void setSymbols(String symbols) { this.symbols = symbols; }
    public double getSentimentScore() { return sentimentScore; }
    public void setSentimentScore(double sentimentScore) { this.sentimentScore = sentimentScore; }
    public String getSentimentLabel() { return sentimentLabel; }
    public void setSentimentLabel(String sentimentLabel) { this.sentimentLabel = sentimentLabel; }
    public String getSentimentTerms() { return sentimentTerms; }
    public void setSentimentTerms(String sentimentTerms) { this.sentimentTerms = sentimentTerms; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
