package com.pif.multiplayer.event;

/**
 * Publié par RoomService.closeRoom juste avant la suppression de la salle, quand les participants, leurs ordres
 * et leurs portefeuilles existent encore. Les écouteurs peuvent y relever les résultats finaux.
 */
public record RoomClosingEvent(String roomId) {
}
