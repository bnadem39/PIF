package com.pif.news;

import com.pif.auth.model.User;
import com.pif.news.NewsDtos.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Actualités et sentiment : lecture pour les utilisateurs authentifiés (/api/v1/news),
 * gestion réservée aux administrateurs (/api/v1/admin/news).
 */
@RestController
public class NewsController {

    private final NewsService service;

    public NewsController(NewsService service) {
        this.service = service;
    }

    /** Actualités publiées jusqu'à la date simulée, éventuellement filtrées sur un actif. */
    @GetMapping("/api/v1/news")
    public ResponseEntity<List<NewsView>> news(@RequestParam String date, @RequestParam(required = false) String symbol,
                                               @RequestParam(defaultValue = "20") int limit) {
        requireDate(date);
        return ResponseEntity.ok(service.visible(date, symbol, Math.max(1, Math.min(limit, 100))));
    }

    @GetMapping("/api/v1/news/sentiment")
    public ResponseEntity<AggregateSentiment> sentiment(@RequestParam String date, @RequestParam(required = false) String symbol) {
        requireDate(date);
        return ResponseEntity.ok(service.aggregate(date, symbol));
    }

    @GetMapping("/api/v1/admin/news")
    public ResponseEntity<List<NewsView>> all() {
        return ResponseEntity.ok(service.all());
    }

    /** Aperçu du sentiment d'un texte, sans l'enregistrer. */
    @PostMapping("/api/v1/admin/news/analyze")
    public ResponseEntity<SentimentPreview> analyze(@Valid @RequestBody AnalyzeRequest req) {
        return ResponseEntity.ok(service.analyze(req.text()));
    }

    @PostMapping("/api/v1/admin/news")
    public ResponseEntity<NewsView> create(@AuthenticationPrincipal User admin, @Valid @RequestBody NewsRequest req) {
        return ResponseEntity.ok(service.create(admin, req));
    }

    @PutMapping("/api/v1/admin/news/{id}")
    public ResponseEntity<NewsView> update(@AuthenticationPrincipal User admin, @PathVariable Long id,
                                           @Valid @RequestBody NewsRequest req) {
        return ResponseEntity.ok(service.update(admin, id, req));
    }

    @DeleteMapping("/api/v1/admin/news/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        service.delete(admin, id);
        return ResponseEntity.noContent().build();
    }

    private static void requireDate(String date) {
        if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) throw new IllegalArgumentException("Date attendue au format AAAA-MM-JJ.");
    }
}
