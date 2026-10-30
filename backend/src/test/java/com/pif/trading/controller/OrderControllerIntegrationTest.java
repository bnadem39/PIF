package com.pif.trading.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.trading.dto.OrderRequest;
import com.pif.trading.model.OrderType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class OrderControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("GET /api/v1/orders/portfolio - Sans JWT, doit être rejeté avec 401 Unauthorized")
    void shouldRejectUnauthenticatedPortfolioAccess() throws Exception {
        mockMvc.perform(get("/api/v1/orders/portfolio"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("POST /api/v1/orders/execute - Sans JWT, doit être rejeté avec 401 Unauthorized")
    void shouldRejectUnauthenticatedOrderExecution() throws Exception {
        OrderRequest req = new OrderRequest("BIAT", OrderType.BUY, 10, new BigDecimal("95.000"), "2022-04-15");

        mockMvc.perform(post("/api/v1/orders/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("POST /api/ai/chat/ask - Sans JWT, doit être rejeté avec 401 (endpoints IA protégés)")
    void shouldRejectUnauthenticatedAiCall() throws Exception {
        mockMvc.perform(post("/api/ai/chat/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"question\":\"test\"}"))
                .andExpect(status().isUnauthorized());
    }
}
