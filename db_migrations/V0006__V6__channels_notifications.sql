CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.channels (id SERIAL PRIMARY KEY, name VARCHAR(128) NOT NULL, description TEXT, username VARCHAR(64) UNIQUE, avatar_url TEXT, is_public BOOLEAN DEFAULT TRUE, owner_id INTEGER, subscribers_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.channel_subscribers (id SERIAL PRIMARY KEY, channel_id INTEGER, user_id INTEGER, joined_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(channel_id, user_id));

CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.channel_posts (id SERIAL PRIMARY KEY, channel_id INTEGER, user_id INTEGER, text TEXT, file_url TEXT, views INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.notifications (id SERIAL PRIMARY KEY, user_id INTEGER, type VARCHAR(32) NOT NULL, title TEXT, body TEXT NOT NULL, entity_type VARCHAR(32), entity_id INTEGER, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT NOW());
