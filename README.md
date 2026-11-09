# Vessel Viewer

Stand on a shore. See the real ships out there, where they've been and where they're going.

I grew up in port cities (Singapore, Hong Kong) and always wondered which ships were on the horizon. Vessel Viewer answers that with public data: live ship broadcasts, port-call history and a port authority feed, piped into one visual page.

## What it shows

- **The horizon.** The ships you'd see from East Coast Park (Singapore), the Tsim Sha Tsui promenade (Hong Kong) or Southend (Thames estuary). Each ship sits at its real bearing and distance.
- **From above.** The same ships on a chart, with a wedge for the direction you're facing.
- **The journey.** Tap a ship and zoom out to a globe: its last port calls, where it is now, and where its crew says it's going.
- **Hong Kong tonight.** The Marine Department's arrivals and departures board, and a map of where the arriving ships last called.

## Pipeline

```
aisstream.io (websocket) --> Supabase Edge Function (every minute, pg_cron)
                                     |
                                     v
                     Postgres: positions, vessels, sightings, runs
                                     |
          Global Fishing Watch API --+--> pipeline/*.py (clean, join, route) --> web/template.html
          HK Marine Department XML --+
```

| Step | What | Where |
|---|---|---|
| Ingest | Live AIS positions and static data for 3 shore areas | `supabase/functions/ais-recorder` |
| Record | 1 position per ship per 2 min; 10 days of detail, daily sightings kept | `supabase/migrations/0001_schema.sql` |
| Clean | Crew-typed destinations matched to UN/LOCODE ports | `pipeline/build_real.py` |
| Model | Port calls from Global Fishing Watch; gaps routed along sea lanes (searoute) | `pipeline/gfw.py`, `pipeline/build_real.py` |
| See | Canvas horizon, chart and d3 globe | `web/template.html` |

## What is real and what is drawn

Real data:
- Ship names, positions, speed, heading, length, crew-typed destination and ETA (AIS, via aisstream.io).
- Port-call history and flag (Global Fishing Watch). This runs about 3 days behind.
- Hong Kong arrivals, departures and ships in port (Marine Department open data).
- Coastlines (Natural Earth).

Drawn or inferred:
- **Ship type for cargo ships** is a best guess. AIS only says "cargo", so container ships, bulk carriers and car carriers are told apart by name.
- **Routes between ports** follow standard sea lanes. They are not the ship's actual track.
- **Silhouettes** are generic per type, scaled to each ship's length.
- **The horizon** compresses distance so near and far ships both fit, and uses generic hill heights.

## Run it

```
cp .env.example .env   # fill in your keys
cd pipeline
python extract.py      # last hour of ships from the database
python build_real.py   # join Global Fishing Watch history and routes
python board.py        # Hong Kong board
python build4.py && python build_page.py
```

Deploy the recorder: apply `supabase/migrations/0001_schema.sql`, deploy `supabase/functions/ais-recorder`, store the aisstream key in Vault, then run `supabase/cron.sql`.

## Credits

- Ship positions: [aisstream.io](https://aisstream.io)
- Port history: Powered by [Global Fishing Watch](https://globalfishingwatch.org). Non-commercial use (CC BY-NC 4.0).
- Hong Kong board: [Marine Department open data](https://data.gov.hk)
- Coastlines: [Natural Earth](https://www.naturalearthdata.com)
- Sea routes: [searoute](https://github.com/genthalili/searoute-py)

Built by Ayush Choudhary with Claude Code.
