import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureSchema, query } from './db.js';
import { hashPassword, verifyPassword, createSessionToken, setSessionCookie, clearSessionCookie, requireAuth, getSessionUser } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function computeStreak(dates) {
  const set = new Set(dates);
  if (set.size === 0) return 0;
  const cursor = new Date();
  if (!set.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(isoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

const app = express();
// Raised from Express's 100kb default to fit base64-encoded journal photos
// (client-side compressed/resized before upload, but base64 still adds ~33%).
app.use(express.json({ limit: '8mb' }));

// Runs the schema-creation SQL once per cold start, before any request touches the DB.
app.use((req, res, next) => {
  ensureSchema().then(() => next(), next);
});

const api = express.Router();

/* ---------- auth ---------- */

api.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!USERNAME_RE.test(username || '')) {
    return res.status(400).json({ error: 'Username must be 3-24 characters: letters, numbers, underscore.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'That username is taken.' });
  }
  const rows = await query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username', [username, hashPassword(password)]);
  const user = rows[0];
  setSessionCookie(res, createSessionToken(user));
  res.json({ username: user.username });
});

api.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const rows = await query('SELECT id, username, password_hash FROM users WHERE username = $1', [username || '']);
  const user = rows[0];
  if (!user || !verifyPassword(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  setSessionCookie(res, createSessionToken(user));
  res.json({ username: user.username });
});

api.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

api.get('/auth/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  res.json({ username: user.username });
});

/* ---------- progress (all scoped to req.user.id) ---------- */

api.use(requireAuth);

api.get('/progress', async (req, res) => {
  const date = req.query.date || isoDate();
  const sets = await query('SELECT day_id, block_index, set_index, weight, hold_seconds FROM set_logs WHERE user_id = $1 AND date = $2', [req.user.id, date]);
  const circuits = await query('SELECT day_id, block_index, rounds_completed FROM circuit_logs WHERE user_id = $1 AND date = $2', [req.user.id, date]);
  res.json({ date, sets, circuits });
});

api.post('/sets', async (req, res) => {
  const { day_id, block_index, set_index, date, done, weight } = req.body;
  if (!day_id || block_index == null || set_index == null || !date) {
    return res.status(400).json({ error: 'day_id, block_index, set_index, date are required' });
  }
  const { hold_seconds } = req.body;
  if (done) {
    await query(
      `INSERT INTO set_logs (user_id, day_id, block_index, set_index, date, weight, hold_seconds, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (user_id, day_id, block_index, set_index, date)
       DO UPDATE SET weight = excluded.weight, hold_seconds = excluded.hold_seconds, completed_at = excluded.completed_at`,
      [req.user.id, day_id, block_index, set_index, date, weight ?? null, hold_seconds ?? null]
    );
  } else {
    await query('DELETE FROM set_logs WHERE user_id = $1 AND day_id = $2 AND block_index = $3 AND set_index = $4 AND date = $5', [req.user.id, day_id, block_index, set_index, date]);
  }
  res.json({ ok: true });
});

api.patch('/sets/weight', async (req, res) => {
  const { day_id, block_index, set_index, date, weight } = req.body;
  await query('UPDATE set_logs SET weight = $1 WHERE user_id = $2 AND day_id = $3 AND block_index = $4 AND set_index = $5 AND date = $6', [weight ?? null, req.user.id, day_id, block_index, set_index, date]);
  res.json({ ok: true });
});

api.patch('/sets/hold', async (req, res) => {
  const { day_id, block_index, set_index, date, hold_seconds } = req.body;
  await query('UPDATE set_logs SET hold_seconds = $1 WHERE user_id = $2 AND day_id = $3 AND block_index = $4 AND set_index = $5 AND date = $6', [hold_seconds ?? null, req.user.id, day_id, block_index, set_index, date]);
  res.json({ ok: true });
});

api.post('/circuits', async (req, res) => {
  const { day_id, block_index, date, done, rounds_completed } = req.body;
  if (!day_id || block_index == null || !date) {
    return res.status(400).json({ error: 'day_id, block_index, date are required' });
  }
  if (done) {
    await query(
      `INSERT INTO circuit_logs (user_id, day_id, block_index, date, rounds_completed, completed_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (user_id, day_id, block_index, date)
       DO UPDATE SET rounds_completed = excluded.rounds_completed, completed_at = excluded.completed_at`,
      [req.user.id, day_id, block_index, date, rounds_completed ?? 0]
    );
  } else {
    await query('DELETE FROM circuit_logs WHERE user_id = $1 AND day_id = $2 AND block_index = $3 AND date = $4', [req.user.id, day_id, block_index, date]);
  }
  res.json({ ok: true });
});

api.post('/day/reset', async (req, res) => {
  const { day_id, date } = req.body;
  if (!day_id || !date) return res.status(400).json({ error: 'day_id and date are required' });
  await query('DELETE FROM set_logs WHERE user_id = $1 AND day_id = $2 AND date = $3', [req.user.id, day_id, date]);
  await query('DELETE FROM circuit_logs WHERE user_id = $1 AND day_id = $2 AND date = $3', [req.user.id, day_id, date]);
  res.json({ ok: true });
});

api.get('/history/:dayId/:blockIndex', async (req, res) => {
  const { dayId } = req.params;
  const blockIndex = Number(req.params.blockIndex);
  const limit = Number(req.query.limit) || 20;
  const rows = await query(
    'SELECT date, set_index, weight, hold_seconds, completed_at FROM set_logs WHERE user_id = $1 AND day_id = $2 AND block_index = $3 ORDER BY date DESC, set_index ASC',
    [req.user.id, dayId, blockIndex]
  );
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date).push({ set_index: row.set_index, weight: row.weight, hold_seconds: row.hold_seconds, completed_at: row.completed_at });
  }
  const sessions = Array.from(byDate.entries())
    .slice(0, limit)
    .map(([date, sets]) => ({ date, sets }));
  res.json({ sessions });
});

