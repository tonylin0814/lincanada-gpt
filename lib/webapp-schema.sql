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
