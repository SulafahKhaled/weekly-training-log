# Prompt: Upgrade my weekly training tracker

You are working on my existing weekly training tracker app. The weekly plan and all current exercises already exist and must keep working. Your job is to make it flexible, fix the bugs listed below, and add the new content.

**Attached / referenced material**
- `Flexibility & Mobility PDF` (Arabic, 8 pages): 12-week flexibility, mobility, yoga, fascia-release, breathing and stick-drill program. This is the source for all mobility content.
- Muscle Atlas 3D artifact: https://claude.ai/artifact/EiaKYDuc8cC2zPJi6Pds37 . Its `MUSCLES` map and `RAW_EXERCISES` list (exercise id, name, day tags, primary and secondary muscles, movement direction) are my exercise and muscle library. Reuse that data, do not retype it. If you cannot open the link, tell me and I will give you the HTML.

## Step 0: Understand before changing
1. Read the whole codebase first. Keep the existing stack, language and visual style (I use it on my phone, so stay mobile-first).
2. Write me a short plan (under 15 lines) listing what you will change and any assumption you are making. Then start building without waiting, unless something would destroy my data.
3. Never delete my existing plan or my logged history. Add a versioned data migration and an Export / Import JSON backup button before changing the storage format.

## Part A: Flexibility (new features)
1. **Exercise library.** One library holds every exercise (the ones already in my plan, the Atlas exercises, the PDF exercises, and my own). Each exercise has: name (English and Arabic when available), type (reps, timed hold, timed per side, cardio/interval), default sets, reps or seconds, rest, primary and secondary muscles (use the Atlas muscle keys), notes, media (see Part C), and source.
2. **Add, edit, remove exercises.** I can create a new exercise, edit any field of any exercise (including the ones that came with the app), duplicate it, and archive or delete it. Deleting an exercise must not erase past history for it.
3. **Browse by muscle.** I can filter and search the library by muscle, by type, and by day or session, using the Atlas muscle names.
4. **Plans.** I can create several training plans, duplicate a plan, rename it, and choose which plan is active. A plan is a set of days, each day a list of sessions, each session an ordered list of exercises. Inside a plan I can add, remove and reorder exercises and override sets, reps, seconds and rest for that plan only.
5. **Do any workout on any day.** If today is Sunday but I did Monday's workout, I can do that: (a) start any other day's session today, (b) add another day's session or any single exercise on top of today's session, (c) move or swap sessions between days. History records what I actually did on the actual date, linked to the template it came from. Do not make me edit the plan for this.
6. **Free exercises.** I can add an exercise that is not in any plan, for today only ("quick add"), either from the library or created on the spot, and it is logged and counted in statistics.
7. **Customizable timing.** Global defaults for countdown, work time and rest, with per-exercise and per-plan overrides.

## Part B: Fixes and changes to the current app
1. **Skip break.** Every rest or break screen has a Skip button.
2. **Isometric counter bug.** For timed holds (plank, wall sit, hollow hold, glute bridge hold, side plank, etc.) the counter only counts the last set and ignores the earlier ones. Find the root cause, fix it so every completed set counts, and add a test that runs 3 sets of a hold and checks that all 3 are recorded.
3. **Skip any timer.** Every timer (work, hold, countdown, rest) has a skip option that asks one question: mark as Completed or Incomplete. The result is saved. Add an Undo.
4. **Change break time.** During a rest I can add or remove 10 or 15 seconds. I can also change the default rest globally, per plan, and per exercise.
5. **Edit exercises.** See A2. Changes to an exercise apply to future sessions only, never to history.
6. **Mobility content comes from the PDF only.** Replace the current mobility exercises with the PDF's: Mobility A (hips and legs, 8 exercises), Mobility B (shoulders, thoracic, wrist, 8), Mobility C (spine and floor movement, 8), the long yoga session (8 sections), fascia release (10 areas, roller and ball), breathing routines (morning 5 minutes, bedtime 5 minutes), and stick drills Levels 1, 2 and 3. Copy the exact names, dosages and cues from the PDF, keep the Arabic text, and add the English name.
7. **Fix the statistics.** First reproduce what is wrong and tell me the root cause. Then rebuild statistics from one source of truth, the session log. Required numbers: sessions completed vs planned per week, completion percentage, current and best streak, total sets, reps and hold time, time trained, per-exercise history and personal bests, and counts of completed, incomplete and skipped items. Weeks start on Sunday (make it a setting), use the Asia/Riyadh timezone, and a skipped rest must never count as a skipped exercise. Add tests with a small fixed log and known expected numbers.
8. **Add the PDF exercises to the current plan** using the PDF's weekly table. Keep my existing resistance workouts unchanged and add these on top:

