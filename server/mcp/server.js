import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createTools, ToolError } from './tools.js';
import { createAdminTools } from './admin.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD').describe('Calendar date YYYY-MM-DD in the user\'s timezone (Asia/Riyadh). Omit for today.').optional();
const requestId = z.string().min(1).max(100).optional().describe('A unique id you generate for this action (e.g. a UUID). If you retry the same call with the same request_id, nothing is logged twice.');
const nonNeg = (max, what) => z.number().min(0).max(max).describe(what);
const status = z.enum(['completed', 'incomplete', 'skipped']);

const WORKOUT_SET = z.object({
  reps: z.number().int().min(0).max(1000).optional().describe('Reps done (rep-based exercises).'),
  weight_kg: z.number().min(0).max(1000).optional().describe('Weight in kg, if any.'),
  seconds: z.number().int().min(0).max(86400).optional().describe('Seconds held / worked (timed exercises such as plank).'),
  status: status.optional().describe('Defaults to the exercise-level status, then "completed".'),
});

export function buildMcpServer(db, user) {
  const tools = createTools(db, user.id);
  const admin = createAdminTools(db, user.id, tools._ctx);
  tools._ctx.setExtraDelete(admin.delete_record);
  const server = new McpServer({ name: 'weekly-training-log', version: '1.0.0' });

  const register = (name, description, inputSchema, fn, { readOnly = false } = {}) => {
    server.registerTool(
      name,
      { description, inputSchema, annotations: { readOnlyHint: readOnly, destructiveHint: name === 'delete_entry', idempotentHint: !readOnly } },
      async (args) => {
        try {
          const result = await fn(args || {});
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
          const message = e instanceof ToolError ? e.message : 'The tracker could not complete that request.';
          if (!(e instanceof ToolError)) console.error(`[mcp:${name}]`, e);
          return { isError: true, content: [{ type: 'text', text: message }] };
        }
      }
    );
  };

  register(
    'log_meal',
    'Log one meal or snack. If the user gave no numbers you may estimate calories/macros — then the entry is stored as estimated. Returns the saved record with its id.',
    {
      date,
      meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
      description: z.string().min(1).max(500).describe('What was eaten, in the user\'s words.'),
      calories: nonNeg(20000, 'kcal').optional(),
      protein_g: nonNeg(2000, 'grams').optional(),
      fiber_g: nonNeg(1000, 'grams').optional(),
      carbs_g: nonNeg(3000, 'grams').optional(),
      fat_g: nonNeg(2000, 'grams').optional(),
      estimated: z.boolean().optional().describe('true if YOU estimated the numbers; false only if the user stated them. Defaults to true whenever numbers are present.'),
      request_id: requestId,
    },
    tools.log_meal
  );

  register(
    'log_workout',
    'Log exercises the user did. Exercise names are matched against the exercise library (id, English or Arabic name); a name that is not found is created as a free exercise and reported in created_exercises. Optionally link to a plan day or session (e.g. "Monday", "Upper A"). Returns every saved set with an id.',
    {
      date,
      plan_or_day: z.string().max(80).optional().describe('Plan weekday ("Monday") or session name ("Upper A") this workout belongs to. Optional.'),
      exercises: z
        .array(
          z.object({
            exercise: z.string().min(1).max(120).describe('Library id or exercise name.'),
            status: status.optional().describe('Default status for all its sets.'),
            sets: z.array(WORKOUT_SET).min(1).max(30),
          })
        )
        .min(1)
        .max(40),
      request_id: requestId,
    },
    tools.log_workout
  );

  register(
    'log_measurement',
    'Log body composition and/or tape measurements for a date. Existing values for that date are kept unless replaced.',
    {
      date,
      weight_kg: z.number().min(20).max(500).optional(),
      muscle_mass_kg: z.number().min(1).max(300).optional(),
      fat_mass_kg: z.number().min(1).max(300).optional(),
      body_fat_percent: z.number().min(1).max(80).optional(),
      neck_cm: z.number().min(10).max(100).optional(),
      waist_cm: z.number().min(30).max(250).optional(),
      hips_cm: z.number().min(30).max(250).optional(),
      arms_cm: z.number().min(10).max(100).optional(),
      thighs_cm: z.number().min(20).max(150).optional(),
      notes: z.string().max(500).optional(),
      request_id: requestId,
    },
    tools.log_measurement
  );

  register(
    'log_journal_entry',
    'Write a journal note for a date. By default appends to that day\'s existing note.',
    { date, text: z.string().min(1).max(5000), append: z.boolean().optional().describe('Default true; false replaces the day\'s note.'), request_id: requestId },
    tools.log_journal_entry
  );

  register(
    'update_entry',
    'Correct something already logged, by its id (meal:12, item:<key>, body:<date>, measure:<date>:<type>, journal:<date>). Only the given fields change. For nutrition goals / daily totals / progress tests, call the set_/log_ tool again instead.',
    {
      id: z.string().min(3).max(300),
      fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).describe('meal: description, meal_type, date, calories, protein_g, fiber_g, carbs_g, fat_g, estimated · item: status, reps, weight_kg, seconds · body: weight_kg, muscle_mass_kg, fat_mass_kg, body_fat_percent, notes · measure: value · journal: text'),
    },
    tools.update_entry
  );

  register('delete_entry', 'Delete a logged meal, set, body log, measurement, journal note, nutrition goal (goal:<id>), daily nutrition total (nutrition:<date>) or progress-test checkpoint (test:<checkpoint>) by id.', { id: z.string().min(3).max(300) }, tools.delete_entry);

  register('get_today', 'Everything for a date: scheduled sessions, what is already logged (with ids), meals and nutrition totals vs goal, body log, journal. Call this before logging to avoid duplicates.', { date }, tools.get_today, { readOnly: true });
  register('get_plan', 'The active training plan (or a named plan): days, sessions and exercises with sets/reps/seconds/rest.', { plan: z.string().max(80).optional() }, tools.get_plan, { readOnly: true });
  register(
    'list_exercises',
    'Search the exercise library (built-in + the user\'s own).',
    { query: z.string().max(80).optional(), muscle: z.string().max(40).optional().describe('Muscle key such as pecMajor, quads, gluteMax.'), type: z.enum(['reps', 'hold', 'hold_side', 'cardio']).optional(), limit: z.number().int().min(1).max(100).optional() },
    tools.list_exercises,
    { readOnly: true }
  );
  register('get_stats', 'Training statistics: sessions completed vs planned this week, streaks, total sets/reps/hold time/time trained, completed/incomplete/skipped counts, nutrition averages.', { range: z.enum(['week', 'month', 'year', 'all']).optional() }, tools.get_stats, { readOnly: true });

  /* ---------- everything else the app can do ---------- */
  const weekday = z.string().min(3).max(10).describe('Weekday: sun, mon, tue, wed, thu, fri or sat (full names also work).');
  const sessionRef = z.string().min(1).max(100).describe('Session id or name, e.g. "Upper A", "Mobility A".');
  const exRef = z.string().min(1).max(120).describe('Exercise id or name.');
  const timing = { sets: z.number().int().min(1).max(50).nullable().optional(), reps: z.number().int().min(1).max(1000).nullable().optional(), seconds: z.number().int().min(1).max(86400).nullable().optional(), rest: z.number().int().min(0).max(3600).nullable().optional(), countdown: z.number().int().min(0).max(300).nullable().optional() };
  const dayAt = { day: weekday, session: sessionRef };

  const planOp = z.discriminatedUnion('op', [
    z.object({ op: z.literal('rename_plan'), name: z.string().min(1).max(80) }),
    z.object({ op: z.literal('set_timing'), countdown: z.number().int().min(0).max(300).nullable().optional(), work: z.number().int().min(1).max(3600).nullable().optional(), rest: z.number().int().min(0).max(3600).nullable().optional() }),
    z.object({ op: z.literal('add_session'), day: weekday, name: z.string().min(1).max(80), name_ar: z.string().max(80).optional(), optional: z.boolean().optional() }),
    z.object({ op: z.literal('rename_session'), ...dayAt, name: z.string().min(1).max(80) }),
    z.object({ op: z.literal('set_session_optional'), ...dayAt, optional: z.boolean() }),
    z.object({ op: z.literal('remove_session'), ...dayAt }),
    z.object({ op: z.literal('move_session'), ...dayAt, to_day: weekday, to_index: z.number().int().min(0).optional() }),
    z.object({ op: z.literal('reorder_session'), ...dayAt, to_index: z.number().int().min(0) }),
    z.object({ op: z.literal('swap_sessions'), day_a: weekday, session_a: sessionRef, day_b: weekday, session_b: sessionRef }),
    z.object({ op: z.literal('swap_days'), day_a: weekday, day_b: weekday }),
    z.object({ op: z.literal('add_exercise'), ...dayAt, exercise: exRef, index: z.number().int().min(0).optional(), ...timing }),
    z.object({ op: z.literal('remove_exercise'), ...dayAt, exercise: exRef }),
    z.object({ op: z.literal('move_exercise'), ...dayAt, exercise: exRef, to_index: z.number().int().min(0) }),
    z.object({ op: z.literal('override_exercise'), ...dayAt, exercise: exRef, ...timing }),
  ]);

  register('list_plans', 'List the training plans and which one is active.', {}, admin.list_plans, { readOnly: true });
  register('get_plan_details', 'Full day-by-day structure of a plan (active plan if omitted), with session ids and exercise names.', { plan: z.string().max(80).optional() }, admin.get_plan_details, { readOnly: true });
  register('create_plan', 'Create a new plan, optionally as a copy of an existing one.', { name: z.string().min(1).max(80), copy_from: z.string().max(80).optional().describe('Name of a plan to duplicate; omit for an empty plan.'), make_active: z.boolean().optional(), request_id: requestId }, admin.create_plan);
  register('set_active_plan', 'Switch which plan is active (drives Home and the planned numbers in statistics).', { plan: z.string().min(1).max(80) }, admin.set_active_plan);
  register('delete_plan', 'Delete a plan. The original default plan cannot be deleted. Logged history is kept.', { plan: z.string().min(1).max(80) }, admin.delete_plan);
  register(
    'edit_plan',
    'Edit a plan with one or more ordered operations (rename, timing, add/remove/move/swap sessions and days, add/remove/reorder exercises, override sets/reps/seconds/rest/countdown for that plan only). All-or-nothing: if one operation is invalid nothing is saved.',
    { plan: z.string().max(80).optional().describe('Plan name; defaults to the active plan.'), operations: z.array(planOp).min(1).max(40), request_id: requestId },
    admin.edit_plan
  );

  const exFields = {
    name_en: z.string().max(120).optional(), name_ar: z.string().max(120).optional(),
    type: z.enum(['reps', 'hold', 'hold_side', 'cardio']).optional().describe('reps = sets×reps; hold = timed hold; hold_side = a hold on each side; cardio = work/rest intervals.'),
    ...timing,
    per_side: z.boolean().optional(),
    primary_muscles: z.array(z.string()).max(12).optional().describe('Muscle keys such as pecMajor, quads, gluteMax (see list_exercises output).'),
    secondary_muscles: z.array(z.string()).max(12).optional(),
    groups: z.array(z.string().max(30)).max(20).optional().describe('Day / session tags such as sun, mobA, yoga.'),
    notes: z.string().max(2000).optional(), how: z.string().max(2000).optional(), dose: z.string().max(300).optional(), direction: z.string().max(500).optional(),
    media: z.object({ url: z.string().max(500).optional(), start: z.number().int().min(0).nullable().optional(), source: z.string().max(100).optional(), verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), title: z.string().max(200).nullable().optional(), note: z.string().max(500).nullable().optional() }).nullable().optional().describe('Video/image link for the exercise; null or empty url clears it.'),
  };
  register('create_exercise', 'Add a new exercise to the library.', { ...exFields, request_id: requestId }, admin.create_exercise);
  register('update_exercise', 'Edit any field of any exercise (built-in or your own), including its media link. Applies to future sessions only; history is untouched.', { exercise: exRef, fields: z.object(exFields).describe('Only the fields to change.') }, admin.update_exercise);
  register('archive_exercise', 'Archive (hide) or restore an exercise.', { exercise: exRef, archived: z.boolean().optional().describe('Default true; false restores.') }, admin.archive_exercise);
  register('duplicate_exercise', 'Copy an exercise into a new custom exercise.', { exercise: exRef, new_name: z.string().max(120).optional(), request_id: requestId }, admin.duplicate_exercise);
  register('delete_exercise', 'Delete a custom exercise, or reset an edited built-in exercise to its original. Logged history is kept.', { exercise: exRef }, admin.delete_exercise);

  register('get_settings', 'Read timing defaults, week start, timezone and stick level.', {}, admin.get_settings, { readOnly: true });
  register(
    'update_settings',
    'Change settings. week_start: 0=Sunday … 6=Saturday. Timing values are global defaults used when the plan/exercise sets none.',
    {
      week_start: z.number().int().min(0).max(6).optional(), timezone: z.string().max(60).optional().describe('IANA name, e.g. Asia/Riyadh.'),
      countdown_s: z.number().int().min(0).max(300).optional(), work_s: z.number().int().min(1).max(3600).optional(), rest_s: z.number().int().min(0).max(3600).optional(),
      seconds_per_rep: z.number().min(1).max(30).optional(), stick_level: z.number().int().min(1).max(3).optional(),
    },
    admin.update_settings
  );

  register(
    'set_nutrition_goal',
    'Set calorie / protein / fiber goals from a date on. Goals are append-only so past days are still judged against the goal that applied then.',
    { effective_from: date, calories_goal: nonNeg(20000, 'kcal per day').optional(), protein_goal: nonNeg(2000, 'g per day').optional(), fiber_goal: nonNeg(1000, 'g per day').optional(), request_id: requestId },
    admin.set_nutrition_goal
  );
  register(
    'log_daily_nutrition',
    'Set a day\'s manual nutrition TOTALS (as opposed to individual meals, which add on top). Only the given fields change.',
    { date, calories: nonNeg(20000, 'kcal').optional(), protein_g: nonNeg(2000, 'g').optional(), fiber_g: nonNeg(1000, 'g').optional(), carbs_g: nonNeg(3000, 'g').optional(), fat_g: nonNeg(2000, 'g').optional(), notes: z.string().max(500).optional(), request_id: requestId },
    admin.log_daily_nutrition
  );
  register(
    'log_progress_test',
    'Record flexibility progress-test results for a checkpoint. results is keyed by test id: reach{value}, deep_squat{supported,unsupported}, knee_wall{right,left}, pass_grip{value}, front_split{right,left}, ninety_no_hands{ok(boolean),clean}, getup{value}, strikes_30{value}, fig8_weak{value}. Merges with what is already saved.',
    { checkpoint: z.enum(['start', 'w4', 'w8', 'w12']), tested_on: date, results: z.record(z.string(), z.record(z.string(), z.union([z.number(), z.boolean(), z.null()]))), request_id: requestId },
    admin.log_progress_test
  );

  register('add_session_to_day', 'Do another day\'s session on a given date (in addition to that weekday\'s own sessions).', { date, day: weekday, session: sessionRef, plan: z.string().max(80).optional() }, admin.add_session_to_day);
  register('quick_add_exercise', 'Add a single free exercise to a date (not part of any plan), then log it with log_workout.', { date, exercise: exRef, ...timing }, admin.quick_add_exercise);
  register('remove_from_day', 'Undo add_session_to_day / quick_add_exercise for a date.', { date, day: weekday.optional(), session: sessionRef.optional(), exercise: exRef.optional() }, admin.remove_from_day);

  register(
    'get_history',
    'Read past records with ids: body (weight, composition, measurements), nutrition (daily totals, meals, goals), journal, progress_tests, workouts (logged sets).',
    { kind: z.enum(['body', 'nutrition', 'journal', 'progress_tests', 'workouts']), start: date, end: date, limit: z.number().int().min(1).max(200).optional() },
    admin.get_history,
    { readOnly: true }
  );

  return server;
}
