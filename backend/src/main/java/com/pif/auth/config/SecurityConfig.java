package com.pif.auth.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pif.auth.security.JwtAuthenticationFilter;
import com.pif.auth.security.UserDetailsServiceImpl;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Configuration de sécurité principale Spring Security 6 (Spring Boot 3).
 * Architecture Stateless basée sur JWT, RBAC et politique CORS complète.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;
    private final ObjectMapper objectMapper;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter,
                          UserDetailsServiceImpl userDetailsService,
                          ObjectMapper objectMapper) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
        this.objectMapper = objectMapper;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. Désactivation CSRF (Architecture REST stateless avec JWT)
                .csrf(AbstractHttpConfigurer::disable)

                // 2. Configuration CORS complète
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 3. Gestion de session : STATELESS
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. Gestion des exceptions de sécurité (401 & 403 formattées en JSON)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(unauthorizedEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler())
                )

                // 5. Règles d'autorisation par URL
                .authorizeHttpRequests(auth -> auth
                        // Requêtes préalables CORS autorisées
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Endpoints publics d'authentification
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // Documentation Swagger / OpenAPI
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()

                        // Endpoints de supervision / erreurs
                        .requestMatchers("/error").permitAll()

                        // Endpoints d'administration sécurisés (rôle ADMIN strict)
                        .requestMatchers("/api/v1/admin/**", "/api/admin/**").hasRole("ADMIN")

                        // Endpoints v1 protégés : requièrent obligatoirement un token JWT
                        .requestMatchers("/api/v1/market/**").authenticated()
                        .requestMatchers("/api/v1/orders/**").authenticated()

                        // Endpoints de cotation et données publiques du simulateur de marché
                        .requestMatchers("/api/market/**").permitAll()

                        // IA : seul le health-check est public. Les appels au modèle et au LLM exigent un JWT
                        .requestMatchers(HttpMethod.GET, "/api/ai/health").permitAll()
                        .requestMatchers("/api/ai/**").authenticated()

                        // Toute autre requête nécessite d'être authentifié
                        .anyRequest().authenticated()
                )

                // 6. Enregistrement du fournisseur d'authentification
                .authenticationProvider(authenticationProvider())

                // 7. Injection du filtre JWT avant le filtre standard UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configuration globale et permissive pour les clients Frontend (React, Vite, Angular).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4200",
                "http://127.0.0.1:4200"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Réponse HTTP 401 Unauthorized formattée en JSON standardisé.
     */
    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            Map<String, Object> body = Map.of(
                    "status", HttpServletResponse.SC_UNAUTHORIZED,
                    "error", "Unauthorized",
                    "message", "Authentification requise : token JWT absent, invalide ou expiré.",
                    "path", request.getRequestURI()
            );
            objectMapper.writeValue(response.getOutputStream(), body);
        };
    }

    /**
     * Réponse HTTP 403 Forbidden formattée en JSON standardisé.
     */
    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            Map<String, Object> body = Map.of(
                    "status", HttpServletResponse.SC_FORBIDDEN,
                    "error", "Forbidden",
                    "message", "Privilèges insuffisants pour accéder à cette ressource (Rôle ADMIN requis).",
                    "path", request.getRequestURI()
            );
            objectMapper.writeValue(response.getOutputStream(), body);
        };
    }
}
