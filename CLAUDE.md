# CLAUDE.md

Guidance for Claude Code (or any future agent) working in this repository. Read this before making changes.

## What this project is

A 7-day home-workout tracker (Sun–Sat: Upper A, Lower A, HIIT circuit, Core+Hip, Upper B, Lower B, HIIT circuit), rebuilt from a static HTML/JS prototype into a React + Vite frontend backed by an Express + Postgres API with real username/password accounts, deployed on Vercel so it's usable by multiple independent people (family/friends) from any device, each with fully isolated data.

- **Live app:** https://files-tau-eosin.vercel.app
- **GitHub repo:** https://github.com/SulafahKhaled/weekly-training-log (public)
- **Database:** Neon Postgres, provisioned via the Vercel Postgres/Neon marketplace integration on the `files` Vercel project (team: `solafahwork-4232s-projects`)

This went through three builds in sequence — a React rewrite of a static prototype, a single-shared-database persistence layer (localStorage → SQLite), and finally this multi-user + cloud version. Earlier sections of this file may describe intermediate states; the "Multi-user & deployment" section below and the rest of this document describe the current, deployed state.

The exercise plan (names, sets/reps/rest, Arabic text, day grouping) is transcribed from `‎⁨جدول التمارين الأسبوعي معاد الترتيب⁩.pdf` — treat that PDF as the source of truth if the plan ever needs correcting.

There are three spec docs in the repo root — don't confuse them: `project-handoff.md` is the first version of the v2 spec (the DB/cross-device rebuild — data model, base feature requirements); `project-handoff_v2.md` is a **later revision of that same v2 spec** that additionally requires the three-layer recovery system in §4.5/§6.2/§6.3 (Dynamic warm-up / Mobility drill / Static stretch, and a per-day "Prepare & Recover" section) — everything else in it is identical to `project-handoff.md`; `journal-stats-feature.md` is a **separate, later addition** specifying the Journal & Statistics tab (journal entries with photos, plus Adherence/Exercise-progress/Body/Nutrition statistics views) — it explicitly assumes `project-handoff.md`'s `exercises`/`sessions` tables exist, which this app never built (see "Deliberate deviations" and "Journal & Statistics" below for how it was adapted). All three requirement sets are implemented. This file documents what was actually built and where it diverges from any of them — **this file is authoritative over all three spec docs** where they disagree with what's actually in the code (see "Deliberate deviations" below).

### Deliberate deviations from the handoff docs

