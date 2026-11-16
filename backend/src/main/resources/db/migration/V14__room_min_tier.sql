-- Salle réservée à un rang minimum (BRONZE, SILVER, GOLD, PLATINUM, MASTER).
-- NULL : salle ouverte à tous les joueurs.
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS min_tier VARCHAR(20);
