package com.pif.market.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Service de gestion des JSON Web Tokens (JJWT 0.12.x).
 * Responsable de la génération, signature cryptographique, validation et extraction des claims.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    @Value("${application.security.jwt.secret:${JWT_SECRET:une_cle_secrete_tres_longue_et_securisee_d_au_moins_256_bits_ici}}")
    private String jwtSecret;

    @Value("${application.security.jwt.expiration-ms:${JWT_EXPIRATION_MS:86400000}}")
    private long jwtExpirationMs;

    /**
     * Extrait l'email (subject) contenu dans le token JWT.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extrait le rôle utilisateur présent dans les claims du token.
     */
    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    /**
     * Extrait une information spécifique (Claim) à l'aide d'une fonction de résolution.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Génère un token JWT signé pour un utilisateur authentifié.
     */
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> extraClaims = new HashMap<>();
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(GrantedAuthority::getAuthority)
                .orElse("ROLE_TRADER");
        extraClaims.put("role", role);
        extraClaims.put("email", userDetails.getUsername());
        return generateToken(extraClaims, userDetails);
    }

    /**
     * Génère un token JWT avec des claims personnalisés additionnels.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtExpirationMs))
                .signWith(getSigningKey(), Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Valide l'intégrité, l'authenticité et la non-expiration du token par rapport aux détails de l'utilisateur.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username != null && username.equalsIgnoreCase(userDetails.getUsername()) && !isTokenExpired(token));
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Token JWT invalide : {}", e.getMessage());
            return false;
        }
    }

    /**
     * Vérifie si le token a dépassé sa date d'expiration.
     */
    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Parse et valide cryptographiquement la signature du token (API moderne JJWT 0.12.x).
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Construit une SecretKey HMAC-SHA sécurisée (>= 256 bits) à partir de la clé configurée.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(jwtSecret);
            if (keyBytes.length < 32) {
                keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        }

        // Si la clé est inférieure à 256 bits (32 octets), hachage SHA-256 de sécurité
        if (keyBytes.length < 32) {
            try {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                keyBytes = md.digest(keyBytes);
            } catch (NoSuchAlgorithmException ignored) {
            }
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }
}
