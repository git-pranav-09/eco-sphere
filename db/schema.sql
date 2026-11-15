CREATE TABLE IF NOT EXISTS stories (
  id BIGSERIAL PRIMARY KEY,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 40 AND 800),
  country TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  theme TEXT NOT NULL CHECK (theme IN ('Hope','Kindness','Education','Friendship','Family','Community','Creativity','Dreams','Belonging','Challenges')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  moderation_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_stories_status_created ON stories(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_country ON stories(country_code);
CREATE INDEX IF NOT EXISTS idx_stories_theme ON stories(theme);
CREATE TABLE IF NOT EXISTS admin_roles (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('super_admin','moderator','analyst')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_roles_email ON admin_roles(email);
CREATE TABLE IF NOT EXISTS moderation_logs (
  id BIGSERIAL PRIMARY KEY,
  story_id BIGINT,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created ON moderation_logs(created_at DESC);
