# Feature Spec: Journal & Statistics Tab

> This is an addition to the app described in `project-handoff.md` — it
> assumes that document's data model (`exercises`, `sessions`, `set_logs`,
> `circuit_logs`) already exists. Upload this file alongside
> `project-handoff.md` and the PDF; this doc only covers the new feature
> below, not the rest of the app.

## 1. What this feature is

A new top-level tab — **"Journal & Stats"** — with two parts:

1. **Journal**: a free-text log the person writes in after a training day
   (how it felt, energy levels, anything worth remembering for next time).
2. **Statistics**: a set of progress views covering four different kinds of
   data — workout adherence, per-exercise strength/performance progress,
   body composition & measurements, and daily nutrition — full macros
   (calories, protein, fiber, carbs, fat), with calories/protein/fiber
   highlighted and tracked against personal goals.

These two are grouped in one tab because they're both "look back and
reflect" screens, as opposed to the rest of the app which is "do the
workout right now."

## 2. Journal

### 2.1 What it is
A running, dated log the person writes in — one entry per day, in their own
words. Not structured data, not a form with fields to fill in — a text box.

### 2.2 Behavior
- Entries are listed newest-first, each showing its date and which training
  day it was linked to if any (e.g. "Sunday — Upper A" or just "Rest day").
- Tapping "New entry" opens a text box for today's date by default; the
  person can change the date to back-fill a missed day.
- An entry can exist with or without a completed session that day — the
  person should be able to journal on a rest day too, not just training
  days.
- **Photos:** the person can attach one or more photos to an entry (e.g. a
  progress photo, a meal, anything worth keeping alongside that day's
  note) — optional, attached the same way any note-taking app handles
  photo attachments (pick from device / take a photo, shown as a thumbnail
  strip under the entry text, tap to view full-size). Not a separate
  photo-only gallery — photos live attached to the day's journal entry.
- Entries are editable and deletable after the fact; removing an entry
  removes its attached photos too.
- No required structure, tags, or mood scores unless the person asks for
  that later — keep this simple and low-friction so it actually gets used.

### 2.3 Data model addition
**`journal_entries`**
- `id`
- `date` (ISO date)
- `session_id` (nullable — links to a `sessions` row from the main app if
  one exists for that date; null on rest days or if unlinked)
- `text`
- `created_at`, `updated_at`

