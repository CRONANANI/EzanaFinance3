-- Reliability audit P2-12: atomic rate-limit counter. One statement
-- increments (or restarts) the bucket and returns the new count, so a burst
-- of parallel requests cannot all read the same count and pass.
-- Additive and idempotent. Service role only. Apply by hand.

create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_ms int)
returns table (allowed boolean, hits int, reset_at timestamptz)
language sql
security definer
set search_path = public
as $$
  insert into rate_limit_buckets as b (bucket_key, count, window_start, expires_at, last_hit_at)
  values (p_key, 1, now(), now() + make_interval(secs => p_window_ms / 1000.0), now())
  on conflict (bucket_key) do update
     set count = case when b.expires_at < now() then 1 else b.count + 1 end,
         window_start = case when b.expires_at < now() then now() else b.window_start end,
         expires_at = case when b.expires_at < now()
                           then now() + make_interval(secs => p_window_ms / 1000.0)
                           else b.expires_at end,
         last_hit_at = now()
  returning b.count <= p_limit, b.count, b.expires_at;
$$;
revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- Expired buckets are dead weight; the api-housekeeping cron calls this.
create or replace function public.prune_rate_limit_buckets()
returns int
language sql
security definer
set search_path = public
as $$
  with d as (
    delete from rate_limit_buckets where expires_at < now() - interval '1 hour' returning 1
  )
  select count(*)::int from d;
$$;
revoke all on function public.prune_rate_limit_buckets() from public, anon, authenticated;
grant execute on function public.prune_rate_limit_buckets() to service_role;
