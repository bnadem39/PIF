package com.pif.actuarial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.actuarial.service.ActuarialAiClient;
import com.pif.common.exception.AiServiceUnavailableException;
import com.pif.marketdata.dto.CandleDto;
import com.pif.marketdata.service.LocalCsvMarketDataService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class ActuarialControllerIntegrationTest {

    private static final String URL = "/api/v1/actuarial/analyze";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ActuarialAiClient aiClient;

    @MockBean
    private LocalCsvMarketDataService marketData;

    private static List<CandleDto> candles(int n) {
        List<CandleDto> list = new ArrayList<>();
        LocalDate d = LocalDate.of(2024, 1, 1);
        for (int i = 0; i < n; i++) {
            double close = 100 + i * 0.1;
            list.add(new CandleDto(d.plusDays(i).toString(), close, close, close, close, 1000));
        }
        return list;
    }

    @Test
    @DisplayName("POST /api/v1/actuarial/analyze - Sans JWT : 401")
    void shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{\"symbol\":\"BIAT\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/actuarial/analyze - Paramètres hors bornes : 400")
    void shouldValidateBounds() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"BIAT\",\"confidence\":0.5}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"BIAT\",\"simulations\":10}"))
                .andExpect(status().isBadRequest());
        verify(aiClient, never()).analyze(any());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/actuarial/analyze - Historique trop court : 400, le service IA n'est pas appelé")
    void shouldRejectShortHistory() throws Exception {
        when(marketData.getCandles(eq("BIAT"), eq("1d"), eq("ALL"), anyInt())).thenReturn(candles(30));
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{\"symbol\":\"biat\"}"))
                .andExpect(status().isBadRequest());
        verify(aiClient, never()).analyze(any());
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/actuarial/analyze - Envoie les clôtures au service IA et renvoie sa réponse")
    void shouldForwardClosesToAiService() throws Exception {
        when(marketData.getCandles(eq("BIAT"), eq("1d"), eq("ALL"), anyInt())).thenReturn(candles(120));
        when(aiClient.analyze(any())).thenReturn(objectMapper.readTree("{\"symbol\":\"BIAT\",\"risk\":{\"var_historical_1d\":0.02}}"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"symbol\":\"biat\",\"confidence\":0.99,\"startDate\":\"2024-01-11\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.risk.var_historical_1d").value(0.02));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiClient).analyze(captor.capture());
        Map<String, Object> body = captor.getValue();
        assertEquals("BIAT", body.get("symbol"));
        assertEquals(0.99, body.get("confidence"));
        assertEquals(110, ((List<?>) body.get("closes")).size());      // filtré à partir du 2024-01-11
        assertEquals("2024-01-11", ((List<?>) body.get("dates")).get(0));
        assertFalse(body.containsKey("simulations"));                  // valeur par défaut laissée au service IA
    }

    @Test
    @WithMockUser(roles = "TRADER")
    @DisplayName("POST /api/v1/actuarial/analyze - Service IA arrêté : 503")
    void shouldReturn503WhenAiDown() throws Exception {
        when(marketData.getCandles(anyString(), anyString(), anyString(), anyInt())).thenReturn(candles(120));
        when(aiClient.analyze(any())).thenThrow(new AiServiceUnavailableException("down", new RuntimeException()));
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{\"symbol\":\"BIAT\"}"))
                .andExpect(status().isServiceUnavailable());
    }
}
