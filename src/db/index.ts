import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { config } from '../config.js';

const sqlite = new Database(config.DATABASE_URL);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS numbers (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'available',
      assigned_to TEXT,
      assigned_at INTEGER,
      expires_at INTEGER,
      cooldown_until INTEGER
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      api_key TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      credits REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      number_id TEXT NOT NULL REFERENCES numbers(id),
      direction TEXT NOT NULL,
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      number_id TEXT REFERENCES numbers(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      to_number TEXT NOT NULL,
      mission_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      transcript TEXT,
      duration_seconds INTEGER,
      credits_used REAL,
      retell_call_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      credits_used REAL NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}

export function getDb() { return db; }
export { schema };