api.get('/streak', async (req, res) => {
  const rows = await query('SELECT date FROM set_logs WHERE user_id = $1 UNION SELECT date FROM circuit_logs WHERE user_id = $1', [req.user.id]);
  res.json({ streak: computeStreak(rows.map((r) => r.date)) });
});

/* ---------- journal & stats (all scoped to req.user.id) ---------- */

function dateRange(req) {
  // Wide-open defaults so callers can omit start/end for "everything."
  return { start: req.query.start || '0000-01-01', end: req.query.end || '9999-12-31' };
}

// Bulk version of /api/progress for an arbitrary date range — the
// adherence heatmap needs every day in the selected period in one call
// rather than one request per day.
api.get('/stats/logs', async (req, res) => {
  const { start, end } = dateRange(req);
  const sets = await query('SELECT day_id, block_index, set_index, date, weight FROM set_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3', [req.user.id, start, end]);
  const circuits = await query('SELECT day_id, block_index, date, rounds_completed FROM circuit_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3', [req.user.id, start, end]);
  res.json({ sets, circuits });
});

/* ---------- journal ---------- */

api.get('/journal', async (req, res) => {
  const { start, end } = dateRange(req);
  const entries = await query(
    'SELECT id, date, day_id, text, created_at, updated_at FROM journal_entries WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC',
    [req.user.id, start, end]
  );
  const ids = entries.map((e) => e.id);
  const photosByEntry = new Map();
  if (ids.length) {
    const photoRows = await query('SELECT id, journal_entry_id FROM journal_photos WHERE journal_entry_id = ANY($1::int[]) ORDER BY id ASC', [ids]);
    for (const p of photoRows) {
      if (!photosByEntry.has(p.journal_entry_id)) photosByEntry.set(p.journal_entry_id, []);
      photosByEntry.get(p.journal_entry_id).push(p.id);
    }
  }
  res.json({ entries: entries.map((e) => ({ ...e, photo_ids: photosByEntry.get(e.id) || [] })) });
});

api.post('/journal', async (req, res) => {
  const { date, day_id, text } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  const rows = await query(
    `INSERT INTO journal_entries (user_id, date, day_id, text, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, date)
     DO UPDATE SET day_id = excluded.day_id, text = excluded.text, updated_at = now()
     RETURNING id, date, day_id, text, created_at, updated_at`,
    [req.user.id, date, day_id ?? null, text ?? '']
  );
  res.json({ entry: rows[0] });
});

