-- Give server-side API calls (service_role) a 30s statement timeout.
--
-- service_role has no timeout of its own, so PostgREST applies the
-- authenticator role's 8s. The Lobbying Activity aggregates
-- (lobbying_page_*) take 1 to 6s alone but went past 8s on a cold cache
-- while the lobbying ingest was writing, and every card failed with
-- "canceling statement due to statement timeout" (Oct 21, 2026).
-- service_role is only ever used server-side (getAdminClient); anon (3s)
-- and authenticated (8s) are unchanged.
alter role service_role set statement_timeout = '30s';

-- PostgREST reads role settings at startup; reload it so this applies now.
notify pgrst, 'reload config';
