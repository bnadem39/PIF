-- Salle d'entraînement : thème travaillé (RISK, DIVERSIFICATION, DISCIPLINE, AI, CRISIS).
-- NULL : salle de jeu ordinaire.
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS training_theme VARCHAR(20);
