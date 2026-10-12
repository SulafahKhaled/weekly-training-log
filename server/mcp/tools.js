/* =========================================================
   MCP tool implementations. Pure logic over a tiny db adapter:
       db.query(sql, params) -> rows        db.tx(async (q) => ...) -> result
   Every function is scoped to `userId` (resolved from the connector token, never from tool input),
   writes `source: 'claude'`, returns the saved record(s) with an `id` that update_entry /
   delete_entry accept, and is idempotent when a `request_id` is supplied.
   ========================================================= */
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { DEFAULT_SETTINGS, mergeSettings, sessionsForDate, snapshotEntries, effectiveEntry, sessionKey } from '../../src/lib/plan.js';
import { totals, streaks, weeklySessionStats } from '../../src/lib/stats.js';
import { addDays, dayIdOf, startOfWeek, weekdayOf } from '../../src/lib/dates.js';

const require = createRequire(import.meta.url);
const BUILTIN = require('../exerciseIndex.generated.json');

export class ToolError extends Error {}

const DAY_NAMES = {
  sun: 'sun', sunday: 'sun', الأحد: 'sun', mon: 'mon', monday: 'mon', الاثنين: 'mon', الإثنين: 'mon', tue: 'tue', tues: 'tue', tuesday: 'tue', الثلاثاء: 'tue',
  wed: 'wed', wednesday: 'wed', الأربعاء: 'wed', thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu', الخميس: 'thu', fri: 'fri', friday: 'fri', الجمعة: 'fri', sat: 'sat', saturday: 'sat', السبت: 'sat',
};
const SESSION_STATUS = ['completed', 'incomplete', 'skipped'];

export function todayInTz(tz = DEFAULT_SETTINGS.timezone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const num = (v) => (v == null ? null : Number(v));

function assertDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) throw new ToolError(`"${d}" is not a valid date; use YYYY-MM-DD.`);
  return d;
}

