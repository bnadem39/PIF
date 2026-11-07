package com.pif.gamification.model;

/**
 * Fonctionnalités de personnalisation visuelle indexées sur le niveau d'EXP du trader.
 */
public enum CustomizationFeature {
    DEFAULT_AVATAR("DEFAULT_AVATAR", "Avatar par Défaut", "Utilisation des initiales et avatars prédéfinis du système.", 1),
    CUSTOM_AVATAR("CUSTOM_AVATAR", "Photo de Profil Personnalisée", "Téléversement d'une photo de profil personnalisée (JPG, PNG, WebP).", 3),
    BASIC_FRAME("BASIC_FRAME", "Cadre Évolutif de Profil", "Bordure de rang et cadre dynamique évoluant avec le niveau.", 5),
    CUSTOM_BACKGROUND("CUSTOM_BACKGROUND", "Fond d'Écran Personnalisé & GIF", "Téléversement d'un fond d'écran ou GIF animé pour le Lobby personnel.", 10),
    ADVANCED_BACKGROUND_EFFECTS("ADVANCED_BACKGROUND_EFFECTS", "Effets Visuels Avancés", "Réglage de l'obscurité, flou artistique et positionnement du fond.", 15),
    PREMIUM_FRAMES("PREMIUM_FRAMES", "Cadres d'Élite & Diamant", "Cadres de prestige animés réservés aux maîtres de l'arène.", 20);

    private final String key;
    private final String displayName;
    private final String description;
    private final int defaultRequiredLevel;

    CustomizationFeature(String key, String displayName, String description, int defaultRequiredLevel) {
        this.key = key;
        this.displayName = displayName;
        this.description = description;
        this.defaultRequiredLevel = defaultRequiredLevel;
    }

    public String getKey() {
        return key;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public int getDefaultRequiredLevel() {
        return defaultRequiredLevel;
    }
}

