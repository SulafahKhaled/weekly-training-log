/* =========================================================
   MCP tools for everything that isn't a plain "log": plans, the exercise library,
   settings, nutrition goals / daily totals, progress tests, extra sessions on a day,
   and history reads. Same rules as tools.js: user-scoped, validated, returns the saved
   record, honours request_id.
   Plan editing reuses the app's own pure operations (src/lib/plan.js), so a plan edited
   by chat is edited exactly like one edited in the Plans screen.
   ========================================================= */
import crypto from 'node:crypto';
import {
  DAY_IDS, DEFAULT_SETTINGS, newPlan, duplicatePlan, renamePlan, setPlanTiming, addSession, removeSession, moveSession, swapSessions, swapDays,
  addEntry, removeEntry, reorderEntry, setEntryOverrides, newExerciseEntry, renameSession, setSessionOptional, newId, effectiveEntry, reorderSession,
} from '../../src/lib/plan.js';
import { ATLAS_MUSCLES } from '../../src/data/atlas.generated.js';
import { PROGRESS_TESTS, CHECKPOINTS } from '../../src/data/pdfProgram.js';
import { ToolError } from './tools.js';

const DEFAULT_PLAN_ID = 'default';
const DAY_ALIASES = {
  sun: 'sun', sunday: 'sun', mon: 'mon', monday: 'mon', tue: 'tue', tues: 'tue', tuesday: 'tue', wed: 'wed', wednesday: 'wed',
  thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu', fri: 'fri', friday: 'fri', sat: 'sat', saturday: 'sat',
};
const TYPES = ['reps', 'hold', 'hold_side', 'cardio'];

const dayOf = (v) => {
  const d = DAY_ALIASES[String(v || '').trim().toLowerCase()];
  if (!d) throw new ToolError(`"${v}" is not a weekday. Use sun, mon, tue, wed, thu, fri or sat.`);
  return d;
};
const intOrNull = (v) => (v == null || v === '' ? null : Math.max(0, Math.round(Number(v))));