| Day | Existing | Add-on from the PDF | Time |
|---|---|---|---|
| Sunday | Upper A | Mobility B + stick: rotations | 25 min |
| Monday | Lower A | Mobility A | 20 min |
| Tuesday | HIIT 1 | Stick: speed and footwork + fascia release | 25 min |
| Wednesday | Core + Hips | Long yoga session (evening) | 40 min |
| Thursday | Upper B | Mobility C + stick: strikes | 25 min |
| Friday | Lower B | Mobility A + fascia release | 25 min |
| Saturday | HIIT 2 | Stick: shadow-boxing rounds + calm stretching | 20 min |
| Every morning | | Breathing routine | 5 min |
| Every night | | Sleep breathing + legs up the wall | 5 min |

   Add-ons are separate optional blocks, so I can complete the resistance workout without them. Include the PDF's minimum version for 12-hour work days (breathing plus 3 movements). Also add the PDF's progress-test table (reach, deep squat, knee to wall, etc.) as a form I can fill at the start, week 4, week 8 and week 12.

## Part C: Video or image for every exercise
1. For every exercise in the app (old, Atlas and PDF), find a YouTube demonstration from a reputable channel (physio, coaching or yoga professionals). Prefer short, clear form videos.
2. Verify every link before saving it: it must load, be embeddable, and match the exercise. Never invent or guess a URL. If you cannot verify one, mark it "no media yet" instead.
3. Where no good video exists, use an image or diagram that you are allowed to use, with attribution. Do not scrape copyrighted images.
4. Store media as editable data on the exercise (url, optional start time, source, verified date) so I can replace it from the app. Load embeds lazily so the app stays fast on mobile data.
5. At the end, give me a table of every exercise with its media link and a list of the ones still missing media.

## Part D: Let Claude log my data directly (MCP connector)

Goal: I can tell Claude in a normal chat "I ate X" or "I did these exercises", and it writes that straight into my tracker, with no copy and paste.

How it works: the app exposes a small MCP server (remote, HTTPS) that I add to claude.ai as a custom connector. Claude then calls its tools.

1. **Backend first.** Data must live in the real database (not browser localStorage), because Claude writes from outside my browser. If the current storage is local only, tell me, move it to the database, and keep my existing data through a migration.
2. **MCP server.** Add an endpoint such as `/mcp` using the official MCP TypeScript SDK with Streamable HTTP transport. Deploy it with the app on a public HTTPS URL.
3. **Authentication.** Only I can use it. Use OAuth 2.1 if the SDK and host make it simple. Otherwise use a long random secret token that I can regenerate in the app's settings, stored hashed, sent as a Bearer token. Never leave the endpoint open, and never put the token in the repo.
4. **Tools** (each with a clear description and a JSON schema, so Claude fills fields correctly):
   - `log_meal`: date (default today, Asia/Riyadh), meal type, free-text description, optional calories, protein_g, fiber_g, carbs_g, fat_g. If I give no numbers, Claude may estimate them and the entry must be marked `estimated: true`.
   - `log_workout`: date, plan or day name (optional), list of exercises by library id or name, for each: sets with reps, weight, or seconds, plus completed, incomplete or skipped. Match names against the exercise library. If a name is not found, create it as a free exercise and report that.
   - `log_measurement` and `log_journal_entry` if those features exist.
   - `get_today`, `get_plan`, `list_exercises`, `get_stats`: read-only, so Claude can check what is already logged and answer questions.
   - `update_entry` and `delete_entry` by id, so I can correct mistakes by chat.
5. **Safety and correctness.**
   - Every write returns the saved record (id and values) so Claude can confirm to me what was stored.
   - Be idempotent: a client-supplied `request_id` prevents double logging if Claude retries.
   - Validate everything (ranges, dates, units). Reject bad input with a clear error message.
   - Entries written by Claude get `source: "claude"` and show a small badge in the app, and I can edit or delete them.
   - Statistics must count Claude-logged data exactly like data I enter in the app.
6. **Settings screen.** A "Connect Claude" page showing the connector URL, a button to create or revoke the token, a copy button, and short setup steps: claude.ai, Settings, Connectors, Add custom connector, paste the URL.
7. **Tests.** Call each tool with sample input and check the database rows and the statistics. Test a duplicate `request_id`, a wrong token (must be rejected), and an unknown exercise name.
8. **Tell me honestly** what hosting this needs (public URL, always on) and whether my Claude plan supports custom connectors, instead of assuming.

## Rules and delivery
- Work in small steps and keep the app runnable after each step.
- Do not change anything I did not ask for. If you notice another bug, report it instead of silently changing behavior.
- Test the timers, the isometric counting, the skip and complete flow, plan switching, doing another day's workout, and the statistics, and show me the results.
- When done, give me: a summary of what changed, the root causes of the isometric and statistics bugs, anything you could not do and why, and short instructions for how to use the new features.
