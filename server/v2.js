// v2 routes: settings, exercise library overrides, plans, session log, day extras,
// progress tests, legacy-log read, and JSON backup export/import.
// Mounted behind requireAuth by app.js — every query is scoped to req.user.id,
// which always comes from the verified session, never from the request.
import { query, pool } from './db.js';

export const BACKUP_APP = 'weekly-training-log';
export const BACKUP_VERSION = 2;

const STATUSES = new Set(['completed', 'incomplete', 'skipped']);
const KINDS = new Set(['work', 'rest', 'countdown']);

const intOrNull = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));
const realOrNull = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isId = (s) => typeof s === 'string' && s.length > 0 && s.length <= 200;

function dateRange(req) {
  return { start: req.query.start || '0000-01-01', end: req.query.end || '9999-12-31' };
}

/* ---------- row <-> object ---------- */

function sessionRow(r) {
  return {
    session_key: r.session_key,
    date: r.date,
    plan_id: r.plan_id,
    tpl_day: r.tpl_day,
    session_id: r.session_id,
    name_en: r.name_en,
    name_ar: r.name_ar,
    optional: r.optional,
    planned: r.planned,
    source: r.source,
  };
}

function itemRow(r) {
  return {
    item_key: r.item_key,
    session_key: r.session_key,
    date: r.date,
    entry_key: r.entry_key,
    set_index: r.set_index,
    exercise_id: r.exercise_id,
    exercise_name: r.exercise_name,
    ex_type: r.ex_type,
    kind: r.kind,
    status: r.status,
    planned_reps: r.planned_reps,
    planned_seconds: r.planned_seconds,
    reps_done: r.reps_done,
    weight: r.weight,
    hold_seconds: r.hold_seconds,
    rounds: r.rounds,
    duration_seconds: r.duration_seconds,
    completed_at: r.completed_at,
    source: r.source,
  };
}

/** Validates + normalises a client-sent session snapshot. Returns null if unusable. */
export function cleanSession(s) {
  if (!s || !isId(s.session_key) || !isDate(s.date)) return null;
  return {
    session_key: s.session_key,
    date: s.date,
    plan_id: s.plan_id ?? null,
    tpl_day: s.tpl_day ?? null,
    session_id: s.session_id ?? null,
    name_en: s.name_en ?? null,
    name_ar: s.name_ar ?? null,
    optional: !!s.optional,
    planned: Array.isArray(s.planned) ? s.planned : [],
    source: s.source || 'app',
  };
}

/** Validates + normalises a client-sent item. Returns null if unusable. */
export function cleanItem(i) {
  if (!i || !isId(i.item_key) || !isId(i.session_key) || !isDate(i.date) || !isId(i.entry_key)) return null;
  const status = STATUSES.has(i.status) ? i.status : 'completed';
  const kind = KINDS.has(i.kind) ? i.kind : 'work';
  return {
    item_key: i.item_key,
    session_key: i.session_key,
    date: i.date,
    entry_key: i.entry_key,
    set_index: intOrNull(i.set_index) ?? 0,
    exercise_id: i.exercise_id ?? null,
    exercise_name: i.exercise_name ?? null,
    ex_type: i.ex_type ?? null,
    kind,
    status,
    planned_reps: intOrNull(i.planned_reps),
    planned_seconds: intOrNull(i.planned_seconds),
    reps_done: intOrNull(i.reps_done),
    weight: realOrNull(i.weight),
    hold_seconds: intOrNull(i.hold_seconds),
    rounds: intOrNull(i.rounds),
    duration_seconds: intOrNull(i.duration_seconds),
    completed_at: i.completed_at || new Date().toISOString(),
    source: i.source || 'app',
  };
}

async function upsertSession(client, userId, s) {
  await client.query(
    `INSERT INTO session_log (user_id, session_key, date, plan_id, tpl_day, session_id, name_en, name_ar, optional, planned, source, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
     ON CONFLICT (user_id, session_key) DO UPDATE SET
       plan_id = excluded.plan_id, tpl_day = excluded.tpl_day, session_id = excluded.session_id,
       name_en = excluded.name_en, name_ar = excluded.name_ar, optional = excluded.optional,
       planned = excluded.planned, updated_at = now()`,
    [userId, s.session_key, s.date, s.plan_id, s.tpl_day, s.session_id, s.name_en, s.name_ar, s.optional, JSON.stringify(s.planned), s.source]
  );
}

