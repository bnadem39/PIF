-- V11: Advanced Background Customization, Dynamic Theming, and Player Profile Avatar
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_darkness INTEGER DEFAULT 60;
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_blur INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS background_position VARCHAR(30) DEFAULT 'center';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(20) DEFAULT 'AUTOMATIC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_secondary_color VARCHAR(30) DEFAULT '#06b6d4';

