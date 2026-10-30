package com.pif.learning.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.learning.catalog.LearningCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class LearningControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LearningCatalog catalog;

    private User trader;

    @BeforeEach
    void createUser() {
        String email = "learner-" + UUID.randomUUID() + "@test.tn";
        trader = userRepository.save(new User(email, "x", "Apprenant Test", Role.ROLE_TRADER, new BigDecimal("100000.00")));
    }

    private JsonNode json(org.springframework.test.web.servlet.ResultActions r) throws Exception {
        return objectMapper.readTree(r.andReturn().getResponse().getContentAsString());
    }

    @Test
    @DisplayName("GET /api/v1/learning/catalog - Sans JWT : 401")
    void shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/learning/catalog")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Leçon terminée : 10 points, une seule fois ; leçon inconnue : 404")
    void shouldCompleteLessonOnce() throws Exception {
        String lessonId = catalog.catalog().modules().get(0).lessons().get(0).id();
        mockMvc.perform(post("/api/v1/learning/lessons/{id}/complete", lessonId).with(user(trader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points").value(10))
                .andExpect(jsonPath("$.badges[?(@.id == 'premiers-pas')].earned").value(true));
        mockMvc.perform(post("/api/v1/learning/lessons/{id}/complete", lessonId).with(user(trader)))
                .andExpect(jsonPath("$.points").value(10));
        mockMvc.perform(get("/api/v1/learning/lessons/inconnue").with(user(trader)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Quiz : les réponses ne sont pas envoyées, la correction garde le meilleur score")
    void shouldGradeQuizOnServer() throws Exception {
        LearningCatalog.Quiz quiz = catalog.catalog().modules().get(0).quiz();
        String view = mockMvc.perform(get("/api/v1/learning/quizzes/{id}", quiz.id()).with(user(trader)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(view).doesNotContain("\"answer\"").doesNotContain("explanation");

        Map<String, Integer> perfect = new LinkedHashMap<>();
        quiz.questions().forEach(q -> perfect.put(q.id(), q.answer()));
        mockMvc.perform(post("/api/v1/learning/quizzes/{id}/submit", quiz.id()).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(Map.of("answers", perfect))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(1.0))
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.points").value(50));

        // Un second essai raté ne fait pas perdre de points
        mockMvc.perform(post("/api/v1/learning/quizzes/{id}/submit", quiz.id()).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"answers\":{}}"))
                .andExpect(jsonPath("$.score").value(0.0))
                .andExpect(jsonPath("$.points").value(0))
                .andExpect(jsonPath("$.bestScore").value(1.0));
        mockMvc.perform(get("/api/v1/learning/progress").with(user(trader)))
                .andExpect(jsonPath("$.points").value(50))
                .andExpect(jsonPath("$.badges[?(@.id == 'sans-faute')].earned").value(true));
    }

    @Test
    @DisplayName("Scénario : historique jusqu'à la date de décision, suite révélée après une réponse unique")
    void shouldRevealScenarioOnlyAfterAnswer() throws Exception {
        String id = "sc-biat-covid";
        JsonNode before = json(mockMvc.perform(get("/api/v1/learning/scenarios/{id}", id).with(user(trader)))
                .andExpect(status().isOk()));
        String decisionDate = before.get("decisionDate").asText();
        JsonNode history = before.get("history");
        assertThat(history.get(history.size() - 1).get("date").asText()).isEqualTo(decisionDate);
        assertThat(before.get("outcome").isNull()).isTrue();

        JsonNode after = json(mockMvc.perform(post("/api/v1/learning/scenarios/{id}/answer", id).with(user(trader))
                .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"ACHETER\"}")).andExpect(status().isOk()));
        JsonNode outcome = after.get("outcome");
        assertThat(outcome.get("decision").asText()).isEqualTo("ACHETER");
        assertThat(outcome.get("after").get(0).get("date").asText()).isGreaterThan(decisionDate);
        int points = outcome.get("points").asInt();

        // Une seconde réponse ne change rien
        mockMvc.perform(post("/api/v1/learning/scenarios/{id}/answer", id).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"VENDRE\"}"))
                .andExpect(jsonPath("$.outcome.decision").value("ACHETER"))
                .andExpect(jsonPath("$.outcome.points").value(points));
        mockMvc.perform(post("/api/v1/learning/scenarios/{id}/answer", id).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"decision\":\"PARIER\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Défi : noté par le backtest, points accordés une fois, achat-conservation refusé")
    void shouldGradeChallengeWithBacktest() throws Exception {
        String id = "ch-bear-sfbt";
        String rsi = "{\"strategy\":{\"type\":\"RSI_REVERSION\",\"params\":{\"period\":14,\"lower\":40,\"upper\":60}}}";
        mockMvc.perform(post("/api/v1/learning/challenges/{id}/submit", id).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content(rsi))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.pointsEarned").value(100));
        mockMvc.perform(post("/api/v1/learning/challenges/{id}/submit", id).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content(rsi))
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.pointsEarned").value(0));

        String smaFast = "{\"strategy\":{\"type\":\"SMA_CROSSOVER\",\"params\":{\"fast\":5,\"slow\":20}}}";
        mockMvc.perform(post("/api/v1/learning/challenges/{id}/submit", id).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content(smaFast))
                .andExpect(jsonPath("$.passed").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("achat-conservation")));

        mockMvc.perform(post("/api/v1/learning/challenges/{id}/submit", id).with(user(trader))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"strategy\":{\"type\":\"BUY_AND_HOLD\"}}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/v1/learning/leaderboard").with(user(trader)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.me == true)].points").value(100));
    }
}
