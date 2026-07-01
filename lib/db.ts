import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const DB_PATH = resolve(process.env.DATABASE_PATH ?? './data/app.db');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language       TEXT NOT NULL DEFAULT 'de',
  level          TEXT NOT NULL DEFAULT 'A1',
  daily_goal     INTEGER NOT NULL DEFAULT 10,
  interests      TEXT NOT NULL DEFAULT '[]',
  refined_topics TEXT NOT NULL DEFAULT '[]',
  onboarding_done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS words (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  language       TEXT NOT NULL DEFAULT 'de',
  level          TEXT NOT NULL,
  lemma          TEXT NOT NULL,
  article        TEXT,
  translation    TEXT NOT NULL,
  part_of_speech TEXT,
  example        TEXT,
  transcription  TEXT,
  topic          TEXT NOT NULL,
  created_at     INTEGER NOT NULL,
  UNIQUE(language, level, lemma)
);
CREATE INDEX IF NOT EXISTS idx_words_lookup ON words(language, level, topic);

CREATE TABLE IF NOT EXISTS user_words (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id       INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'new',
  ease_factor   REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  repetitions   INTEGER NOT NULL DEFAULT 0,
  due_at        INTEGER NOT NULL,
  last_reviewed INTEGER,
  UNIQUE(user_id, word_id)
);
CREATE INDEX IF NOT EXISTS idx_user_words_due ON user_words(user_id, due_at);

CREATE TABLE IF NOT EXISTS texts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  level      TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  word_links TEXT NOT NULL DEFAULT '[]',
  image_url   TEXT,
  image_attr  TEXT,
  image_link  TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_texts_user ON texts(user_id, created_at);

CREATE TABLE IF NOT EXISTS daily_sets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  word_ids   TEXT NOT NULL DEFAULT '[]',
  completed  INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, day)
);

CREATE TABLE IF NOT EXISTS review_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id     INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  grade       INTEGER NOT NULL,
  reviewed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_logs_user ON review_logs(user_id, reviewed_at);
`;

const globalForDb = globalThis as unknown as { __db?: DatabaseSync };

const MIGRATIONS = [
  'ALTER TABLE texts ADD COLUMN image_url TEXT',
  'ALTER TABLE texts ADD COLUMN image_attr TEXT',
  'ALTER TABLE texts ADD COLUMN image_link TEXT',
  'ALTER TABLE words ADD COLUMN transcription TEXT',
  'ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE users ADD COLUMN is_banned INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE words ADD COLUMN image_url TEXT',
];

function seedAccounts(database: DatabaseSync): void {
  const row = database
    .prepare('SELECT COUNT(*) as n FROM users')
    .get() as { n: number };
  if (row.n > 0) return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { hashSync } = require('bcryptjs') as { hashSync: (s: string, r: number) => string };

  const accounts = [
    {
      label: 'account_1',
      code: process.env.ACCOUNT_CODE_1 ?? randomBytes(5).toString('base64url'),
      isAdmin: 0,
    },
    {
      label: 'account_2',
      code: process.env.ACCOUNT_CODE_2 ?? randomBytes(5).toString('base64url'),
      isAdmin: 0,
    },
    {
      label: 'admin',
      code: process.env.ACCOUNT_CODE_ADMIN ?? randomBytes(5).toString('base64url'),
      isAdmin: 1,
    },
  ];

  const stmt = database.prepare(
    'INSERT INTO users (email, password_hash, is_admin, is_banned, created_at) VALUES (?, ?, ?, 0, ?)',
  );
  const now = Date.now();
  for (const a of accounts) {
    const hash = hashSync(a.code, 10);
    stmt.run(a.label, hash, a.isAdmin, now);
    console.log(`[Wortland] Аккаунт "${a.label}" → КОД: ${a.code}`);
  }
  console.log('[Wortland] ⚠️  Сохрани коды — они больше не выведутся! Смени в .env.local или через AdminPanel.');
}

function createDb(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const database = new DatabaseSync(DB_PATH);
  database.exec(SCHEMA);
  for (const sql of MIGRATIONS) {
    try {
      database.exec(sql);
    } catch {
      // колонка уже существует
    }
  }
  seedAccounts(database);
  return database;
}

export const db: DatabaseSync = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== 'production') globalForDb.__db = db;
