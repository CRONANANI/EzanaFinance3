# Uptime monitoring

Two endpoints (reliability audit P3). Neither is rate limited or cached.

| Endpoint       | Meaning   | 200 when                        | 503 when                     |
| -------------- | --------- | ------------------------------- | ---------------------------- |
| `/api/healthz` | liveness  | the function runs               | never                        |
| `/api/readyz`  | readiness | the database answers within 3 s | the database is down or slow |

External providers (Finnhub today) are reported in the operator view of
`/api/readyz` but never cause a 503: a provider outage is not an Ezana
outage. `/api/health` is kept as an alias of `/api/readyz` for existing
monitors.

## Monitor to set up (not configured yet)

Use Better Stack, Vercel Monitoring, or any HTTP monitor:

- **Check:** `GET https://ezana.world/api/readyz`, every 1 minute, from at
  least 2 regions.
- **Alert:** 2 consecutive failures (status not 200, or > 10 s).
- **Second check:** `GET https://ezana.world/api/healthz` every 5 minutes;
  if `healthz` fails too, the deployment itself is down, not just the
  database.
- **Operator detail:** call `/api/readyz` with
  `Authorization: Bearer $ADMIN_LOCK_SECRET` to see the per-service
  breakdown. Do not put that header in a third-party monitor.

## Failure capture

Failed cron runs, webhooks and the Plaid sync drain write a row to
`public.failed_jobs` and send a Sentry message tagged `failed_job:<job>`.
Create a Sentry alert rule on `failed_job` (any value) to page on them.
Open items: `select * from failed_jobs where resolved_at is null order by created_at desc;`
