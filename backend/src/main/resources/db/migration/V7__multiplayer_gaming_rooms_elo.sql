-- ============================================================================
-- V7: PIVOT GAMING MULTIJOUEUR - ROOMS 3D, MATCHMAKING ELO, ORDRES ET PARTICIPANTS
-- ============================================================================

-- 1. Extension du profil joueur ELO & Rang sur la table users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE users ADD COLUMN username VARCHAR(50);
        UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
        ALTER TABLE users ALTER COLUMN username SET NOT NULL;
        ALTER TABLE users ADD CONSTRAINT uk_users_username UNIQUE (username);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'elo_rating') THEN
        ALTER TABLE users ADD COLUMN elo_rating INT DEFAULT 1000 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tier') THEN
        ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'Silver' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_matches') THEN
        ALTER TABLE users ADD COLUMN total_matches INT DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'wins') THEN
        ALTER TABLE users ADD COLUMN wins INT DEFAULT 0 NOT NULL;
    END IF;
END $$;

-- 2. Table des Arènes de Jeu Multijoueur (Rooms)
CREATE TABLE IF NOT EXISTS rooms (
    id                     UUID PRIMARY KEY,
    name                   VARCHAR(100) NOT NULL,
    created_by             BIGINT REFERENCES users(id) ON DELETE SET NULL,
    start_date             DATE NOT NULL,
    end_date               DATE NOT NULL,
    initial_cash           NUMERIC(15, 2) NOT NULL,
    min_elo                INT NOT NULL,
    max_elo                INT NOT NULL,
    tick_rate_ms           INT DEFAULT 1000 NOT NULL,
    max_players            INT DEFAULT 8 NOT NULL,
    status                 VARCHAR(20) DEFAULT 'WAITING' NOT NULL, -- WAITING, RUNNING, PAUSED, FINISHED
    current_simulated_date DATE,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'created_by') THEN
        ALTER TABLE rooms ADD COLUMN created_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'max_players') THEN
        ALTER TABLE rooms ADD COLUMN max_players INT DEFAULT 8 NOT NULL;
    END IF;
END $$;

-- 3. Table des Joueurs Inscrits dans une Arène (Room Participants)
CREATE TABLE IF NOT EXISTS room_participants (
    room_id         UUID NOT NULL,
    user_id         BIGINT NOT NULL,
    current_cash    NUMERIC(15, 2) NOT NULL,
    portfolio_value NUMERIC(15, 2) NOT NULL,
    pnl             NUMERIC(15, 2) DEFAULT 0.0 NOT NULL,
    rank            INT DEFAULT 0 NOT NULL,
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_room_participants_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_room_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Table des Ordres Exécutés en Arène Multijoueur
CREATE TABLE IF NOT EXISTS orders (
    id             UUID PRIMARY KEY,
    room_id        UUID NOT NULL,
    user_id        BIGINT NOT NULL,
    ticker         VARCHAR(20) NOT NULL,
    side           VARCHAR(10) NOT NULL, -- BUY / SELL
    order_type     VARCHAR(20) NOT NULL, -- MARKET, LIMIT, SL, TP
    price          NUMERIC(15, 4) NOT NULL,
    quantity       INT NOT NULL,
    stop_loss      NUMERIC(15, 4),
    take_profit    NUMERIC(15, 4),
    status         VARCHAR(20) DEFAULT 'EXECUTED' NOT NULL,
    simulated_date DATE NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_orders_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_orders_side CHECK (side IN ('BUY', 'SELL')),
    CONSTRAINT ck_orders_type CHECK (order_type IN ('MARKET', 'LIMIT', 'SL', 'TP'))
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stop_loss') THEN
        ALTER TABLE orders ADD COLUMN stop_loss NUMERIC(15, 4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'take_profit') THEN
        ALTER TABLE orders ADD COLUMN take_profit NUMERIC(15, 4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'status') THEN
        ALTER TABLE orders ADD COLUMN status VARCHAR(20) DEFAULT 'EXECUTED' NOT NULL;
    END IF;
END $$;

-- Index pour requêtes temps réel haute fréquence
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_participants_room ON room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user ON room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_room_date ON orders(room_id, simulated_date);

