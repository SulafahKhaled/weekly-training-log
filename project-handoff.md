# Project Handoff: Weekly Training Tracker — v2 (Vite + Database)

## 1. What this project is

A personal home-workout companion app built around a fixed **7-day training
split** (Sun–Sat): Upper A, Lower A, HIIT circuit, Core + Hip, Upper B, Lower B,
HIIT circuit. The full exercise list, sets/reps, and weekly structure come from
the attached PDF (`الجدول_التمارين_الأسبوعي.pdf`) — **read that file first**,
it is the source of truth for exercise names, order, sets, reps, and rest
periods, in Arabic with some English exercise-family labels.

A first version (v1) already exists as a static HTML/CSS/vanilla-JS app (no
build step, no backend, no database). It works and is fully functional, but
it's a prototype: state lives only in `localStorage`, resets every day, and
there's no history, no weight tracking, and no way to see progress over time.

**Your job:** rebuild this as a proper Vite-based app with a real database so
the person's workout history persists permanently and can be reviewed/charted
over time — while keeping everything else about the experience (see §4) at
least as good as v1.

## 2. Why this rebuild is happening

v1 proved the concept and the interaction design works well for actually
following a workout at the gym or at home (phone in hand). What it can't do,
and what v2 must add:

- Remember what happened in **past sessions**, not just today (v1 wipes
  progress at midnight).
- Track **actual weight used** per set (v1 has no weight input at all — it's
  a pure checklist).
