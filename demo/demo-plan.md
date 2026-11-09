# Vessel Viewer: demo clip plan (v6)

Tempo: 136 BPM. 1 bar = 1.765 s. Total: 13 bars = 22.9 s. Silent first; music added later.
Source for every claim: `pipeline/data4.json` and `timelapse.json`, snapshot 9 Nov 2026, 16:20 GMT.

| # | Bars | Time | Idea | On screen | Caption | Proof (ring) | Source |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 0.0–3.5 | Why | Singapore horizon, then Hong Kong | I grew up watching ships in **Singapore** and Hong Kong | Shore buttons | Ayush's own story; `cities.sg`, `cities.hk` |
| 2 | 2 | 3.5–7.1 | Pick one | Horizon, then the ship ticket | Tap one. Bulk carrier, **362 m** | Type line on the ticket | `ships[ORE BRASIL]`: len 362, typeGuess true (the ticket says "likely") |
| 3 | 3 | 7.1–12.4 | Where it's been | Globe follows the ship from Brazil | Where it's been: **Brazil,** China, here | Stops strip | `calls`: Ponta da Madeira, Dongjiakou (Global Fishing Watch) |
| 4 | 2 | 12.4–15.9 | Zoom out | Replay map of Singapore | Then zoom out: **19 hours** of traffic | Subtitle "The last 19 hours off Singapore" | `timelapse.json` sg range |
| 5 | 2 | 15.9–19.4 | How | Flow diagram | All from ship radio and **public data** | Sources column | AIS (aisstream.io), Global Fishing Watch, HK Marine Dept, terrain and coastlines |
| 6 | 2 | 19.4–22.9 | Mirror | Beat card | What's that ship? **Vessel Viewer.** | none | none |

Notes
- Real UI and real data only. Ship names are public AIS data.
- "Bulk carrier" is a guess from the name. The ticket on screen shows "(likely)".
- The route between ports is inferred along sea lanes. The clip says "where it's been", not "its track".
- The end card names the project only. Add the live link when the subdomain exists.
