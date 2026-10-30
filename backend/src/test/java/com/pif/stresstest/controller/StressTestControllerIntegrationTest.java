package com.pif.stresstest.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.common.exception.AiServiceUnavailableException;
import com.pif.stresstest.service.StressTestAiClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class StressTestControllerIntegrationTest {

    private static final String SHOCKS = """
            {"rateShockBp":100,"equityDropPct":10,"unemploymentIncreasePp":1,"gdpGrowthPct":0,
             "defaultRateMultiplier":1.5,"assetQualityDowngrade":0,"revenueDropPct":5}""";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StressTestAiClient aiClient;

    @Test
    @DisplayName("GET /api/v1/stress-test/scenarios - Sans JWT : 401")
    void shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/stress-test/scenarios"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("GET /api/v1/stress-test/scenarios - Les 6 scénarios prédéfinis de la migration V3")
    void shouldListSeededPresets() throws Exception {
        mockMvc.perform(get("/api/v1/stress-test/scenarios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'COMBINED_SEVERE')].preset").value(true))
                .andExpect(jsonPath("$[?(@.code == 'RECESSION')].shocks.gdpGrowthPct").value(-4.0));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/stress-test/run - Sans scénario : 400")
    void shouldRequireAScenario() throws Exception {
        mockMvc.perform(post("/api/v1/stress-test/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/stress-test/run - Choc hors bornes : 400")
    void shouldValidateShockBounds() throws Exception {
        mockMvc.perform(post("/api/v1/stress-test/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customShocks\":" + SHOCKS.replace("\"rateShockBp\":100", "\"rateShockBp\":900") + "}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/stress-test/run - Résultat du service IA relayé")
    void shouldRelayAiResult() throws Exception {
        when(aiClient.post(eq("/run"), anyMap()))
                .thenReturn(objectMapper.readTree("{\"scenarios\":[{\"scenario\":{\"code\":\"CUSTOM\"}}]}"));
        mockMvc.perform(post("/api/v1/stress-test/run")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customShocks\":" + SHOCKS + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenarios[0].scenario.code").value("CUSTOM"));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("GET /api/v1/stress-test/banks - Service IA arrêté : 503")
    void shouldReturn503WhenAiDown() throws Exception {
        when(aiClient.get(any())).thenThrow(new AiServiceUnavailableException("IA indisponible", null));
        mockMvc.perform(get("/api/v1/stress-test/banks"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/admin/stress-test/scenarios - Rôle TRADER : 403")
    void shouldForbidTraderScenarioEdit() throws Exception {
        mockMvc.perform(post("/api/v1/admin/stress-test/scenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"X\",\"name\":\"X\",\"shocks\":" + SHOCKS + "}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Admin : création, doublon refusé, suppression d'un scénario")
    void shouldLetAdminManageScenarios() throws Exception {
        String body = "{\"code\":\"TEST_ADMIN\",\"name\":\"Test admin\",\"shocks\":" + SHOCKS + "}";
        String created = mockMvc.perform(post("/api/v1/admin/stress-test/scenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.preset").value(false))
                .andReturn().getResponse().getContentAsString();

        mockMvc.perform(post("/api/v1/admin/stress-test/scenarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        long id = objectMapper.readTree(created).get("id").asLong();
        mockMvc.perform(delete("/api/v1/admin/stress-test/scenarios/" + id))
                .andExpect(status().isNoContent());
    }
}
