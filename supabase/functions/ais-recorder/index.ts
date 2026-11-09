// Vessel Viewer recorder: listens to aisstream.io for ~55 s per call and stores
// ship positions (one per ship per 2 min) and ship details. Called every minute by pg_cron.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// [[minLat,minLon],[maxLat,maxLon]]
const AREAS: Record<string, number[][]> = {
  sg: [[1.0, 103.5], [1.5, 104.5]],     // Singapore Strait, East Coast Park
  hk: [[22.1, 113.8], [22.6, 114.45]],  // Hong Kong waters
  ldn: [[51.3, 0.4], [51.75, 1.6]],     // Thames estuary, Southend
};
const SECONDS = 55;
const THROTTLE_S = 120;

function areaOf(lat: number, lon: number) {
  for (const [k, [[a, b], [c, d]]] of Object.entries(AREAS)) if (lat >= a && lat <= c && lon >= b && lon <= d) return k;
  return null;
}
function parseTs(s: string) {
  // "2026-11-08 20:10:33.123456789 +0000 UTC"
  const m = (s || "").match(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)/);
  return m ? new Date(`${m[1]}T${m[2]}Z`) : new Date();
}

async function record() {
  const { data: run } = await sb.from("runs").insert({}).select("id").single();
  let messages = 0, err: string | null = null;
  const pos = new Map<string, Record<string, unknown>>();
  const ves = new Map<number, Record<string, unknown>>();
  const merge = (mmsi: number, v: Record<string, unknown>) => {
    const cur = ves.get(mmsi) || { mmsi };
    for (const [k, x] of Object.entries(v)) if (x !== null && x !== undefined && x !== "" && x !== 0) cur[k] = x;
    ves.set(mmsi, cur);
  };
  try {
    const { data: key, error } = await sb.rpc("get_ais_key");
    if (error || !key) throw new Error("no key: " + (error?.message || ""));
    await new Promise<void>((resolve) => {
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
      ws.binaryType = "arraybuffer";
      const timer = setTimeout(() => { try { ws.close(); } catch (_) { /* */ } resolve(); }, SECONDS * 1000);
      ws.onopen = () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: Object.values(AREAS) }));
      ws.onerror = (e) => { err = "ws error " + ((e as ErrorEvent).message || ""); clearTimeout(timer); resolve(); };
      ws.onclose = () => { clearTimeout(timer); resolve(); };
      ws.onmessage = (ev) => {
        messages++;
        // deno-lint-ignore no-explicit-any
        let j: any;
        try { j = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data)); } catch (_) { return; }
        if (j.error) { err = String(j.error); return; }
        const md = j.MetaData || {}, mmsi = Number(md.MMSI);
        if (!mmsi) return;
        const area = areaOf(md.latitude, md.longitude);
        const t = j.MessageType, m = (j.Message || {})[t] || {};
        if (md.ShipName && md.ShipName.trim()) merge(mmsi, { name: md.ShipName.trim() });
        if (t === "PositionReport" || t === "StandardClassBPositionReport" || t === "ExtendedClassBPositionReport") {
          if (!area) return;
          const ts = parseTs(md.time_utc);
          const bucket = Math.floor(ts.getTime() / 1000 / THROTTLE_S);
          const k = `${mmsi}:${bucket}`;
          if (pos.has(k)) return;
          const lat = m.Latitude ?? md.latitude, lon = m.Longitude ?? md.longitude;
          if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
          pos.set(k, { mmsi, ts: new Date(bucket * THROTTLE_S * 1000).toISOString(), area, lat, lon,
            sog: m.Sog ?? null, cog: m.Cog ?? null, heading: m.TrueHeading === 511 ? null : (m.TrueHeading ?? null),
            nav_status: m.NavigationalStatus ?? null });
        } else if (t === "ShipStaticData") {
          const d = m.Dimension || {}, e = m.Eta || {};
          merge(mmsi, { name: (m.Name || "").trim(), imo: m.ImoNumber, callsign: (m.CallSign || "").trim(), ship_type: m.Type,
            len_m: (d.A || 0) + (d.B || 0), beam_m: (d.C || 0) + (d.D || 0), destination: (m.Destination || "").trim(),
            eta: e.Month ? `${e.Month}-${e.Day} ${e.Hour}:${String(e.Minute).padStart(2, "0")}` : null, draught: m.MaximumStaticDraught });
        } else if (t === "StaticDataReport") {
          const a = m.ReportA || {}, b = m.ReportB || {}, d = b.Dimension || {};
          merge(mmsi, { name: (a.Name || "").trim(), callsign: (b.CallSign || "").trim(), ship_type: b.ShipType,
            len_m: (d.A || 0) + (d.B || 0), beam_m: (d.C || 0) + (d.D || 0) });
        }
      };
    });
    const rows = [...pos.values()];
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from("positions").upsert(rows.slice(i, i + 500), { onConflict: "mmsi,ts", ignoreDuplicates: true });
      if (error) throw new Error("positions: " + error.message);
    }
    const vrows = [...ves.values()];
    if (vrows.length) { const { error } = await sb.rpc("upsert_vessels", { rows: vrows }); if (error) throw new Error("vessels: " + error.message); }
  } catch (e) { err = String(e); }
  if (run) await sb.from("runs").update({ ended: new Date().toISOString(), messages, positions: pos.size, vessels: ves.size, error: err }).eq("id", run.id);
}

Deno.serve((_req) => {
  EdgeRuntime.waitUntil(record());
  return new Response(JSON.stringify({ ok: true, recording_seconds: SECONDS }), { headers: { "Content-Type": "application/json" } });
});
