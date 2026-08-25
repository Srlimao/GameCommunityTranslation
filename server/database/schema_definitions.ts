export const INITIAL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  context_prompt TEXT DEFAULT '',
  base_language TEXT DEFAULT 'en-US',
  raw_json_template TEXT DEFAULT '',
  schema_config TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS base_keys (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  key_path TEXT NOT NULL,
  source_text TEXT NOT NULL,
  context_note TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_base_keys_game_id ON base_keys(game_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_base_keys_game_key ON base_keys(game_id, key_path);

CREATE TABLE IF NOT EXISTS languages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_languages_game_id ON languages(game_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_languages_game_code ON languages(game_id, language_code);

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL,
  language_id TEXT NOT NULL,
  translated_text TEXT DEFAULT '',
  status TEXT DEFAULT 'untranslated',
  model_used TEXT DEFAULT '',
  updated_at TEXT NOT NULL,
  FOREIGN KEY(key_id) REFERENCES base_keys(id) ON DELETE CASCADE,
  FOREIGN KEY(language_id) REFERENCES languages(id) ON DELETE CASCADE,
  UNIQUE(key_id, language_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_key_lang ON translations(key_id, language_id);

CREATE TABLE IF NOT EXISTS glossary (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  source_term TEXT NOT NULL,
  target_term TEXT NOT NULL,
  target_language TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_glossary_game_id ON glossary(game_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'translator',
  display_name TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY(user_id, key),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;
