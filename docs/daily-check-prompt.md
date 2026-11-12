# Daily check: the prompt

Ayush has a scheduled task in Claude ("Vessel Viewer daily check", 08:37 London time, push notification).
It is a second pair of eyes on top of `health.yml`. If the Claude account changes and the task is lost,
create a new daily scheduled task with this prompt.

```
Daily health check for Ayush's Vessel Viewer (live at https://vessels.ayushcchoudhary.com, repo ayushcchoudhary-hub/vessel-viewer, Supabase project "vessel-viewer", Vercel project "vessel-viewer"). Read docs/RUNBOOK.md in the repo first.

Check these things:
1. Live API: fetch https://vessels.ayushcchoudhary.com/api/live?area=sg (and hk, ldn, ny). Each must return ships, and the "at" time must be under 20 minutes old.
2. Page age: the page at https://vessels.ayushcchoudhary.com/ holds "captured":"<time>". It must be under 14 hours old.
3. GitHub Actions in the repo: the last runs of "Build page" and "Health check". Note any failure in the last 24 hours and read its log for the cause.
4. Supabase (read-only SQL): database size (free limit 500 MB; warn above 350 MB), recorder runs in the last 24 hours (expect about 1,440) and how many had an error, and that both cron jobs are active.

Rules:
- This is a read-only check. Do not push code, change settings, run migrations, or re-run workflows. If something is wrong, say what is wrong, the likely cause, and the fix you propose, and wait for Ayush.
- Write to Ayush in ASD-STE100 Simplified Technical English: short sentences, lead with the answer.
- If everything is healthy, reply with one line: "Vessel Viewer is healthy." plus the database size and the page age.
- If something is wrong, lead with the problem in one sentence, then at most five short bullets.
- Never print tokens or keys.
```
