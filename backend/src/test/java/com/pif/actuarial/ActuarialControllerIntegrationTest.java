package com.pif.actuarial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.actuarial.service.ActuarialAiClient;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class ActuarialControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ActuarialAiClient client;

    @Test
    @DisplayName("GET /api/v1/actuarial/models - Sans JWT : 401")
    void shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/actuarial/models")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/actuarial/quote - Réponse du service IA relayée")
    void shouldRelayQuote() throws Exception {
        when(client.post(eq("/quote"), any())).thenReturn(objectMapper.readTree("{\"commercial_premium\": 1910.1}"));
        mockMvc.perform(post("/api/v1/actuarial/quote").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"profile\":{\"driver_age\":22}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commercial_premium").value(1910.1));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/actuarial/reserving - Triangle refusé : 400 avec le message du service IA")
    void shouldTurnAiValidationErrorInto400() throws Exception {
        when(client.post(eq("/reserving"), any())).thenThrow(new IllegalArgumentException("La ligne 2 doit contenir 2 valeurs."));
        mockMvc.perform(post("/api/v1/actuarial/reserving").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"triangle\":[[1,2,3],[4],[5]]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La ligne 2 doit contenir 2 valeurs."));
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("GET /api/v1/actuarial/portfolio - Service IA arrêté : 503")
    void shouldReturn503WhenAiDown() throws Exception {
        when(client.get(any())).thenThrow(new AiServiceUnavailableException("IA indisponible", null));
        mockMvc.perform(get("/api/v1/actuarial/portfolio")).andExpect(status().isServiceUnavailable());
    }
}
