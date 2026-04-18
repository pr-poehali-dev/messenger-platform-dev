CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.message_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER,
  user_id INTEGER,
  emoji VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE t_p250553_messenger_platform_d.messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE t_p250553_messenger_platform_d.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE t_p250553_messenger_platform_d.messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE t_p250553_messenger_platform_d.messages ADD COLUMN IF NOT EXISTS file_type VARCHAR(32);
ALTER TABLE t_p250553_messenger_platform_d.messages ADD COLUMN IF NOT EXISTS voice_duration INTEGER;
