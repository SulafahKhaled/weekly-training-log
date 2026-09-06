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
app.use(express.json());

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
  const sets = await query('SELECT day_id, block_index, set_index, weight FROM set_logs WHERE user_id = $1 AND date = $2', [req.user.id, date]);
  const circuits = await query('SELECT day_id, block_index, rounds_completed FROM circuit_logs WHERE user_id = $1 AND date = $2', [req.user.id, date]);
  res.json({ date, sets, circuits });
});

api.post('/sets', async (req, res) => {
  const { day_id, block_index, set_index, date, done, weight } = req.body;
  if (!day_id || block_index == null || set_index == null || !date) {
    return res.status(400).json({ error: 'day_id, block_index, set_index, date are required' });
  }
  if (done) {
    await query(
      `INSERT INTO set_logs (user_id, day_id, block_index, set_index, date, weight, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (user_id, day_id, block_index, set_index, date)
       DO UPDATE SET weight = excluded.weight, completed_at = excluded.completed_at`,
      [req.user.id, day_id, block_index, set_index, date, weight ?? null]
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
    'SELECT date, set_index, weight, completed_at FROM set_logs WHERE user_id = $1 AND day_id = $2 AND block_index = $3 ORDER BY date DESC, set_index ASC',
    [req.user.id, dayId, blockIndex]
  );
  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date).push({ set_index: row.set_index, weight: row.weight, completed_at: row.completed_at });
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
