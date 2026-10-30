package com.pif.backtest.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.backtest.service.AiSignalClient;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class BacktestControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AiSignalClient aiSignalClient;

    @Test
    @DisplayName("POST /api/v1/backtest/run - Sans JWT : 401")
    void shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/backtest/run").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("GET /api/v1/backtest/strategies - Catalogue avec paramètres par défaut")
    void shouldListStrategies() throws Exception {
        mockMvc.perform(get("/api/v1/backtest/strategies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'SMA_CROSSOVER')].params[0].defaultValue").value(20.0));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/backtest/run - Compare plusieurs stratégies sur BIAT ; IA indisponible = avertissement")
    void shouldCompareStrategiesOnRealHistory() throws Exception {
        when(aiSignalClient.fetch(any(), anyList())).thenThrow(new AiServiceUnavailableException("IA arrêtée.", null));
        String body = """
                {"symbol":"biat","startDate":"2019-01-01","endDate":"2022-12-31",
                 "strategies":[{"type":"BUY_AND_HOLD"},{"type":"SMA_CROSSOVER","params":{"fast":20,"slow":100}},
                               {"type":"RSI_REVERSION"},{"type":"AI_SIGNAL"}]}""";
        String json = mockMvc.perform(post("/api/v1/backtest/run").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.symbol").value("BIAT"))
                .andExpect(jsonPath("$.results.length()").value(3))
                .andExpect(jsonPath("$.results[1].label").value("SMA 20/100"))
                .andExpect(jsonPath("$.warnings[0]").value(org.hamcrest.Matchers.containsString("IA arrêtée")))
                .andReturn().getResponse().getContentAsString();

        JsonNode res = objectMapper.readTree(json);
        assertThat(res.get("startDate").asText()).isGreaterThanOrEqualTo("2019-01-01");
        for (JsonNode r : res.get("results")) {
            JsonNode eq = r.get("equity");
            assertThat(eq.size()).isEqualTo(res.get("tradingDays").asInt());
            assertThat(r.get("metrics").get("maxDrawdown").asDouble()).isBetween(-1.0, 0.0);
        }
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/backtest/run - Paramètre hors bornes ou symbole inconnu : 400")
    void shouldRejectInvalidRequests() throws Exception {
        mockMvc.perform(post("/api/v1/backtest/run").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"BIAT\",\"strategies\":[{\"type\":\"RSI_REVERSION\",\"params\":{\"lower\":80}}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        mockMvc.perform(post("/api/v1/backtest/run").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"NOPE\",\"strategies\":[{\"type\":\"BUY_AND_HOLD\"}]}"))
                .andExpect(status().isBadRequest());
    }
}
