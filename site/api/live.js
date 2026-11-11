// GET /api/live?area=sg  ->  { area, at, ships: [...] }
// The latest position of every ship the recorder heard off one shore in the last 30 minutes.
// Reads Supabase through its public REST API. The tables allow public reads (see supabase/migrations/0001_schema.sql).
// The publishable key below is public by design (Supabase ships it to browsers). It can only read these public tables.
// It is the only key allowed in this repo. SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the environment override the defaults.
const SB_URL = process.env.SUPABASE_URL || 'https://twgfnjrejumoihageznk.supabase.co';
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cV3Qt7i2ubzfdBq-Gq07iw_Q_SryxpR';
const AREAS = new Set(['sg', 'hk', 'ldn', 'ny']);
const WINDOW_MIN = 30, PAGE = 1000, MAX_PAGES = 4;

async function rest(path, range) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, ...(range ? { range } : {}) },
  });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  const area = String((req.query && req.query.area) || '');
  if (!AREAS.has(area)) return res.status(400).json({ error: 'area must be sg, hk, ldn or ny' });
  try {
    const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
    const latest = new Map();                                   // rows arrive newest first, so the first row per ship is its latest
    for (let p = 0; p < MAX_PAGES; p++) {
      const rows = await rest(`positions?select=mmsi,ts,lat,lon,sog,cog,heading,nav_status&area=eq.${area}&ts=gte.${since}&order=ts.desc`, `${p * PAGE}-${p * PAGE + PAGE - 1}`);
      for (const r of rows) if (!latest.has(r.mmsi)) latest.set(r.mmsi, r);
      if (rows.length < PAGE) break;
    }
    const ids = [...latest.keys()], info = new Map();
    for (let i = 0; i < ids.length; i += 150) {
      const rows = await rest(`vessels?select=mmsi,name,ship_type,len_m,beam_m,destination&mmsi=in.(${ids.slice(i, i + 150).join(',')})`);
      for (const v of rows) info.set(v.mmsi, v);
    }
    const ships = ids.map((m) => { const p = latest.get(m), v = info.get(m) || {};
      return { mmsi: m, name: (v.name || '').trim() || null, type: v.ship_type ?? null, len: v.len_m || null, beam: v.beam_m || null, dest: (v.destination || '').trim() || null,
        lat: p.lat, lon: p.lon, sog: p.sog, cog: p.cog, hdg: p.heading != null && p.heading < 360 ? p.heading : null, nav: p.nav_status, ts: p.ts }; });
    const at = ships.reduce((a, s) => (s.ts > a ? s.ts : a), '');
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.status(200).json({ area, at: at || null, ships });
  } catch (e) {
    res.status(502).json({ error: 'could not read live data' });
  }
}
