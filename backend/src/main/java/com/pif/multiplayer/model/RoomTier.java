package com.pif.multiplayer.model;

import java.util.List;
import java.util.Locale;

/**
 * Rangs des joueurs, du plus bas au plus haut (cf. User.calculateTier : le rang vient de l'ELO).
 * Une salle peut exiger un rang minimum pour y entrer.
 */
public final class RoomTier {

    public static final List<String> ORDER = List.of("BRONZE", "SILVER", "GOLD", "PLATINUM", "MASTER");

    private RoomTier() {
    }

    /** Rang normalisé (majuscules), ou null si la valeur est vide : salle ouverte à tous. */
    public static String normalize(String tier) {
        if (tier == null || tier.isBlank()) {
            return null;
        }
        String t = tier.trim().toUpperCase(Locale.ROOT);
        if (!ORDER.contains(t)) {
            throw new IllegalArgumentException("Rang inconnu : " + tier + ". Rangs possibles : " + String.join(", ", ORDER) + ".");
        }
        return t;
    }

    /** Vrai si un joueur de rang playerTier peut entrer dans une salle qui exige minTier. */
    public static boolean allows(String minTier, String playerTier) {
        String min = normalize(minTier);
        if (min == null) {
            return true;
        }
        int player = playerTier == null ? -1 : ORDER.indexOf(playerTier.trim().toUpperCase(Locale.ROOT));
        return player >= ORDER.indexOf(min);
    }
}
