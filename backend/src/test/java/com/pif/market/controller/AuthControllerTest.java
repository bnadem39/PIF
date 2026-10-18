package com.pif.market.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.market.dto.AuthRequest;
import com.pif.market.dto.AuthResponse;
import com.pif.market.dto.RegisterRequest;
import com.pif.market.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.trading.TradingSimulatorApplication.class)
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("POST /api/v1/auth/login - Devrait retourner 200 OK avec le JWT en cas d'identifiants valides")
    void shouldLoginSuccessfully() throws Exception {
        AuthRequest req = new AuthRequest("admin@gmail.com", "admin@26");
        AuthResponse res = AuthResponse.builder()
                .token("valid-jwt-token")
                .type("Bearer")
                .email("admin@gmail.com")
                .role("ROLE_ADMIN")
                .virtualBalance(new BigDecimal("100000.00"))
                .build();

        when(authService.login(any(AuthRequest.class))).thenReturn(res);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("valid-jwt-token"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.email").value("admin@gmail.com"))
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login - Devrait retourner 401 Unauthorized en cas de mauvais identifiants")
    void shouldReturn401OnBadCredentials() throws Exception {
        AuthRequest req = new AuthRequest("admin@gmail.com", "wrong-password");

        when(authService.login(any(AuthRequest.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register - Devrait créer un nouveau trader et retourner 201 Created")
    void shouldRegisterTraderSuccessfully() throws Exception {
        RegisterRequest req = new RegisterRequest("trader@domain.com", "password123", "Trader Name");
        AuthResponse res = AuthResponse.builder()
                .token("trader-jwt-token")
                .type("Bearer")
                .email("trader@domain.com")
                .role("ROLE_TRADER")
                .virtualBalance(new BigDecimal("100000.00"))
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(res);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("trader-jwt-token"))
                .andExpect(jsonPath("$.role").value("ROLE_TRADER"))
                .andExpect(jsonPath("$.email").value("trader@domain.com"));
    }

    @Test
    @DisplayName("GET /api/v1/market/symbols - Sans JWT, devrait être rejeté avec 401 Unauthorized")
    void shouldRejectUnauthenticatedRequestToMarketEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/market/symbols"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }
}
