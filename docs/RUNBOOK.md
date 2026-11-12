# Vessel Viewer: how it stays alive

## What runs, and where

| Part | Where | How often | What it does |
|---|---|---|---|
| Recorder | Supabase (`ais-recorder-every-minute`) | every minute | Listens to ship radio (aisstream) and stores positions |
| Trim | Supabase (`ais-rollup-nightly`) | 00:17 UTC | Rolls up old rows so the database stays small |
| Live API | Vercel (`site/api/live.js`) | on each visit, cached 60 s | Latest position of each ship in the last 30 minutes |
| Build | GitHub Actions (`build.yml`) | about every 6 hours | Rebuilds the page: ships, port calls (Global Fishing Watch), routes. Commits `site/index.html`. Vercel deploys it. |
| Health check | GitHub Actions (`health.yml`) | every 3 hours | Fails, and GitHub emails the owner, if the live API or the page is stale |

GitHub schedules can be late by an hour or skipped. The live positions do not depend on them.

## What the visitor sees when something stops

- Recorder or aisstream down: the badge changes from LIVE to SNAPSHOT with the build time. Old positions are never shown as live.
- Build fails: nothing is published. The last good page stays, with live positions on top.

## If the health check fails

1. `live <shore>: last position is N min old`. Look at the `runs` table in Supabase for errors. Check that aisstream.io is up and the key is valid.
2. `page: built N hours ago`. Open the Actions tab and read the last "Build page" run. Re-run it. Common causes: Supabase timeout (re-run), Global Fishing Watch error (re-run later), token expired (`GFW_TOKEN` secret).
3. `live <shore>: HTTPError`. Check the Vercel deployment and its function logs.

## Things to watch (not automatic)

- Database size. Free limit is 500 MB. Check in Supabase: Database, then Usage.
- Supabase pauses free projects that get no use. The recorder keeps it in use.
- GitHub turns off schedules in repos with no activity for 60 days. The build's own commits count as activity.
- Hong Kong arrivals board: `pipeline/feed/*.xml` is a fixed copy from 9 Nov 2026. No script refreshes it yet.
- Keys: `GFW_TOKEN` (GitHub secret), `OPENROUTER_API_KEY` (Vercel, only for the hidden photo step), the aisstream key (Supabase).

## Run the build by hand

Actions tab, "Build page", "Run workflow". Or from `pipeline/`, the commands in `build.yml`.
