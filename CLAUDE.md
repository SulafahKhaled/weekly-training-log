# CLAUDE.md

Guidance for Claude Code (or any future agent) working in this repository. Read this before making changes.

## What this project is

A personal 7-day home-workout tracker (Sun–Sat: Upper A, Lower A, HIIT circuit, Core+Hip, Upper B, Lower B, HIIT circuit), rebuilt from a static HTML/JS prototype into a React + Vite frontend backed by a small Express + SQLite API, so training history persists permanently and is reachable from any device on the local network (phone at the gym, laptop at home).

The exercise plan (names, sets/reps/rest, Arabic text, day grouping) is transcribed from `‎⁨جدول التمارين الأسبوعي معاد الترتيب⁩.pdf` — treat that PDF as the source of truth if the plan ever needs correcting.

There are two handoff specs in the repo root, both titled "v2" relative to the original static v1 app — don't confuse them: `project-handoff.md` is the first version of that v2 spec (the DB/cross-device rebuild — data model, base feature requirements), and `project-handoff_v2.md` is a **later revision of the same v2 spec** that additionally requires the three-layer recovery system in §4.5/§6.2/§6.3 (Dynamic warm-up / Mobility drill / Static stretch, and a per-day "Prepare & Recover" section) — everything else in it is identical to `project-handoff.md`. Both requirement sets are implemented. This file documents what was actually built and where it diverges from either spec — **this file is authoritative over both handoff docs** where they disagree with what's actually in the code (see "Deliberate deviations" below).

### Deliberate deviations from the handoff docs

- **Light mode, not dark.** Both handoff docs (§4.6) specify a dark theme — that was true through the first build, but the user explicitly asked to switch to light mode afterward ("I hate dark modes"). The app is light-mode now; don't revert to dark without the user asking again. See the category-color contrast notes below if re-theming.
- **No `exercises` table** — see "Data model" below.

## Architecture

```
src/
  data/days.js          static plan data (7 days, exercises, sets/reps/rest, Arabic labels) — NOT in the DB
  data/videos.js         YouTube video-ID map, keyed by exercise
  data/recovery.js        three-layer recovery library (DYNAMIC/MOBILITY/STATIC) +
                           per-day config + buildDayRecovery() — see "Recovery system" below
  lib/api.js              fetch wrapper for the /api/* backend
  lib/audio.js            Web Audio beep cues (timer phase changes)
  lib/celebrate.js        canvas-confetti wrapper
  lib/time.js             fmtTime formatting
  context/ProgressContext.jsx   loads today's progress + streak from the API on mount,
                                 exposes isSetDone/getSetWeight/toggleSet/setWeightFor/
                                 isCircuitDone/toggleCircuit/resetDay, does optimistic
                                 local updates then calls the API (reverts on failure)
  hooks/useProgress.js    dayProgress()/useDayProgress()/useTodayTotals() — pure
                           aggregation over ProgressContext + the static day data
  components/             Home, DayView, DayCard, TopBar, TabBar, InfoPage, VideoCard,
                           ProgressRing, VideoBlock, ExerciseShell (accordion wrapper)
  components/PrepareRecover.jsx  per-day "Prepare & Recover" section (muscle-card grid + extras)
  components/MuscleCard.jsx      one muscle/joint card with switchable Dynamic/Mobility/Stretch tabs
  components/blocks/      ResistanceBlock (sets + weight input + rest timer + history),
                           IsometricBlock (auto hold/rest sequence), CircuitBlock
                           (work/rest interval sequence), RestTimer, ExerciseHistory

server/
  db.js     sql.js (WASM SQLite) wrapper — initDb(), run(), all(), persist()
  index.js  Express app: /api/* routes + serves dist/ in production

legacy/      the original static HTML/vanilla-JS v1 (kept for reference only)
```

## Recovery system (v2 handoff §4.5/§6.2/§6.3)

Three layers, each a different granularity, all in `src/data/recovery.js`:

- `DYNAMIC` — region-level movement prep (6 entries: Full-Body/Cardio, Upper/Lower Body Dynamic, Hip & Glute Activation, Ankle & Calf Mobility, Core/Torso Rotation), done before training.
- `MOBILITY` — joint-level CARs-style drills (Shoulder CARs, Hip 90/90, T-Spine Rotation, Ankle Mobility, Wrist Mobility, plus `primalFlow` — the weekly-bonus Primal Movement Flow, flagged `badge: 'Weekly bonus'` and never assigned to a specific day).
- `STATIC` — muscle-level held stretches (13 entries), one per named muscle from the handoff's day→muscle table.

