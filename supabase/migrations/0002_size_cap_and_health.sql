-- Keep the database small for good, and let the health check see its size.
--
-- 1. rollup_and_trim (runs every night) keeps at most 10 days of positions, as before, and now also
--    at most 1,800,000 rows. If traffic grows, the oldest rows go first, so new data always has room.
--    About 140 bytes per row: 1.8 million rows is about 250 MB. The free limit is 500 MB.
-- 2. db_health() gives the size and the recorder's last day, read-only, for pipeline/health.py.

create or replace function public.rollup_and_trim()
returns void
language sql
security definer
set search_path to 'public'
as $function$
  insert into sightings as s (mmsi, area, day, first_seen, last_seen, n)
  select mmsi, area, (ts at time zone 'utc')::date, min(ts), max(ts), count(*)
  from positions where ts > now() - interval '2 days'
  group by 1,2,3
  on conflict (mmsi, area, day) do update set
    first_seen = least(s.first_seen, excluded.first_seen),
    last_seen = greatest(s.last_seen, excluded.last_seen),
    n = greatest(s.n, excluded.n);
  delete from positions where ts < now() - interval '10 days';
  -- size cap: when there are more than 1.8 million rows, drop the oldest ones (never the last 2 days)
  delete from positions
   where ts < least((select ts from positions order by ts desc offset 1800000 limit 1), now() - interval '2 days');
  delete from runs where started < now() - interval '7 days';
$function$;

create or replace function public.db_health()
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  select json_build_object(
    'db_mb', round(pg_database_size(current_database()) / 1048576.0),
    'positions', (select count(*) from positions),
    'oldest_position', (select min(ts) from positions),
    'last_position', (select max(ts) from positions),
    'runs_24h', (select count(*) from runs where started > now() - interval '24 hours'),
    'errors_24h', (select count(*) from runs where started > now() - interval '24 hours' and error is not null));
$function$;

revoke all on function public.db_health() from public;
grant execute on function public.db_health() to anon, authenticated;
