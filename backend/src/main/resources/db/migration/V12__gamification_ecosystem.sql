-- ============================================================================
-- V12: ULTIMATE GAMIFICATION ECOSYSTEM
-- SPECTATOR MODE, TRADING SEASONS, SKILL TREE, ACHIEVEMENTS & CAREER
-- ============================================================================

-- 1. Support des Spectateurs dans les Arènes
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS allow_spectators BOOLEAN DEFAULT TRUE;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS max_spectators INT DEFAULT 50;

CREATE TABLE IF NOT EXISTS room_spectators (
    id BIGSERIAL PRIMARY KEY,
    room_id VARCHAR(20) NOT NULL REFERENCES game_rooms(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_room_spectator UNIQUE (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_room_spectators_room ON room_spectators(room_id);

-- 2. Saisons Compétitives de Trading
CREATE TABLE IF NOT EXISTS seasons (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- UPCOMING, ACTIVE, FINISHED, ARCHIVED
    rules_json TEXT,
    rewards_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS season_participants (
    id BIGSERIAL PRIMARY KEY,
    season_id VARCHAR(40) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_points INT DEFAULT 0,
    matches_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    best_equity NUMERIC(15,3) DEFAULT 100000.000,
    max_drawdown NUMERIC(8,2) DEFAULT 0.00,
    rank_position INT DEFAULT 0,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_tier VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_season_user UNIQUE (season_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_season_participants_points ON season_participants(season_id, season_points DESC);

-- 3. Arbre de Compétences (Skill Tree - 5 Branches RPG)
CREATE TABLE IF NOT EXISTS skill_nodes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    branch VARCHAR(50) NOT NULL, -- TECHNICAL_ANALYSIS, RISK_MANAGEMENT, PORTFOLIO_MANAGEMENT, MARKET_ANALYSIS, ADVANCED_STRATEGIES
    difficulty VARCHAR(20) DEFAULT 'BEGINNER', -- BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    required_level INT DEFAULT 1,
    prerequisite_skill_id VARCHAR(50),
    associated_course_id VARCHAR(64),
    exp_reward INT DEFAULT 250,
    icon_name VARCHAR(50) DEFAULT 'Zap',
    order_index INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_skills (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(50) NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'LOCKED', -- LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED, MASTERED
    mastery_tier VARCHAR(20) DEFAULT 'NONE', -- NONE, BASIC, INTERMEDIATE, ADVANCED, EXPERT
    completed_at TIMESTAMP,
    mastered_at TIMESTAMP,
    CONSTRAINT uk_player_skill UNIQUE (user_id, skill_id)
);
CREATE INDEX IF NOT EXISTS idx_player_skills_user ON player_skills(user_id);

-- 4. Succès, Trophées & Collection
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(60) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL, -- TRADING, RISK_MANAGEMENT, COMPETITIVE, EDUCATIONAL, CAREER, SOCIAL
    rarity VARCHAR(20) NOT NULL DEFAULT 'COMMON', -- COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, MYTHIC
    target_count INT DEFAULT 1,
    exp_reward INT DEFAULT 150,
    icon_name VARCHAR(50) DEFAULT 'Trophy',
    is_secret BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS player_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(60) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    current_progress INT DEFAULT 0,
    unlocked BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    CONSTRAINT uk_player_achievement UNIQUE (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_player_achievements_user ON player_achievements(user_id);

-- 5. Carrière Professionnelle de Trader (9 Paliers)
CREATE TABLE IF NOT EXISTS career_stages (
    stage_order INT PRIMARY KEY,
    title VARCHAR(60) NOT NULL,
    required_level INT NOT NULL,
    required_exp INT NOT NULL,
    required_wins INT DEFAULT 0,
    required_skills_count INT DEFAULT 0,
    badge_color VARCHAR(30) DEFAULT '#0284c7',
    icon_name VARCHAR(50) DEFAULT 'Briefcase',
    cosmetic_reward_title VARCHAR(80)
);

CREATE TABLE IF NOT EXISTS player_careers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_stage_order INT NOT NULL REFERENCES career_stages(stage_order),
    current_title VARCHAR(60) NOT NULL,
    promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    career_points INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS career_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage_order INT NOT NULL,
    title VARCHAR(60) NOT NULL,
    promoted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);
CREATE INDEX IF NOT EXISTS idx_career_history_user ON career_history(user_id);

-- 6. Événements de Célébration 3D (Gestionnaire Central Idempotent)
CREATE TABLE IF NOT EXISTS celebration_events (
    event_id VARCHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(40) NOT NULL, -- LEVEL_UP, ACHIEVEMENT_UNLOCKED, TROPHY_UNLOCKED, CAREER_PROMOTION, SEASON_CHAMPION, ROOM_VICTORY, SKILL_MASTERED
    title VARCHAR(100) NOT NULL,
    subtitle TEXT,
    rarity VARCHAR(20) DEFAULT 'COMMON',
    reward_exp INT DEFAULT 0,
    payload_json TEXT,
    is_displayed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_celebrations_user_pending ON celebration_events(user_id, is_displayed);

-- ============================================================================
-- INITIAL DATA SEEDING (COMPÉTENCES, SUCCÈS, PALIERS CARRIÈRE, SAISON PILOTE)
-- ============================================================================

-- A. Paliers de Carrière
INSERT INTO career_stages (stage_order, title, required_level, required_exp, required_wins, required_skills_count, badge_color, icon_name, cosmetic_reward_title)
VALUES
(1, 'Novice des Marchés', 1, 0, 0, 0, '#64748b', 'User', 'Insigne Débutant'),
(2, 'Junior Trader', 5, 2000, 1, 2, '#06b6d4', 'TrendingUp', 'Cadre Jeune Loup'),
(3, 'Analyste Financier', 10, 5000, 3, 4, '#3b82f6', 'LineChart', 'Titre Analyste Agréé'),
(4, 'Trader Professionnel', 15, 9000, 5, 6, '#10b981', 'ShieldCheck', 'Glow Vert Alpha'),
(5, 'Senior Market Operator', 20, 13000, 8, 8, '#f59e0b', 'Award', 'Trophée Opérateur Senior'),
(6, 'Gestionnaire de Portefeuille', 25, 17000, 12, 10, '#ec4899', 'Briefcase', 'Aura Diamant Gestionnaire'),
(7, 'Stratège d''Investissement', 30, 22000, 16, 12, '#8b5cf6', 'Compass', 'Manteau Institutionnel'),
(8, 'Hedge Fund Manager', 35, 28000, 20, 14, '#ef4444', 'Crown', 'Sceau Hedge Fund'),
(9, 'Légende Vivante du Trading', 40, 35000, 30, 16, '#eab308', 'Sparkles', 'Trophée Mythique Perpétuel')
ON CONFLICT (stage_order) DO UPDATE SET
    title = EXCLUDED.title,
    required_level = EXCLUDED.required_level,
    required_exp = EXCLUDED.required_exp;

-- B. Compétences de l'Arbre (Skill Tree - 5 Branches)
INSERT INTO skill_nodes (id, name, description, branch, difficulty, required_level, prerequisite_skill_id, associated_course_id, exp_reward, icon_name, order_index)
VALUES
-- Branche 1 : Analyse Technique
('tech_candles', 'Lecture des Chandelier Japonais', 'Déchiffrez mèches, corps, marteaux et étoiles du matin.', 'TECHNICAL_ANALYSIS', 'BEGINNER', 1, NULL, 'technical-indicators', 250, 'BarChart2', 1),
('tech_sup_res', 'Supports & Résistances Clés', 'Identifiez les planchers acheteurs et plafonds institutionnels.', 'TECHNICAL_ANALYSIS', 'BEGINNER', 2, 'tech_candles', 'technical-indicators', 300, 'Layers', 2),
('tech_trends', 'Suivi de Tendance & Dow Theory', 'Repérez les sommets/creux croissants et la structure de marché.', 'TECHNICAL_ANALYSIS', 'INTERMEDIATE', 4, 'tech_sup_res', 'technical-indicators', 400, 'TrendingUp', 3),
('tech_ma_crossover', 'Golden & Death Cross (SMA 20/50)', 'Validez le momentum via croisements de moyennes mobiles.', 'TECHNICAL_ANALYSIS', 'INTERMEDIATE', 6, 'tech_trends', 'technical-indicators', 450, 'Activity', 4),
('tech_rsi_divergence', 'Oscillateurs & Divergences RSI', 'Anticipez les retournements majeurs hors des zones de surachat.', 'TECHNICAL_ANALYSIS', 'ADVANCED', 10, 'tech_ma_crossover', 'technical-indicators', 600, 'Compass', 5),

-- Branche 2 : Gestion des Risques
('risk_ratio', 'Ratio Risque / Rendement (R:R)', 'N''entrez sur le marché qu''avec une asymétrie favorable minimum 1:2.', 'RISK_MANAGEMENT', 'BEGINNER', 1, NULL, 'risk-management', 300, 'ShieldAlert', 1),
('risk_pos_sizing', 'Calibration du Dimensionnement (1-2%)', 'Calculez la taille de lot exacte en fonction de la perte maximale tolérée.', 'RISK_MANAGEMENT', 'BEGINNER', 3, 'risk_ratio', 'risk-management', 350, 'DollarSign', 2),
('risk_stop_loss', 'Discipline Stop-Loss & Ordres OCO', 'Verrouillez les risques avant toute prise de position en carnet.', 'RISK_MANAGEMENT', 'INTERMEDIATE', 5, 'risk_pos_sizing', 'risk-management', 450, 'Target', 3),
('risk_drawdown_ctrl', 'Contrôle du Drawdown Maximal', 'Enrayez les séries négatives par réduction de voilure systématique.', 'RISK_MANAGEMENT', 'ADVANCED', 8, 'risk_stop_loss', 'risk-management', 600, 'AlertTriangle', 4),
('risk_capital_preserv', 'Préservation Absolue du Capital', 'Maîtrisez la gestion de risque institutionnelle et l''espérance mathématique.', 'RISK_MANAGEMENT', 'EXPERT', 12, 'risk_drawdown_ctrl', 'risk-management', 800, 'ShieldCheck', 5),

-- Branche 3 : Gestion de Portefeuille
('port_diversif', 'Diversification Multi-Secteurs', 'Ventilez le capital entre banques, leasing, agro-alimentaire et tech.', 'PORTFOLIO_MANAGEMENT', 'INTERMEDIATE', 4, NULL, 'technical-indicators', 350, 'PieChart', 1),
('port_alloc', 'Allocation Stratégique & Cash Tampon', 'Gardez une réserve de liquidité disponible pour les creux de marché.', 'PORTFOLIO_MANAGEMENT', 'INTERMEDIATE', 7, 'port_diversif', 'risk-management', 450, 'Wallet', 2),
('port_rebalancing', 'Rééquilibrage Périodique Dynamique', 'Prenez vos bénéfices sur les gagnants pour renforcer les opportunités sous-évaluées.', 'PORTFOLIO_MANAGEMENT', 'ADVANCED', 11, 'port_alloc', 'risk-management', 650, 'RefreshCw', 3),

-- Branche 4 : Analyse de Marché & Macro
('market_historical', 'Exploration Historique & Replay', 'Analysez les cycles BVMT passés et la saisonnalité des dividendes.', 'MARKET_ANALYSIS', 'BEGINNER', 2, NULL, 'technical-indicators', 300, 'Calendar', 1),
('market_regimes', 'Identification des Régimes de Marché', 'Distinguez range étroit, expansion volatile et panique baissière.', 'MARKET_ANALYSIS', 'ADVANCED', 9, 'market_historical', 'quant-ai', 550, 'Eye', 2),

-- Branche 5 : Stratégies Quantitatives & IA
('strat_backtesting', 'Backtesting Rigoureux sur Données Réelles', 'Validez une thèse d''investissement sur 10 ans de cotations tick-par-tick.', 'ADVANCED_STRATEGIES', 'INTERMEDIATE', 6, NULL, 'quant-ai', 500, 'PlayCircle', 1),
('strat_xgboost_audit', 'Interprétation des Signaux IA XGBoost', 'Arbitrez entre le consensus probabiliste IA et l''analyse chartiste.', 'ADVANCED_STRATEGIES', 'ADVANCED', 12, 'strat_backtesting', 'quant-ai', 750, 'Cpu', 2),
('strat_stress_testing', 'Simulation de Crise & Stress-Testing', 'Testez la résilience de vos positions face à des chocs de liquidité sévères.', 'ADVANCED_STRATEGIES', 'EXPERT', 16, 'strat_xgboost_audit', 'quant-ai', 900, 'Zap', 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    branch = EXCLUDED.branch;

-- C. Catalogue des Succès & Trophées
INSERT INTO achievements (id, name, description, category, rarity, target_count, exp_reward, icon_name, is_secret)
VALUES
-- Trading
('ach_first_trade', 'Premier Ordre en Carnet', 'Exécutez votre premier ordre d''achat ou de vente dans l''arène.', 'TRADING', 'COMMON', 1, 100, 'Zap', FALSE),
('ach_multi_asset', 'Explorateur Multi-Actifs', 'Détenez simultanément au moins 3 actifs différents en portefeuille.', 'TRADING', 'UNCOMMON', 3, 200, 'Layers', FALSE),
('ach_master_orders', 'Vétéran du Carnet', 'Exécutez un total cumulé de 50 ordres sur la plateforme.', 'TRADING', 'RARE', 50, 450, 'Briefcase', FALSE),

-- Gestion des Risques
('ach_risk_master', 'Maître du Risque', 'Complétez 5 matchs complets sans jamais dépasser 5% de drawdown max.', 'RISK_MANAGEMENT', 'EPIC', 5, 600, 'ShieldCheck', FALSE),
('ach_stop_loss_hero', 'Discipline de Fer', 'Utilisez un Stop-Loss protecteur sur au moins 10 positions.', 'RISK_MANAGEMENT', 'UNCOMMON', 10, 300, 'Target', FALSE),

-- Compétition & Matchs
('ach_first_win', 'Première Victoire en Arène', 'Remportez votre tout premier match multijoueur face à d''autres traders.', 'COMPETITIVE', 'UNCOMMON', 1, 300, 'Trophy', FALSE),
('ach_five_wins', 'Série Gagnante (5 Victoires)', 'Remportez 5 victoires certifiées dans les arènes multijoueur.', 'COMPETITIVE', 'RARE', 5, 600, 'Award', FALSE),
('ach_season_champ', 'Champion de Saison BVMT', 'Terminez sur la plus haute marche du podium d''une saison officielle.', 'COMPETITIVE', 'MYTHIC', 1, 2500, 'Crown', FALSE),
('ach_comeback_king', 'Comeback Inespéré', 'Remportez un match après avoir été classé dernier au premier tiers du temps.', 'COMPETITIVE', 'LEGENDARY', 1, 1000, 'Sparkles', FALSE),

-- Éducation & Savoir
('ach_first_course', 'Premier Diplôme Académique', 'Validez avec succès votre premier cours au sein de l''Académie.', 'EDUCATIONAL', 'COMMON', 1, 150, 'GraduationCap', FALSE),
('ach_skill_tree_unlocked', 'Érudit des Marchés', 'Débloquez au moins 5 compétences distinctes dans l''Arbre de Progression.', 'EDUCATIONAL', 'RARE', 5, 500, 'BookOpen', FALSE),
('ach_skill_master', 'Grand Maître Analyste', 'Atteignez la maîtrise Experte sur au moins 3 compétences de l''arbre.', 'EDUCATIONAL', 'EPIC', 3, 850, 'Star', FALSE),

-- Carrière
('ach_level_10', 'Ascension Professionnelle', 'Atteignez le Niveau 10 de progression globale.', 'CAREER', 'RARE', 10, 400, 'TrendingUp', FALSE),
('ach_level_25', 'Consécration Diamant', 'Atteignez le Niveau 25 et rejoignez l''élite compétitive.', 'CAREER', 'LEGENDARY', 25, 1200, 'Gem', FALSE),

-- Social & Spectateur
('ach_spectator_watch', 'Observateur Averti', 'Visionnez un match multijoueur en direct en mode Spectateur.', 'SOCIAL', 'COMMON', 1, 100, 'Eye', FALSE),
('ach_first_friend', 'Réseau Financier', 'Ajoutez votre premier ami trader sur la plateforme.', 'SOCIAL', 'COMMON', 1, 100, 'Users', FALSE),
('ach_room_creator', 'Hôte d''Arène', 'Créez et menez à terme votre propre arène de compétition.', 'SOCIAL', 'UNCOMMON', 1, 200, 'PlusCircle', FALSE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    rarity = EXCLUDED.rarity;

-- D. Saison Initiale (Saison 1: L''Envol des Champions)
INSERT INTO seasons (id, name, description, start_date, end_date, status, rules_json, rewards_json)
VALUES (
    'season-2026-s1',
    'Saison 1 : L''Envol des Champions BVMT',
    'La première saison officielle multijoueur de PIF Trading Arena. Affrontez les meilleurs traders de Tunisie, gérez votre risque et décrochez le trophée saisonnier légendaire !',
    '2026-11-01 00:00:00',
    '2026-12-31 23:59:59',
    'ACTIVE',
    '{"pointsPerWin": 100, "pointsPerParticipation": 25, "drawdownBonus": 30, "minDurationMinutes": 10}',
    '{"top1": "Trophée Saisonnier Mythique 3D + Titre Champion BVMT", "top3": "Cadre d''Avatar Orphelin Or Brillant + 2500 EXP", "top10": "Insigne Élite Argent + 1000 EXP", "top50": "Badge Trader Classé + 500 EXP"}'
)
ON CONFLICT (id) DO NOTHING;

-- E. Initialisation des carrières pour les utilisateurs existants
INSERT INTO player_careers (user_id, current_stage_order, current_title, career_points)
SELECT 
    u.id, 
    CASE 
        WHEN u.level >= 25 THEN 6
        WHEN u.level >= 20 THEN 5
        WHEN u.level >= 15 THEN 4
        WHEN u.level >= 10 THEN 3
        WHEN u.level >= 5 THEN 2
        ELSE 1
    END,
    CASE 
        WHEN u.level >= 25 THEN 'Gestionnaire de Portefeuille'
        WHEN u.level >= 20 THEN 'Senior Market Operator'
        WHEN u.level >= 15 THEN 'Trader Professionnel'
        WHEN u.level >= 10 THEN 'Analyste Financier'
        WHEN u.level >= 5 THEN 'Junior Trader'
        ELSE 'Novice des Marchés'
    END,
    COALESCE(u.exp, 0)
FROM users u
ON CONFLICT (user_id) DO NOTHING;

