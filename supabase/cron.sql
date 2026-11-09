-- Run once after deploying the function. Replace <PROJECT_REF> and <ANON_KEY>.
-- Store the aisstream key first:  select vault.create_secret('<AISSTREAM_KEY>', 'aisstream_key');
select cron.schedule('ais-recorder-every-minute', '* * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/ais-recorder',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := '{}'::jsonb, timeout_milliseconds := 10000)
$$);
select cron.schedule('ais-rollup-nightly', '17 0 * * *', 'select public.rollup_and_trim()');