- **Light mode, not dark.** Both handoff docs (§4.6) specify a dark theme — that was true through the first build, but the user explicitly asked to switch to light mode afterward ("I hate dark modes"). The app is light-mode now; don't revert to dark without the user asking again. See the category-color contrast notes below if re-theming.
- **No `exercises` table** — see "Data model" below.
- **Multi-user with hand-rolled auth, not the handoff's single-shared-database model.** Both handoff docs assume one person, one database. The user later asked to share this with family/friends without mixing data, so every table now has a `user_id` and there's a username/password login (see "Multi-user & deployment" below). This supersedes the handoff docs' implicit single-user assumption everywhere it's relevant.
- **Postgres (Neon via Vercel), not SQLite.** The handoff docs suggested SQLite/Dexie; the move to Vercel hosting required a real hosted database (serverless functions have no persistent local disk), so the backend was migrated from sql.js/SQLite to Postgres. `server/db.js` and the schema below reflect Postgres, not the SQLite version described in earlier project history.
- **No `sessions`/`exercises` tables for Journal & Statistics either** — `journal-stats-feature.md` assumes they exist; adherence and exercise-progress instead derive from the existing `set_logs`/`circuit_logs` tables plus the static `days.js` plan data, exactly like the Home/DayView progress rings already did (see "Journal & Statistics" below).
- **Journal photos live in Postgres, not a file-storage service** — compressed to JPEG client-side before upload (see "Journal & Statistics" below), per the spec's own "no separate storage mechanism" deliverable.
- **Arm/thigh measurements are one combined field each**, not left/right — the spec explicitly left this to the builder's judgment, and the user confirmed the combined-field default when asked.

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
  lib/dates.js            local-calendar-date helpers (isoDate/today/addDays/addMonths) —
                           canonical place for this; see the toISOString() gotcha below
  lib/photo.js            client-side image resize/compress (canvas) before a journal photo upload
  lib/adherence.js        Week/Month/Year date-range + per-day/per-month completion aggregation
                           for the Adherence stats view, reusing dayProgress() (see hooks/useProgress.js)
  lib/exerciseProgress.js per-session value extraction (weight/hold_seconds/rounds) for the
                           Exercise-progress chart, from bulk /api/stats/logs rows
  lib/bodyStats.js        computeDelta()/fmtDelta() — "change since first log / last 30 days"
                           trend signal, shared by the Body stats view
  context/AuthContext.jsx       fetches /api/auth/me on mount, exposes user/login/register/logout;
                                 listens for a window 'auth:unauthorized' event (dispatched by
                                 lib/api.js on any 401) to bounce back to the login screen
  context/ProgressContext.jsx   loads today's progress + streak from the API on mount,
                                 exposes isSetDone/getSetWeight/getSetHoldSeconds/toggleSet/
                                 setWeightFor/setHoldSecondsFor/isCircuitDone/toggleCircuit/
                                 resetDay, does optimistic local updates then calls the API
                                 (reverts on failure) — the `sets` map stores `{weight, holdSeconds}`
                                 per set, not a bare weight value
  context/UiPrefsContext.jsx    fetches/persists collapsed_sections (per-user UI prefs) once per
                                 session; every Collapsible reads/writes through this
  hooks/useProgress.js    dayProgress()/useDayProgress()/useTodayTotals() — pure
                           aggregation over ProgressContext + the static day data; dayProgress()
                           takes any isSetDone/isCircuitDone-shaped object, which is what lets
                           lib/adherence.js reuse it for an arbitrary past date, not just "today"
  components/             Home, DayView, DayCard, TopBar (account menu + logout), TabBar,
                           InfoPage, VideoCard, ProgressRing, VideoBlock, ExerciseShell,
                           LoginScreen (combined sign-in/register form)
  components/PrepareRecover.jsx  per-day "Prepare & Recover" section (muscle-card grid + extras)
  components/MuscleCard.jsx      one muscle/joint card with switchable Dynamic/Mobility/Stretch tabs
  components/blocks/      ResistanceBlock (sets + weight input + rest timer + history),
                           IsometricBlock (auto hold/rest sequence + editable per-set hold_seconds),
                           CircuitBlock (work/rest interval sequence), RestTimer, ExerciseHistory
  components/JournalStats.jsx    Journal | Statistics segmented top-level page (the "Journal" tab)
  components/journal/     JournalList, JournalEntryForm, JournalEntryCard, PhotoLightbox
  components/stats/       StatsAdherence, StatsExerciseProgress, StatsBody, StatsNutrition
  components/shared/      Collapsible (persisted per-section collapse state), Heatmap
                           (bullet-tracker grid), LineChart (recharts wrapper + raw-numbers table)

server/
  db.js     pg.Pool wrapper — ensureSchema() (cached per cold start), query()
  auth.js   scrypt password hashing + HMAC-signed session cookies (no JWT/bcrypt dependency)
  app.js    the Express app itself (routes, middleware) — exported, no .listen()
  index.js  local/LAN entry point — imports app.js, calls .listen() (used by `npm run dev`/`npm start`)

api/
  index.js  Vercel serverless entry point — imports the SAME app.js and exports it as the
            default handler; vercel.json rewrites /api/:path* to this one function

