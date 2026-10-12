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

export const SCHEMA_SQL = `
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

  -- ---------------------------------------------------------------------------
  -- v2 storage (exercise library, plans, session log). Everything below is
  -- ADDITIVE: set_logs / circuit_logs above are never altered or dropped, and
  -- the client copies them into session_log / session_items once (idempotent
  -- upsert by key) in its versioned "v2" migration.
  -- ---------------------------------------------------------------------------
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Overrides of built-in exercises + the user's own exercises. The built-in
  -- catalogue itself lives in code (src/data/library.js).
  CREATE TABLE IF NOT EXISTS user_exercises (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    data JSONB NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, exercise_id)
  );

  CREATE TABLE IF NOT EXISTS plans (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    data JSONB NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, plan_id)
  );

  -- One row per session actually performed on a date (a template instance,
  -- an extra session from another day, or the free "quick add" bucket). The
  -- planned[] snapshot is what that session looked like when it was done, so
  -- later plan/exercise edits never rewrite history.
  CREATE TABLE IF NOT EXISTS session_log (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_key TEXT NOT NULL,
    date TEXT NOT NULL,
    plan_id TEXT,
    tpl_day TEXT,
    session_id TEXT,
    name_en TEXT,
    name_ar TEXT,
    optional BOOLEAN NOT NULL DEFAULT false,
    planned JSONB NOT NULL DEFAULT '[]'::jsonb,
    source TEXT NOT NULL DEFAULT 'app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, session_key)
  );

  -- One row per logged item: a set / hold / circuit (kind 'work') or a rest
  -- (kind 'rest'). status is completed | incomplete | skipped.
  CREATE TABLE IF NOT EXISTS session_items (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    session_key TEXT NOT NULL,
    date TEXT NOT NULL,
    entry_key TEXT NOT NULL,
    set_index INTEGER NOT NULL DEFAULT 0,
    exercise_id TEXT,
    exercise_name TEXT,
    ex_type TEXT,
    kind TEXT NOT NULL DEFAULT 'work',
    status TEXT NOT NULL DEFAULT 'completed',
    planned_reps INTEGER,
    planned_seconds INTEGER,
    reps_done INTEGER,
    weight REAL,
    hold_seconds INTEGER,
    rounds INTEGER,
    duration_seconds INTEGER,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'app',
    PRIMARY KEY (user_id, item_key)
  );

  -- Sessions added to a date on top of (or instead of) the plan: another
  -- day's session, plus free "quick add" exercises. {sessions:[], quick:[]}
  CREATE TABLE IF NOT EXISTS day_extras (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS progress_tests (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkpoint TEXT NOT NULL,
    tested_on TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, checkpoint)
  );

  CREATE INDEX IF NOT EXISTS idx_session_log_user_date ON session_log(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_session_items_user_date ON session_items(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_session_items_user_exercise ON session_items(user_id, exercise_id);

  -- ---------------------------------------------------------------------------
  -- MCP connector ("let Claude log my data"). Additive.
  -- ---------------------------------------------------------------------------
  -- One connector token per user; only its SHA-256 hash is stored.
  CREATE TABLE IF NOT EXISTS mcp_tokens (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
  );

  -- Individual meals. Daily nutrition totals = the manual daily row + the sum of that day's meals.
  CREATE TABLE IF NOT EXISTS meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL DEFAULT 'other',
    description TEXT NOT NULL DEFAULT '',
    calories REAL, protein_g REAL, fiber_g REAL, carbs_g REAL, fat_g REAL,
    estimated BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL DEFAULT 'app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);

  -- Retry safety: a repeated request_id returns the stored result instead of writing again.
  CREATE TABLE IF NOT EXISTS mcp_requests (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, request_id)
  );

  ALTER TABLE body_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';
  ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';
  ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app';

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

// Adapter used by the MCP tools (and their tests): query() + a real transaction.
export const mcpDb = {
  query,
  async tx(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(async (sql, params = []) => (await client.query(sql, params)).rows);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  },
};

export async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}
