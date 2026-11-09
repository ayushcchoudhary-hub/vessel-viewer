-- Vessel Viewer recorder schema (Supabase Postgres)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- one row per ship per 2 minutes, only inside the three shore areas
create table if not exists public.positions (
  mmsi bigint not null,
  ts timestamptz not null,
  area text not null,            -- sg | hk | ldn
  lat double precision not null,
  lon double precision not null,
  sog real, cog real, heading smallint, nav_status smallint,
  primary key (mmsi, ts)
);
create index if not exists positions_area_ts on public.positions (area, ts desc);

-- latest static details each ship broadcasts (name, type code, size, crew-typed destination)
create table if not exists public.vessels (
  mmsi bigint primary key,
  name text, imo bigint, callsign text, ship_type int,
  len_m int, beam_m int, destination text, eta text, draught real,
  first_seen timestamptz default now(), updated_at timestamptz default now()
);

-- permanent daily summary: which ship was seen in which area on which day
create table if not exists public.sightings (
  mmsi bigint not null, area text not null, day date not null,
  first_seen timestamptz, last_seen timestamptz, n int,
  primary key (mmsi, area, day)
);

-- health log, one row per recorder run
create table if not exists public.runs (
  id bigserial primary key, started timestamptz default now(), ended timestamptz,
  messages int, positions int, vessels int, error text
);

alter table public.positions enable row level security;
alter table public.vessels enable row level security;
alter table public.sightings enable row level security;
alter table public.runs enable row level security;
create policy "public read positions" on public.positions for select using (true);
create policy "public read vessels" on public.vessels for select using (true);
create policy "public read sightings" on public.sightings for select using (true);

create or replace function public.upsert_vessels(rows jsonb) returns void
language sql security definer set search_path = public as $$
  insert into vessels as v (mmsi, name, imo, callsign, ship_type, len_m, beam_m, destination, eta, draught, updated_at)
  select (r->>'mmsi')::bigint, nullif(trim(r->>'name'),''), nullif(r->>'imo','')::bigint, nullif(trim(r->>'callsign'),''),
         nullif(r->>'ship_type','')::int, nullif(r->>'len_m','')::int, nullif(r->>'beam_m','')::int,
         nullif(trim(r->>'destination'),''), nullif(r->>'eta',''), nullif(r->>'draught','')::real, now()
  from jsonb_array_elements(rows) r
  on conflict (mmsi) do update set
    name = coalesce(excluded.name, v.name), imo = coalesce(excluded.imo, v.imo),
    callsign = coalesce(excluded.callsign, v.callsign), ship_type = coalesce(excluded.ship_type, v.ship_type),
    len_m = coalesce(excluded.len_m, v.len_m), beam_m = coalesce(excluded.beam_m, v.beam_m),
    destination = coalesce(excluded.destination, v.destination), eta = coalesce(excluded.eta, v.eta),
    draught = coalesce(excluded.draught, v.draught), updated_at = now();
$$;
revoke all on function public.upsert_vessels(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_vessels(jsonb) to service_role;

-- the aisstream key lives in Supabase Vault as 'aisstream_key'
create or replace function public.get_ais_key() returns text
language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'aisstream_key' limit 1;
$$;
revoke all on function public.get_ais_key() from public, anon, authenticated;
grant execute on function public.get_ais_key() to service_role;

-- nightly: roll positions into sightings, keep 10 days of detail (free tier is 500 MB)
create or replace function public.rollup_and_trim() returns void
language sql security definer set search_path = public as $$
  insert into sightings as s (mmsi, area, day, first_seen, last_seen, n)
  select mmsi, area, (ts at time zone 'utc')::date, min(ts), max(ts), count(*)
  from positions where ts > now() - interval '2 days'
  group by 1,2,3
  on conflict (mmsi, area, day) do update set
    first_seen = least(s.first_seen, excluded.first_seen),
    last_seen = greatest(s.last_seen, excluded.last_seen),
    n = greatest(s.n, excluded.n);
  delete from positions where ts < now() - interval '10 days';
  delete from runs where started < now() - interval '7 days';
$$;