legacy/      the original static HTML/vanilla-JS v1 (kept for reference only)
```

## Multi-user & deployment

- **Auth**: username/password, hand-rolled (not a third-party auth provider) — see `server/auth.js`. Passwords are hashed with Node's built-in `crypto.scrypt` (no bcrypt/argon2 dependency — deliberately avoids native-module compilation, which already failed once on this machine for `better-sqlite3`). Sessions are a signed-but-unencrypted cookie (`wtl_session`, HMAC-SHA256 via `SESSION_SECRET`, 30-day expiry) — don't put anything sensitive in the session payload beyond `{id, username, exp}`.
- **Every table has `user_id`** (`users.id`, FK with `ON DELETE CASCADE`). Every query in `server/app.js` past the `requireAuth` middleware filters by `req.user.id` — if you add a new route that touches `set_logs`/`circuit_logs`, it must take `req.user.id` from the verified session, never from the request body/query (a client-supplied user id would let one account read/write another's data).
- **One Express app, two entry points.** `server/app.js` exports the configured app with no `.listen()` call. `server/index.js` is for local dev/LAN (`npm run dev`, `npm start`) and calls `.listen()`. `api/index.js` is the Vercel serverless entry — same app object, wrapped by Vercel's Node runtime. Don't duplicate route logic between them; add new routes only in `app.js`.
- **Vercel + Neon setup already done**: the `files` Vercel project (under team `solafahwork-4232s-projects`) is linked to the GitHub repo (auto-deploys on push to `main`) and has a Neon Postgres database attached via the marketplace integration, which injects `DATABASE_URL`/`POSTGRES_URL` (and several other `PG*`/`POSTGRES_*` vars) into all three Vercel environments automatically. `SESSION_SECRET` was added by hand (`vercel env add`) to Production and Preview — it is **not** auto-provided, don't assume it exists in a new environment without adding it.
- **Local dev needs its own Postgres.** It talks to a throwaway Docker container (`docker run --name wtl-postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=weekly_training_log -p 5432:5432 postgres:16-alpine`), not the production Neon database — keep it that way so local testing/experiments never touch real family data. `.env` (gitignored) points `DATABASE_URL` at it; see `.env.example`.
- **`.agents/skills/neon*` and `skills-lock.json`** at the repo root were auto-installed by `vercel integration add neon` — they're Neon's own reference docs for AI coding agents (vector/full-text search recipes), not app code. Harmless to keep, safe to ignore.

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

## Journal & Statistics (`journal-stats-feature.md`)

A second top-level tab (`components/JournalStats.jsx`, reached via the "Journal" entry in `TabBar.jsx`) with a Journal | Statistics segmented toggle; Statistics has its own four-way sub-toggle (Adherence / Exercises / Body / Nutrition).

- **Journal** (`components/journal/`): one free-text entry per calendar date (`UNIQUE(user_id, date)` — upsert, not append-only), with 0+ photos. The day a date belongs to is **computed, not picked** — `DAYS` in `days.js` is ordered Sun..Sat, which matches `Date#getDay()` exactly, so `dayForDate(date)` always gives the right day-tag with no manual picker (avoids the spec's generic `session_id` linking concept entirely, since this app has no `sessions` table to link to). Editing an existing entry keeps its date fixed — only a brand-new entry lets you pick the date — specifically to avoid an upsert silently merging into a different date's row if you edited the date field on an existing entry. Photos are managed entirely at the `JournalEntryCard` level (add/remove call the API immediately, since the entry always already has an id by the time a card renders) — don't move photo state into local component state disconnected from the parent's list; that was a real bug (see gotchas below).
- **Adherence** (`components/stats/StatsAdherence.jsx` + `lib/adherence.js`): Week/Month/Year toggle, a bullet-tracker heatmap (single hue at three lightness/opacity steps — missed/partial/full — never a traffic-light hue swap, per the dataviz skill's sequential-encoding rule), an overall completion ring (reusing `ProgressRing`), and a per-day-type breakdown. All derived from a new bulk `GET /api/stats/logs?start&end` endpoint (every `set_logs`/`circuit_logs` row in a date range in one call) — the frontend then reuses `dayProgress()` unmodified, just built against an arbitrary date instead of only "today."
- **Exercise progress** (`components/stats/StatsExerciseProgress.jsx` + `lib/exerciseProgress.js`): search/pick any exercise (flattened via `ALL_EXERCISES` in `days.js`), then a line chart with a Last-4/3-months/all-time filter. Resistance charts the heaviest set per session; isometric charts the real `hold_seconds` (see below); circuit charts `rounds_completed`. Also built from `/api/stats/logs`, not the older `/api/history/:dayId/:blockIndex` endpoint (which only covers `set_logs`, not `circuit_logs`) — `/api/history` is still used by the per-exercise history list in `ExerciseHistory.jsx`, unchanged.
- **Isometric hold duration is now real data, not a flat planned value.** Before this feature, `IsometricBlock` always logged completion with no duration — a hold's "achieved time" chart would've just been a flat line at the planned duration. Fixed by adding a nullable `hold_seconds` column to `set_logs` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — idempotent, so it applies automatically on the next cold start with no manual Neon migration) and logging the planned duration as a default the instant a hold completes, with an editable "Held __s" input per set (same auto-fill-a-default-then-let-the-person-correct-it pattern `ResistanceBlock` already used for weight). `ProgressContext`'s `sets` map had to change shape from a bare weight value to `{weight, holdSeconds}` to carry this.
- **Body composition & measurements** (`components/stats/StatsBody.jsx` + `lib/bodyStats.js`): one form (weight/muscle mass/fat mass/body-fat % + neck/waist/hips/arms/thighs, all optional) feeding one collapsible chart section per metric that has data — sections for metrics with no data simply don't render, rather than showing an empty chart. Each section leads with a computed trend ("+1.2kg since first log · -0.4kg in the last 30 days"), always from the *full* history regardless of the chart's own 1-month/3-month/1-year/all-time range.
- **Nutrition** (`components/stats/StatsNutrition.jsx`): daily macro log + append-only goals (`nutrition_goals` — a goal update inserts a new row rather than editing in place, so a past date's adherence stays measured against whatever goal was active then) + three Apple-Fitness-style goal rings for today (calories/protein/fiber — the three "highlighted" metrics per the spec; carbs/fat are logged but never get rings) + trend charts with the *current* goal drawn as a dashed reference line via `LineChart`'s `goal` prop. Deliberately does **not** implement the spec's separate "days logged vs. not logged + per-goal hit-rate" breakdown view (mirrors what Adherence already does for workouts) — logging, goals, rings, and trends cover the day-to-day "am I on track" question; that historical rollup is a clean addition later if wanted, not part of this pass.
- **Collapsible sections persist their open/closed state** per user via `ui_prefs.collapsed_sections` (a JSONB blob keyed by each `Collapsible`'s `id` prop) — see `UiPrefsContext.jsx`. A `Collapsible` defaults to **expanded** unless given `defaultCollapsed` — don't assume a freshly-added one starts closed.
- **Photo storage**: compressed to JPEG client-side (`lib/photo.js`, max ~1440px, quality 0.72) before being POSTed as base64 and stored as `BYTEA` directly in `journal_photos` — chosen over a dedicated file-storage service specifically to avoid another manual Vercel integration step (see "Multi-user & deployment"'s Neon setup for how much friction that adds) and because the spec's own deliverable list says no separate storage mechanism should be needed. Fine at personal/family scale; would need revisiting (e.g. Vercel Blob) if photo volume ever got heavy. `GET /api/journal/photos/:id` streams the bytes directly with a long `Cache-Control` — it's still behind `requireAuth`, which works fine for a plain `<img src>` since the browser sends the session cookie automatically on a same-origin request.

## Data model (Postgres, via `server/db.js`)

```sql
users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,       -- "salt:hash" hex, scrypt
  created_at TIMESTAMPTZ
)
set_logs (
  id, user_id REFERENCES users(id) ON DELETE CASCADE,
  day_id, block_index, set_index, date,
  weight REAL NULL, completed_at,
  UNIQUE(user_id, day_id, block_index, set_index, date)
)
circuit_logs (
  id, user_id REFERENCES users(id) ON DELETE CASCADE,
  day_id, block_index, date,
  rounds_completed, completed_at,
  UNIQUE(user_id, day_id, block_index, date)
)
journal_entries (
  id, user_id, date, day_id NULL, text,
  created_at, updated_at,
  UNIQUE(user_id, date)
)
journal_photos (
  id, journal_entry_id REFERENCES journal_entries(id) ON DELETE CASCADE,
  data BYTEA, mime_type, created_at
)
body_logs (
  id, user_id, date,
  weight REAL, muscle_mass REAL, fat_mass REAL, body_fat_percent REAL, notes,
  UNIQUE(user_id, date)
)
body_measurements (
  id, user_id, date, measurement_type, value REAL, unit,
  UNIQUE(user_id, date, measurement_type)   -- key-value shape: a new measurement
)                                            -- type needs no schema change
nutrition_logs (
  id, user_id, date,
  calories REAL, protein_g REAL, fiber_g REAL, carbs_g REAL, fat_g REAL, notes,
  UNIQUE(user_id, date)
)
nutrition_goals (
  id, user_id, effective_from, calories_goal REAL, protein_goal REAL, fiber_goal REAL,
  created_at   -- append-only: no UNIQUE constraint, a goal update always inserts
)
ui_prefs (
  user_id PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  collapsed_sections JSONB NOT NULL DEFAULT '{}'::jsonb
)
```

- `day_id` is the static id from `days.js` (`sun`…`sat`); `block_index` is that day's `blocks[]` array index. Both are stable as long as `days.js` isn't reordered — don't reorder blocks within a day without considering existing history rows will then point at the wrong exercise.
- A row's existence *is* the "done" state — marking a set done inserts a row (upsert on the unique key), unmarking it deletes the row. There is no separate boolean column.
- Weight is optional (nullable) and editable independently via `PATCH /api/sets/weight` without re-toggling done state. `hold_seconds` (added for isometric holds — see "Journal & Statistics" above) works the same way via `PATCH /api/sets/hold`; both columns are nullable and only one is ever meaningful per set depending on the exercise's `type`.
- No `sessions` table, no `reps_done` override, no per-set `notes` on `set_logs` — trimmed from the handoff doc's suggested schema to keep the surface small; add them if the user asks for reps-override editing or session-level metadata.
- Schema is created by `ensureSchema()` — mostly `CREATE TABLE IF NOT EXISTS`, but `hold_seconds` was added to an *existing* table via `ALTER TABLE set_logs ADD COLUMN IF NOT EXISTS hold_seconds INTEGER` in the same `SCHEMA_SQL` string. Postgres's `ADD COLUMN IF NOT EXISTS` support means this one specific kind of schema change (adding a nullable column) *can* go through `ensureSchema()` with no manual step — but that's the exception: a column type change, a `NOT NULL` addition, a rename, or anything not expressible as an idempotent `IF NOT EXISTS` statement still needs a manual run against the Neon database (via its dashboard SQL editor, linked from the Vercel project's Storage tab).

## API (`server/app.js`)

| Method | Path | Auth? | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | `{username, password}` — username 3-24 chars `[a-zA-Z0-9_]`, password ≥6 chars; sets session cookie |
| POST | `/api/auth/login` | — | `{username, password}` — sets session cookie |
| POST | `/api/auth/logout` | — | clears session cookie |
| GET | `/api/auth/me` | — | `{username}` or 401 |
| GET | `/api/progress?date=YYYY-MM-DD` | ✓ | all set/circuit logs for one date, for the signed-in user |
| POST | `/api/sets` | ✓ | `{day_id, block_index, set_index, date, done, weight, hold_seconds}` — upsert or delete |
| PATCH | `/api/sets/weight` | ✓ | `{day_id, block_index, set_index, date, weight}` — update weight only |
| PATCH | `/api/sets/hold` | ✓ | `{day_id, block_index, set_index, date, hold_seconds}` — update hold duration only |
| POST | `/api/circuits` | ✓ | `{day_id, block_index, date, done, rounds_completed}` |
| POST | `/api/day/reset` | ✓ | `{day_id, date}` — deletes all logs for that day+date |
| GET | `/api/history/:dayId/:blockIndex?limit=20` | ✓ | past sessions for one exercise, grouped by date (`set_logs` only) |
| GET | `/api/streak` | ✓ | consecutive-day streak computed server-side |
| GET | `/api/stats/logs?start&end` | ✓ | bulk `set_logs`+`circuit_logs` rows in a date range — feeds Adherence and Exercise-progress |
| GET/POST | `/api/journal?start&end` / `/api/journal` | ✓ | list entries in range (with `photo_ids`) / upsert one by date |
| DELETE | `/api/journal/:id` | ✓ | delete an entry (cascades to its photos) |
| POST/GET/DELETE | `/api/journal/:entryId/photos` / `/api/journal/photos/:id` (×2) | ✓ | upload `{mime, data: base64}` / stream one photo's bytes / delete one |
| GET/POST | `/api/body-logs?start&end` / `/api/body-logs` | ✓ | body composition, list in range / upsert by date |
| GET/POST | `/api/body-measurements?start&end&type=` / `/api/body-measurements` | ✓ | measurements, list (optionally filtered by type) / upsert by date+type |
| GET/POST | `/api/nutrition-logs?start&end` / `/api/nutrition-logs` | ✓ | macro logs, list in range / upsert by date |
| GET/POST | `/api/nutrition-goals` | ✓ | list all goals (newest first) / insert a new one (never updates in place) |
| GET/PUT | `/api/ui-prefs` | ✓ | `{collapsed_sections}` — per-user Collapsible open/closed state |

"Auth?" ✓ routes are behind `api.use(requireAuth)` in `app.js` — everything registered after that line in the file requires a valid session cookie and gets `req.user`.

## Key conventions / gotchas

- **`better-sqlite3` fails to compile on this machine** (`fatal error: 'climits' file not found` — a broken Xcode CLT C++ header path). This is why the project uses `pg` (pure JS, no native build) for Postgres, and Node's built-in `crypto.scrypt` instead of `bcrypt` for password hashing (same reasoning) — don't introduce a native-module dependency here without checking it actually compiles on this machine first.
- **Idempotent completion for isometric holds and circuits.** `ProgressContext.toggleSet`/`toggleCircuit` are true toggles (flip on/off). `IsometricBlock` and `CircuitBlock` guard with `if (!isSetDone/isCircuitDone(...)) toggle...(...)` before marking complete on timer finish — otherwise re-running a finished timer (e.g. hitting "Restart") would silently *uncheck* an already-logged set. If you add more auto-completing timers, keep this guard.
- **Track "has this timer session started" as an explicit `started` boolean in state, never derive it by comparing `remaining`/`phase`/`index` to their initial values.** `IsometricBlock` and `CircuitBlock` both had a real bug from this: the derived check (`remaining !== block.hold`, etc.) is indistinguishable from "never started" in the ~1s window before the first tick decrements anything, so rapidly starting-then-pausing (or minimizing then immediately resuming) showed "Ready" instead of "Paused" and hid the fullscreen timer. Fixed by setting `started: true` once, in the initial Start action, and never deriving it. Any new resumable timer needs the same explicit flag.
- **`FullscreenTimer.jsx`** (`src/components/`) is the shared "dramatic mode" overlay used by `RestTimer`, `IsometricBlock`, and `CircuitBlock` — a `createPortal`-rendered, full-viewport takeover with a huge animated ring/countdown, phase label, exercise name, and a tick sound + haptic buzz on the final 3 seconds. It's intentionally modal: it covers the top bar and tab bar too, so a caller must give the user an explicit way out (the built-in minimize/chevron button, or `onDismissComplete` after the completion screen) — don't add a timer that goes fullscreen with no exit. Minimizing hides the overlay only; the underlying interval keeps running (state lives in the calling block, not in `FullscreenTimer` itself), so background progress is never lost.
- **Every fullscreen timer supports pause, resume, stop, reset, and repeat**, via `FullscreenTimer`'s `onTogglePause`/`onStop`/`onReset`/`onRepeat` props — all optional, so a caller only renders the buttons it wires up. The convention across `RestTimer`/`IsometricBlock`/`CircuitBlock` is: `onStop` fully exits back to the idle "Ready" state (same handler as the inline card's "Reset" button — it's the one that unsets `started`); `onReset` restarts the *whole* sequence (round 1 / hold 1 / full rest duration) but stays fullscreen and running (`{ ...initialState(block), running: true, started: true }` — this is the `handleRestart()` helper, shared with `onRepeat`); `onRepeat` only appears on the completion screen and calls that same `handleRestart()`. `RestTimer` used to have no pause/stop/reset/repeat at all — it just auto-counted down and vanished on zero — so it was rebuilt with the same `{ remaining, total, running, complete }` state machine as the other two blocks (see git history for the pre-rewrite version if needed). Don't add a new resumable timer without wiring all five controls — that's the whole point of the shared component.
- **Never format a locally-constructed `Date` with `.toISOString().slice(0, 10)`.** `toISOString()` converts to UTC first — in any positive UTC-offset timezone (this machine is UTC+3), that can silently return the *same* calendar-date string you started with instead of an advanced one. `src/lib/adherence.js` had a real infinite loop from exactly this: its `addDays()`/`isoDate()` helpers used this pattern, so `allDatesBetween()`'s `while (cur <= end)` loop never terminated — `cur` never actually advanced — and froze the whole page (confirmed via Playwright: even `page.evaluate()` calls stopped responding, not just a slow render). Fixed by building the date string from the `Date`'s local `getFullYear()`/`getMonth()`/`getDate()` instead. `lib/api.js`'s `todayKey()` and `server/app.js`'s `isoDate()` use the same `toISOString()` pattern and share the same latent risk (they only fail for the ~3-hour window after local midnight where UTC is still on the previous day) — left alone since fixing them wasn't part of this feature and they're exercised constantly in production without incident, but don't copy that pattern into new code; use the local-getters approach instead.
- **Progress is date-scoped like v1, history is not.** The home/day views only ever show *today's* checkmarks (matches the original UX — checklists reset visually each day), but every completed set is retained in `set_logs` forever, which is what the history view and streak read from.
- **Express 5 routing**: the SPA catch-all in `server/app.js` uses a regex (`/^(?!\/api).*/`), not the bare `'*'` string — Express 5's path-to-regexp no longer accepts that.
- **Vite dev proxy**: `vite.config.js` proxies `/api` → `http://localhost:3001` so `fetch('/api/...')` works identically in dev (`npm run dev`, two processes via `concurrently`) and in production (both `npm start` locally and Vercel — same-origin in both cases, so no CORS handling exists or is needed).
- **Cold-start schema check**: every request runs `ensureSchema()` first (`app.use` at the top of `app.js`), but the result is cached in a module-level promise so it only actually hits the DB once per warm Lambda instance, not once per request.
- **DATABASE_URL vs POSTGRES_URL**: `server/db.js` accepts either env var name — Vercel's Neon integration provides both, but if you ever switch database providers, check which name they use and keep both in the fallback rather than renaming.
- Weight is stored as a plain number, no unit conversion — the UI labels it "kg" but doesn't enforce it.
- **Editing `server/app.js` or `server/db.js` does not hot-reload the local API process** — unlike the Vite dev server, which picks up frontend changes instantly. `node --env-file=.env server/index.js` must be killed and restarted (`lsof -ti :3001 | xargs kill`, then relaunch) to pick up backend changes, including new/changed SQL in `ensureSchema()`. Forgetting this looks exactly like a real bug — e.g. a newly-added column silently missing from a route's response — and cost real debugging time twice while building the Journal & Statistics feature. If a route's behavior doesn't match what you just wrote, restart the API process before looking for a code bug.
- **A `Collapsible` defaults to expanded**, not collapsed, unless given `defaultCollapsed`. Don't click a section's header expecting to open it without checking first — it may already be open, and the click will close it instead.

## Running it

- `npm run dev` — hot-reload frontend (Vite) + local API together, via `concurrently`. Needs `.env` with `DATABASE_URL` pointing at a local Postgres (see "Multi-user & deployment" above for the Docker one-liner) and a `SESSION_SECRET`.
- `npm start` — build the frontend then serve everything (frontend + API) from one Express process, reachable from other devices on the LAN too if wanted.
- Pushing to `main` on GitHub auto-deploys to Vercel production. `npx vercel --prod` also works for a manual deploy from a local checkout.
- See `documentation.md` for the full walkthrough, environment variable reference, and troubleshooting.

## Out of scope (don't add without the user asking)

- Cloud sync *across separate deployments* (multi-user on this one deployment is done — see above).
- Editing the workout plan from the UI (plan is fixed, seeded from the PDF).
- `reps_done` override, per-set notes on `set_logs`, session-level metadata (`sessions` table) — all trimmed from the original schema proposal; revisit only on request.
- Password reset / email verification — the simple-auth approach deliberately has neither (see `documentation.md`'s known limitations). If a user forgets their password, the only recovery path today is a direct database edit.
- Food-item-level nutrition diary (barcode scanning, food database lookups) — `journal-stats-feature.md` explicitly scopes nutrition to manual daily totals only; don't add per-food logging without being asked.
- Device/wearable integration for body composition — manual entry only, per the same spec.
- A nutrition "days logged vs. not logged + per-goal hit-rate" adherence breakdown (mirroring the workout Adherence tab) — the spec asks for it, but it was deliberately left for later; see "Journal & Statistics" above.
