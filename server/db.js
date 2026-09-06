import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. See .env.example for local dev, or set it in your Vercel project settings.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS set_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_id TEXT NOT NULL,
    block_index INTEGER NOT NULL,
    set_index INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight REAL,
    completed_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, day_id, block_index, set_index, date)
  );

  CREATE TABLE IF NOT EXISTS circuit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_id TEXT NOT NULL,
    block_index INTEGER NOT NULL,
    date TEXT NOT NULL,
    rounds_completed INTEGER NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, day_id, block_index, date)
  );

  CREATE INDEX IF NOT EXISTS idx_set_logs_user_date ON set_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_set_logs_user_exercise ON set_logs(user_id, day_id, block_index);
  CREATE INDEX IF NOT EXISTS idx_circuit_logs_user_date ON circuit_logs(user_id, date);
`;

// Runs once per cold start (serverless) / once at startup (local) — cached so
// repeat requests on a warm instance don't re-run the DDL every time.
let schemaReady = null;
export function ensureSchema() {
  if (!schemaReady) schemaReady = pool.query(SCHEMA_SQL);
  return schemaReady;
}

export async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}