export function createTools(db, userId, { now = () => new Date() } = {}) {
  /* ---------- context ---------- */
  async function loadSettings() {
    const rows = await db.query('SELECT data FROM user_settings WHERE user_id = $1', [userId]);
    return mergeSettings(rows[0]?.data || {});
  }
  async function loadPlans() {
    const rows = await db.query('SELECT plan_id, data, sort_order FROM plans WHERE user_id = $1 ORDER BY sort_order', [userId]);
    return rows.map((r) => ({ ...r.data, id: r.plan_id }));
  }
  async function loadLibrary() {
    const rows = await db.query('SELECT exercise_id, data, archived FROM user_exercises WHERE user_id = $1', [userId]);
    const byId = new Map(BUILTIN.map((e) => [e.id, { ...e }]));
    for (const r of rows) {
      const base = byId.get(r.exercise_id) || { id: r.exercise_id, type: 'reps', sets: 3, reps: 12, seconds: null, rest: 30, primary: [], secondary: [], groups: [] };
      byId.set(r.exercise_id, { ...base, ...r.data, id: r.exercise_id, archived: !!r.archived, custom: !BUILTIN.some((b) => b.id === r.exercise_id) });
    }
    return byId;
  }
  const today = (settings) => todayInTz(settings.timezone, now());

  function matchExercise(lib, ref) {
    const raw = String(ref).trim();
    if (lib.has(raw)) return { ex: lib.get(raw), how: 'id' };
    const q = norm(raw);
    const all = [...lib.values()].filter((e) => !e.archived);
    const names = (e) => [e.name?.en, e.name?.ar].filter(Boolean).map(norm);
    const exact = all.filter((e) => names(e).includes(q));
    if (exact.length >= 1) return { ex: exact[0], how: 'name' };
    const qt = q.split(' ').filter(Boolean);
    if (qt.length) {
      const fuzzy = all.filter((e) => names(e).some((n) => qt.every((t) => n.split(' ').includes(t) || n.includes(t))));
      if (fuzzy.length === 1) return { ex: fuzzy[0], how: 'fuzzy' };
      if (fuzzy.length > 1) {
        const tight = fuzzy.filter((e) => names(e).some((n) => n.split(' ').length === qt.length));
        if (tight.length === 1) return { ex: tight[0], how: 'fuzzy' };
      }
    }
    return null;
  }

  async function idempotent(tool, requestId, fn) {
    if (requestId) {
      const prev = await db.query('SELECT result FROM mcp_requests WHERE user_id = $1 AND request_id = $2', [userId, requestId]);
      if (prev[0]) return { ...prev[0].result, duplicate_request: true };
    }
    const result = await fn();
    if (requestId) {
      await db.query(
        'INSERT INTO mcp_requests (user_id, request_id, tool, result) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id, request_id) DO NOTHING',
        [userId, requestId, tool, JSON.stringify(result)]
      );
    }
    return result;
  }

  const mealOut = (r) => ({
    id: `meal:${r.id}`, date: r.date, meal_type: r.meal_type, description: r.description,
    calories: r.calories, protein_g: r.protein_g, fiber_g: r.fiber_g, carbs_g: r.carbs_g, fat_g: r.fat_g,
    estimated: r.estimated, source: r.source,
  });

  /* ---------- writes ---------- */
  async function log_meal(a) {
    return idempotent('log_meal', a.request_id, async () => {
      const settings = await loadSettings();
      const date = assertDate(a.date || today(settings));
      const hasNumbers = [a.calories, a.protein_g, a.fiber_g, a.carbs_g, a.fat_g].some((v) => v != null);
      // Numbers Claude supplies are estimates unless it explicitly says they were given by the user.
      const estimated = a.estimated ?? hasNumbers;
      const rows = await db.query(
        `INSERT INTO meals (user_id, date, meal_type, description, calories, protein_g, fiber_g, carbs_g, fat_g, estimated, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'claude') RETURNING *`,
        [userId, date, a.meal_type || 'other', a.description, a.calories ?? null, a.protein_g ?? null, a.fiber_g ?? null, a.carbs_g ?? null, a.fat_g ?? null, estimated]
      );
      return { saved: mealOut(rows[0]) };
    });
  }

  async function log_workout(a) {
    return idempotent('log_workout', a.request_id, async () => {
      const settings = await loadSettings();
      const date = assertDate(a.date || today(settings));
      const [plans, lib] = await Promise.all([loadPlans(), loadLibrary()]);
      const plan = plans.find((p) => p.id === settings.activePlanId) || plans[0] || null;
      const warnings = [];
      const created = [];

      // optional link to a plan session ("Monday", "Upper A", …)
      let tpl = null;
      if (a.plan_or_day) {
        const key = norm(a.plan_or_day);
        const day = DAY_NAMES[key] || DAY_NAMES[String(a.plan_or_day).trim()];
        if (plan && day) {
          const s = (plan.days[day] || []).find((x) => x.id === 'main') || (plan.days[day] || []).find((x) => !x.optional);
          if (s) tpl = { day, session: s };
        }
        if (plan && !tpl) {
          for (const d of Object.keys(plan.days)) {
            const s = plan.days[d].find((x) => norm(x.name?.en) === key || norm(x.name?.ar) === key || norm(x.name?.en).includes(key));
            if (s) {
              tpl = { day: d, session: s };
              break;
            }
          }
        }
        if (!tpl) warnings.push(`No plan day or session matched "${a.plan_or_day}"; logged as free exercises.`);
      }

      const out = await db.tx(async (q) => {
        const items = [];
        const sessions = new Map();
        const freeKey = sessionKey(date, null, null, 'claude');
        const snapshotFor = (session, key, planId, tplDay) => {
          if (sessions.has(key)) return;
          if (session) {
            const byId = new Map([...lib].map(([id, e]) => [id, { ...e, name: e.name || { en: id, ar: '' } }]));
            sessions.set(key, { key, plan_id: planId, tpl_day: tplDay, session_id: session.id, name_en: session.name.en, name_ar: session.name.ar || '', optional: !!session.optional, planned: snapshotEntries(session, plan, byId, settings) });
          } else {
            sessions.set(key, { key, plan_id: null, tpl_day: null, session_id: 'claude', name_en: 'Logged by Claude', name_ar: '', optional: true, planned: [] });
          }
        };

        for (const entry of a.exercises) {
          let found = matchExercise(lib, entry.exercise);
          let ex;
          if (found) ex = found.ex;
          else {
            const timed = entry.sets.some((s) => s.seconds != null) && entry.sets.every((s) => s.reps == null);
            const id = `ex_${crypto.randomBytes(5).toString('hex')}`;
            ex = { id, name: { en: String(entry.exercise).trim(), ar: '' }, type: timed ? 'hold' : 'reps', sets: 3, reps: timed ? null : 12, seconds: timed ? 30 : null, rest: 30, countdown: null, perSide: false, primary: [], secondary: [], groups: [], notes: '', how: '', dose: '', direction: '', media: null, source: 'custom' };
            await q(
              `INSERT INTO user_exercises (user_id, exercise_id, data, archived) VALUES ($1,$2,$3,false) ON CONFLICT DO NOTHING`,
              [userId, id, JSON.stringify(ex)]
            );
            lib.set(id, { ...ex, custom: true });
            created.push({ id, name: ex.name.en });
            found = { ex, how: 'created' };
          }

          // use the plan entry's key when this exercise is part of the linked session
          const tplEntry = tpl?.session.entries.find((e) => e.kind === 'exercise' && e.exerciseId === ex.id);
          const sKey = tplEntry ? sessionKey(date, plan.id, tpl.day, tpl.session.id) : freeKey;
          const entryKey = tplEntry ? tplEntry.eid : ex.id;
          if (tplEntry) snapshotFor(tpl.session, sKey, plan.id, tpl.day);
          else snapshotFor(null, freeKey);
          const eff = tplEntry ? effectiveEntry(tplEntry, ex, plan, settings) : { type: ex.type, reps: ex.reps, seconds: ex.seconds };

          const existing = await q(`SELECT COALESCE(MAX(set_index), -1) AS m FROM session_items WHERE user_id = $1 AND session_key = $2 AND entry_key = $3 AND kind = 'work'`, [userId, sKey, entryKey]);
          let idx = Number(existing[0].m) + 1;
          for (const s of entry.sets) {
            const status = s.status || entry.status || 'completed';
            const timed = ex.type !== 'reps';
            const row = {
              item_key: `${sKey}|${entryKey}|${idx}`, session_key: sKey, date, entry_key: entryKey, set_index: idx,
              exercise_id: ex.id, exercise_name: ex.name?.en || ex.id, ex_type: ex.type,
              status, planned_reps: eff.reps ?? null, planned_seconds: eff.seconds ?? null,
              reps_done: !timed ? (s.reps ?? (status === 'completed' ? eff.reps ?? null : null)) : null,
              weight: s.weight_kg ?? null,
              hold_seconds: timed ? (s.seconds ?? (status === 'completed' ? eff.seconds ?? null : null)) : null,
              duration_seconds: s.seconds ?? null,
            };
            await q(
              `INSERT INTO session_items (user_id, item_key, session_key, date, entry_key, set_index, exercise_id, exercise_name, ex_type, kind, status,
                 planned_reps, planned_seconds, reps_done, weight, hold_seconds, duration_seconds, completed_at, source)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'work',$10,$11,$12,$13,$14,$15,$16, now(),'claude')
               ON CONFLICT (user_id, item_key) DO UPDATE SET status = excluded.status, reps_done = excluded.reps_done, weight = excluded.weight,
                 hold_seconds = excluded.hold_seconds, duration_seconds = excluded.duration_seconds, source = 'claude'`,
              [userId, row.item_key, sKey, date, entryKey, idx, row.exercise_id, row.exercise_name, row.ex_type, status, row.planned_reps, row.planned_seconds, row.reps_done, row.weight, row.hold_seconds, row.duration_seconds]
            );
            items.push({ id: `item:${row.item_key}`, exercise: row.exercise_name, exercise_id: ex.id, matched: found.how, set_index: idx, status, reps: row.reps_done, weight_kg: row.weight, seconds: row.hold_seconds ?? row.duration_seconds });
            idx++;
          }
        }
        for (const s of sessions.values()) {
          await q(
            `INSERT INTO session_log (user_id, session_key, date, plan_id, tpl_day, session_id, name_en, name_ar, optional, planned, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'claude') ON CONFLICT (user_id, session_key) DO NOTHING`,
            [userId, s.key, date, s.plan_id, s.tpl_day, s.session_id, s.name_en, s.name_ar, s.optional, JSON.stringify(s.planned)]
          );
        }
        return { items, sessions: [...sessions.keys()] };
      });
      return { saved: { date, linked_to: tpl ? `${tpl.day}:${tpl.session.name.en}` : null, sessions: out.sessions, items: out.items }, created_exercises: created, warnings };
    });
  }

  async function log_measurement(a) {
    return idempotent('log_measurement', a.request_id, async () => {
      const settings = await loadSettings();
      const date = assertDate(a.date || today(settings));
      const body = { weight: a.weight_kg, muscle_mass: a.muscle_mass_kg, fat_mass: a.fat_mass_kg, body_fat_percent: a.body_fat_percent };
      const saved = { date, id: [], values: {} };
      if (Object.values(body).some((v) => v != null) || a.notes) {
        await db.query(
          `INSERT INTO body_logs (user_id, date, weight, muscle_mass, fat_mass, body_fat_percent, notes, source)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'claude')
           ON CONFLICT (user_id, date) DO UPDATE SET
             weight = COALESCE(excluded.weight, body_logs.weight), muscle_mass = COALESCE(excluded.muscle_mass, body_logs.muscle_mass),
             fat_mass = COALESCE(excluded.fat_mass, body_logs.fat_mass), body_fat_percent = COALESCE(excluded.body_fat_percent, body_logs.body_fat_percent),
             notes = COALESCE(excluded.notes, body_logs.notes), source = 'claude'`,
          [userId, date, body.weight ?? null, body.muscle_mass ?? null, body.fat_mass ?? null, body.body_fat_percent ?? null, a.notes ?? null]
        );
        saved.id.push(`body:${date}`);
        Object.assign(saved.values, Object.fromEntries(Object.entries(body).filter(([, v]) => v != null)));
      }
      const cm = { neck: a.neck_cm, waist: a.waist_cm, hips: a.hips_cm, arms: a.arms_cm, thighs: a.thighs_cm };
      for (const [type, value] of Object.entries(cm)) {
        if (value == null) continue;
        await db.query(
          `INSERT INTO body_measurements (user_id, date, measurement_type, value, unit, source) VALUES ($1,$2,$3,$4,'cm','claude')
           ON CONFLICT (user_id, date, measurement_type) DO UPDATE SET value = excluded.value, source = 'claude'`,
          [userId, date, type, value]
        );
        saved.id.push(`measure:${date}:${type}`);
        saved.values[`${type}_cm`] = value;
      }
      if (!saved.id.length) throw new ToolError('Nothing to save: give at least one measurement.');
      return { saved };
    });
  }

  async function log_journal_entry(a) {
    return idempotent('log_journal_entry', a.request_id, async () => {
      const settings = await loadSettings();
      const date = assertDate(a.date || today(settings));
      const day = dayIdOf(date);
      const prev = await db.query('SELECT text FROM journal_entries WHERE user_id = $1 AND date = $2', [userId, date]);
      const append = a.append ?? true;
      const text = prev[0] && append && prev[0].text ? `${prev[0].text}\n${a.text}` : a.text;
      await db.query(
        `INSERT INTO journal_entries (user_id, date, day_id, text, source, updated_at) VALUES ($1,$2,$3,$4,'claude', now())
         ON CONFLICT (user_id, date) DO UPDATE SET text = excluded.text, source = 'claude', updated_at = now()`,
        [userId, date, day, text]
      );
      return { saved: { id: `journal:${date}`, date, text, source: 'claude' } };
    });
  }

  /* ---------- corrections ---------- */
  function parseId(id) {
    const i = String(id).indexOf(':');
    if (i < 0) throw new ToolError(`"${id}" is not an entry id. Ids look like meal:12, item:<key>, body:<date>, measure:<date>:<type>, journal:<date>.`);
    return [id.slice(0, i), id.slice(i + 1)];
  }

  async function update_entry({ id, fields }) {
    const [kind, rest] = parseId(id);
    const f = fields || {};
    const sets = [];
    const params = [];
    const add = (col, v) => {
      params.push(v);
      sets.push(`${col} = $${params.length + 2}`);
    };
    const pick = (map) => {
      for (const [inKey, col] of Object.entries(map)) if (f[inKey] !== undefined) add(col, f[inKey]);
      const unknown = Object.keys(f).filter((k) => !(k in map));
      if (unknown.length) throw new ToolError(`These fields can't be changed on a ${kind}: ${unknown.join(', ')}. Allowed: ${Object.keys(map).join(', ')}.`);
      if (!sets.length) throw new ToolError('No fields to update.');
    };
    const range = (k, lo, hi) => {
      if (f[k] != null && (typeof f[k] !== 'number' || f[k] < lo || f[k] > hi)) throw new ToolError(`${k} must be a number between ${lo} and ${hi}.`);
    };
    if (kind === 'meal') {
      pick({ description: 'description', meal_type: 'meal_type', date: 'date', calories: 'calories', protein_g: 'protein_g', fiber_g: 'fiber_g', carbs_g: 'carbs_g', fat_g: 'fat_g', estimated: 'estimated' });
      if (f.date) assertDate(f.date);
      ['calories', 'protein_g', 'fiber_g', 'carbs_g', 'fat_g'].forEach((k) => range(k, 0, 20000));
      const rows = await db.query(`UPDATE meals SET ${sets.join(', ')} WHERE user_id = $1 AND id = $2 RETURNING *`, [userId, Number(rest), ...params]);
      if (!rows[0]) throw new ToolError(`No meal with id ${id}.`);
      return { saved: mealOut(rows[0]) };
    }
    if (kind === 'item') {
      pick({ status: 'status', reps: 'reps_done', weight_kg: 'weight', seconds: 'hold_seconds' });
      if (f.status && !SESSION_STATUS.includes(f.status)) throw new ToolError(`status must be one of ${SESSION_STATUS.join(', ')}.`);
      range('reps', 0, 10000); range('weight_kg', 0, 1000); range('seconds', 0, 86400);
      const rows = await db.query(`UPDATE session_items SET ${sets.join(', ')} WHERE user_id = $1 AND item_key = $2 AND kind = 'work' RETURNING *`, [userId, rest, ...params]);
      if (!rows[0]) throw new ToolError(`No logged set with id ${id}.`);
      const r = rows[0];
      return { saved: { id, exercise: r.exercise_name, set_index: r.set_index, status: r.status, reps: r.reps_done, weight_kg: r.weight, seconds: r.hold_seconds } };
    }
    if (kind === 'body') {
      pick({ weight_kg: 'weight', muscle_mass_kg: 'muscle_mass', fat_mass_kg: 'fat_mass', body_fat_percent: 'body_fat_percent', notes: 'notes' });
      range('weight_kg', 20, 500); range('body_fat_percent', 1, 80);
      const rows = await db.query(`UPDATE body_logs SET ${sets.join(', ')} WHERE user_id = $1 AND date = $2 RETURNING *`, [userId, rest, ...params]);
      if (!rows[0]) throw new ToolError(`No body log with id ${id}.`);
      return { saved: { id, ...rows[0] } };
    }
    if (kind === 'measure') {
      const [date, type] = rest.split(':');
      pick({ value: 'value' });
      range('value', 1, 500);
      const rows = await db.query(`UPDATE body_measurements SET ${sets.join(', ')} WHERE user_id = $1 AND date = $2 AND measurement_type = '${type.replace(/[^a-z_]/g, '')}' RETURNING *`, [userId, date, ...params]);
      if (!rows[0]) throw new ToolError(`No measurement with id ${id}.`);
      return { saved: { id, date, type, value: rows[0].value, unit: rows[0].unit } };
    }
    if (kind === 'journal') {
      pick({ text: 'text' });
      const rows = await db.query(`UPDATE journal_entries SET ${sets.join(', ')}, updated_at = now() WHERE user_id = $1 AND date = $2 RETURNING date, text`, [userId, rest, ...params]);
      if (!rows[0]) throw new ToolError(`No journal entry with id ${id}.`);
      return { saved: { id, ...rows[0] } };
    }
    throw new ToolError(`Unknown entry type "${kind}".`);
  }

  async function delete_entry({ id }) {
    const [kind, rest] = parseId(id);
    let rows = [];
    if (kind === 'meal') rows = await db.query('DELETE FROM meals WHERE user_id = $1 AND id = $2 RETURNING id', [userId, Number(rest)]);
    else if (kind === 'item') rows = await db.query(`DELETE FROM session_items WHERE user_id = $1 AND item_key = $2 AND kind = 'work' RETURNING item_key`, [userId, rest]);
    else if (kind === 'body') rows = await db.query('DELETE FROM body_logs WHERE user_id = $1 AND date = $2 RETURNING date', [userId, rest]);
    else if (kind === 'measure') {
      const [date, type] = rest.split(':');
      rows = await db.query('DELETE FROM body_measurements WHERE user_id = $1 AND date = $2 AND measurement_type = $3 RETURNING date', [userId, date, type]);
    } else if (kind === 'journal') rows = await db.query('DELETE FROM journal_entries WHERE user_id = $1 AND date = $2 RETURNING date', [userId, rest]);
    else throw new ToolError(`Unknown entry type "${kind}".`);
    if (!rows.length) throw new ToolError(`Nothing found with id ${id}.`);
    return { deleted: id };
  }

  /* ---------- reads ---------- */
  async function nutritionTotals(start, end) {
    const logs = await db.query('SELECT date, calories, protein_g, fiber_g, carbs_g, fat_g FROM nutrition_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3', [userId, start, end]);
    const meals = await db.query('SELECT * FROM meals WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY id', [userId, start, end]);
    const byDate = new Map();
    const add = (date, r) => {
      const t = byDate.get(date) || { date, calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, fat_g: 0 };
      for (const k of ['calories', 'protein_g', 'fiber_g', 'carbs_g', 'fat_g']) t[k] += Number(r[k] || 0);
      byDate.set(date, t);
    };
    logs.forEach((r) => add(r.date, r));
    meals.forEach((r) => add(r.date, r));
    return { days: [...byDate.values()], meals };
  }

  async function get_today({ date } = {}) {
    const settings = await loadSettings();
    const d = assertDate(date || today(settings));
    const [plans, lib] = await Promise.all([loadPlans(), loadLibrary()]);
    const plan = plans.find((p) => p.id === settings.activePlanId) || plans[0] || null;
    const extrasRow = await db.query('SELECT data FROM day_extras WHERE user_id = $1 AND date = $2', [userId, d]);
    const insts = sessionsForDate(d, plan, new Map(plans.map((p) => [p.id, p])), extrasRow[0]?.data || {}, { stickLevel: settings.stickLevel });
    const items = await db.query(`SELECT * FROM session_items WHERE user_id = $1 AND date = $2 AND kind = 'work' ORDER BY completed_at`, [userId, d]);
    const nutrition = await nutritionTotals(d, d);
    const goal = (await db.query('SELECT calories_goal, protein_goal, fiber_goal FROM nutrition_goals WHERE user_id = $1 AND effective_from <= $2 ORDER BY effective_from DESC, id DESC LIMIT 1', [userId, d]))[0] || null;
    const body = (await db.query('SELECT * FROM body_logs WHERE user_id = $1 AND date = $2', [userId, d]))[0] || null;
    const journal = (await db.query('SELECT text, source FROM journal_entries WHERE user_id = $1 AND date = $2', [userId, d]))[0] || null;
    return {
      date: d, weekday: dayIdOf(d), active_plan: plan?.name || null,
      scheduled_sessions: insts.map((i) => ({
        name: i.session.name.en, optional: !!i.session.optional, source: i.source,
        exercises: i.session.entries.map((e) => (e.kind === 'circuit' ? `${e.name.en} (circuit)` : lib.get(e.exerciseId)?.name?.en || e.exerciseId)),
      })),
      logged_sets: items.map((r) => ({ id: `item:${r.item_key}`, exercise: r.exercise_name, set_index: r.set_index, status: r.status, reps: r.reps_done, weight_kg: r.weight, seconds: r.hold_seconds, source: r.source })),
      meals: nutrition.meals.map(mealOut),
      nutrition_totals: nutrition.days[0] || { date: d, calories: 0, protein_g: 0, fiber_g: 0, carbs_g: 0, fat_g: 0 },
      nutrition_goal: goal,
      body_log: body ? { id: `body:${d}`, ...body } : null,
      journal: journal ? { id: `journal:${d}`, ...journal } : null,
    };
  }

  async function get_plan({ plan } = {}) {
    const settings = await loadSettings();
    const [plans, lib] = await Promise.all([loadPlans(), loadLibrary()]);
    const chosen = (plan && plans.find((p) => norm(p.name) === norm(plan) || p.id === plan)) || plans.find((p) => p.id === settings.activePlanId) || plans[0];
    if (!chosen) return { plan: null };
    const days = {};
    for (const [day, sessions] of Object.entries(chosen.days)) {
      days[day] = sessions.map((s) => ({
        name: s.name.en, optional: !!s.optional,
        exercises: s.entries.filter((e) => e.level == null || e.level === settings.stickLevel).map((e) => {
          if (e.kind === 'circuit') return { name: `${e.name.en} (circuit)`, rounds: e.rounds, work_s: e.work, rest_s: e.rest };
          const ex = lib.get(e.exerciseId);
          const eff = ex ? effectiveEntry(e, ex, chosen, settings) : {};
          return { id: e.exerciseId, name: ex?.name?.en || e.exerciseId, type: eff.type, sets: eff.sets, reps: eff.reps, seconds: eff.seconds, rest_s: eff.rest };
        }),
      }));
    }
    return { plan: chosen.name, active: chosen.id === settings.activePlanId, days, other_plans: plans.filter((p) => p.id !== chosen.id).map((p) => p.name) };
  }

  async function list_exercises({ query: q, muscle, type, limit = 25 } = {}) {
    const lib = await loadLibrary();
    const needle = norm(q || '');
    const out = [...lib.values()].filter((e) => !e.archived).filter((e) => {
      if (type && e.type !== type) return false;
      if (muscle && !(e.primary || []).includes(muscle) && !(e.secondary || []).includes(muscle)) return false;
      if (needle) return `${norm(e.name?.en)} ${norm(e.name?.ar)} ${e.id}`.includes(needle);
      return true;
    });
    return {
      total_matches: out.length,
      exercises: out.slice(0, limit).map((e) => ({ id: e.id, name: e.name?.en, name_ar: e.name?.ar || undefined, type: e.type, sets: e.sets, reps: e.reps, seconds: e.seconds, primary_muscles: e.primary, custom: !!e.custom })),
    };
  }

  async function get_stats({ range = 'week' } = {}) {
    const settings = await loadSettings();
    const t = today(settings);
    const from = { week: startOfWeek(t, settings.weekStart), month: `${t.slice(0, 7)}-01`, year: `${t.slice(0, 4)}-01-01`, all: '0000-01-01' }[range];
    const [plans, sessions, items] = await Promise.all([
      loadPlans(),
      db.query('SELECT * FROM session_log WHERE user_id = $1', [userId]),
      db.query('SELECT * FROM session_items WHERE user_id = $1', [userId]),
    ]);
    const plan = plans.find((p) => p.id === settings.activePlanId) || plans[0] || null;
    const inRange = items.filter((i) => i.date >= from && i.date <= t);
    const tot = totals(inRange, { secondsPerRep: settings.secondsPerRep });
    const week = weeklySessionStats({ sessions, items, plan, today: t, weekStart: settings.weekStart, from: startOfWeek(t, settings.weekStart), to: t }).at(-1);
    const nut = await nutritionTotals(from === '0000-01-01' ? '0000-01-01' : from, t);
    const avg = (k) => (nut.days.length ? Math.round((nut.days.reduce((a, d) => a + d[k], 0) / nut.days.length) * 10) / 10 : null);
    return {
      range, from, to: t,
      this_week: { sessions_completed: week?.completed ?? 0, sessions_planned: week?.planned ?? 0, sessions_due_so_far: week?.plannedDue ?? 0, completion_percent: week?.completionPct ?? null, optional_completed: week?.optionalCompleted ?? 0, extra_sessions: week?.extra ?? 0 },
      streak: streaks(items, t),
      totals: { sets: tot.sets, reps: tot.reps, hold_seconds: tot.holdSeconds, time_trained_seconds: tot.timeSeconds, time_is_estimate: tot.timeIsEstimate, completed: tot.completed, incomplete: tot.incomplete, skipped: tot.skipped, breaks_cut_short: tot.restsIncomplete + tot.restsSkipped },
      nutrition: { days_logged: nut.days.length, avg_calories: avg('calories'), avg_protein_g: avg('protein_g'), avg_fiber_g: avg('fiber_g') },
    };
  }

  return { log_meal, log_workout, log_measurement, log_journal_entry, update_entry, delete_entry, get_today, get_plan, list_exercises, get_stats, _weekday: weekdayOf, _addDays: addDays };
}