- Show **history/trends** for a given exercise (e.g., "last 6 times you did
  Dumbbell Bench Press, here's the weight and reps each time").
- Survive browser data clearing / work across devices if possible (a real DB
  beats `localStorage`).

## 3. Suggested stack (builder's call, but here's the reasoning)

- **Frontend:** Vite + a component framework — React is the safe default
  unless you have a strong reason to prefer Svelte/Vue; either is fine, the
  UI itself is not complex (cards, expand/collapse, timers, forms).
- **Database / persistence — pick one, don't over-build this:**
  - **Option A (recommended for "just works, runs locally, no server to
    manage"):** client-side database via **IndexedDB**, wrapped with
    **Dexie.js**. Fully offline-capable, no backend process to run, history
    persists in the browser profile permanently (survives refresh/close,
    does *not* survive clearing browser data or switching browsers/devices).
  - **Option B (if cross-device history matters):** a tiny local backend —
    **Node + Express + SQLite** (via `better-sqlite3` or `Prisma`) — with the
    Vite frontend calling a small REST/JSON API on `localhost`. More moving
    parts (two processes to run), but data lives in one `.sqlite` file you
    could back up or sync.
  - Whichever you choose, the **data model in §5 stays the same** — it's just
    a question of where it's stored.
- Keep the app **installable/runnable with one or two commands**
  (`npm install && npm run dev`, or a single `npm start` that boots both
  frontend and backend if you go with Option B). This is a personal tool, not
  a product — optimize for "the person can actually run this," not for
  deployment infrastructure.

## 4. Feature requirements (carry over from v1, all must survive the rebuild)

### 4.1 Structure
- Home screen: list/grid of the 7 days, each showing its category (Upper /
  Lower / Core+Hip / HIIT), a color per category, and **today's or most
  recent completion status** for that day.
- Tapping a day opens its exercise list in the order given in the PDF:
  warm-up block → main exercises → cool-down block.
- Bottom (or side) navigation with 4 sections: **Home**, **Warm-up**,
  **Mobility**, **Cool-down** — these three are general reference guides,
  not tied to a specific day (see §4.5).

### 4.2 Exercise types and how each is run
The PDF's exercises fall into three behaviors — preserve all three:

1. **Resistance exercises** (sets × reps, e.g. "3×12"): show one row per set.
   Tapping a set marks it done **and now must also capture the weight used**
   (new in v2 — see §5). After marking a set done, auto-start a rest-timer
   for that exercise's rest period; a "skip rest" control ends it early.
2. **Isometric holds** (e.g. Plank, Wall Sit, Side Plank, Superman, Hollow
   Hold): a timer that runs hold → rest → hold → rest automatically across
   all sets, with an audible cue on each phase change, marking each hold
   complete as it finishes.
3. **HIIT circuits** (Tuesday and Saturday): a work/rest interval timer that
   cycles through a fixed sequence of moves across N rounds (from the PDF:
   4 rounds, 40s work / 20s rest), showing which move is current and what's
   next, and marks the whole circuit complete at the end.

Timers should give an audible/vibration cue at phase transitions (start of
work, start of rest, and a distinct "all done" cue). Reuse the simple
Web Audio beep approach from v1 (no audio files needed) unless you have a
better idea.

### 4.3 Video demos
Every exercise has a linked YouTube video demo. In v1 this is a
click-to-preview thumbnail that swaps into an embedded iframe on tap (so
nothing autoplays or loads until requested). Keep this pattern — it's good
for performance and good for "I know this exercise, don't need the video."
**Do not re-search for videos** — the full verified video-ID map from v1 is
below in §6; reuse it directly.

### 4.4 Bilingual labels
Exercise names should show both the English name and the Arabic name from
the PDF (the PDF is the source for exact Arabic wording, sets/reps, and rest
times — don't paraphrase it, transcribe it).

### 4.5 Warm-up / Cool-down / Mobility sections
The original PDF only briefly mentions warm-up/cool-down (a few lines per
day, e.g. "10 min dynamic warm-up" or "30s stretch per muscle") without real
detail or video guidance. v1 added three dedicated reference pages with
proper video demonstrations and short tips:
- **Warm-up:** general dynamic full-body warm-up video + guidance.
- **Cool-down:** general full-body static stretch/cool-down video + guidance.
- **Mobility:** a general full-body mobility routine, plus a hip-mobility
  video and a shoulder-mobility video (these pair with leg days and upper
  days respectively).

Keep these three pages; the video IDs are included in §6.

### 4.6 Visual design
Dark theme, mobile-first, one accent color per workout category (the PDF
itself color-codes days by category — Upper / Lower / Core+Hip / HIIT — carry
that through). Keep it simple and legible; this is a "glance at your phone
mid-set" tool, not a marketing site. No requirement to match v1's exact
palette, but keep the same spirit: dark background, clear category colors,
big tap targets, minimal chrome.

## 5. New in v2: data model for persistent history

This is the core of the rebuild. Define a schema (in SQLite or as Dexie
tables) roughly like:

**`exercises`** (static reference data, seeded from the PDF — see §6)
- `id`, `day_id` (sun/mon/tue/wed/thu/fri/sat), `order`, `type`
  (`resistance` / `isometric` / `circuit_item`), `name_en`, `name_ar`,
  `default_sets`, `default_reps_or_hold_seconds`, `default_rest_seconds`,
  `youtube_id`, `note` (e.g. "per side")

**`sessions`** (one row each time the person opens/works through a given
day)
- `id`, `day_id`, `date` (ISO date), `started_at`, `completed_at` (nullable)

**`set_logs`** (one row per set actually performed — this is the history)
- `id`, `session_id`, `exercise_id`, `set_number`, `weight` (nullable —
  resistance exercises only; store units, default kg but let it be a plain
  number the person interprets consistently), `reps_done` (nullable override
  if they did more/fewer than planned), `hold_seconds_done` (isometric only),
  `completed_at`, `notes` (optional free text)

**`circuit_logs`** (one row per completed circuit run)
- `id`, `session_id`, `exercise_group_id` (the HIIT circuit block),
  `rounds_completed`, `completed_at`

From this, the app should be able to answer (this is the point of the DB):
- "Show me my history for Dumbbell Bench Press" → list of past sessions with
  date, weight, reps per set, so the person can see progressive overload.
- "Did I train Wednesday's Core+Hip day this week?" → derived from
  `sessions`.
- (Nice-to-have, not required for v1 of this rebuild) a simple line chart of
  weight-over-time per exercise, e.g. via `recharts` or `chart.js`.

**UI implication:** each resistance set row now needs a small weight input
(numeric field, appears when you tap the set, or sits inline next to it) in
addition to the "done" checkbox — this is the one clear UI addition v1
didn't have.

## 6. Exercise + video reference data (reuse as-is, already verified)

> Full exercise names, Arabic text, sets/reps/rest, and day grouping are in
> the attached PDF — treat it as authoritative. The table below is the
> **video ID mapping** already researched and tested; reuse these directly
> rather than re-searching.

### General guide videos
| Purpose | YouTube ID |
|---|---|
| Full-body dynamic warm-up | `oiBAbrqajBw` |
| Full-body cool-down stretch | `4Ajg_KJwbHc` |
| Full-body mobility routine | `W1OQIx-Rgw4` |
| Hip mobility | `888Fod2Fcmo` |
| Shoulder mobility | `cHEdG5bb0ds` |

### Sunday — Upper A
| Exercise | YouTube ID |
|---|---|
| Dumbbell Bench Press | `J-gWN5hYwRU` |
| Dumbbell Bent-Over Row | `c-gt-zzoa_A` |
| Dumbbell Shoulder Press | `0JfYxMRsUCQ` |
| Around the World | `TQa0zH8Mvf4` |
| DB Curl + Kickback | `I5BsUOzDyC4` |
| Plank Hold | `mwlp75MS6Rg` |

### Monday — Lower A
| Exercise | YouTube ID |
|---|---|
| Chair Squat | `rvpC9QkTc3Y` |
| Dumbbell Lunges | `9gglI77Kzq8` |
| Cossack Squat | `JaCbmoDqUc4` |
| Standing Calf Raise | `ndQc4mz4mBU` |
| Jump Squat | `tZjZxrAeVjg` |
| Wall Sit | `rHRVy2j85EE` |

### Tuesday — HIIT Circuit 1 (4 rounds, 40s work / 20s rest)
| Move | YouTube ID |
|---|---|
| Fast Step-Ups | `vs87hPGdnCc` |
| Jumping Jacks | `Q4QnlZs9PqI` |
| High Knees | `lR3cpCVBjPM` |
| Mountain Climbers | `cnyTQDSE884` |
| Squat Jump | `tZjZxrAeVjg` |
| Plank Hold (30s) | `mwlp75MS6Rg` |

### Wednesday — Core + Hip
| Exercise | YouTube ID |
|---|---|
| Supine Hip Flexor March (band) | `MfWcrchYEN4` |
| Seated Lateral Hip Steps (band) | `MfWcrchYEN4` |
| Side-Lying Leg Circles (band) | `MfWcrchYEN4` |
| Side-Lying Inner Thigh Raise (band) | `MfWcrchYEN4` |
| Hip Adduction Squeeze | `MfWcrchYEN4` |
| Wood Chops | `Rf-2l8Z40dg` |
| Halo + Wood Chop combo | `hGP_n2y-r84` |
| Bicycle Crunches | `wpRI3xBhJmo` |
| Windshield Wiper | `ggmcWcfSeq4` |
| Side Plank Hold | `iNbH7_edNI8` |

### Thursday — Upper B
| Exercise | YouTube ID |
|---|---|
| Decline Push-Up | `QBlYp-EwHlo` |
| Band Pull-Down | `zTSPbF4LSZw` |
| Lateral Raise | `ssAo_xwFt5c` |
| Face Pull | `PYj77in44ms` |
| Hammer Curl + Overhead Triceps Ext. | `oOQg_AJNTIg` |
| Superman Hold | `ATly_pW0i6g` |

### Friday — Lower B
| Exercise | YouTube ID |
|---|---|
| DB Leg Extension + Leg Curl | `ZHlBSI6JPsA` |
| Glute Bridge | `1PRGMrkaOBM` |
| Side Leg Raise | `8c0HOaxWlYE` |
| Lying Leg Raise | `sY2ZgV2Sj_s` |
| Broad Jump | `7Du1KbwCdUk` |
| Glute Bridge Top Hold | `1PRGMrkaOBM` |

### Saturday — HIIT Circuit 2 (4 rounds, 40s work / 20s rest)
| Move | YouTube ID |
|---|---|
| Step-Up + Knee Drive | `vs87hPGdnCc` |
| Max-Speed Sprint in Place | `lR3cpCVBjPM` |
| Lateral Jumps | `VcbNNYXyhdc` |
| Toe Touches | `NR4k8hJfs-8` |
| Skater Jumps | `ZuOYHejN7GU` |
| Hollow Hold (30s) | `LlDNef_Ztsc` |

Embed pattern: `https://www.youtube.com/embed/{ID}?autoplay=1&rel=0`,
thumbnail for the preview state: `https://i.ytimg.com/vi/{ID}/hqdefault.jpg`.

## 7. Deliverables expected

1. A Vite project (frontend framework of your choice, React suggested) with
   clear `npm run dev` / `npm run build` scripts.
2. A working persistence layer per §5 (Dexie/IndexedDB or SQLite+Express —
   document which you chose and why in the README).
3. All 7 days, all three timer behaviors (resistance/isometric/circuit),
   working exactly like v1's interaction model, plus the new weight-logging
   step for resistance sets.
4. Warm-up / Cool-down / Mobility pages.
5. A basic history view for at least one exercise (proves the DB round-trips
   correctly) — a simple list of past sessions is enough; a chart is a bonus.
6. A short README explaining how to run it locally and where the data file
   lives (if SQLite) or that it's per-browser (if IndexedDB).

## 8. Explicitly out of scope for this round

- User accounts / multi-user / cloud sync.
- Editing the workout plan itself from the UI (the 7-day plan is fixed,
  seeded from the PDF — no need to build a plan editor yet).
- Nutrition, body-weight, or non-workout tracking.
