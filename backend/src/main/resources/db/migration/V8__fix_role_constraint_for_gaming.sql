-- ============================================================================
-- V8: Mise à jour du CHECK constraint sur les rôles pour supporter ROLE_AGENT et ROLE_USER
-- ============================================================================

-- Supprimer l'ancien CHECK constraint restrictif
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Recréer avec tous les rôles du système de jeu multijoueur
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ROLE_ADMIN', 'ROLE_TRADER', 'ROLE_AGENT', 'ROLE_USER'));

