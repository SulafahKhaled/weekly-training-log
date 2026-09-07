# Weekly Training Log — Documentation

A 7-day home-workout tracker (Sun–Sat: Upper A, Lower A, HIIT, Core+Hip, Upper B, Lower B, HIIT), with guided timers, video demos, weight logging, and history. Deployed on Vercel with its own account system, so you can share it with family or friends and everyone's progress stays completely separate.

**Live app:** https://files-tau-eosin.vercel.app
**Source code:** https://github.com/SulafahKhaled/weekly-training-log

## Features

- **Accounts** — each person creates their own username + password. All progress, weights, and history are private to that account; sharing the app link with someone else never mixes your data with theirs.
- **All 7 days** from the plan, each with warm-up → exercises → cool-down, color-coded by category (Upper / Lower / Core+Hip / HIIT).
- **Resistance exercises** — tap a set to check it off, optionally log the weight used (kg) right on the row. A rest timer starts automatically between sets.
- **Isometric holds** (plank, wall sit, side plank, superman, hollow hold, etc.) — a ring timer runs hold → rest → hold automatically across all sets with audio cues, marking each one done as it finishes.
- **HIIT circuits** (Tuesday/Saturday) — a work/rest interval timer cycles through all moves across 4 rounds, showing the current and next move, with a confetti celebration on completion.
- **Video demos** — every exercise links a YouTube demo; tap to preview inline, nothing loads until you ask for it.
- **Prepare & Recover** — every day screen shows a card for each muscle/joint that day trains, each with up to three tap-to-preview videos: a **Dynamic** warm-up, a **Mobility** drill (CARs-style controlled range work), and a **Static** stretch — plus 2–3 tips per muscle.
- **Warm-up / Mobility / Cool-down tabs** — the same three layers as full browsable libraries, for general reference or a rest-day routine.
- **History** — expand any resistance exercise to see your last several sessions and the weight you used per set.
- **Streak** — a flame badge counting your consecutive days with any completed work.
- **Dramatic fullscreen timers** — rest, isometric hold, and HIIT circuit timers all take over the screen while running, with a huge countdown ring, the exercise name, and a tick + haptic buzz on the final 3 seconds. Every timer supports pause, resume, stop, reset, and repeat.
- **Journal & Stats tab** — a dated, free-text training journal (optionally with photos) plus four statistics views:
  - **Adherence** — a GitHub-style heatmap and completion ring over Week/Month/Year, plus a per-day-type breakdown ("Upper A completed 3/4 times").
  - **Exercise progress** — pick any exercise and see a line chart of its history: weight for resistance moves, actual hold duration for isometric holds (editable per set, see below), rounds completed for HIIT circuits.
  - **Body composition & measurements** — log weight/muscle mass/fat mass/body-fat % and neck/waist/hips/arms/thighs, each with its own trend chart and a "change since first log / last 30 days" signal.
  - **Nutrition** — log daily macros, set goals for calories/protein/fiber, see today's progress as goal-rings (à la Apple Fitness), and trend charts with the goal line overlaid.
- **Isometric holds log a real duration** — each hold defaults to the planned time the moment it completes, but is editable afterward (e.g. "held 35s not the full 40s") so the exercise-progress chart reflects what actually happened, not just the timer's plan.
- **Light theme** throughout — no dark mode.

## Using it with family or friends

There's nothing to set up per-person — just send them the live link:

**https://files-tau-eosin.vercel.app**

Each person taps "Create an account," picks a username and password, and gets their own private log from that point on. Nobody can see or affect anyone else's data — it's enforced on the server, not just hidden in the UI.

## Architecture at a glance

```
Browser (anywhere)
   │  HTTPS
   ▼
Vercel  ──serves static files──▶  built React app
   │  /api/* (serverless function, api/index.js → server/app.js)
   ▼
Neon Postgres (serverless, via Vercel's Neon integration)
```

The workout plan itself (exercise names, sets/reps, videos) is fixed and lives in `src/data/days.js` in the code — it isn't in the database, since there's no in-app plan editor. What's in the database: user accounts (username + hashed password) and everything each person actually *does* (completed sets, weights, completed circuits).

