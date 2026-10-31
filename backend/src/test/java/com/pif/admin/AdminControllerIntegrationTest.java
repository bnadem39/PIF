package com.pif.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = com.pif.PifApplication.class)
@AutoConfigureMockMvc
class AdminControllerIntegrationTest {

    private static final String PASSWORD = "Trader-Test-2026!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User admin;
    private User trader;

    @BeforeEach
    void createUsers() {
        String id = UUID.randomUUID().toString();
        admin = userRepository.save(new User("adm-" + id + "@test.tn", "x", "Admin Test", Role.ROLE_ADMIN, new BigDecimal("100000.00")));
        trader = userRepository.save(new User("trd-" + id + "@test.tn", passwordEncoder.encode(PASSWORD), "Trader Test",
                Role.ROLE_TRADER, new BigDecimal("100000.00")));
    }

    private String login(String email) throws Exception {
        String body = objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", PASSWORD));
        String json = mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json).get("token").asText();
    }

    @Test
    @DisplayName("Administration : réservée au rôle ADMIN (trader 403, sans JWT 401)")
    void shouldRestrictToAdmins() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/stats").with(user(trader))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/stats").with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activity30d.length()").value(30));
        mockMvc.perform(get("/api/v1/admin/users").param("search", trader.getEmail()).with(user(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value(trader.getEmail()))
                .andExpect(jsonPath("$[0].enabled").value(true));
    }

    @Test
    @DisplayName("Compte désactivé : connexion refusée (403) et jeton déjà émis invalidé")
    void shouldDisableAccount() throws Exception {
        String token = login(trader.getEmail());
        mockMvc.perform(get("/api/v1/learning/catalog").header("Authorization", "Bearer " + token)).andExpect(status().isOk());

        mockMvc.perform(patch("/api/v1/admin/users/{id}", trader.getId()).with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));
        assertThat(userRepository.findById(trader.getId()).orElseThrow().isEnabled()).isFalse();

        mockMvc.perform(get("/api/v1/learning/catalog").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        String body = objectMapper.writeValueAsString(java.util.Map.of("email", trader.getEmail(), "password", PASSWORD));
        mockMvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un administrateur ne peut ni se désactiver ni retirer son propre rôle")
    void shouldProtectOwnAccount() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/users/{id}", admin.getId()).with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/v1/admin/users/{id}", admin.getId()).with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ROLE_TRADER\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/v1/admin/users/{id}", trader.getId()).with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ROLE_ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }
}
