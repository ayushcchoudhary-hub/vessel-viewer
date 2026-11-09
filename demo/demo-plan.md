# Vessel Viewer: demo clip plan (v6)

Tempo: 136 BPM. 1 bar = 1.765 s. Total: 14 bars = 24.7 s. Silent first; music added later.
Source for every claim: `pipeline/data4.json` and `timelapse.json`, snapshot 9 Nov 2026, 16:20 GMT.

| # | Bars | Time | Idea | On screen | Caption | Proof (ring) | Source |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 0.0–3.5 | Why | Singapore horizon, then Hong Kong (stills) | I grew up watching ships in **Singapore** and Hong Kong | Shore buttons | Ayush's own story; `cities.sg`, `cities.hk` |
| 2 | 2 | 3.5–7.1 | Pick one | Live: the view turns, the ship is picked, 7x zoom | What's that **ship?** Tap one. | The picked ship turns orange | `ships[ORE BRASIL]` |
| 3 | 1 | 7.1–8.8 | What it is | Live: the ship ticket | Bulk carrier, **362 m** | Type line on the ticket | len 362, typeGuess true (the ticket says "likely") |
| 4 | 3 | 8.8–14.1 | Its route | Live: the globe follows the ship from Brazil to Singapore | Follow it: **Brazil,** China, here | Stops strip | `calls`: Ponta da Madeira, Dongjiakou (Global Fishing Watch) |
| 5 | 2 | 14.1–17.6 | Zoom out | Live: replay map of Singapore | Then zoom out: **19 hours** of traffic | Subtitle "The last 19 hours off Singapore" | `timelapse.json` sg range |
| 6 | 2 | 17.6–21.2 | How | Live: flow diagram | All from ship radio and **public data** | Sources column | AIS (aisstream.io), Global Fishing Watch, HK Marine Dept, terrain and coastlines |
| 7 | 2 | 21.2–24.7 | Mirror | Beat card | What's that ship? **Vessel Viewer.** | none | none |

Notes
- Shots 2 to 6 are the real page, recorded frame by frame with a controlled clock (`capture_live.py`), then sped up 1.2x to 2.3x.
- Real UI and real data only. Ship names are public AIS data.
- "Bulk carrier" is a guess from the name. The ticket on screen shows "(likely)".
- The route between ports is inferred along sea lanes. The clip says "where it's been", not "its track".
- The end card shows the live link: vessels.ayushcchoudhary.com.
