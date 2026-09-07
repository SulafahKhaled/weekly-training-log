import pg from 'pg';

const { Pool } = pg;

// Vercel's Postgres integration injects POSTGRES_URL (not DATABASE_URL) —
// accept either so the same code works locally and on Vercel without
// renaming anything by hand.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error('No database connection string found. Set DATABASE_URL (see .env.example) for local dev, or add the Postgres storage integration in your Vercel project (it sets POSTGRES_URL automatically).');
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
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

  -- Isometric holds always ran the full planned duration with no way to
  -- record anything different. This lets a person log what they actually
  -- held (defaulting to the planned duration, editable afterward) so
  -- exercise-progress charts have real per-session data instead of a flat
  -- line. Added via idempotent ADD COLUMN so no manual Neon migration step
  -- is needed on an existing database.
  ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS hold_seconds INTEGER;

  CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    day_id TEXT,
    text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS journal_photos (
    id SERIAL PRIMARY KEY,
    journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    data BYTEA NOT NULL,
    mime_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS body_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    weight REAL,
    muscle_mass REAL,
    fat_mass REAL,
    body_fat_percent REAL,
    notes TEXT,
    UNIQUE (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS body_measurements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    measurement_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'cm',
    UNIQUE (user_id, date, measurement_type)
  );

  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    calories REAL,
    protein_g REAL,
    fiber_g REAL,
    carbs_g REAL,
    fat_g REAL,
    notes TEXT,
    UNIQUE (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS nutrition_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    effective_from TEXT NOT NULL,
    calories_goal REAL,
    protein_goal REAL,
    fiber_goal REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS ui_prefs (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    collapsed_sections JSONB NOT NULL DEFAULT '{}'::jsonb
  );

  CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_body_logs_user_date ON body_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date ON nutrition_logs(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_nutrition_goals_user_date ON nutrition_goals(user_id, effective_from);
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
