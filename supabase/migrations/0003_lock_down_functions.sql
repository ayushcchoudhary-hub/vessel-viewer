-- Only the database itself may run the maintenance and import functions.
-- Before this, anyone with the public key could call rollup_and_trim() (harmless, but it is work for the database),
-- and any signed-in user could call import_rows().
revoke all on function public.rollup_and_trim() from public, anon, authenticated;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('import_rows', 'upsert_vessels', 'get_ais_key') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- db_health() is public on purpose (the health check reads it). Make it cheap: an estimate, not a full count.
create or replace function public.db_health()
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  select json_build_object(
    'db_mb', round(pg_database_size(current_database()) / 1048576.0),
    'positions', (select greatest(reltuples, 0)::bigint from pg_class where oid = 'public.positions'::regclass),
    'last_position', (select max(ts) from positions where area = 'sg'),
    'runs_24h', (select count(*) from runs where started > now() - interval '24 hours'),
    'errors_24h', (select count(*) from runs where started > now() - interval '24 hours' and error is not null));
$function$;
