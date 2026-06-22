CREATE SCHEMA IF NOT EXISTS webapp;
SET search_path TO webapp, public;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  supabase_connection_string TEXT NOT NULL,
  google_drive_folder_id TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS features (
  feature_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  feature_group TEXT NOT NULL,
  record_category TEXT NOT NULL,
  record_type TEXT NOT NULL,
  default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_features (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(feature_key) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, feature_key)
);

CREATE TABLE IF NOT EXISTS user_record_types (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_category TEXT NOT NULL,
  record_type TEXT NOT NULL,
  feature_key TEXT REFERENCES features(feature_key) ON DELETE SET NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  confidence NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  source_table TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, record_category, record_type, source_table)
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_feature_key TEXT REFERENCES features(feature_key) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Insert Tony as the first admin (password to be set via script).
-- INSERT INTO users (
--   name,
--   email,
--   password_hash,
--   supabase_connection_string,
--   google_drive_folder_id,
--   is_admin
-- ) VALUES (
--   'Tony',
--   'tonylin0814@gmail.com',
--   '<bcrypt hash from setup script>',
--   '<Tony Supabase connection string>',
--   NULL,
--   TRUE
-- );
