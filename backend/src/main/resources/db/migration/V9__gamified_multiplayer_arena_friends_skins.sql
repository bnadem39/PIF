-- ============================================================================
-- V9: GAMIFIED MULTIPLAYER TRADING ARENA (PLAYERS, FRIENDS, GAME_ROOMS, SKINS)
-- ============================================================================

-- Nettoyage des anciennes tables de simulation transitoire
DROP TABLE IF EXISTS room_invitations CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;

-- 1. Table des Joueurs et progression ELO / EXP / Thème
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    elo_rating INT DEFAULT 1000,
    tier VARCHAR(20) DEFAULT 'BRONZE',
    level INT DEFAULT 1,
    exp INT DEFAULT 0,
    wins INT DEFAULT 0,
    total_matches INT DEFAULT 0,
    custom_background_url TEXT,
    theme_accent_color VARCHAR(30) DEFAULT '#10b981',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Synchronisation des utilisateurs existants vers players
INSERT INTO players (id, username, elo_rating, tier, level, exp, wins, total_matches, theme_accent_color, created_at)
SELECT 
    id, 
    username, 
    COALESCE(elo_rating, 1000), 
    UPPER(COALESCE(tier, 'BRONZE')), 
    1, 
    0, 
    COALESCE(wins, 0), 
    COALESCE(total_matches, 0), 
    '#10b981', 
    COALESCE(created_at, NOW())
FROM users
ON CONFLICT (username) DO UPDATE SET
    elo_rating = EXCLUDED.elo_rating,
    tier = EXCLUDED.tier;

-- Ajustement de la séquence d'ID
SELECT setval('players_id_seq', COALESCE((SELECT MAX(id) FROM players), 1));

-- 2. Relations d'amitié entre joueurs
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    requester_id INT REFERENCES players(id) ON DELETE CASCADE,
    addressee_id INT REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACCEPTED', -- PENDING, ACCEPTED, DECLINED, BLOCKED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- 3. Salons de jeu (identifiant court alpha-numérique ex: PIF-7842)
CREATE TABLE game_rooms (
    id VARCHAR(20) PRIMARY KEY, -- e.g., PIF-7842
    room_name VARCHAR(100) NOT NULL,
    creator_id INT REFERENCES players(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    initial_cash NUMERIC(15, 2) NOT NULL,
    game_duration_minutes INT NOT NULL DEFAULT 15,
    tick_rate_ms INT NOT NULL DEFAULT 1000,
    status VARCHAR(20) DEFAULT 'LOBBY', -- LOBBY, RUNNING, PAUSED, FINISHED
    current_simulated_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Participants et suivi d'équité en temps réel
CREATE TABLE room_participants (
    room_id VARCHAR(20) REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    cash NUMERIC(15, 2) NOT NULL,
    total_equity NUMERIC(15, 2) NOT NULL,
    pnl_percentage NUMERIC(8, 2) DEFAULT 0.0,
    is_ready BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (room_id, player_id)
);

-- 5. Ordres exécutés dans l'arène
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    room_id VARCHAR(20) REFERENCES game_rooms(id) ON DELETE CASCADE,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL, -- BUY, SELL
    order_type VARCHAR(20) NOT NULL, -- MARKET, LIMIT, STOP_LOSS, TAKE_PROFIT, OCO
    price NUMERIC(15, 4) NOT NULL,
    quantity INT NOT NULL,
    stop_loss_price NUMERIC(15, 4),
    take_profit_price NUMERIC(15, 4),
    simulated_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'EXECUTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Invitations directes de salon
CREATE TABLE room_invitations (
    id UUID PRIMARY KEY,
    room_id VARCHAR(20) REFERENCES game_rooms(id) ON DELETE CASCADE,
    sender_id INT REFERENCES players(id) ON DELETE CASCADE,
    receiver_id INT REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour requêtes temps réel haute fréquence
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_orders_room ON orders(room_id);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(requester_id, addressee_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_receiver ON room_invitations(receiver_id, status);

-- Insertion de données de test pour amitié
INSERT INTO friendships (requester_id, addressee_id, status)
SELECT p1.id, p2.id, 'ACCEPTED'
FROM players p1, players p2
WHERE p1.username = 'trader' AND p2.username = 'adem'
ON CONFLICT DO NOTHING;

-- Insertion d'une arène de départ PIF-7842
INSERT INTO game_rooms (id, room_name, creator_id, start_date, end_date, initial_cash, game_duration_minutes, tick_rate_ms, status)
SELECT 'PIF-7842', 'Arène des Champions BVMT', p.id, '2023-01-01', '2023-12-31', 100000.00, 15, 1000, 'LOBBY'
FROM players p
WHERE p.username = 'trader'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO room_participants (room_id, player_id, cash, total_equity, pnl_percentage, is_ready)
SELECT 'PIF-7842', p.id, 100000.00, 100000.00, 0.00, true
FROM players p
WHERE p.username = 'trader'
LIMIT 1
ON CONFLICT DO NOTHING;
