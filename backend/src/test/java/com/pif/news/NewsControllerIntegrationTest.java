package com.pif.news;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class NewsControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NewsRepository repository;

    @Autowired
    private UserRepository userRepository;

    private User trader;
    private String symbol;

    private void article(String date, String title, String symbols, double score, String label) {
        NewsArticle a = new NewsArticle();
        a.setPublishedDate(date);
        a.setTitle(title);
        a.setSymbols(symbols);
        a.setSentimentScore(score);
        a.setSentimentLabel(label);
        repository.save(a);
    }

    @BeforeEach
    void seed() {
        trader = userRepository.save(new User("news-" + UUID.randomUUID() + "@test.tn", "x", "Lecteur", Role.ROLE_TRADER,
                new BigDecimal("100000.00")));
        // Ticker propre au test : les autres tests de la classe partagent la base
        symbol = "T" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        article("2021-03-01", "Bonne nouvelle", symbol, 0.8, "POSITIVE");
        article("2021-03-10", "Mauvaise nouvelle", symbol, -0.6, "NEGATIVE");
        article("2021-03-05", "Autre actif", "ZZZOTHER", -1.0, "NEGATIVE");
    }

    @Test
    @DisplayName("Actualités : seules celles publiées à la date simulée sont visibles (aucune information future)")
    void shouldHideFutureNews() throws Exception {
        mockMvc.perform(get("/api/v1/news").param("date", "2021-02-28").param("symbol", symbol).with(user(trader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.symbols[0] == '" + symbol + "')]").isEmpty());
        mockMvc.perform(get("/api/v1/news").param("date", "2021-03-05").param("symbol", symbol).with(user(trader)))
                .andExpect(jsonPath("$[?(@.symbols[0] == '" + symbol + "')].title").value("Bonne nouvelle"));
        mockMvc.perform(get("/api/v1/news").param("date", "2021-03-12").param("symbol", symbol).with(user(trader)))
                .andExpect(jsonPath("$[?(@.symbols[0] == '" + symbol + "')]", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[?(@.symbols[0] == 'ZZZOTHER')]").isEmpty());
    }

    @Test
    @DisplayName("Sentiment agrégé : pondéré par l'ancienneté, fenêtre de 30 jours")
    void shouldAggregateSentiment() throws Exception {
        // Le 2021-03-10 : poids 0,5^(9/7) ≈ 0,41 pour l'article positif, 1 pour le négatif -> score < 0
        mockMvc.perform(get("/api/v1/news/sentiment").param("date", "2021-03-10").param("symbol", symbol).with(user(trader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.articles").value(2))
                .andExpect(jsonPath("$.score").value(org.hamcrest.Matchers.closeTo(-0.19, 0.02)))
                .andExpect(jsonPath("$.label").value("NEGATIVE"));
        mockMvc.perform(get("/api/v1/news/sentiment").param("date", "2021-05-01").param("symbol", symbol).with(user(trader)))
                .andExpect(jsonPath("$.articles").value(0))
                .andExpect(jsonPath("$.score").doesNotExist());
    }

    @Test
    @DisplayName("Gestion des actualités : réservée aux administrateurs")
    void shouldRestrictManagement() throws Exception {
        mockMvc.perform(get("/api/v1/admin/news").with(user(trader))).andExpect(status().isForbidden());
    }
}
