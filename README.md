# Weekly Training Log

A 7-day home-workout tracker (Sun–Sat: Upper / Lower / Core+Hip / HIIT), with guided timers, video demos, weight logging, and history — React + Vite frontend, Express + Postgres backend, with its own accounts so it can be shared with family or friends without mixing anyone's data.

**Live app:** https://files-tau-eosin.vercel.app

## Quick start (local development)

```bash
npm install
docker run -d --name wtl-postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=weekly_training_log -p 5432:5432 postgres:16-alpine
cp .env.example .env   # then fill in SESSION_SECRET
npm run dev
```

Pushing to `main` on GitHub auto-deploys to Vercel production.

See **[documentation.md](documentation.md)** for full setup, deployment details, and troubleshooting. See **[CLAUDE.md](CLAUDE.md)** for architecture notes if you're working on the code.

The original static HTML/JS version (no database, single device only) is kept in [`legacy/`](legacy/) for reference.
