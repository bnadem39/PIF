package com.pif.gamification.service;

import com.pif.auth.model.User;
import com.pif.gamification.dto.CustomizationPermissionsResponseDto;
import com.pif.gamification.dto.FeaturePermissionDto;
import com.pif.gamification.model.CustomizationFeature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/**
 * Service gérant l'éligibilité et l'accès autoritaire aux fonctionnalités de personnalisation visuelle.
 * Les fonctionnalités (avatar, fond d'écran, effets avancés, cadres) sont verrouillées selon le niveau d'EXP du trader.
 */
@Service
public class CustomizationPermissionService {

    private static final Logger log = LoggerFactory.getLogger(CustomizationPermissionService.class);

    private final Map<CustomizationFeature, Integer> featureThresholds = new EnumMap<>(CustomizationFeature.class);

    public CustomizationPermissionService(
            @Value("${gamification.customization.level.avatar:3}") int avatarLevel,
            @Value("${gamification.customization.level.frame:5}") int frameLevel,
            @Value("${gamification.customization.level.background:10}") int backgroundLevel,
            @Value("${gamification.customization.level.effects:15}") int effectsLevel,
            @Value("${gamification.customization.level.premium:20}") int premiumLevel
    ) {
        featureThresholds.put(CustomizationFeature.DEFAULT_AVATAR, 1);
        featureThresholds.put(CustomizationFeature.CUSTOM_AVATAR, avatarLevel);
        featureThresholds.put(CustomizationFeature.BASIC_FRAME, frameLevel);
        featureThresholds.put(CustomizationFeature.CUSTOM_BACKGROUND, backgroundLevel);
        featureThresholds.put(CustomizationFeature.ADVANCED_BACKGROUND_EFFECTS, effectsLevel);
        featureThresholds.put(CustomizationFeature.PREMIUM_FRAMES, premiumLevel);

        log.info("[CUSTOMIZATION PERMISSIONS] Seuils de niveau initialisés : Avatar={}, Cadre={}, Fond={}, Effets={}, Premium={}",
                avatarLevel, frameLevel, backgroundLevel, effectsLevel, premiumLevel);
    }

    /**
     * Récupère le niveau minimum requis pour une fonctionnalité.
     */
    public int getRequiredLevel(CustomizationFeature feature) {
        return featureThresholds.getOrDefault(feature, feature.getDefaultRequiredLevel());
    }

    /**
     * Vérifie si le joueur connecté possède le niveau requis.
     */
    public boolean hasPermission(User user, CustomizationFeature feature) {
        if (user == null) return false;
        int userLevel = user.getLevel() != null ? user.getLevel() : 1;
        return userLevel >= getRequiredLevel(feature);
    }

    /**
     * Validation stricte avec rejet HTTP 403 Forbidden si le niveau est insuffisant.
     */
    public void checkPermission(User user, CustomizationFeature feature) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise pour cette personnalisation.");
        }
        int userLevel = user.getLevel() != null ? user.getLevel() : 1;
        int required = getRequiredLevel(feature);

        if (userLevel < required) {
            log.warn("[CUSTOMIZATION DENIED] Trader {} (Niveau {}) a tenté d'accéder à {} (Niveau requis : {})",
                    user.getUsernameAlias(), userLevel, feature.name(), required);
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    String.format("%s verrouillé : Niveau %d requis. (Votre niveau actuel : %d). Continuez votre progression en arène ou à l'Académie pour débloquer.",
                            feature.getDisplayName(), required, userLevel)
            );
        }
    }

    /**
     * Construit le rapport complet des permissions et pourcentages de déblocage pour le joueur.
     */
    public CustomizationPermissionsResponseDto getPermissionsForUser(User user) {
        int userLevel = (user != null && user.getLevel() != null) ? user.getLevel() : 1;
        int userExp = (user != null && user.getExp() != null) ? user.getExp() : 0;
        String tier = (user != null && user.getTier() != null) ? user.getTier() : "BRONZE";
        String username = user != null ? user.getUsernameAlias() : "Trader";
        Long userId = user != null ? user.getId() : null;

        List<FeaturePermissionDto> permissions = new ArrayList<>();
        Map<String, Boolean> unlockedMap = new HashMap<>();

        for (CustomizationFeature feature : CustomizationFeature.values()) {
            int required = getRequiredLevel(feature);
            boolean unlocked = userLevel >= required;
            int progress = Math.min(100, (int) Math.round(((double) userLevel / required) * 100));

            String hint;
            if (unlocked) {
                hint = "Fonctionnalité acquise et active.";
            } else {
                int levelsNeeded = required - userLevel;
                hint = String.format("Débloqué au niveau %d. Encore %d niveau%s pour débloquer.",
                        required, levelsNeeded, levelsNeeded > 1 ? "x" : "");
            }

            FeaturePermissionDto dto = new FeaturePermissionDto(
                    feature.getKey(),
                    feature.getDisplayName(),
                    feature.getDescription(),
                    required,
                    userLevel,
                    unlocked,
                    progress,
                    hint
            );
            permissions.add(dto);
            unlockedMap.put(feature.getKey(), unlocked);
        }

        return new CustomizationPermissionsResponseDto(
                userId,
                username,
                userLevel,
                userExp,
                tier,
                permissions,
                unlockedMap
        );
    }
}