**`journal_photos`** (one row per photo, so an entry can have several)
- `id`
- `journal_entry_id` (links back to the entry above)
- `file_path` or `blob` reference — store depending on whichever
  persistence option was chosen in `project-handoff.md` §3 (a file path if
  using a filesystem/SQLite setup, or as a stored blob/data URI if
  IndexedDB — builder's call based on that decision)
- `created_at`

## 3. Statistics

Four sub-views under the Statistics half of the tab. Present them as
sub-tabs or a scrollable set of sections — builder's call on layout, but
all four need to be reachable without a deep navigation hunt.

### 3.1 Adherence — "did I actually show up"

Shows how consistently the person is following the plan, with a **view
toggle: Week / Month / Year.**

- For the selected period, show:
  - How many days the person logged a session (opened a day and completed
    at least one exercise) vs. how many training days the plan calls for
    in that period (the plan is 7 days/week, so a month has ~30 "expected"
    training days minus none, since every day is trained — but Sundays
    still equal one specific day-type; base "expected" on calendar days in
    the period, not a rest-day assumption, since this plan has no built-in
    rest days).
  - A **bullet-tracker style grid** as the primary view (see §4.3 for the
    visual spec) — one cell per day, shaded by adherence level, plus the
    same completed/partial/missed breakdown in text below it for anyone
    who wants the specifics rather than reading color.
  - A breakdown of **what was done vs. what wasn't**: e.g. "Completed:
    Sunday Upper A, Monday Lower A, Wednesday Core+Hip. Missed: Tuesday
    HIIT 1." for a week view; roll this up to a simpler completion
    percentage per day-type for month/year views (e.g. "Upper A completed
    3/4 times in October").
  - A **circular tracker** (see §4.4) showing overall completion percentage
    for the selected period at a glance, above or beside the grid.
- Year view should be able to roll up to a month-by-month summary (a strip
  of 12 months each showing a completion percentage) rather than trying to
  show 365 individual days — the bullet-tracker grid itself can switch its
  cell unit from "day" to "month" when the Year toggle is selected.

This is derived entirely from the existing `sessions` and `set_logs` tables
in the main app's data model — no new tables needed for adherence itself.

### 3.2 Per-exercise progress — "am I getting stronger"

- The person picks an exercise (e.g. "Dumbbell Bench Press") from a list or
  search.
- Show a **line diagram** (see §4.5) as the primary view of that exercise's
  history:
  - For **resistance exercises**: weight used per session over time (and
    optionally reps, if the person overrode the planned rep count).
  - For **isometric holds**: hold duration achieved per session over time.
  - For **HIIT circuit moves**: rounds/circuits completed over time (less
    granular — mainly useful to confirm the circuit is being finished, not
    for a progression metric).
- Let the person filter the range: last 4 sessions, last 3 months, all
  time.
- This is derived from `set_logs` and `circuit_logs` (already defined in
  the main data model) — the `weight` and `hold_seconds_done` fields
  already capture what's needed. No new tables required for this section.

### 3.3 Body composition & measurements — "how is my body changing"

Two related but distinct kinds of data, both logged manually by the person
(no device integration assumed) and both trackable over time:

**Body composition** (single entries, one set of numbers per log date):
- Body weight
- Muscle mass (if the person has a scale/method that gives this)
- Fat mass and/or body-fat percentage

**Body measurements** (tape-measure circumferences, one set per log date):
- Neck
- Waist
- Hips
- Arms (track left/right separately, or just one "arms" field — ask the
  person which they prefer if it comes up; default to one combined field
  to keep logging fast)
- Thighs (same left/right note as arms)
- Any other measurement the person wants to add later — design the
  measurements table so a new measurement type doesn't require a schema
  migration (see data model below).

**Behavior:**
- A simple log form: pick a date (defaults to today), enter whichever
  fields the person has data for that day (all optional — someone might
  log weight daily but only measure waist/hips monthly).
- A **line diagram** (§4.5) per metric showing it over time, with the
  ability to filter by range (last month, last 3 months, last year, all
  time) — same range controls as §3.2 for consistency. Every tracked
  metric (weight, muscle mass, fat mass/%, and each measurement) gets its
  own line — either as separate small charts per metric or as toggleable
  series on one shared chart, builder's call.
- Show percentage or absolute change since the first logged entry and
  since 30 days ago, as a quick "am I trending the right way" signal.

**Data model addition:**

**`body_logs`** (one row per date the person logs any body composition
number — sparse columns are fine, leave unset fields null)
- `id`, `date`
- `weight`
- `muscle_mass`
- `fat_mass`
- `body_fat_percent`
- `notes` (optional)

**`body_measurements`** (key-value shape so new measurement types don't
need a schema change)
- `id`, `date`, `measurement_type` (e.g. `neck`, `waist`, `hips`, `arm`,
  `thigh` — or `arm_left` / `arm_right` if the person wants sides tracked
  separately), `value`, `unit` (cm or in — pick one default and stay
  consistent, or store the unit per entry if the person might switch)

### 3.4 Nutrition — full macros, with calories/protein/fiber highlighted

**Daily logging:**
- One entry per day, full macro breakdown: calories, protein (g), fiber
  (g), carbs (g), fat (g). Calories, protein, and fiber are the
  **highlighted** metrics — they're the ones with goals, rings, and
  top-billing in the UI (§4.4) — carbs and fat are logged alongside them
  for a complete picture but stay visually secondary (smaller text, no
  ring) unless the person later asks to promote them too.
- Simple manual entry — a running total the person types in once they know
  their day's numbers, not a food-item-by-item diary (that's a much bigger
  feature and wasn't asked for).

**Goals:**
- The person can set a daily target for each of the three highlighted
  metrics (calories, protein, fiber). Store the goal with an effective-from
  date so past adherence is measured against whatever goal was active at
  the time, not retroactively against today's goal if it's changed since.
  Carbs and fat are logged but don't need goals for this pass.
- Show **today's goal-vs-actual as circular trackers** (§4.4) — one ring
  each for calories, protein, and fiber, filling toward each daily target
  (this is the natural fit for the circular-tracker request: three
  concentric or side-by-side rings, à la Apple Fitness rings). Carbs/fat
  can appear as plain numbers near the rings, not as rings themselves.

**Adherence view:**
- Same Week / Month / Year range toggle as §3.1, showing: days logged vs.
  not logged, and for logged days, how many hit each goal (e.g. "Protein
  goal met 18/22 logged days this month") — goal-hit tracking applies only
  to the three highlighted metrics.
- A **line diagram** (§4.5) per metric over the selected range. Calories,
  protein, and fiber get the goal line overlaid on their charts; carbs and
  fat get a plain trend line with no goal overlay.

**Data model addition:**

**`nutrition_logs`**
- `id`, `date`
- `calories`, `protein_g`, `fiber_g` (highlighted), `carbs_g`, `fat_g`
  (logged, secondary)
- `notes` (optional)

**`nutrition_goals`**
- `id`, `effective_from` (date)
- `calories_goal`, `protein_goal`, `fiber_goal` — goals cover only the
  three highlighted metrics for this pass
- (a new row is inserted whenever the person updates a goal, rather than
  editing the old one in place, so historical adherence stays accurate)

## 4. Interface & Visual Design

This tab should feel noticeably more alive than the rest of the app — this
is the "look back and feel good about your progress" screen, so it's worth
spending polish here. Four specific requirements, all applying across the
Journal and Statistics views wherever they're relevant:

### 4.1 Animation
- Charts and rings should **animate in** when a view loads or its data
  range changes (lines drawing left-to-right, rings filling from 0 to their
  value, numbers counting up rather than just appearing) — not a static
  render.
- Expand/collapse (§4.2) should be a smooth transition (height/opacity),
  not an instant show/hide.
- Keep animations quick (150–400ms range) — this is polish, not a delay the
  person has to wait through every time they open the tab.

### 4.2 Minimize / maximize on every section
- Every card or section in this tab (each Statistics sub-view, each
  Journal entry if it's long, each metric's chart) should be **collapsible**
  — a tap on the header minimizes it to a compact summary line (e.g. just
  the headline number or a mini sparkline) and expands it back to full
  detail on tap again.
- Remember collapsed/expanded state per section across visits (don't reset
  every time the person reopens the tab) — store this as a simple per-user
  UI preference, not tied to the data itself.
- This matters most on the Statistics page, where four sub-views stacked
  fully expanded would be a lot of scrolling — letting the person collapse
  the ones they're not currently focused on keeps it usable.

### 4.3 Bullet-tracker heatmap (Adherence, §3.1)
A bullet-journal-style habit tracker grid — the same visual language as a
GitHub contribution graph:
- A grid of cells, one per day (or one per month when the Year toggle is
  selected, per §3.1).
- **Color intensity encodes adherence, darkest = fully followed:**
  - Darkest shade: day fully completed (every planned exercise checked
    off).
  - Medium shade: partial (some but not all checked off).
  - Lightest shade (or an empty/outline cell): missed — nothing logged.
- Tapping a cell shows that day's detail (which day-type it was, what was
  completed) — this is how the person gets the specifics behind the color
  at a glance.
- Use one consistent color hue across the grid (varying only in
  darkness/lightness) rather than switching hues per status — that's what
  makes it read as a bullet-tracker rather than a traffic light.

### 4.4 Circular tracker
Ring-style progress indicators, used in two places:
- **§3.1 Adherence:** one ring showing overall completion percentage for
  the selected period (week/month/year).
- **§3.4 Nutrition:** three rings (calories, protein, fiber) showing
  today's progress toward each daily goal, filling as the day's numbers
  are logged — same visual idea as Apple Fitness's activity rings.
- Rings should animate their fill (§4.1) and show the percentage or
  fraction (e.g. "142/150g") at their center or alongside.

### 4.5 Line diagram for every metric's performance
Every progress-over-time view in this feature (per-exercise progress in
§3.2, each body-composition/measurement metric in §3.3, and the
nutrition trend view in §3.4) is shown as an actual **line chart** — not a
table — as the primary view. A line chart library the main app already
uses (`recharts` or `chart.js`, per `project-handoff.md` §5) is enough;
nothing more elaborate is needed. A table can still exist as a secondary
"see raw numbers" toggle underneath the chart if useful, but it is not a
substitute for the chart itself.

## 5. Deliverables for this feature

1. New "Journal & Stats" tab, reachable from the main navigation.
2. Journal: create/edit/delete dated free-text entries with optional photo
   attachments, optionally linked to a training session.
3. Statistics → Adherence: week/month/year toggle, bullet-tracker heatmap
   grid (§4.3), overall-completion circular tracker (§4.4), and the
   completed/partial/missed breakdown by day-type.
4. Statistics → Exercise progress: per-exercise history as a line diagram
   (§4.5) with range filter.
5. Statistics → Body composition & measurements: logging form + line-
   diagram progress views (§4.5) for weight, muscle mass, fat
   mass/percentage, and each tracked measurement (neck, waist, hips, arms,
   thighs, extensible to more).
6. Statistics → Nutrition: daily logging of full macros (calories,
   protein, fiber, carbs, fat) with calories/protein/fiber highlighted,
   goal setting for the three highlighted metrics, circular goal-rings
   (§4.4) for today, and a line-diagram adherence/trend view (§4.5) with
   week/month/year toggle.
7. Animation (§4.1) and collapsible minimize/maximize behavior (§4.2)
   applied consistently across all sections in this tab.
8. All new tables added to the same database chosen in the main app
   (`project-handoff.md` §3/§5) — no separate storage mechanism.

## 6. Explicitly out of scope for this feature

- Food-item-level nutrition diary (barcode scanning, food database
  lookups) — daily totals only, entered manually.
- Device/wearable integration for body composition (smart scales, etc.) —
  manual entry only.