`DYNAMIC` and `MOBILITY` entries carry a `covers: [muscleKey, ...]` array. `buildDayRecovery(dayId)` uses it to build that day's muscle-card grid: for each of the day's target muscles (from the day's own `static` list in `DAY_RECOVERY`), it looks for a dynamic/mobility entry *assigned to that day* whose `covers` includes the muscle — **the lookup is scoped to the day's own assigned entries, not the whole library**, because several muscles (e.g. glutes) are covered by more than one global entry and only the day-scoped match is the one actually relevant that day. Not every muscle gets all three layers — e.g. Neck has no matching Dynamic/Mobility entry in the library, so its card only shows Stretch, and that's correct, not a bug.

Any of a day's Dynamic/Mobility entries that don't end up matching a muscle card (e.g. Wrist Mobility on plank/push-up days) are surfaced as standalone "Also relevant today" cards via `extras` — see `PrepareRecover.jsx`. This orphan-handling is deliberate; don't force an artificial muscle mapping to eliminate it.

The Warm-up/Mobility/Cool-down tabs (`WARMUP_INFO`/`MOBILITY_INFO`/`COOLDOWN_INFO` in `days.js`) are now full browsable libraries built directly from `Object.values(DYNAMIC/MOBILITY/STATIC)` — the per-day Prepare & Recover section is the primary path, the tabs are the secondary/reference path, per the handoff's explicit requirement that both exist.

**Scope decision:** `DYNAMIC`/`MOBILITY`/`STATIC` entries have English + Arabic labels, but the 2–3 tip bullets per entry are English-only (they're supplementary guidance text the handoff docs didn't supply verbatim, unlike the PDF-sourced exercise data — translating them accurately wasn't worth the risk for a personal app). Revisit only if asked.

**The exercise plan itself is not in the database.** `exercises` from the original handoff-doc schema was deliberately dropped — the 7-day plan is fixed, there's no UI to edit it (explicitly out of scope), and keeping it as a static JS module is simpler than seeding/migrating it into SQLite for no behavioral gain. Only what a person *does* (completed sets, weights, completed circuits) is persisted.

## Data model (SQLite via sql.js, `server/data.sqlite`)

```sql
set_logs (
  id, day_id, block_index, set_index, date,
  weight REAL NULL, completed_at,
  UNIQUE(day_id, block_index, set_index, date)
)
circuit_logs (
  id, day_id, block_index, date,
  rounds_completed, completed_at,
  UNIQUE(day_id, block_index, date)
)
```

- `day_id` is the static id from `days.js` (`sun`…`sat`); `block_index` is that day's `blocks[]` array index. Both are stable as long as `days.js` isn't reordered — don't reorder blocks within a day without considering existing history rows will then point at the wrong exercise.
- A row's existence *is* the "done" state — marking a set done inserts a row (upsert on the unique key), unmarking it deletes the row. There is no separate boolean column.
- Weight is optional (nullable) and editable independently via `PATCH /api/sets/weight` without re-toggling done state.
- No `sessions` table, no `reps_done` override, no `notes` — trimmed from the handoff doc's suggested schema to keep the surface small; add them if the user asks for reps-override editing or session-level metadata.

## API (`server/index.js`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/progress?date=YYYY-MM-DD` | all set/circuit logs for one date |
| POST | `/api/sets` | `{day_id, block_index, set_index, date, done, weight}` — upsert or delete |
| PATCH | `/api/sets/weight` | `{day_id, block_index, set_index, date, weight}` — update weight only |
| POST | `/api/circuits` | `{day_id, block_index, date, done, rounds_completed}` |
| POST | `/api/day/reset` | `{day_id, date}` — deletes all logs for that day+date |
| GET | `/api/history/:dayId/:blockIndex?limit=20` | past sessions for one exercise, grouped by date |
| GET | `/api/streak` | consecutive-day streak computed server-side |

## Key conventions / gotchas

- **`better-sqlite3` fails to compile on this machine** (`fatal error: 'climits' file not found` — a broken Xcode CLT C++ header path, not a project bug). Use **`sql.js`** (SQLite-to-WASM, no native build) instead — already the choice made here. Don't swap back without confirming native compilation actually works in the target environment.
- **sql.js is in-memory + manual persistence.** `server/db.js`'s `run()` calls `persist()` (full DB export to disk) after every mutation. Fine at this write volume (a person tapping checkboxes); would need debouncing if write frequency ever grows much.
- **Idempotent completion for isometric holds and circuits.** `ProgressContext.toggleSet`/`toggleCircuit` are true toggles (flip on/off). `IsometricBlock` and `CircuitBlock` guard with `if (!isSetDone/isCircuitDone(...)) toggle...(...)` before marking complete on timer finish — otherwise re-running a finished timer (e.g. hitting "Restart") would silently *uncheck* an already-logged set. If you add more auto-completing timers, keep this guard.
- **Progress is date-scoped like v1, history is not.** The home/day views only ever show *today's* checkmarks (matches the original UX — checklists reset visually each day), but every completed set is retained in `set_logs` forever, which is what the history view and streak read from.
- **Express 5 routing**: the SPA catch-all in `server/index.js` uses a regex (`/^(?!\/api).*/`), not the bare `'*'` string — Express 5's path-to-regexp no longer accepts that.
- **Vite dev proxy**: `vite.config.js` proxies `/api` → `http://localhost:3001` so `fetch('/api/...')` works identically in dev (`npm run dev`, two processes via `concurrently`) and in production (`npm start`, one process serving both).
- Weight is stored as a plain number, no unit conversion — the UI labels it "kg" but doesn't enforce it.

## Running it

- `npm run dev` — hot-reload frontend (Vite) + API together, via `concurrently`.
- `npm start` — build the frontend then serve everything (frontend + API) from one Express process on `0.0.0.0:3001`, reachable from other devices on the LAN. This is the "cross-device" mode.
- See `documentation.md` for the full walkthrough and troubleshooting.

## Out of scope (per the original handoff doc — don't add without the user asking)

- User accounts, multi-user, cloud sync.
- Editing the workout plan from the UI (plan is fixed, seeded from the PDF).
- Nutrition or body-weight tracking.
- `reps_done` override, per-set notes, session-level metadata (`sessions` table) — all trimmed from the original schema proposal; revisit only on request.
