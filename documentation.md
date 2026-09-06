# Weekly Training Log — Documentation

A 7-day home-workout tracker (Sun–Sat: Upper A, Lower A, HIIT, Core+Hip, Upper B, Lower B, HIIT), with guided timers, video demos, weight logging, and history — backed by a real database so your data survives across days, browsers, and devices.

## Features

- **All 7 days** from the plan, each with warm-up → exercises → cool-down, color-coded by category (Upper / Lower / Core+Hip / HIIT).
- **Resistance exercises** — tap a set to check it off, optionally log the weight used (kg) right on the row. A rest timer starts automatically between sets.
- **Isometric holds** (plank, wall sit, side plank, superman, hollow hold, etc.) — a ring timer runs hold → rest → hold automatically across all sets with audio cues, marking each one done as it finishes.
- **HIIT circuits** (Tuesday/Saturday) — a work/rest interval timer cycles through all moves across 4 rounds, showing the current and next move, with a confetti celebration on completion.
- **Video demos** — every exercise links a YouTube demo; tap to preview inline, nothing loads until you ask for it.
- **Prepare & Recover** — every day screen shows a card for each muscle/joint that day trains, each with up to three tap-to-preview videos: a **Dynamic** warm-up (movement-based, before training), a **Mobility** drill (slow, controlled-range CARs work — the layer that builds real joint control, not just looseness), and a **Static** stretch (held, after training) — plus 2–3 tips per muscle. Not every muscle has all three (e.g. Neck only has a stretch); that's expected.
- **Warm-up / Mobility / Cool-down tabs** — the same three layers as full browsable libraries (every region, joint, and muscle in the app), for general reference or a rest-day routine. The Mobility tab also has a weekly-bonus "Full-Body Primal Movement Flow" video not tied to any specific day.
- **History** — expand any resistance exercise to see your last several sessions and the weight you used per set.
- **Streak** — a flame badge counting consecutive days with any completed work.
- **Cross-device, persistent** — all progress is stored in a SQLite database on whichever computer runs the server; any device on the same Wi-Fi network sees the same data.
- **Light theme** throughout — no dark mode.

## Architecture at a glance

```
Browser (phone, laptop, ...)
   │  HTTP
   ▼
Express server (server/index.js)  ──serves──▶  built React app (dist/)
   │  /api/*
   ▼
sql.js (SQLite compiled to WASM)  ──▶  server/data.sqlite   (one file, on this computer)
```

The workout plan itself (exercise names, sets/reps, videos) is fixed and lives in `src/data/days.js` — it isn't in the database, since there's no in-app plan editor. Only what you actually *do* — completed sets, weights, completed circuits — is stored in `server/data.sqlite`.

## Running it locally

You need [Node.js](https://nodejs.org) 18+ installed. From the project folder:

```bash
npm install        # one-time, installs all dependencies
npm start           # builds the app and starts the server
```

You'll see something like:

```
Weekly Training Log server running on port 3001
  Local:   http://localhost:3001
  Network: http://10.13.35.55:3001   (use this on other devices)
```

- Open the **Local** URL on the same computer.
- Open the **Network** URL on your phone or any other device connected to the **same Wi-Fi network** — that's what makes it cross-device. The IP address shown will vary by network; re-run `npm start` (or check the terminal output) any time you switch networks, since it can change.
- Leave the terminal window open — closing it stops the server. To stop it deliberately, press `Ctrl+C` in that terminal.

### Developing (hot reload)

If you're editing the code and want instant reload instead of rebuilding:

```bash
npm run dev
```

This runs the API (port 3001) and the Vite dev server (port 5173/5174) together; the dev server proxies `/api` calls to the backend automatically. Use `npm start` (not `npm run dev`) for the everyday "just use the app across my devices" case — it's one process, one port, and matches what other devices will see.

### Restarting after a code change (production mode)

`npm start` rebuilds automatically each time you run it, so just stop the server (`Ctrl+C`) and run `npm start` again.

## Where your data lives

Everything you log is stored in a single file: `server/data.sqlite`, on whichever computer is running the server. It is:

- **Not** committed to git (see `.gitignore`) and **not** shared automatically anywhere — back it up yourself (just copy the file) if you want a safety net.
- Tied to that one computer. If you want your history to follow you without running a server on a specific machine, you'd need to host this somewhere reachable from everywhere (out of scope for this local setup).
- Safe to delete if you ever want to start over — the server recreates an empty database automatically on next startup.

## Troubleshooting

- **"Can't reach the server" banner in the app** — the Express server isn't running, or the device can't reach it. Make sure `npm start` is running and that your phone/laptop is on the same Wi-Fi network as the computer running it (not cellular data, not a guest network that isolates devices).
- **Port 3001 already in use** — another process is using it. Either stop that process, or run the server on a different port: `PORT=4000 npm start` (then use that port in the URLs above).
- **Other devices can't connect even on the same Wi-Fi** — some routers/network profiles (especially "Guest" networks, or macOS's Firewall) block device-to-device connections. Check System Settings → Network → Firewall on the machine running the server, or try a different network profile.
- **Lost your history after a reinstall** — check that `server/data.sqlite` wasn't deleted; it's the only copy of your data.

## Known limitations / not built (by design, for now)

- No user accounts — anyone who can reach the server's URL sees the same single training log. Fine for personal/family LAN use; not meant for multiple independent users.
- No plan editor — the 7-day plan is fixed in code (from the source PDF). Changing exercises means editing `src/data/days.js`.
- No rep-count override or per-set notes — only weight is logged per set beyond the checkbox.
- No progress charts yet — history is a list, not a graph (see "Ideas for later").
- The Prepare & Recover / Warm-up / Mobility / Cool-down content has English + Arabic muscle/drill names, but the short tip bullets under each video are English-only.

## Ideas for later

- A weight-over-time line chart per exercise (the history data already supports it).
- Exporting/importing `server/data.sqlite` for backup or moving to a new computer.
- Editable rep counts and per-set notes.
