ALTER TABLE t_p250553_messenger_platform_d.chats ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(16) DEFAULT '#00d4ff';
ALTER TABLE t_p250553_messenger_platform_d.users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(16) DEFAULT '#00d4ff';

CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.chat_invites (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);
