package com.pif.auth.bootstrap;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminInitializerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminInitializer adminInitializer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(adminInitializer, "adminEmail", "admin@gmail.com");
        ReflectionTestUtils.setField(adminInitializer, "adminPassword", "Str0ng-Admin-Pass!");
    }

    @Test
    @DisplayName("Devrait créer le compte admin avec mot de passe hashé et solde 100 000 TND si inexistant")
    void shouldSeedAdminWhenNotPresent() {
        when(userRepository.findByEmail("admin@gmail.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Str0ng-Admin-Pass!")).thenReturn("bcryptHashedPassword");

        adminInitializer.run();

        // Deux sauvegardes : le compte admin puis le compte de test adem
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(2)).save(captor.capture());

        User created = captor.getAllValues().stream()
                .filter(u -> "admin@gmail.com".equals(u.getEmail()))
                .findFirst()
                .orElseThrow();
        assertEquals("bcryptHashedPassword", created.getPassword());
        assertEquals(Role.ROLE_ADMIN, created.getRole());
        assertEquals(0, new BigDecimal("100000.00").compareTo(created.getVirtualBalance()));
        assertEquals(0, new BigDecimal("100000.000").compareTo(created.getCashBalance()));
    }

    @Test
    @DisplayName("Ne ré-encode pas le mot de passe d'un administrateur existant")
    void shouldKeepExistingAdminPassword() {
        User existingAdmin = new User("admin@gmail.com", "hash", "Admin", Role.ROLE_ADMIN, new BigDecimal("100000.00"));
        when(userRepository.findByEmail("admin@gmail.com")).thenReturn(Optional.of(existingAdmin));

        adminInitializer.run();

        verify(passwordEncoder, never()).encode("Str0ng-Admin-Pass!");
        assertEquals("hash", existingAdmin.getPassword());
        assertEquals(Role.ROLE_ADMIN, existingAdmin.getRole());
    }

    @Test
    @DisplayName("Utilise l'admin par défaut si les variables d'environnement ne sont pas définies")
    void shouldFallbackToDefaultAdminWhenNotConfigured() {
        ReflectionTestUtils.setField(adminInitializer, "adminEmail", "");
        ReflectionTestUtils.setField(adminInitializer, "adminPassword", "");

        adminInitializer.run();

        verify(passwordEncoder).encode("Admin2026!Secure");
        verify(userRepository, atLeastOnce()).findByEmail("admin@gmail.com");
    }

    @Test
    @DisplayName("Ignore un mot de passe de moins de 12 caractères et utilise le mot de passe par défaut")
    void shouldIgnoreTooShortAdminPassword() {
        ReflectionTestUtils.setField(adminInitializer, "adminPassword", "admin@26");

        adminInitializer.run();

        verify(passwordEncoder, never()).encode("admin@26");
        verify(passwordEncoder).encode("Admin2026!Secure");
    }
}