export function createAdminTools(db, userId, ctx) {
  const { loadSettings, loadPlans, loadLibrary, idempotent, today, matchExercise, norm, assertDate, BUILTIN } = ctx;

  /* ---------- helpers ---------- */
  async function rawSettings() {
    const rows = await db.query('SELECT data FROM user_settings WHERE user_id = $1', [userId]);
    return rows[0]?.data || {};
  }
  async function saveRawSettings(data) {
    await db.query(
      `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1,$2, now())
       ON CONFLICT (user_id) DO UPDATE SET data = excluded.data, updated_at = now()`,
      [userId, JSON.stringify(data)]
    );
  }
  async function findPlan(ref) {
    const settings = await loadSettings();
    const plans = await loadPlans();
    if (!plans.length) throw new ToolError('There are no plans yet — open the app once so the default plan is created.');
    if (!ref) return { plan: plans.find((p) => p.id === settings.activePlanId) || plans[0], plans, settings };
    const q = norm(ref);
    const plan = plans.find((p) => p.id === ref) || plans.find((p) => norm(p.name) === q) || plans.find((p) => norm(p.name).includes(q));
    if (!plan) throw new ToolError(`No plan named "${ref}". Plans: ${plans.map((p) => p.name).join(', ')}.`);
    return { plan, plans, settings };
  }
  async function savePlan(plan, sortOrder) {
    const { id, ...data } = plan;
    await db.query(
      `INSERT INTO plans (user_id, plan_id, data, sort_order, updated_at) VALUES ($1,$2,$3,COALESCE($4,0), now())
       ON CONFLICT (user_id, plan_id) DO UPDATE SET data = excluded.data, updated_at = now()`,
      [userId, id, JSON.stringify({ ...data, id }), sortOrder ?? null]
    );
  }
  function findSession(plan, day, ref) {
    const list = plan.days[day] || [];
    const q = norm(ref);
    const s = list.find((x) => x.id === ref) || list.find((x) => norm(x.name?.en) === q || norm(x.name?.ar) === q) || list.find((x) => norm(x.name?.en).includes(q));
    if (!s) throw new ToolError(`No session "${ref}" on ${day}. Sessions that day: ${list.map((x) => x.name.en).join(', ') || 'none'}.`);
    return s;
  }
  function findEntry(session, ref, lib) {
    const q = norm(ref);
    const e =
      session.entries.find((x) => x.eid === ref) ||
      session.entries.find((x) => x.exerciseId === ref) ||
      session.entries.find((x) => (x.kind === 'circuit' ? norm(x.name?.en) : norm(lib.get(x.exerciseId)?.name?.en)) === q);
    if (e) return e;
    // fall back to the same fuzzy name matching log_workout uses ("bench press" → Dumbbell Bench Press)
    const m = matchExercise(lib, ref);
    const viaMatch = m && session.entries.find((x) => x.exerciseId === m.ex.id);
    if (!viaMatch) throw new ToolError(`"${ref}" is not in session "${session.name.en}".`);
    return viaMatch;
  }
  const planSummary = (p, lib) => ({
    id: p.id, name: p.name, timing: p.timing,
    days: Object.fromEntries(DAY_IDS.map((d) => [d, (p.days[d] || []).map((s) => ({
      id: s.id, name: s.name.en, optional: !!s.optional,
      exercises: s.entries.map((e) => (e.kind === 'circuit' ? `${e.name.en} (circuit)` : lib.get(e.exerciseId)?.name?.en || e.exerciseId)),
    }))])),
  });

  /* ---------- plans ---------- */
  async function list_plans() {
    const settings = await loadSettings();
    const plans = await loadPlans();
    return { active: settings.activePlanId, plans: plans.map((p) => ({ id: p.id, name: p.name, sessions: Object.values(p.days).reduce((n, l) => n + l.length, 0), active: p.id === settings.activePlanId })) };
  }

  async function create_plan({ name, copy_from, make_active, request_id }) {
    return idempotent('create_plan', request_id, async () => {
      const { plans, plan: src } = await findPlan(copy_from);
      const plan = copy_from ? duplicatePlan(src, name) : newPlan(name);
      await savePlan(plan, plans.length);
      if (make_active) await saveRawSettings({ ...(await rawSettings()), activePlanId: plan.id });
      return { saved: { id: plan.id, name: plan.name, copied_from: copy_from ? src.name : null, active: !!make_active } };
    });
  }

  async function set_active_plan({ plan }) {
    const { plan: p } = await findPlan(plan);
    await saveRawSettings({ ...(await rawSettings()), activePlanId: p.id });
    return { saved: { active_plan: p.name, id: p.id } };
  }

  async function delete_plan({ plan }) {
    const { plan: p, settings } = await findPlan(plan);
    if (p.id === DEFAULT_PLAN_ID) throw new ToolError('The original plan cannot be deleted (your history links to it). Duplicate it and edit the copy instead.');
    await db.query('DELETE FROM plans WHERE user_id = $1 AND plan_id = $2', [userId, p.id]);
    if (settings.activePlanId === p.id) await saveRawSettings({ ...(await rawSettings()), activePlanId: DEFAULT_PLAN_ID });
    return { deleted: p.name };
  }

  /**
   * Applies a list of edits to one plan, in order, then saves once. Nothing is saved if any step is invalid.
   */
  async function edit_plan({ plan: ref, operations, request_id }) {
    return idempotent('edit_plan', request_id, async () => {
      const { plan: original } = await findPlan(ref);
      const lib = await loadLibrary();
      let plan = original;
      const log = [];
      for (const [i, op] of operations.entries()) {
        const at = `operation ${i + 1} (${op.op})`;
        try {
          switch (op.op) {
            case 'rename_plan':
              plan = renamePlan(plan, op.name);
              break;
            case 'set_timing':
              plan = setPlanTiming(plan, Object.fromEntries(['countdown', 'work', 'rest'].filter((k) => op[k] !== undefined).map((k) => [k, op[k]])));
              break;
            case 'add_session': {
              const day = dayOf(op.day);
              plan = addSession(plan, day, { id: newId('s'), name: { en: op.name, ar: op.name_ar || '' }, color: op.optional ? 'mobility' : 'upper', optional: !!op.optional, entries: [] });
              break;
            }
            case 'rename_session': {
              const day = dayOf(op.day);
              const s = findSession(plan, day, op.session);
              plan = renameSession(plan, day, s.id, { en: op.name });
              break;
            }
            case 'set_session_optional': {
              const day = dayOf(op.day);
              plan = setSessionOptional(plan, day, findSession(plan, day, op.session).id, op.optional);
              break;
            }
            case 'remove_session': {
              const day = dayOf(op.day);
              plan = removeSession(plan, day, findSession(plan, day, op.session).id);
              break;
            }
            case 'move_session': {
              const day = dayOf(op.day);
              plan = moveSession(plan, day, findSession(plan, day, op.session).id, dayOf(op.to_day), op.to_index);
              break;
            }
            case 'reorder_session': {
              const day = dayOf(op.day);
              const s = findSession(plan, day, op.session);
              plan = reorderSession(plan, day, plan.days[day].findIndex((x) => x.id === s.id), op.to_index);
              break;
            }
            case 'swap_sessions': {
              const a = dayOf(op.day_a);
              const b = dayOf(op.day_b);
              plan = swapSessions(plan, a, findSession(plan, a, op.session_a).id, b, findSession(plan, b, op.session_b).id);
              break;
            }
            case 'swap_days':
              plan = swapDays(plan, dayOf(op.day_a), dayOf(op.day_b));
              break;
            case 'add_exercise': {
              const day = dayOf(op.day);
              const s = findSession(plan, day, op.session);
              const found = matchExercise(lib, op.exercise);
              if (!found) throw new ToolError(`Exercise "${op.exercise}" is not in the library — create_exercise first.`);
              const overrides = Object.fromEntries(['sets', 'reps', 'seconds', 'rest', 'countdown'].filter((k) => op[k] != null).map((k) => [k, op[k]]));
              plan = addEntry(plan, day, s.id, newExerciseEntry(found.ex.id, overrides), op.index);
              break;
            }
            case 'remove_exercise': {
              const day = dayOf(op.day);
              const s = findSession(plan, day, op.session);
              plan = removeEntry(plan, day, s.id, findEntry(s, op.exercise, lib).eid);
              break;
            }
            case 'move_exercise': {
              const day = dayOf(op.day);
              const s = findSession(plan, day, op.session);
              const e = findEntry(s, op.exercise, lib);
              plan = reorderEntry(plan, day, s.id, s.entries.findIndex((x) => x.eid === e.eid), op.to_index);
              break;
            }
            case 'override_exercise': {
              const day = dayOf(op.day);
              const s = findSession(plan, day, op.session);
              const e = findEntry(s, op.exercise, lib);
              const patch = Object.fromEntries(['sets', 'reps', 'seconds', 'rest', 'countdown'].filter((k) => op[k] !== undefined).map((k) => [k, op[k]]));
              if (!Object.keys(patch).length) throw new ToolError('Give at least one of sets, reps, seconds, rest, countdown (null clears an override).');
              plan = setEntryOverrides(plan, day, s.id, e.eid, patch);
              break;
            }
            default:
              throw new ToolError(`Unknown operation "${op.op}".`);
          }
          log.push(`${op.op}: ok`);
        } catch (e) {
          if (e instanceof ToolError) throw new ToolError(`Plan not changed — ${at}: ${e.message}`);
          throw e;
        }
      }
      await savePlan(plan);
      return { saved: planSummary(plan, lib), applied: log };
    });
  }

  async function get_plan_details({ plan }) {
    const { plan: p } = await findPlan(plan);
    return planSummary(p, await loadLibrary());
  }

  /* ---------- exercise library ---------- */
  function cleanExercise(input, base) {
    const out = { ...base };
    const str = (k) => input[k] !== undefined && (out[k] = String(input[k] ?? '').slice(0, 2000));
    if (input.name_en !== undefined || input.name_ar !== undefined) {
      out.name = { en: String(input.name_en ?? base.name?.en ?? '').trim(), ar: String(input.name_ar ?? base.name?.ar ?? '').trim() };
    }
    if (input.type !== undefined) {
      if (!TYPES.includes(input.type)) throw new ToolError(`type must be one of ${TYPES.join(', ')}.`);
      out.type = input.type;
    }
    for (const k of ['sets', 'reps', 'seconds', 'rest', 'countdown']) if (input[k] !== undefined) out[k] = intOrNull(input[k]);
    if (input.per_side !== undefined) out.perSide = !!input.per_side;
    for (const k of ['primary_muscles', 'secondary_muscles']) {
      if (input[k] === undefined) continue;
      const bad = input[k].filter((m) => !ATLAS_MUSCLES[m]);
      if (bad.length) throw new ToolError(`Unknown muscle key(s): ${bad.join(', ')}. Valid keys: ${Object.keys(ATLAS_MUSCLES).join(', ')}.`);
      out[k === 'primary_muscles' ? 'primary' : 'secondary'] = input[k];
    }
    if (input.groups !== undefined) out.groups = input.groups;
    str('notes'); str('how'); str('dose'); str('direction');
    if (input.media !== undefined) {
      if (input.media === null || !input.media.url) out.media = null;
      else {
        try {
          new URL(input.media.url);
        } catch {
          throw new ToolError(`"${input.media.url}" is not a valid URL.`);
        }
        out.media = { url: input.media.url, start: intOrNull(input.media.start), source: input.media.source || '', verified: input.media.verified || null, title: input.media.title || null, note: input.media.note || null };
      }
    }
    if (out.type && out.type !== 'reps') out.reps = null;
    if (out.type === 'hold_side') out.perSide = true;
    return out;
  }
  const exOut = (e) => ({ id: e.id, name: e.name?.en, name_ar: e.name?.ar || undefined, type: e.type, sets: e.sets, reps: e.reps, seconds: e.seconds, rest: e.rest, countdown: e.countdown ?? null, primary_muscles: e.primary, secondary_muscles: e.secondary, media: e.media?.url || null, archived: !!e.archived, custom: !!e.custom });
  async function saveExerciseRow(id, data, archived) {
    await db.query(
      `INSERT INTO user_exercises (user_id, exercise_id, data, archived, updated_at) VALUES ($1,$2,$3,$4, now())
       ON CONFLICT (user_id, exercise_id) DO UPDATE SET data = excluded.data, archived = excluded.archived, updated_at = now()`,
      [userId, id, JSON.stringify(data), !!archived]
    );
  }
  const blank = { type: 'reps', sets: 3, reps: 12, seconds: null, rest: 30, countdown: null, perSide: false, primary: [], secondary: [], notes: '', how: '', dose: '', direction: '', media: null, groups: [], source: 'custom' };

  async function create_exercise(a) {
    return idempotent('create_exercise', a.request_id, async () => {
      if (!a.name_en?.trim() && !a.name_ar?.trim()) throw new ToolError('Give the exercise a name.');
      const lib = await loadLibrary();
      if (matchExercise(lib, a.name_en || a.name_ar)?.how === 'name') throw new ToolError(`An exercise called "${a.name_en || a.name_ar}" already exists — use update_exercise.`);
      const id = `ex_${crypto.randomBytes(5).toString('hex')}`;
      const data = cleanExercise(a, { ...blank, name: { en: '', ar: '' } });
      await saveExerciseRow(id, data, false);
      return { saved: exOut({ ...data, id, custom: true }) };
    });
  }

  async function update_exercise({ exercise, fields }) {
    const lib = await loadLibrary();
    const found = matchExercise(lib, exercise);
    if (!found) throw new ToolError(`No exercise matching "${exercise}".`);
    const cur = found.ex;
    const data = cleanExercise(fields, { ...cur, name: cur.name });
    delete data.id; delete data.custom; delete data.archived;
    await saveExerciseRow(cur.id, data, cur.archived);
    return { saved: exOut({ ...data, id: cur.id, archived: cur.archived, custom: cur.custom }), note: 'Applies to future sessions only; logged history keeps its own snapshot.' };
  }

  async function archive_exercise({ exercise, archived = true }) {
    const lib = await loadLibrary();
    const found = matchExercise(lib, exercise);
    if (!found) throw new ToolError(`No exercise matching "${exercise}".`);
    const { id, custom, archived: _a, ...data } = found.ex;
    await saveExerciseRow(id, data, archived);
    return { saved: { id, name: found.ex.name?.en, archived } };
  }

  async function duplicate_exercise({ exercise, new_name, request_id }) {
    return idempotent('duplicate_exercise', request_id, async () => {
      const lib = await loadLibrary();
      const found = matchExercise(lib, exercise);
      if (!found) throw new ToolError(`No exercise matching "${exercise}".`);
      const id = `ex_${crypto.randomBytes(5).toString('hex')}`;
      const { id: _i, custom, archived, ...rest } = found.ex;
      const data = { ...rest, name: { en: new_name || `${found.ex.name?.en} (copy)`, ar: found.ex.name?.ar || '' }, source: 'custom' };
      await saveExerciseRow(id, data, false);
      return { saved: exOut({ ...data, id, custom: true }) };
    });
  }

  async function delete_exercise({ exercise }) {
    const lib = await loadLibrary();
    const found = matchExercise(lib, exercise);
    if (!found) throw new ToolError(`No exercise matching "${exercise}".`);
    await db.query('DELETE FROM user_exercises WHERE user_id = $1 AND exercise_id = $2', [userId, found.ex.id]);
    const builtin = BUILTIN.some((b) => b.id === found.ex.id);
    return { deleted: found.ex.id, effect: builtin ? 'Built-in exercise reset to its original version.' : 'Custom exercise removed; logged history is kept.' };
  }

  /* ---------- settings ---------- */
  async function get_settings() {
    const s = await loadSettings();
    return { week_start: s.weekStart, timezone: s.timezone, countdown_s: s.countdown, work_s: s.work, rest_s: s.rest, seconds_per_rep: s.secondsPerRep, stick_level: s.stickLevel, active_plan_id: s.activePlanId };
  }

  async function update_settings(a) {
    const raw = await rawSettings();
    const map = { week_start: 'weekStart', timezone: 'timezone', countdown_s: 'countdown', work_s: 'work', rest_s: 'rest', seconds_per_rep: 'secondsPerRep', stick_level: 'stickLevel' };
    for (const [k, v] of Object.entries(a)) {
      if (v === undefined || !map[k]) continue;
      if (k === 'timezone') {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
        } catch {
          throw new ToolError(`"${v}" is not a valid IANA timezone (e.g. Asia/Riyadh).`);
        }
      }
      raw[map[k]] = v;
    }
    await saveRawSettings(raw);
    return { saved: await get_settings() };
  }

  /* ---------- nutrition goals + daily totals ---------- */
  async function set_nutrition_goal(a) {
    return idempotent('set_nutrition_goal', a.request_id, async () => {
      const settings = await loadSettings();
      const from = assertDate(a.effective_from || today(settings));
      if (a.calories_goal == null && a.protein_goal == null && a.fiber_goal == null) throw new ToolError('Give at least one of calories_goal, protein_goal, fiber_goal.');
      // append-only on purpose: a past day stays measured against the goal that was active then
      const rows = await db.query(
        'INSERT INTO nutrition_goals (user_id, effective_from, calories_goal, protein_goal, fiber_goal) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [userId, from, a.calories_goal ?? null, a.protein_goal ?? null, a.fiber_goal ?? null]
      );
      const r = rows[0];
      return { saved: { id: `goal:${r.id}`, effective_from: r.effective_from, calories_goal: r.calories_goal, protein_goal: r.protein_goal, fiber_goal: r.fiber_goal } };
    });
  }

  async function log_daily_nutrition(a) {
    return idempotent('log_daily_nutrition', a.request_id, async () => {
      const settings = await loadSettings();
      const date = assertDate(a.date || today(settings));
      if (['calories', 'protein_g', 'fiber_g', 'carbs_g', 'fat_g'].every((k) => a[k] == null)) throw new ToolError('Give at least one nutrition value.');
      await db.query(
        `INSERT INTO nutrition_logs (user_id, date, calories, protein_g, fiber_g, carbs_g, fat_g, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (user_id, date) DO UPDATE SET calories = COALESCE(excluded.calories, nutrition_logs.calories), protein_g = COALESCE(excluded.protein_g, nutrition_logs.protein_g),
           fiber_g = COALESCE(excluded.fiber_g, nutrition_logs.fiber_g), carbs_g = COALESCE(excluded.carbs_g, nutrition_logs.carbs_g),
           fat_g = COALESCE(excluded.fat_g, nutrition_logs.fat_g), notes = COALESCE(excluded.notes, nutrition_logs.notes)`,
        [userId, date, a.calories ?? null, a.protein_g ?? null, a.fiber_g ?? null, a.carbs_g ?? null, a.fat_g ?? null, a.notes ?? null]
      );
      const r = (await db.query('SELECT * FROM nutrition_logs WHERE user_id = $1 AND date = $2', [userId, date]))[0];
      return { saved: { id: `nutrition:${date}`, date, calories: r.calories, protein_g: r.protein_g, fiber_g: r.fiber_g, carbs_g: r.carbs_g, fat_g: r.fat_g }, note: 'This is the manual daily total; individual meals are added on top of it.' };
    });
  }

  /* ---------- progress tests ---------- */
  async function log_progress_test(a) {
    return idempotent('log_progress_test', a.request_id, async () => {
      const settings = await loadSettings();
      if (!CHECKPOINTS.some((c) => c.id === a.checkpoint)) throw new ToolError(`checkpoint must be one of ${CHECKPOINTS.map((c) => c.id).join(', ')}.`);
      const prev = (await db.query('SELECT data, tested_on FROM progress_tests WHERE user_id = $1 AND checkpoint = $2', [userId, a.checkpoint]))[0];
      const data = { ...(prev?.data || {}) };
      for (const [testId, values] of Object.entries(a.results)) {
        const test = PROGRESS_TESTS.find((t) => t.id === testId);
        if (!test) throw new ToolError(`Unknown test "${testId}". Tests: ${PROGRESS_TESTS.map((t) => t.id).join(', ')}.`);
        const next = { ...(data[testId] || {}) };
        for (const [k, v] of Object.entries(values)) {
          const f = test.fields.find((x) => x.key === k);
          if (!f) throw new ToolError(`Test "${testId}" has no field "${k}". Fields: ${test.fields.map((x) => x.key).join(', ')}.`);
          if (v === null) next[k] = null;
          else if (f.kind === 'yesno') {
            if (typeof v !== 'boolean') throw new ToolError(`${testId}.${k} must be true or false.`);
            next[k] = v;
          } else {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100000) throw new ToolError(`${testId}.${k} must be a number ≥ 0.`);
            next[k] = v;
          }
        }
        data[testId] = next;
      }
      const testedOn = a.tested_on ? assertDate(a.tested_on) : prev?.tested_on || today(settings);
      await db.query(
        `INSERT INTO progress_tests (user_id, checkpoint, tested_on, data, updated_at) VALUES ($1,$2,$3,$4, now())
         ON CONFLICT (user_id, checkpoint) DO UPDATE SET tested_on = excluded.tested_on, data = excluded.data, updated_at = now()`,
        [userId, a.checkpoint, testedOn, JSON.stringify(data)]
      );
      return { saved: { id: `test:${a.checkpoint}`, checkpoint: a.checkpoint, tested_on: testedOn, results: data } };
    });
  }

  /* ---------- extra sessions / quick-add on a date ---------- */
  async function extrasFor(date) {
    return (await db.query('SELECT data FROM day_extras WHERE user_id = $1 AND date = $2', [userId, date]))[0]?.data || {};
  }
  async function saveExtras(date, data) {
    await db.query(
      `INSERT INTO day_extras (user_id, date, data) VALUES ($1,$2,$3) ON CONFLICT (user_id, date) DO UPDATE SET data = excluded.data`,
      [userId, date, JSON.stringify(data)]
    );
  }

  async function add_session_to_day({ date, day, session, plan: planRef }) {
    const { plan, settings } = await findPlan(planRef);
    const d = assertDate(date || today(settings));
    const dayId = dayOf(day);
    const s = findSession(plan, dayId, session);
    const ex = await extrasFor(d);
    const sessions = ex.sessions || [];
    if (!sessions.some((x) => x.planId === plan.id && x.day === dayId && x.sessionId === s.id)) sessions.push({ planId: plan.id, day: dayId, sessionId: s.id });
    await saveExtras(d, { ...ex, sessions });
    return { saved: { date: d, added: `${dayId}: ${s.name.en}`, plan: plan.name } };
  }

  async function quick_add_exercise({ date, exercise, sets, reps, seconds, rest }) {
    const settings = await loadSettings();
    const d = assertDate(date || today(settings));
    const lib = await loadLibrary();
    const found = matchExercise(lib, exercise);
    if (!found) throw new ToolError(`No exercise matching "${exercise}" — create_exercise first.`);
    const ex = await extrasFor(d);
    const overrides = Object.fromEntries(Object.entries({ sets, reps, seconds, rest }).filter(([, v]) => v != null));
    const quick = [...(ex.quick || []), { eid: newId('q'), exerciseId: found.ex.id, overrides }];
    await saveExtras(d, { ...ex, quick });
    return { saved: { date: d, added: found.ex.name?.en, exercise_id: found.ex.id, overrides } };
  }

  async function remove_from_day({ date, session, day, exercise }) {
    const settings = await loadSettings();
    const d = assertDate(date || today(settings));
    const ex = await extrasFor(d);
    let removed = 0;
    if (exercise) {
      const lib = await loadLibrary();
      const f = matchExercise(lib, exercise);
      const before = (ex.quick || []).length;
      ex.quick = (ex.quick || []).filter((q) => q.exerciseId !== f?.ex.id);
      removed = before - ex.quick.length;
    } else if (session && day) {
      const dayId = dayOf(day);
      const before = (ex.sessions || []).length;
      ex.sessions = (ex.sessions || []).filter((s) => !(s.day === dayId && norm(s.sessionId) === norm(session)));
      removed = before - ex.sessions.length;
    } else throw new ToolError('Give either exercise, or day + session.');
    await saveExtras(d, ex);
    return { removed, date: d };
  }

  /* ---------- history reads ---------- */
  async function get_history({ kind, start, end, limit = 60 }) {
    const settings = await loadSettings();
    const to = assertDate(end || today(settings));
    const from = assertDate(start || '0000-01-01');
    const lim = Math.min(Math.max(limit, 1), 200);
    if (kind === 'body') {
      const logs = await db.query('SELECT date, weight, muscle_mass, fat_mass, body_fat_percent, notes, source FROM body_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC LIMIT $4', [userId, from, to, lim]);
      const m = await db.query('SELECT date, measurement_type, value, unit, source FROM body_measurements WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC LIMIT $4', [userId, from, to, lim * 6]);
      return { body_logs: logs.map((r) => ({ id: `body:${r.date}`, ...r })), measurements: m.map((r) => ({ id: `measure:${r.date}:${r.measurement_type}`, ...r })) };
    }
    if (kind === 'nutrition') {
      const logs = await db.query('SELECT date, calories, protein_g, fiber_g, carbs_g, fat_g FROM nutrition_logs WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC LIMIT $4', [userId, from, to, lim]);
      const meals = await db.query('SELECT id, date, meal_type, description, calories, protein_g, fiber_g, carbs_g, fat_g, estimated, source FROM meals WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC, id DESC LIMIT $4', [userId, from, to, lim * 4]);
      const goals = await db.query('SELECT id, effective_from, calories_goal, protein_goal, fiber_goal FROM nutrition_goals WHERE user_id = $1 ORDER BY effective_from DESC, id DESC', [userId]);
      return { daily_totals: logs.map((r) => ({ id: `nutrition:${r.date}`, ...r })), meals: meals.map((r) => ({ ...r, id: `meal:${r.id}` })), goals: goals.map((r) => ({ ...r, id: `goal:${r.id}` })) };
    }
    if (kind === 'journal') {
      const rows = await db.query('SELECT date, text, source FROM journal_entries WHERE user_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date DESC LIMIT $4', [userId, from, to, lim]);
      return { entries: rows.map((r) => ({ id: `journal:${r.date}`, ...r })) };
    }
    if (kind === 'progress_tests') {
      const rows = await db.query('SELECT checkpoint, tested_on, data FROM progress_tests WHERE user_id = $1', [userId]);
      return { checkpoints: rows.map((r) => ({ id: `test:${r.checkpoint}`, checkpoint: r.checkpoint, tested_on: r.tested_on, results: r.data })), tests: PROGRESS_TESTS.map((t) => ({ id: t.id, name: t.en, fields: t.fields.map((f) => `${f.key} (${f.kind})`) })) };
    }
    if (kind === 'workouts') {
      const rows = await db.query(`SELECT item_key, date, exercise_id, exercise_name, set_index, status, reps_done, weight, hold_seconds, source FROM session_items WHERE user_id = $1 AND kind = 'work' AND date BETWEEN $2 AND $3 ORDER BY date DESC, completed_at DESC LIMIT $4`, [userId, from, to, lim * 5]);
      return { sets: rows.map((r) => ({ id: `item:${r.item_key}`, date: r.date, exercise: r.exercise_name, exercise_id: r.exercise_id, set_index: r.set_index, status: r.status, reps: r.reps_done, weight_kg: r.weight, seconds: r.hold_seconds, source: r.source })) };
    }
    throw new ToolError('kind must be body, nutrition, journal, progress_tests or workouts.');
  }

  /* ---------- extra ids for delete_entry ---------- */
  async function delete_record(id) {
    const [kind, rest] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
    if (kind === 'goal') return db.query('DELETE FROM nutrition_goals WHERE user_id = $1 AND id = $2 RETURNING id', [userId, Number(rest)]);
    if (kind === 'nutrition') return db.query('DELETE FROM nutrition_logs WHERE user_id = $1 AND date = $2 RETURNING date', [userId, rest]);
    if (kind === 'test') return db.query('DELETE FROM progress_tests WHERE user_id = $1 AND checkpoint = $2 RETURNING checkpoint', [userId, rest]);
    return null;
  }

  return {
    list_plans, create_plan, set_active_plan, delete_plan, edit_plan, get_plan_details,
    create_exercise, update_exercise, archive_exercise, duplicate_exercise, delete_exercise,
    get_settings, update_settings, set_nutrition_goal, log_daily_nutrition, log_progress_test,
    add_session_to_day, quick_add_exercise, remove_from_day, get_history, delete_record,
    _effectiveEntry: effectiveEntry, _DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  };
}
