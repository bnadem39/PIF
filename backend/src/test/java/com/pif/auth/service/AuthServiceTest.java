package com.pif.auth.service;

import com.pif.auth.dto.AuthRequest;
import com.pif.auth.dto.AuthResponse;
import com.pif.auth.dto.RegisterRequest;
import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.auth.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User("trader@test.com", "encodedPassword", "Trader Pro", Role.ROLE_TRADER, new BigDecimal("100000.00"));
    }

    @Test
    @DisplayName("Devrait inscrire un nouveau trader avec rôle ROLE_TRADER et solde 100 000 TND")
    void shouldRegisterNewTraderSuccessfully() {
        RegisterRequest request = new RegisterRequest("newtrader@test.com", "secret123", "Nouveau Trader");

        when(userRepository.existsByEmail("newtrader@test.com")).thenReturn(false);
        when(passwordEncoder.encode("secret123")).thenReturn("encodedSecret");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(10L);
            return u;
        });
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token-12345");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt-token-12345", response.getToken());
        assertEquals("Bearer", response.getType());
        assertEquals("newtrader@test.com", response.getEmail());
        assertEquals(Role.ROLE_TRADER.name(), response.getRole());
        assertEquals(new BigDecimal("100000.00"), response.getVirtualBalance());

        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Devrait refuser l'inscription si l'email existe déjà")
    void shouldFailRegisterWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest("trader@test.com", "secret123", "Trader");
        when(userRepository.existsByEmail("trader@test.com")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        assertTrue(ex.getMessage().contains("existe déjà"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Devrait connecter un utilisateur existant avec succès")
    void shouldLoginSuccessfully() {
        AuthRequest request = new AuthRequest("trader@test.com", "password123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(userRepository.findByEmail("trader@test.com")).thenReturn(Optional.of(sampleUser));
        when(jwtService.generateToken(sampleUser)).thenReturn("jwt-login-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-login-token", response.getToken());
        assertEquals("trader@test.com", response.getEmail());
        assertEquals("ROLE_TRADER", response.getRole());
    }

    @Test
    @DisplayName("Devrait propager une exception si l'authentification échoue")
    void shouldThrowExceptionOnFailedLogin() {
        AuthRequest request = new AuthRequest("trader@test.com", "wrongPassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    @DisplayName("L'email est normalisé (minuscules, sans espaces) à l'inscription comme à la connexion")
    void shouldNormalizeEmailCase() {
        when(userRepository.existsByEmail("trader@test.com")).thenReturn(true);
        RegisterRequest dup = new RegisterRequest("  Trader@Test.COM ", "secret123", "Trader");
        assertThrows(IllegalArgumentException.class, () -> authService.register(dup));

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(null);
        when(userRepository.findByEmail("trader@test.com")).thenReturn(Optional.of(sampleUser));
        when(jwtService.generateToken(sampleUser)).thenReturn("jwt");

        AuthResponse response = authService.login(new AuthRequest("TRADER@test.com", "password123"));
        assertEquals("trader@test.com", response.getEmail());
    }
}
