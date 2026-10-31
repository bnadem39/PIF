package com.pif.ai.insight;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.backtest.service.AiSignalClient;
import com.pif.backtest.service.Bar;
import com.pif.common.exception.AiServiceUnavailableException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThanOrEqualTo;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class MarketInsightControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private AiSignalClient aiSignalClient;

    /** Probabilités constantes (achat 0,7 ; vente 0,1) pour chaque séance transmise. */
    private static AiSignalClient.AiSignals constant(List<Bar> bars) {
        Map<String, double[]> byDate = new HashMap<>();
        bars.forEach(b -> byDate.put(b.date(), new double[]{0.7, 0.1}));
        return new AiSignalClient.AiSignals(byDate, "2020-06-19");
    }

    @Test
    @DisplayName("GET /api/v1/ai/signals - Sans JWT : 401")
    void shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/ai/signals").param("date", "2022-01-03").param("symbols", "BIAT"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("Signaux : cours de la dernière séance connue ; un historique refusé n'empêche pas les autres actifs")
    void shouldServeSignalsAtDate() throws Exception {
        when(aiSignalClient.fetch(eq("SFBT"), anyList())).thenThrow(new IllegalArgumentException("historique trop court"));
        when(aiSignalClient.fetch(eq("BIAT"), anyList())).thenAnswer(inv -> constant(inv.getArgument(1)));

        mockMvc.perform(get("/api/v1/ai/signals").param("date", "2022-01-03").param("symbols", "sfbt,BIAT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].symbol").value("SFBT"))
                .andExpect(jsonPath("$[0].pBuy").doesNotExist())
                .andExpect(jsonPath("$[0].signal").value(0))
                .andExpect(jsonPath("$[1].symbol").value("BIAT"))
                .andExpect(jsonPath("$[1].date").value(lessThanOrEqualTo("2022-01-03")))
                .andExpect(jsonPath("$[1].close").value(greaterThan(0.0)))
                .andExpect(jsonPath("$[1].pBuy").value(0.7))
                .andExpect(jsonPath("$[1].signal").value(1));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("Signaux : service IA arrêté = cours servis sans probabilités ; date invalide = 400")
    void shouldServePricesWithoutAi() throws Exception {
        when(aiSignalClient.fetch(eq("TLNET"), anyList())).thenThrow(new AiServiceUnavailableException("IA arrêtée.", null));
        mockMvc.perform(get("/api/v1/ai/signals").param("date", "2021-06-01").param("symbols", "TLNET"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].close").value(greaterThan(0.0)))
                .andExpect(jsonPath("$[0].pBuy").doesNotExist());
        mockMvc.perform(get("/api/v1/ai/signals").param("date", "03/01/2022").param("symbols", "BIAT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Optimiseur : au moins deux actifs, sinon 400 avant tout appel au service IA")
    void shouldValidateOptimizer() throws Exception {
        User trader = userRepository.save(new User("opt-" + UUID.randomUUID() + "@test.tn", "x", "Optimiseur",
                Role.ROLE_TRADER, new BigDecimal("100000.00")));
        mockMvc.perform(post("/api/v1/ai/optimize").with(user(trader)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"2022-01-03\",\"symbols\":[\"BIAT\"]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("deux actifs")));
        mockMvc.perform(post("/api/v1/ai/optimize").with(user(trader)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"2022-01-03\",\"symbols\":[\"BIAT\",\"SFBT\"],\"maxWeight\":2}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Vue d'ensemble du marché à une date : indice équipondéré et largeur du marché")
    void shouldBuildMarketOverview() throws Exception {
        mockMvc.perform(get("/api/market/indices").param("date", "2022-01-25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tiles[0].symbol").value("PIF-BVMT"))
                .andExpect(jsonPath("$.tiles[0].value").value(greaterThan(0.0)))
                .andExpect(jsonPath("$.breadth.advancers").isNumber());
    }
}
