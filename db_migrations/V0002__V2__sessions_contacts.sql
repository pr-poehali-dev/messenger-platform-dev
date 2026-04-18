CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p250553_messenger_platform_d.users(id),
  token VARCHAR(128) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE TABLE IF NOT EXISTS t_p250553_messenger_platform_d.contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES t_p250553_messenger_platform_d.users(id),
  contact_id INTEGER REFERENCES t_p250553_messenger_platform_d.users(id),
  status VARCHAR(16) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);
