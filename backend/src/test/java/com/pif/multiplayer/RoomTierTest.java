package com.pif.multiplayer;

import com.pif.multiplayer.model.RoomTier;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoomTierTest {

    @Test
    void aRoomWithoutMinimumIsOpenToEveryone() {
        assertThat(RoomTier.allows(null, "BRONZE")).isTrue();
        assertThat(RoomTier.allows("  ", null)).isTrue();
    }

    @Test
    void aPlayerNeedsAtLeastTheRequiredTier() {
        assertThat(RoomTier.allows("GOLD", "SILVER")).isFalse();
        assertThat(RoomTier.allows("GOLD", "GOLD")).isTrue();
        assertThat(RoomTier.allows("GOLD", "MASTER")).isTrue();
        assertThat(RoomTier.allows("BRONZE", "BRONZE")).isTrue();
    }

    @Test
    void tiersAreComparedWithoutCaseAndUnknownPlayerTierIsRefused() {
        assertThat(RoomTier.allows("silver", "Silver")).isTrue();
        assertThat(RoomTier.allows("SILVER", null)).isFalse();
        assertThat(RoomTier.allows("SILVER", "???")).isFalse();
    }

    @Test
    void anUnknownRequiredTierIsRejected() {
        assertThatThrownBy(() -> RoomTier.normalize("DIAMOND")).isInstanceOf(IllegalArgumentException.class);
        assertThat(RoomTier.normalize(" gold ")).isEqualTo("GOLD");
        assertThat(RoomTier.normalize("")).isNull();
    }
}