api.delete('/journal/:id', async (req, res) => {
  await query('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

api.post('/journal/:entryId/photos', async (req, res) => {
  const { mime, data } = req.body || {};
  if (!mime || !data) return res.status(400).json({ error: 'mime and data are required' });
  // Ownership check — the entry must belong to this user before we attach a photo to it.
  const owned = await query('SELECT id FROM journal_entries WHERE id = $1 AND user_id = $2', [req.params.entryId, req.user.id]);
  if (!owned.length) return res.status(404).json({ error: 'Journal entry not found' });
  const rows = await query('INSERT INTO journal_photos (journal_entry_id, data, mime_type) VALUES ($1, $2, $3) RETURNING id', [req.params.entryId, Buffer.from(data, 'base64'), mime]);
  res.json({ id: rows[0].id });
});

api.get('/journal/photos/:id', async (req, res) => {
  const rows = await query(
    `SELECT p.data, p.mime_type FROM journal_photos p
     JOIN journal_entries e ON e.id = p.journal_entry_id
     WHERE p.id = $1 AND e.user_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).end();
  res.set('Content-Type', rows[0].mime_type);
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  res.send(rows[0].data);
});

api.delete('/journal/photos/:id', async (req, res) => {
  await query(
    `DELETE FROM journal_photos p USING journal_entries e
     WHERE p.id = $1 AND p.journal_entry_id = e.id AND e.user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

/* ---------- body composition & measurements ---------- */

api.get('/body-logs', async (req, res) => {
  const { start, end } = dateRange(req);
  const rows = await query('SELECT date, weight, muscle_mass, fat_mass, body_fat_percent, notes FROM body_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date ASC', [req.user.id, start, end]);
  res.json({ logs: rows });
});

api.post('/body-logs', async (req, res) => {
  const { date, weight, muscle_mass, fat_mass, body_fat_percent, notes } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  await query(
    `INSERT INTO body_logs (user_id, date, weight, muscle_mass, fat_mass, body_fat_percent, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, date)
     DO UPDATE SET weight = excluded.weight, muscle_mass = excluded.muscle_mass, fat_mass = excluded.fat_mass, body_fat_percent = excluded.body_fat_percent, notes = excluded.notes`,
    [req.user.id, date, weight ?? null, muscle_mass ?? null, fat_mass ?? null, body_fat_percent ?? null, notes ?? null]
  );
  res.json({ ok: true });
});

api.get('/body-measurements', async (req, res) => {
  const { start, end } = dateRange(req);
  const type = req.query.type;
  const rows = type
    ? await query('SELECT date, measurement_type, value, unit FROM body_measurements WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND measurement_type = $4 ORDER BY date ASC', [req.user.id, start, end, type])
    : await query('SELECT date, measurement_type, value, unit FROM body_measurements WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date ASC', [req.user.id, start, end]);
  res.json({ measurements: rows });
});

api.post('/body-measurements', async (req, res) => {
  const { date, measurement_type, value, unit } = req.body || {};
  if (!date || !measurement_type || value == null) return res.status(400).json({ error: 'date, measurement_type, and value are required' });
  await query(
    `INSERT INTO body_measurements (user_id, date, measurement_type, value, unit)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, date, measurement_type)
     DO UPDATE SET value = excluded.value, unit = excluded.unit`,
    [req.user.id, date, measurement_type, value, unit || 'cm']
  );
  res.json({ ok: true });
});

/* ---------- nutrition ---------- */

api.get('/nutrition-logs', async (req, res) => {
  const { start, end } = dateRange(req);
  const rows = await query('SELECT date, calories, protein_g, fiber_g, carbs_g, fat_g, notes FROM nutrition_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date ASC', [req.user.id, start, end]);
  res.json({ logs: rows });
});

api.post('/nutrition-logs', async (req, res) => {
  const { date, calories, protein_g, fiber_g, carbs_g, fat_g, notes } = req.body || {};
  if (!date) return res.status(400).json({ error: 'date is required' });
  await query(
    `INSERT INTO nutrition_logs (user_id, date, calories, protein_g, fiber_g, carbs_g, fat_g, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, date)
     DO UPDATE SET calories = excluded.calories, protein_g = excluded.protein_g, fiber_g = excluded.fiber_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g, notes = excluded.notes`,
    [req.user.id, date, calories ?? null, protein_g ?? null, fiber_g ?? null, carbs_g ?? null, fat_g ?? null, notes ?? null]
  );
  res.json({ ok: true });
});

api.get('/nutrition-goals', async (req, res) => {
  const rows = await query('SELECT id, effective_from, calories_goal, protein_goal, fiber_goal FROM nutrition_goals WHERE user_id = $1 ORDER BY effective_from DESC', [req.user.id]);
  res.json({ goals: rows });
});

api.post('/nutrition-goals', async (req, res) => {
  const { effective_from, calories_goal, protein_goal, fiber_goal } = req.body || {};
  if (!effective_from) return res.status(400).json({ error: 'effective_from is required' });
  // Always inserted, never updated in place — so a past date's adherence
  // stays measured against whatever goal was active then.
  const rows = await query(
    'INSERT INTO nutrition_goals (user_id, effective_from, calories_goal, protein_goal, fiber_goal) VALUES ($1, $2, $3, $4, $5) RETURNING id, effective_from, calories_goal, protein_goal, fiber_goal',
    [req.user.id, effective_from, calories_goal ?? null, protein_goal ?? null, fiber_goal ?? null]
  );
  res.json({ goal: rows[0] });
});

/* ---------- per-user UI preferences (e.g. collapsed sections) ---------- */

api.get('/ui-prefs', async (req, res) => {
  const rows = await query('SELECT collapsed_sections FROM ui_prefs WHERE user_id = $1', [req.user.id]);
  res.json({ collapsed_sections: rows[0]?.collapsed_sections || {} });
});

api.put('/ui-prefs', async (req, res) => {
  const { collapsed_sections } = req.body || {};
  await query(
    `INSERT INTO ui_prefs (user_id, collapsed_sections) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET collapsed_sections = excluded.collapsed_sections`,
    [req.user.id, JSON.stringify(collapsed_sections || {})]
  );
  res.json({ ok: true });
});

app.use('/api', api);

// Serve the production build if it exists (npm run build first) — used for
// local "npm start" / LAN mode. On Vercel the static build is served by the
// platform directly, so this branch is simply skipped there.
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Central error handler — without this, a thrown/rejected error in any async
// route above would hang the request instead of returning a response.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
