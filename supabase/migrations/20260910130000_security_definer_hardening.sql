-- Security hardening (Sep 10 2026 sweep) — Supabase advisor findings.
--
-- 1. SECURITY DEFINER functions were executable by `anon` and `authenticated`
--    via PostgREST /rest/v1/rpc/* (functions get EXECUTE TO PUBLIC by default).
--    None of these are called by app code with a user-scoped client (verified
--    against the repo: they are cron/trigger/seed helpers reached only via the
--    service role, or auth triggers), so we revoke both roles + PUBLIC.
--    NOTE: the auth_*_org_ids()/auth_member_ids() RLS helper functions are
--    intentionally NOT revoked — RLS policy evaluation requires EXECUTE for
--    the querying role, and they only return the caller's own ids.
--
-- 2. mv_portfolio_leaderboard was selectable by anon/authenticated via
--    PostgREST, bypassing the /api/community/leaderboard route's shaping.
--    Only the service-role API route reads it.
--
-- 3. Pin search_path on all advisor-flagged functions (mutable search_path
--    on SECURITY DEFINER functions enables search-path hijacking).

-- ── 1. Revoke direct RPC execution of privileged helpers ──────────────────
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'seed_demo_investor',
        'increment_post_likes',
        'increment_post_comments',
        'refresh_leaderboard_mat',
        'cleanup_expired_rate_limits',
        'cleanup_old_security_audit_logs',
        'evict_old_news_cache',
        'evict_query_embedding_cache',
        'prune_old_breadcrumbs',
        'handle_new_user',
        'handle_new_user_elo',
        'trg_post_likes_after_delete',
        'trg_post_likes_after_insert'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

-- ── 2. Leaderboard materialized view: service-role only ───────────────────
revoke select on table public.mv_portfolio_leaderboard from anon, authenticated;

-- ── 3. Pin search_path on advisor-flagged functions ───────────────────────
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'update_updated_at', 'assign_legacy_number', 'touch_user_watchlists_updated_at',
        'increment_post_likes', 'set_updated_at_now', 'set_data_subject_requests_updated_at',
        'empire_set_updated_at', 'set_user_trades_updated_at', 'increment_post_comments',
        'match_echo_articles_for_user', 'set_changelog_updated_at', 'prune_old_breadcrumbs',
        'set_ptn_updated_at', 'cleanup_expired_rate_limits', 'cleanup_old_security_audit_logs',
        'set_kge_updated_at', 'evict_old_news_cache', 'update_org_flag_updated_at',
        'usaspending_fy_counts', 'get_echo_engagement_counts', 'enforce_cross_desk_reason',
        'update_updated_at_column', 'enforce_override_reason', 'handle_new_user',
        'tg_org_positions_updated_at', 'match_echo_articles', 'seed_demo_investor',
        'oecd_latest_observations', 'match_echo_chunks', 'increment_query_cache_hit',
        'evict_query_embedding_cache', 'lobbying_issue_mix', 'match_polymarket_markets',
        'match_markets', 'handle_new_user_elo', 'trg_post_likes_after_delete',
        'trg_post_likes_after_insert', 'refresh_leaderboard_mat'
      )
  loop
    execute format('alter function %s set search_path = public', fn.sig);
  end loop;
end $$;
