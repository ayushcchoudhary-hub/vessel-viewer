# Vessel Viewer: demo clip plan

Tempo: 136 BPM. 1 bar = 1.765 s. 2 bars = 3.53 s.
Total: 13 bars = 22.9 s. Silent first; music added later.
Source for every claim: `pipeline/data4.json`, snapshot 9 Nov 2026, 12:24 GMT.

| # | Bars | Time | Idea | On screen | Caption | Proof (ring) | Source |
|---|---|---|---|---|---|---|---|
| 1 | 2 | 0.0–3.5 | What it is | Singapore horizon, real ships | What's that **ship**? | "REAL SHIPS" badge | `cities.sg`, `captured` |
| 2 | 2 | 3.5–7.1 | Pick one | Binoculars 7× on ORE BRASIL | Tap one. Bulk carrier, **362 m** | ORE BRASIL label | `ships[ORE BRASIL]`: len 362, typeGuess true ("likely") |
| 3 | 2 | 7.1–10.6 | Scale | From above, whole area | **843** ships heard off Singapore in the last hour | chart note / ship cloud | `counts.hour` = 843 |
| 4 | 3 | 10.6–15.9 | How it works | Globe flies to Itaqui, Brazil and follows the ship | Where it's been: **Brazil**, China, here | ship icon + stops list | `calls`: Itaqui, Dongjiakou (Global Fishing Watch) |
| 5 | 2 | 15.9–19.4 | Result | Lines from Singapore to today's destinations | Where today's ships are **going** | destination list | `heading`: 705 ships over 60 m, 24 h |
| 6 | 2 | 19.4–22.9 | Mirror | Beat card | What's that ship? **Vessel Viewer.** Real ships, public data. | — | — |

Notes
- Real UI and real data only. Ship names are public AIS data.
- "Bulk carrier" is a guess from the name; the caption uses the page's own "(likely)" label on screen.
- Route between ports is inferred along sea lanes; the clip says "where it's been", not "its track".
- Repo is private, so the end card names the project only.
