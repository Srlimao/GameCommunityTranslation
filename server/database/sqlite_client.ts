import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { INITIAL_SCHEMA_SQL } from './schema_definitions.ts';

const DB_PATH = process.env.SQLITE_DB_PATH || './data/translator.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for high performance concurrency and enable foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
db.exec(INITIAL_SCHEMA_SQL);

// Migration for existing tables
try {
  db.exec("ALTER TABLE games ADD COLUMN raw_json_template TEXT DEFAULT ''");
} catch {}
try {
  db.exec("ALTER TABLE games ADD COLUMN schema_config TEXT DEFAULT ''");
} catch {}
try {
  db.exec("ALTER TABLE games ADD COLUMN whitelist_tags TEXT DEFAULT '[]'");
} catch {}

// Deduplicate translation rows if any duplicates exist
try {
  db.exec(`
    DELETE FROM translations
    WHERE id NOT IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY key_id, language_id
                 ORDER BY
                   CASE
                     WHEN status = 'approved' THEN 1
                     WHEN status = 'manual_translated' THEN 2
                     WHEN status = 'ai_translated' THEN 3
                     ELSE 4
                   END ASC,
                   LENGTH(translated_text) DESC,
                   updated_at DESC
               ) as rn
        FROM translations
      ) WHERE rn = 1
    );
  `);
} catch (err) {
  console.warn('[Database] Duplicate cleanup notice:', err);
}

try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_key_lang ON translations(key_id, language_id)");
} catch (err) {
  console.warn('[Database] Unique index creation notice:', err);
}

console.log(`[Database] SQLite initialized at: ${path.resolve(DB_PATH)}`);
