import { chmodSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

let database: DatabaseSync | undefined;

/** Persistent application data. DATA_DIR must point to a durable volume in production. */
export function getDb(): DatabaseSync {
  if (database) return database;

  const directory = resolve(process.env.DATA_DIR || './data');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = resolve(directory, 'nestate.sqlite');
  const newFile = !existsSync(filename);
  const connection = new DatabaseSync(filename);
  if (newFile) chmodSync(filename, 0o600);
  connection.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      singleton INTEGER NOT NULL UNIQUE DEFAULT 1 CHECK (singleton = 1),
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      tokenHash TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expiresAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expiresAt);
    CREATE TABLE IF NOT EXISTS login_attempts (
      key TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL,
      expiresAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      publishedAt TEXT,
      shareLinkedIn INTEGER NOT NULL DEFAULT 0 CHECK (shareLinkedIn IN (0, 1)),
      linkedinStatus TEXT NOT NULL DEFAULT 'never'
        CHECK (linkedinStatus IN ('never', 'pending', 'sent', 'failed', 'uncertain')),
      linkedinUrl TEXT,
      linkedinError TEXT
    );
    CREATE INDEX IF NOT EXISTS posts_publication ON posts(status, publishedAt);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  database = connection;
  return connection;
}
