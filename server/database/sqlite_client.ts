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

console.log(`[Database] SQLite initialized at: ${path.resolve(DB_PATH)}`);