## Project structure

```
src/           React frontend
server/        Express app (app.js) shared by both entry points below
  index.js       local dev / LAN entry point (npm run dev, npm start)
api/index.js   Vercel serverless entry point (same app.js, wrapped for Vercel)
vercel.json    tells Vercel how to build the frontend and route /api/*
```

## How deployment works

- **GitHub → Vercel is automatic.** The GitHub repo is connected to the Vercel project; every push to the `main` branch triggers a new production deployment on its own. You generally don't need to run any deploy command by hand.
- **Manual deploy** (if you ever need it): `npx vercel --prod` from the project folder, once logged in (`npx vercel login`).
- **Database**: a Neon Postgres database, added to the Vercel project via Vercel's Storage/Marketplace integration (Neon). Vercel automatically injects the connection details (`DATABASE_URL`, `POSTGRES_URL`, etc.) as environment variables — you don't manage a connection string by hand for production.
- **Secrets**: `SESSION_SECRET` (used to sign login sessions) is set directly in the Vercel project's Environment Variables — it is not committed to the repo and not auto-generated by any integration, so if you ever recreate the Vercel project from scratch, you need to set it again (any random 64-character string works, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

## Running it locally (for development)

You need [Node.js](https://nodejs.org) 20+, [Docker](https://www.docker.com) (for a local database), and the repo cloned.

```bash
npm install

# one-time: start a local Postgres in Docker
docker run -d --name wtl-postgres \
  -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=weekly_training_log \
  -p 5432:5432 postgres:16-alpine

# one-time: create your local .env (see .env.example)
cp .env.example .env
# .env.example already points DATABASE_URL at the Docker container above;
# generate your own SESSION_SECRET value with:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run dev   # hot-reload frontend + API together
```

Local development always talks to your own Docker Postgres, never the real production database — that's deliberate, so testing never touches other people's real training data. If you stop and restart the Docker container later, use `docker start wtl-postgres` (no need to `run` again — that would create a second, empty container).

`npm start` builds the frontend and runs one Express process serving both the app and the API (same shape as production, useful for a final check before pushing, or for LAN-only use without deploying anywhere).

## Troubleshooting

- **"Can't reach the server" banner** — the API request failed. On the live Vercel app this usually means a transient network hiccup (reload); locally it means the API process (or its Docker Postgres) isn't running.
- **Forgot your password** — there's no self-service password reset (see "Known limitations"). Whoever manages the Vercel project can reset it directly in the database via Neon's dashboard SQL editor (reachable from the Vercel project's Storage tab).
- **Local dev can't connect to Postgres** — confirm the container is running: `docker ps` should list `wtl-postgres`. If it's not there, re-run the `docker run` command above (once) or `docker start wtl-postgres` if you'd created it before.
- **A deploy didn't show up** — check the Vercel dashboard's Deployments tab for the project; a build error there will show exactly what failed. Common cause: a new environment variable your code needs wasn't added in Vercel's Environment Variables settings.

## Known limitations / not built (by design, for now)

- **No password reset / email verification.** Signing up only needs a username and password, no email — which also means there's no automated way to recover a forgotten password. Low stakes for a small trusted group; a real fix would need an email-based flow.
- **No plan editor** — the 7-day plan is fixed in code (from the source PDF). Changing exercises means editing `src/data/days.js` and redeploying.
- **No rep-count override or per-set notes** — only weight is logged per set beyond the checkbox.
- **Nutrition adherence is logging + goals + trend charts only** — there's no separate "days logged vs. not logged" or per-goal hit-rate breakdown view yet (the Adherence tab's day-type breakdown covers that concept for workouts, not nutrition).
- Journal photos are stored as compressed JPEGs directly in the database (resized client-side before upload) — fine for personal use, but would need moving to dedicated file storage if photo volume ever got heavy.
- The Prepare & Recover / Warm-up / Mobility / Cool-down content has English + Arabic muscle/drill names, but the short tip bullets under each video are English-only.

## Ideas for later

- Self-service password reset via email.
- Editable rep counts and per-set notes.
- A days-logged-vs-not-logged nutrition adherence view, mirroring the workout Adherence tab.
