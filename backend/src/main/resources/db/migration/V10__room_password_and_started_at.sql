-- Migration V10 : Support des salles protégées par mot de passe et chronomètre temps réel immuable
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS password VARCHAR(100);
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

