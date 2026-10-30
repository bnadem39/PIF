package com.pif.market.bootstrap;

import com.pif.market.model.Role;
import com.pif.market.model.User;
import com.pif.market.repository.UserRepository;
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

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());

        User created = captor.getValue();
        assertEquals("admin@gmail.com", created.getEmail());
        assertEquals("bcryptHashedPassword", created.getPassword());
        assertEquals(Role.ROLE_ADMIN, created.getRole());
        assertEquals(0, new BigDecimal("100000.00").compareTo(created.getVirtualBalance()));
        assertEquals(new BigDecimal("100000.000"), created.getCashBalance());
    }

    @Test
    @DisplayName("Devrait ne rien faire si l'administrateur existe déjà")
    void shouldSkipSeedingWhenAdminAlreadyExists() {
        User existingAdmin = new User("admin@gmail.com", "hash", "Admin", Role.ROLE_ADMIN, new BigDecimal("100000.00"));
        when(userRepository.findByEmail("admin@gmail.com")).thenReturn(Optional.of(existingAdmin));

        adminInitializer.run();

        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    @DisplayName("Ne crée aucun admin si les variables d'environnement ne sont pas définies")
    void shouldSkipSeedingWhenNotConfigured() {
        ReflectionTestUtils.setField(adminInitializer, "adminEmail", "");
        ReflectionTestUtils.setField(adminInitializer, "adminPassword", "");

        adminInitializer.run();

        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("Ne crée aucun admin si le mot de passe fait moins de 12 caractères")
    void shouldSkipSeedingWhenPasswordTooShort() {
        ReflectionTestUtils.setField(adminInitializer, "adminPassword", "admin@26");

        adminInitializer.run();

        verifyNoInteractions(userRepository);
    }
}
