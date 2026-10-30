package com.pif.auth.security;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "jwtSecret", "une_cle_secrete_tres_longue_et_securisee_d_au_moins_256_bits_ici");
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMs", 3600000L); // 1 hour
    }

    @Test
    @DisplayName("Devrait générer un token JWT valide et extraire le username et le rôle")
    void shouldGenerateAndExtractTokenClaims() {
        User user = new User("trader@test.com", "password123", "Trader Test", Role.ROLE_TRADER, new BigDecimal("100000.00"));

        String token = jwtService.generateToken(user);
        assertNotNull(token);
        assertFalse(token.isBlank());

        String username = jwtService.extractUsername(token);
        assertEquals("trader@test.com", username);

        String role = jwtService.extractRole(token);
        assertEquals("ROLE_TRADER", role);

        assertTrue(jwtService.isTokenValid(token, user));
        assertFalse(jwtService.isTokenExpired(token));
    }

    @Test
    @DisplayName("Devrait rejeter un token pour un autre utilisateur")
    void shouldRejectTokenForDifferentUser() {
        User user1 = new User("user1@test.com", "pwd", "User 1", Role.ROLE_TRADER, new BigDecimal("100000.00"));
        User user2 = new User("user2@test.com", "pwd", "User 2", Role.ROLE_TRADER, new BigDecimal("100000.00"));

        String token = jwtService.generateToken(user1);

        assertFalse(jwtService.isTokenValid(token, user2));
    }
}
