// @vitest-environment node
// MCP connector: real Postgres semantics (PGlite), the real Express router and the official MCP SDK client.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

process.env.DATABASE_URL = 'postgres://unused@localhost/unused'; // db.js only builds a lazy Pool
process.env.SESSION_SECRET = 'test';
const { SCHEMA_SQL } = await import('../server/db.js');
const { createMcpRouter, hashToken, newToken } = await import('../server/mcp/router.js');
const { buildDefaultPlan } = await import('../src/data/defaultPlan.js');
const { builtinLibrary } = await import('../src/data/library.js');
const { totals } = await import('../src/lib/stats.js');
const INDEX = (await import('../server/exerciseIndex.generated.json', { with: { type: 'json' } })).default;

let pg, db, server, base, token, userId, otherUserId;

const adapter = (p) => ({
  query: async (sql, params = []) => (await p.query(sql, params)).rows,
  tx: (fn) => p.transaction((t) => fn(async (sql, params = []) => (await t.query(sql, params)).rows)),
});

async function connect(tok = token, { path = true, header = false } = {}) {
  const url = new URL(path ? `${base}/mcp/${tok}` : `${base}/mcp`);
  const transport = new StreamableHTTPClientTransport(url, header ? { requestInit: { headers: { Authorization: `Bearer ${tok}` } } } : undefined);
  const client = new Client({ name: 'test', version: '1' });
  await client.connect(transport);
  return client;
}
const call = async (client, name, args) => {
  const r = await client.callTool({ name, arguments: args });
  const text = r.content?.[0]?.text;
  return { isError: !!r.isError, text, json: !r.isError ? JSON.parse(text) : null };
};
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SCHEMA_SQL);
  db = adapter(pg);
  const app = express();
  app.use(express.json());
  app.use('/mcp', createMcpRouter(db));
  await new Promise((r) => {
    server = app.listen(0, r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => server?.close());

beforeEach(async () => {
  await pg.exec('DELETE FROM users');
  userId = (await db.query(`INSERT INTO users (username, password_hash) VALUES ('me','x') RETURNING id`))[0].id;
  otherUserId = (await db.query(`INSERT INTO users (username, password_hash) VALUES ('someone','x') RETURNING id`))[0].id;
  token = newToken();
  await db.query('INSERT INTO mcp_tokens (user_id, token_hash) VALUES ($1,$2)', [userId, hashToken(token)]);
});

describe('authentication', () => {
  const post = (url, headers = {}) =>
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });

  it('rejects a missing token, a wrong token, and a revoked token', async () => {
    expect((await post(`${base}/mcp`)).status).toBe(401);
    expect((await post(`${base}/mcp`, { authorization: 'Bearer wtl_nope' })).status).toBe(401);
    expect((await post(`${base}/mcp/wtl_nope`)).status).toBe(401);
    await db.query('DELETE FROM mcp_tokens WHERE user_id = $1', [userId]);
    expect((await post(`${base}/mcp/${token}`)).status).toBe(401);
  });
  it('accepts the token as a Bearer header and as a path segment; stores only the hash', async () => {
    expect((await post(`${base}/mcp`, { authorization: `Bearer ${token}` })).status).toBe(200);
    expect((await post(`${base}/mcp/${token}`)).status).toBe(200);
    const stored = (await db.query('SELECT token_hash, last_used_at FROM mcp_tokens WHERE user_id = $1', [userId]))[0];
    expect(stored.token_hash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
    expect(stored.last_used_at).toBeTruthy();
  });
  it('GET is not allowed (stateless connector)', async () => {
    expect((await fetch(`${base}/mcp/${token}`)).status).toBe(405);
  });
});

describe('tools', () => {
  it('lists the ten tools with schemas', async () => {
    const c = await connect(token, { path: false, header: true });
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['delete_entry', 'get_plan', 'get_stats', 'get_today', 'list_exercises', 'log_journal_entry', 'log_measurement', 'log_meal', 'log_workout', 'update_entry'].sort());
    expect(tools.every((t) => t.description && t.inputSchema?.type === 'object')).toBe(true);
    await c.close();
  });

  it('log_meal: saves with source claude, marks estimates, and defaults the date to today (Riyadh)', async () => {
    const c = await connect();
    const r = await call(c, 'log_meal', { description: 'Chicken shawarma plate', meal_type: 'dinner', calories: 750, protein_g: 45 });
    expect(r.json.saved).toMatchObject({ meal_type: 'dinner', calories: 750, estimated: true, source: 'claude', date: today });
    const row = (await db.query('SELECT * FROM meals WHERE user_id = $1', [userId]))[0];
    expect(row).toMatchObject({ description: 'Chicken shawarma plate', source: 'claude', estimated: true });
    expect(r.json.saved.id).toBe(`meal:${row.id}`);
    const stated = await call(c, 'log_meal', { description: 'Protein bar', calories: 200, estimated: false });
    expect(stated.json.saved.estimated).toBe(false);
    await c.close();
  });

  it('is idempotent on request_id', async () => {
    const c = await connect();
    const args = { description: 'Oats', calories: 300, request_id: 'req-1' };
    const a = await call(c, 'log_meal', args);
    const b = await call(c, 'log_meal', args);
    expect(b.json.duplicate_request).toBe(true);
    expect(b.json.saved.id).toBe(a.json.saved.id);
    expect((await db.query('SELECT count(*)::int AS n FROM meals WHERE user_id = $1', [userId]))[0].n).toBe(1);
    await c.close();
  });

  it('rejects bad input with a clear error and writes nothing', async () => {
    const c = await connect();
    const neg = await c.callTool({ name: 'log_meal', arguments: { description: 'x', calories: -5 } }).catch((e) => ({ isError: true, content: [{ text: String(e.message) }] }));
    expect(neg.isError).toBe(true);
    const badDate = await c.callTool({ name: 'log_meal', arguments: { description: 'x', date: '2025-13-45' } }).catch((e) => ({ isError: true, content: [{ text: String(e.message) }] }));
    expect(badDate.isError).toBe(true);
    expect((await db.query('SELECT count(*)::int AS n FROM meals'))[0].n).toBe(0);
    await c.close();
  });

  it('log_workout: matches library names, creates unknown exercises and says so', async () => {
    const c = await connect();
    const r = await call(c, 'log_workout', {
      date: '2025-01-05',
      exercises: [
        { exercise: 'dumbbell bench press', sets: [{ reps: 12, weight_kg: 20 }, { reps: 10, weight_kg: 22.5 }] },
        { exercise: 'plank', sets: [{ seconds: 45 }] },
        { exercise: 'Zottman curl', sets: [{ reps: 8, weight_kg: 10, status: 'incomplete' }] },
      ],
    });
    expect(r.json.created_exercises).toHaveLength(1);
    expect(r.json.created_exercises[0].name).toBe('Zottman curl');
    const items = r.json.saved.items;
    expect(items.map((i) => [i.exercise_id, i.matched, i.status])).toEqual([
      ['bench_press', 'name', 'completed'], ['bench_press', 'name', 'completed'], ['plank', 'id', 'completed'], [r.json.created_exercises[0].id, 'created', 'incomplete'],
    ]);
    const rows = await db.query(`SELECT * FROM session_items WHERE user_id = $1 ORDER BY exercise_id, set_index`, [userId]);
    expect(rows).toHaveLength(4);
    expect(rows.every((x) => x.source === 'claude' && x.date === '2025-01-05')).toBe(true);
    expect(rows.find((x) => x.exercise_id === 'plank')).toMatchObject({ hold_seconds: 45, ex_type: 'hold' });
    const custom = await db.query('SELECT * FROM user_exercises WHERE user_id = $1', [userId]);
    expect(custom).toHaveLength(1);
    await c.close();
  });

  it('log_workout linked to a plan day uses the plan session and its entry keys', async () => {
    const plan = buildDefaultPlan();
    await db.query('INSERT INTO plans (user_id, plan_id, data) VALUES ($1,$2,$3)', [userId, plan.id, JSON.stringify(plan)]);
    const c = await connect();
    const r = await call(c, 'log_workout', { date: '2025-01-05', plan_or_day: 'Sunday', exercises: [{ exercise: 'bench_press', sets: [{ reps: 12, weight_kg: 20 }, {}, {}] }, { exercise: 'wall sit', sets: [{ seconds: 30 }] }] });
    expect(r.json.saved.linked_to).toMatch(/^sun:/);
    expect(r.json.saved.sessions).toContain('2025-01-05|default|sun|main');
    const bench = (await db.query(`SELECT * FROM session_items WHERE user_id = $1 AND exercise_id = 'bench_press' ORDER BY set_index`, [userId]));
    expect(bench.map((b) => b.item_key)).toEqual([0, 1, 2].map((i) => `2025-01-05|default|sun|main|b0|${i}`));
    expect(bench[1].reps_done).toBe(12); // an empty set = the planned reps, completed
    const session = (await db.query('SELECT * FROM session_log WHERE user_id = $1 AND session_key = $2', [userId, '2025-01-05|default|sun|main']))[0];
    expect(session.planned).toHaveLength(6);
    // wall sit is not part of Sunday's session -> goes to the free "Logged by Claude" session
    const wall = (await db.query(`SELECT session_key FROM session_items WHERE user_id = $1 AND exercise_id = 'wall_sit'`, [userId]))[0];
    expect(wall.session_key).toBe('2025-01-05|free|-|claude');
    await c.close();
  });

  it('statistics count Claude-logged data exactly like data entered in the app', async () => {
    const c = await connect();
    await call(c, 'log_workout', { date: today, exercises: [{ exercise: 'bench press', sets: [{ reps: 12, weight_kg: 20 }, { reps: 12, weight_kg: 20 }] }, { exercise: 'plank', sets: [{ seconds: 40 }] }] });
    const stats = await call(c, 'get_stats', { range: 'all' });
    expect(stats.json.totals).toMatchObject({ sets: 3, reps: 24, hold_seconds: 40, completed: 3 });
    expect(stats.json.streak.current).toBe(1);
    // same numbers from the shared stats code applied to the raw rows
    const rows = await db.query('SELECT * FROM session_items WHERE user_id = $1', [userId]);
    expect(totals(rows).sets).toBe(3);
    await c.close();
  });

  it('log_measurement + log_journal_entry + get_today', async () => {
    const c = await connect();
    await call(c, 'log_meal', { description: 'Eggs', calories: 200, protein_g: 14 });
    const m = await call(c, 'log_measurement', { weight_kg: 71.4, waist_cm: 82 });
    expect(m.json.saved.id).toEqual([`body:${today}`, `measure:${today}:waist`]);
    const j = await call(c, 'log_journal_entry', { text: 'Felt strong' });
    const j2 = await call(c, 'log_journal_entry', { text: 'Knee ok' });
    expect(j2.json.saved.text).toBe('Felt strong\nKnee ok');
    expect(j.json.saved.source).toBe('claude');
    const t = await call(c, 'get_today', {});
    expect(t.json.nutrition_totals).toMatchObject({ calories: 200, protein_g: 14 });
    expect(t.json.meals).toHaveLength(1);
    expect(t.json.body_log.weight).toBe(71.4);
    await c.close();
  });

  it('update_entry and delete_entry correct mistakes by id', async () => {
    const c = await connect();
    const meal = (await call(c, 'log_meal', { description: 'Rice', calories: 900 })).json.saved;
    const up = await call(c, 'update_entry', { id: meal.id, fields: { calories: 450, description: 'Rice (half)' } });
    expect(up.json.saved).toMatchObject({ calories: 450, description: 'Rice (half)' });
    const bad = await call(c, 'update_entry', { id: meal.id, fields: { colour: 'red' } });
    expect(bad.isError).toBe(true);
    const w = (await call(c, 'log_workout', { date: today, exercises: [{ exercise: 'plank', sets: [{ seconds: 40 }] }] })).json.saved.items[0];
    const fixed = await call(c, 'update_entry', { id: w.id, fields: { seconds: 55, status: 'incomplete' } });
    expect(fixed.json.saved).toMatchObject({ seconds: 55, status: 'incomplete' });
    expect((await call(c, 'delete_entry', { id: meal.id })).json.deleted).toBe(meal.id);
    expect((await call(c, 'delete_entry', { id: meal.id })).isError).toBe(true);
    expect((await call(c, 'delete_entry', { id: w.id })).json.deleted).toBe(w.id);
    await c.close();
  });

  it('can never touch another user’s data', async () => {
    const meal = (await db.query(`INSERT INTO meals (user_id, date, description, source) VALUES ($1,'2025-01-01','not yours','app') RETURNING id`, [otherUserId]))[0];
    const c = await connect();
    expect((await call(c, 'delete_entry', { id: `meal:${meal.id}` })).isError).toBe(true);
    expect((await call(c, 'update_entry', { id: `meal:${meal.id}`, fields: { description: 'hacked' } })).isError).toBe(true);
    expect((await call(c, 'get_today', { date: '2025-01-01' })).json.meals).toHaveLength(0);
    expect((await db.query('SELECT description FROM meals WHERE id = $1', [meal.id]))[0].description).toBe('not yours');
    await c.close();
  });

  it('get_plan and list_exercises are read-only helpers', async () => {
    const plan = buildDefaultPlan();
    await db.query('INSERT INTO plans (user_id, plan_id, data) VALUES ($1,$2,$3)', [userId, plan.id, JSON.stringify(plan)]);
    const c = await connect();
    const p = await call(c, 'get_plan', {});
    expect(p.json.days.sun.map((s) => s.name)).toContain('Upper A');
    const l = await call(c, 'list_exercises', { query: 'bench', limit: 5 });
    expect(l.json.exercises.map((e) => e.id)).toContain('bench_press');
    await c.close();
  });
});

describe('server exercise index', () => {
  it('is in sync with the app library (re-run scripts/build-server-index.mjs if this fails)', () => {
    const lib = builtinLibrary();
    expect(INDEX.map((e) => e.id)).toEqual(lib.map((e) => e.id));
    expect(INDEX.find((e) => e.id === 'plank')).toMatchObject({ type: 'hold', seconds: 40 });
  });
});
