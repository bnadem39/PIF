package com.pif.news;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.ai.config.AiServiceProperties;
import com.pif.audit.model.AuditAction;
import com.pif.audit.service.AuditService;
import com.pif.auth.model.User;
import com.pif.common.exception.AiServiceUnavailableException;
import com.pif.news.NewsDtos.*;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Actualités financières et sentiment (cahier §3.4.3), gérées par les administrateurs (§5).
 * Une actualité n'est visible dans la simulation qu'à partir de sa date de publication : pas de biais d'anticipation.
 */
@Service
public class NewsService {

    static final int WINDOW_DAYS = 30;
    static final double HALF_LIFE_DAYS = 7.0;
    static final double NEUTRAL_BAND = 0.15;

    private final NewsRepository repository;
    private final AuditService auditService;
    private final AiServiceProperties properties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public NewsService(NewsRepository repository, AuditService auditService, AiServiceProperties properties,
                       RestTemplateBuilder builder, ObjectMapper objectMapper) {
        this.repository = repository;
        this.auditService = auditService;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.restTemplate = builder.setConnectTimeout(Duration.ofSeconds(3)).setReadTimeout(Duration.ofSeconds(15)).build();
    }

    // ── Lecture (utilisateurs) ─────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NewsView> visible(String date, String symbol, int limit) {
        return repository.findByPublishedDateLessThanEqualOrderByPublishedDateDescIdDesc(date, PageRequest.of(0, 200)).stream()
                .filter(a -> symbol == null || symbol.isBlank() || concerns(a, symbol))
                .limit(limit)
                .map(this::view)
                .toList();
    }

    /** Sentiment des articles publiés dans les 30 jours précédant la date, sur l'actif ou sur tout le marché. */
    @Transactional(readOnly = true)
    public AggregateSentiment aggregate(String date, String symbol) {
        LocalDate d = LocalDate.parse(date);
        List<NewsArticle> window = repository.findByPublishedDateBetweenOrderByPublishedDateDesc(
                d.minusDays(WINDOW_DAYS).toString(), date);
        double weighted = 0, weights = 0;
        int n = 0;
        for (NewsArticle a : window) {
            if (symbol != null && !symbol.isBlank() && !concerns(a, symbol)) continue;
            long age = ChronoUnit.DAYS.between(LocalDate.parse(a.getPublishedDate()), d);
            double w = Math.pow(0.5, age / HALF_LIFE_DAYS);
            weighted += w * a.getSentimentScore();
            weights += w;
            n++;
        }
        Double score = n == 0 ? null : Math.round(weighted / weights * 1000) / 1000.0;
        return new AggregateSentiment(symbol, date, WINDOW_DAYS, n, score, score == null ? null : label(score));
    }

    /** Une actualité sans ticker concerne tout le marché ; sinon, seulement les actifs cités. */
    static boolean concerns(NewsArticle a, String symbol) {
        if (a.getSymbols() == null || a.getSymbols().isBlank()) return true;
        return Arrays.stream(a.getSymbols().split(",")).anyMatch(s -> s.trim().equalsIgnoreCase(symbol));
    }

    static String label(double score) {
        return score > NEUTRAL_BAND ? "POSITIVE" : score < -NEUTRAL_BAND ? "NEGATIVE" : "NEUTRAL";
    }

    // ── Administration ─────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NewsView> all() {
        return repository.findAllByOrderByPublishedDateDescIdDesc().stream().map(this::view).toList();
    }

    public SentimentPreview analyze(String text) {
        JsonNode r = callSentiment(text);
        return new SentimentPreview(r.path("score").asDouble(), r.path("label").asText(), terms(r.path("terms")),
                r.path("method").asText());
    }

    @Transactional
    public NewsView create(User admin, NewsRequest req) {
        NewsArticle a = new NewsArticle();
        a.setCreatedBy(admin.getId());
        apply(a, req);
        NewsArticle saved = repository.save(a);
        auditService.record(admin, AuditAction.NEWS_CHANGED, true, "Ajout : " + a.getPublishedDate() + " " + a.getTitle());
        return view(saved);
    }

    @Transactional
    public NewsView update(User admin, Long id, NewsRequest req) {
        NewsArticle a = repository.findById(id).orElseThrow(() -> new NoSuchElementException("Actualité introuvable : " + id));
        apply(a, req);
        auditService.record(admin, AuditAction.NEWS_CHANGED, true, "Modification : " + a.getPublishedDate() + " " + a.getTitle());
        return view(repository.save(a));
    }

    @Transactional
    public void delete(User admin, Long id) {
        NewsArticle a = repository.findById(id).orElseThrow(() -> new NoSuchElementException("Actualité introuvable : " + id));
        repository.delete(a);
        auditService.record(admin, AuditAction.NEWS_CHANGED, true, "Suppression : " + a.getPublishedDate() + " " + a.getTitle());
    }

    private void apply(NewsArticle a, NewsRequest req) {
        a.setPublishedDate(req.publishedDate());
        a.setTitle(req.title().trim());
        a.setSource(blankToNull(req.source()));
        a.setUrl(blankToNull(req.url()));
        a.setBody(blankToNull(req.body()));
        a.setSymbols(req.symbols() == null ? null : String.join(",", req.symbols()));
        JsonNode r = callSentiment(req.title() + ". " + (req.body() != null ? req.body() : ""));
        a.setSentimentScore(r.path("score").asDouble());
        a.setSentimentLabel(r.path("label").asText("NEUTRAL"));
        try {
            String json = objectMapper.writeValueAsString(terms(r.path("terms")));
            a.setSentimentTerms(json.length() > 1000 ? json.substring(0, 1000) : json);
        } catch (JsonProcessingException e) {
            a.setSentimentTerms(null);
        }
    }

    private JsonNode callSentiment(String text) {
        try {
            JsonNode r = restTemplate.postForObject(properties.getBaseUrl() + "/api/ai/sentiment", Map.of("text", text), JsonNode.class);
            if (r == null) throw new RestClientException("Réponse vide");
            return r;
        } catch (RestClientException e) {
            throw new AiServiceUnavailableException("Service IA indisponible pour l'analyse de sentiment (" + properties.getBaseUrl() + ").", e);
        }
    }

    private static List<Term> terms(JsonNode node) {
        List<Term> out = new ArrayList<>();
        for (JsonNode t : node) out.add(new Term(t.path("term").asText(), t.path("polarity").asDouble(), t.path("negated").asBoolean()));
        return out;
    }

    private NewsView view(NewsArticle a) {
        List<Term> terms = List.of();
        if (a.getSentimentTerms() != null) {
            try {
                terms = objectMapper.readValue(a.getSentimentTerms(), new TypeReference<List<Term>>() { });
            } catch (JsonProcessingException ignored) {
                // termes tronqués : l'article reste affiché sans le détail
            }
        }
        List<String> symbols = a.getSymbols() == null || a.getSymbols().isBlank() ? List.of() : List.of(a.getSymbols().split(","));
        return new NewsView(a.getId(), a.getPublishedDate(), a.getTitle(), a.getSource(), a.getUrl(), a.getBody(), symbols,
                a.getSentimentScore(), a.getSentimentLabel(), terms);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