async function upsertItem(client, userId, i) {
  await client.query(
    `INSERT INTO session_items (user_id, item_key, session_key, date, entry_key, set_index, exercise_id, exercise_name, ex_type, kind, status,
        planned_reps, planned_seconds, reps_done, weight, hold_seconds, rounds, duration_seconds, completed_at, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (user_id, item_key) DO UPDATE SET
        status = excluded.status, exercise_id = excluded.exercise_id, exercise_name = excluded.exercise_name, ex_type = excluded.ex_type,
        planned_reps = excluded.planned_reps, planned_seconds = excluded.planned_seconds, reps_done = excluded.reps_done,
        weight = excluded.weight, hold_seconds = excluded.hold_seconds, rounds = excluded.rounds,
        duration_seconds = excluded.duration_seconds, completed_at = excluded.completed_at`,
    [userId, i.item_key, i.session_key, i.date, i.entry_key, i.set_index, i.exercise_id, i.exercise_name, i.ex_type, i.kind, i.status,
      i.planned_reps, i.planned_seconds, i.reps_done, i.weight, i.hold_seconds, i.rounds, i.duration_seconds, i.completed_at, i.source]
  );
}

async function inTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export function mountV2(api) {
  /* ---------- settings ---------- */
  api.get('/settings', async (req, res) => {
    const rows = await query('SELECT data FROM user_settings WHERE user_id = $1', [req.user.id]);
    res.json({ settings: rows[0]?.data || {} });
  });

  api.put('/settings', async (req, res) => {
    const settings = req.body?.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return res.status(400).json({ error: 'settings object is required' });
    await query(
      `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = now()`,
      [req.user.id, JSON.stringify(settings)]
    );
    res.json({ ok: true });
  });

  /* ---------- exercise library (overrides + custom) ---------- */
  api.get('/exercises', async (req, res) => {
    const rows = await query('SELECT exercise_id, data, archived FROM user_exercises WHERE user_id = $1 ORDER BY exercise_id', [req.user.id]);
    res.json({ exercises: rows.map((r) => ({ id: r.exercise_id, data: r.data, archived: r.archived })) });
  });

  api.put('/exercises/:id', async (req, res) => {
    const { data, archived } = req.body || {};
    if (!isId(req.params.id) || !data || typeof data !== 'object') return res.status(400).json({ error: 'id and data are required' });
    await query(
      `INSERT INTO user_exercises (user_id, exercise_id, data, archived, updated_at) VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (user_id, exercise_id) DO UPDATE SET data = excluded.data, archived = excluded.archived, updated_at = now()`,
      [req.user.id, req.params.id, JSON.stringify(data), !!archived]
    );
    res.json({ ok: true });
  });

  // Removes the override / custom exercise only. Logged history keeps its own
  // name + planned-values snapshot, so nothing in the past is erased.
  api.delete('/exercises/:id', async (req, res) => {
    await query('DELETE FROM user_exercises WHERE user_id = $1 AND exercise_id = $2', [req.user.id, req.params.id]);
    res.json({ ok: true });
  });

  /* ---------- plans ---------- */
  api.get('/plans', async (req, res) => {
    const rows = await query('SELECT plan_id, data, sort_order FROM plans WHERE user_id = $1 ORDER BY sort_order, plan_id', [req.user.id]);
    res.json({ plans: rows.map((r) => ({ id: r.plan_id, sort_order: r.sort_order, data: r.data })) });
  });

  api.put('/plans/:id', async (req, res) => {
    const { data, sort_order } = req.body || {};
    if (!isId(req.params.id) || !data || typeof data !== 'object') return res.status(400).json({ error: 'id and data are required' });
    await query(
      `INSERT INTO plans (user_id, plan_id, data, sort_order, updated_at) VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (user_id, plan_id) DO UPDATE SET data = excluded.data, sort_order = excluded.sort_order, updated_at = now()`,
      [req.user.id, req.params.id, JSON.stringify(data), intOrNull(sort_order) ?? 0]
    );
    res.json({ ok: true });
  });

  api.delete('/plans/:id', async (req, res) => {
    await query('DELETE FROM plans WHERE user_id = $1 AND plan_id = $2', [req.user.id, req.params.id]);
    res.json({ ok: true });
  });

  /* ---------- session log ---------- */
  api.get('/session-log', async (req, res) => {
    const { start, end } = dateRange(req);
    const sessions = await query('SELECT * FROM session_log WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date, session_key', [req.user.id, start, end]);
    const items = await query('SELECT * FROM session_items WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date, completed_at', [req.user.id, start, end]);
    res.json({ sessions: sessions.map(sessionRow), items: items.map(itemRow) });
  });

  // Upserts a session snapshot and/or items in one transaction.
  api.post('/session-log', async (req, res) => {
    const sessions = (Array.isArray(req.body?.sessions) ? req.body.sessions : []).map(cleanSession).filter(Boolean);
    const items = (Array.isArray(req.body?.items) ? req.body.items : []).map(cleanItem).filter(Boolean);
    await inTransaction(async (c) => {
      for (const s of sessions) await upsertSession(c, req.user.id, s);
      for (const i of items) await upsertItem(c, req.user.id, i);
    });
    res.json({ ok: true, sessions: sessions.length, items: items.length });
  });

  api.delete('/session-log/items', async (req, res) => {
    const keys = Array.isArray(req.body?.item_keys) ? req.body.item_keys.filter(isId) : [];
    if (keys.length) await query('DELETE FROM session_items WHERE user_id = $1 AND item_key = ANY($2::text[])', [req.user.id, keys]);
    res.json({ ok: true, removed: keys.length });
  });

  // "Reset" for one session instance: removes its items (the explicit action the app already offers).
  api.delete('/session-log/session', async (req, res) => {
    const key = req.body?.session_key;
    if (!isId(key)) return res.status(400).json({ error: 'session_key is required' });
    await query('DELETE FROM session_items WHERE user_id = $1 AND session_key = $2', [req.user.id, key]);
    await query('DELETE FROM session_log WHERE user_id = $1 AND session_key = $2', [req.user.id, key]);
    res.json({ ok: true });
  });

  /* ---------- day extras ---------- */
  api.get('/day-extras', async (req, res) => {
    const { start, end } = dateRange(req);
    const rows = await query('SELECT date, data FROM day_extras WHERE user_id = $1 AND date BETWEEN $2 AND $3', [req.user.id, start, end]);
    res.json({ extras: rows });
  });

  api.put('/day-extras/:date', async (req, res) => {
    if (!isDate(req.params.date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    const data = req.body?.data;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data is required' });
    await query(
      `INSERT INTO day_extras (user_id, date, data) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, date) DO UPDATE SET data = excluded.data`,
      [req.user.id, req.params.date, JSON.stringify(data)]
    );
    res.json({ ok: true });
  });

  /* ---------- progress tests ---------- */
  api.get('/progress-tests', async (req, res) => {
    const rows = await query('SELECT checkpoint, tested_on, data FROM progress_tests WHERE user_id = $1', [req.user.id]);
    res.json({ tests: rows });
  });

  api.put('/progress-tests/:checkpoint', async (req, res) => {
    const { tested_on, data } = req.body || {};
    if (!isId(req.params.checkpoint) || !data || typeof data !== 'object') return res.status(400).json({ error: 'checkpoint and data are required' });
    await query(
      `INSERT INTO progress_tests (user_id, checkpoint, tested_on, data, updated_at) VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (user_id, checkpoint) DO UPDATE SET tested_on = excluded.tested_on, data = excluded.data, updated_at = now()`,
      [req.user.id, req.params.checkpoint, isDate(tested_on) ? tested_on : null, JSON.stringify(data)]
    );
    res.json({ ok: true });
  });

  /* ---------- legacy v1 logs (read-only; used by the client's v2 migration) ---------- */
  api.get('/legacy/logs', async (req, res) => {
    const sets = await query('SELECT day_id, block_index, set_index, date, weight, hold_seconds, completed_at FROM set_logs WHERE user_id = $1 ORDER BY date, day_id, block_index, set_index', [req.user.id]);
    const circuits = await query('SELECT day_id, block_index, date, rounds_completed, completed_at FROM circuit_logs WHERE user_id = $1 ORDER BY date, day_id, block_index', [req.user.id]);
    res.json({ sets, circuits });
  });

  /* ---------- backup export / import ---------- */
  api.get('/backup', async (req, res) => {
    const uid = req.user.id;
    const [settings, exercises, plans, sessions, items, extras, tests, legacySets, legacyCircuits, journal, body, measurements, nutrition, goals, prefs] = await Promise.all([
      query('SELECT data FROM user_settings WHERE user_id = $1', [uid]),
      query('SELECT exercise_id, data, archived FROM user_exercises WHERE user_id = $1', [uid]),
      query('SELECT plan_id, data, sort_order FROM plans WHERE user_id = $1', [uid]),
      query('SELECT * FROM session_log WHERE user_id = $1 ORDER BY date', [uid]),
      query('SELECT * FROM session_items WHERE user_id = $1 ORDER BY date', [uid]),
      query('SELECT date, data FROM day_extras WHERE user_id = $1', [uid]),
      query('SELECT checkpoint, tested_on, data FROM progress_tests WHERE user_id = $1', [uid]),
      query('SELECT day_id, block_index, set_index, date, weight, hold_seconds, completed_at FROM set_logs WHERE user_id = $1', [uid]),
      query('SELECT day_id, block_index, date, rounds_completed, completed_at FROM circuit_logs WHERE user_id = $1', [uid]),
      query('SELECT date, day_id, text FROM journal_entries WHERE user_id = $1', [uid]),
      query('SELECT date, weight, muscle_mass, fat_mass, body_fat_percent, notes FROM body_logs WHERE user_id = $1', [uid]),
      query('SELECT date, measurement_type, value, unit FROM body_measurements WHERE user_id = $1', [uid]),
      query('SELECT date, calories, protein_g, fiber_g, carbs_g, fat_g, notes FROM nutrition_logs WHERE user_id = $1', [uid]),
      query('SELECT effective_from, calories_goal, protein_goal, fiber_goal FROM nutrition_goals WHERE user_id = $1', [uid]),
      query('SELECT collapsed_sections FROM ui_prefs WHERE user_id = $1', [uid]),
    ]);
    res.json({
      app: BACKUP_APP,
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      user: req.user.username,
      // Journal photos are binary and can be large — they are not part of this file.
      notes: 'Journal photos are not included in this backup.',
      data: {
        settings: settings[0]?.data || {},
        exercises: exercises.map((r) => ({ id: r.exercise_id, data: r.data, archived: r.archived })),
        plans: plans.map((r) => ({ id: r.plan_id, data: r.data, sort_order: r.sort_order })),
        session_log: sessions.map(sessionRow),
        session_items: items.map(itemRow),
        day_extras: extras,
        progress_tests: tests,
        legacy: { set_logs: legacySets, circuit_logs: legacyCircuits },
        journal_entries: journal,
        body_logs: body,
        body_measurements: measurements,
        nutrition_logs: nutrition,
        nutrition_goals: goals,
        ui_prefs: prefs[0]?.collapsed_sections || {},
      },
    });
  });

  // Merge-only: rows are upserted by their natural keys, nothing is ever deleted.
  api.post('/backup/import', async (req, res) => {
    const b = req.body;
    if (!b || b.app !== BACKUP_APP) return res.status(400).json({ error: 'This is not a weekly-training-log backup file.' });
    if (!Number.isInteger(b.backupVersion) || b.backupVersion > BACKUP_VERSION) {
      return res.status(400).json({ error: `This backup is from a newer app version (v${b.backupVersion}); this app understands up to v${BACKUP_VERSION}.` });
    }
    const d = b.data || {};
    const uid = req.user.id;
    const counts = {};

    await inTransaction(async (c) => {
      if (d.settings && typeof d.settings === 'object') {
        await c.query(
          `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1,$2, now())
           ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = now()`,
          [uid, JSON.stringify(d.settings)]
        );
      }
      for (const e of d.exercises || []) {
        if (!isId(e?.id) || !e.data) continue;
        await c.query(
          `INSERT INTO user_exercises (user_id, exercise_id, data, archived) VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, exercise_id) DO UPDATE SET data = excluded.data, archived = excluded.archived, updated_at = now()`,
          [uid, e.id, JSON.stringify(e.data), !!e.archived]
        );
      }
      counts.exercises = (d.exercises || []).length;
      for (const p of d.plans || []) {
        if (!isId(p?.id) || !p.data) continue;
        await c.query(
          `INSERT INTO plans (user_id, plan_id, data, sort_order) VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, plan_id) DO UPDATE SET data = excluded.data, sort_order = excluded.sort_order, updated_at = now()`,
          [uid, p.id, JSON.stringify(p.data), intOrNull(p.sort_order) ?? 0]
        );
      }
      counts.plans = (d.plans || []).length;
      let nSessions = 0;
      for (const s of (d.session_log || []).map(cleanSession).filter(Boolean)) {
        await upsertSession(c, uid, s);
        nSessions++;
      }
      let nItems = 0;
      for (const i of (d.session_items || []).map(cleanItem).filter(Boolean)) {
        await upsertItem(c, uid, i);
        nItems++;
      }
      counts.sessions = nSessions;
      counts.items = nItems;
      for (const x of d.day_extras || []) {
        if (!isDate(x?.date) || !x.data) continue;
        await c.query(`INSERT INTO day_extras (user_id, date, data) VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO UPDATE SET data = excluded.data`, [uid, x.date, JSON.stringify(x.data)]);
      }
      for (const t of d.progress_tests || []) {
        if (!isId(t?.checkpoint) || !t.data) continue;
        await c.query(
          `INSERT INTO progress_tests (user_id, checkpoint, tested_on, data) VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, checkpoint) DO UPDATE SET tested_on = excluded.tested_on, data = excluded.data, updated_at = now()`,
          [uid, t.checkpoint, isDate(t.tested_on) ? t.tested_on : null, JSON.stringify(t.data)]
        );
      }
      // Legacy v1 logs: insert-if-missing only.
      for (const s of d.legacy?.set_logs || []) {
        if (!isId(s?.day_id) || !isDate(s.date)) continue;
        await c.query(
          `INSERT INTO set_logs (user_id, day_id, block_index, set_index, date, weight, hold_seconds, completed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
          [uid, s.day_id, intOrNull(s.block_index) ?? 0, intOrNull(s.set_index) ?? 0, s.date, realOrNull(s.weight), intOrNull(s.hold_seconds), s.completed_at || new Date().toISOString()]
        );
      }
      for (const s of d.legacy?.circuit_logs || []) {
        if (!isId(s?.day_id) || !isDate(s.date)) continue;
        await c.query(
          `INSERT INTO circuit_logs (user_id, day_id, block_index, date, rounds_completed, completed_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [uid, s.day_id, intOrNull(s.block_index) ?? 0, s.date, intOrNull(s.rounds_completed) ?? 0, s.completed_at || new Date().toISOString()]
        );
      }
      for (const j of d.journal_entries || []) {
        if (!isDate(j?.date)) continue;
        await c.query(
          `INSERT INTO journal_entries (user_id, date, day_id, text) VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, date) DO NOTHING`,
          [uid, j.date, j.day_id ?? null, j.text ?? '']
        );
      }
      for (const r of d.body_logs || []) {
        if (!isDate(r?.date)) continue;
        await c.query(
          `INSERT INTO body_logs (user_id, date, weight, muscle_mass, fat_mass, body_fat_percent, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (user_id, date) DO NOTHING`,
          [uid, r.date, realOrNull(r.weight), realOrNull(r.muscle_mass), realOrNull(r.fat_mass), realOrNull(r.body_fat_percent), r.notes ?? null]
        );
      }
      for (const r of d.body_measurements || []) {
        if (!isDate(r?.date) || !isId(r?.measurement_type) || realOrNull(r.value) == null) continue;
        await c.query(
          `INSERT INTO body_measurements (user_id, date, measurement_type, value, unit) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (user_id, date, measurement_type) DO NOTHING`,
          [uid, r.date, r.measurement_type, Number(r.value), r.unit || 'cm']
        );
      }
      for (const r of d.nutrition_logs || []) {
        if (!isDate(r?.date)) continue;
        await c.query(
          `INSERT INTO nutrition_logs (user_id, date, calories, protein_g, fiber_g, carbs_g, fat_g, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (user_id, date) DO NOTHING`,
          [uid, r.date, realOrNull(r.calories), realOrNull(r.protein_g), realOrNull(r.fiber_g), realOrNull(r.carbs_g), realOrNull(r.fat_g), r.notes ?? null]
        );
      }
    });

    res.json({ ok: true, imported: counts });
  });
}
