# Architecture Audit — Ezana Finance

**Last updated:** May 13 2026
**Audit scope:** entire `cronanani` Next.js application + supporting tooling
**Stack reality (corrected from earlier docs):** Next.js 14 App Router + React 18 + Supabase (Postgres + Auth + RLS) + Vercel — **not** FastAPI + vanilla JS.

This document is an honest senior-engineer-level read of the code as it stands today. It is intentionally light on aspirational language and heavy on file paths and counts so you can verify every claim. The companion document `REFACTOR_ROADMAP.md` turns the gaps below into a phased, PR-sized execution plan.

---

## 1. High-level layer map

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                Browser                                     │
│  Next.js App-Router pages (RSC + Client) ── Tailwind ── Recharts ── SWR-ish│
│  Sentry browser SDK + session replay                                       │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │ fetch /api/*
┌──────────────────────────┴─────────────────────────────────────────────────┐
│  Next.js API Routes (186 total)                                            │
│  ── auth glue (5 different Supabase client patterns, see §3)               │
│  ── domain handlers (community, learning, market-data, fmp, ...)           │
│  ── cron handlers (Vercel /api/cron/*, 11 schedules)                       │
│  ── webhook handlers (Stripe, Alpaca trading; raw-body carve-outs)         │
│  Sentry server SDK + nodeProfilingIntegration + structured logs            │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────────────────┐
│  src/lib/                                                                  │
│  ── supabase facade (new):  src/lib/supabase/index.js                      │
│  ── supabase legacy (old):  supabase-server.js, supabase-service-role.js,  │
│                             supabase.js, auth-helpers.js, plaid.js admin   │
│  ── service clients:        src/lib/services/{fmp,finnhub,massive-news,    │
│                             stripe,resend}.js                              │
│  ── domain helpers (still flat at lib/ root): echo articles, learning      │
│    curriculum, mock data sets, community utils, ELO + rewards              │
│  ── env validator:          src/lib/env.js                                 │
│  ── in-process rate limit:  src/lib/rate-limit.js + api-guard.js           │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────────────────┐
│  External                                                                  │
│  Supabase (Postgres + Auth + Storage + Realtime channels in /messages)     │
│  Plaid │ Stripe │ FMP │ Finnhub │ Polygon │ Resend │ Anthropic             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventory (numbers that matter)

| Metric                                                     | Count |
| ---------------------------------------------------------- | ----: |
| Next.js API route files (`src/app/api/**/route.js`)        |   186 |
| Files under `src/lib/`                                     |   117 |
| Hook files under `src/hooks/`                              |    37 |
| Component files under `src/components/`                    |  ~301 |
| Components/pages > 1000 lines                              |    11 |
| Existing test files (`*.test.*` / `*.spec.*` / Playwright) |     0 |
| GitHub Actions workflows under `.github/workflows/`        |     0 |
| Dockerfile / docker-compose                                |     0 |
| Vercel cron entries in `vercel.json`                       |    11 |

---

## 3. Auth + data access — the fragmentation is real

`src/app/api/**/route.js` currently uses **five overlapping Supabase patterns**:

| Pattern                                                             | Source module                      | API routes using it |
| ------------------------------------------------------------------- | ---------------------------------- | ------------------: |
| `getUserClient` / `getAdminClient` / `requireUser` (new canonical)  | `src/lib/supabase/index.js`        |                  61 |
| `getAuthUser`                                                       | `src/lib/auth-helpers.js`          |                  29 |
| `createServerSupabase`                                              | `src/lib/supabase-server.js`       |                  43 |
| `createServerSupabaseClient`                                        | `src/lib/supabase-service-role.js` |                  21 |
| `supabaseAdmin` (service-role client exported from a Plaid lib (!)) | `src/lib/plaid.js`                 |                  67 |
| Raw `createClient` from `@supabase/supabase-js`                     | (inline)                           |                   8 |

**Symptoms:**

1. The same handler often imports two different client factories (e.g. `getAuthUser` for the user check, `supabaseAdmin` for the actual write). Every developer has to re-decide which combination to use.
2. The `requireUser` helper that the new canonical module exports is **referenced by zero API routes** today — it ships unused.
3. `supabaseAdmin` is exported from `src/lib/plaid.js` (a Plaid SDK wrapper). Any route that wants admin-scope writes ends up importing the Plaid module just to get a service-role client. There is no semantic relationship between Plaid and the admin Supabase client; this is an old shortcut that has metastasized.
4. The `createServerSupabase` family was deprecated in our previous migration session; 64 routes still call it.
5. Eight routes bypass all helpers and instantiate clients inline with `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` directly, including `stripe/webhook`, `trading/webhook`, `centaur/chat`, `auth/verify-code`, and `mock-portfolio`.

**Largest API route files (top 10 by lines):**

| Lines | File                                               |
| ----: | -------------------------------------------------- |
|   458 | `src/app/api/cron/monthly-elo/route.js`            |
|   421 | `src/app/api/market-data/upcoming-events/route.js` |
|   389 | `src/app/api/community/posts/route.js`             |
|   382 | `src/app/api/earnings/analysis/[symbol]/route.js`  |
|   369 | `src/app/api/community/copy-request/route.js`      |
|   328 | `src/app/api/fmp/politician-profile/route.js`      |
|   316 | `src/app/api/learning/progress/route.js`           |
|   315 | `src/app/api/centaur/chat/route.js`                |
|   306 | `src/app/api/market-data/sector-detail/route.js`   |
|   265 | `src/app/api/market-data/analyze-event/route.js`   |

These read more like service classes than route handlers. They mix transport (request parsing, response shaping) with domain logic (scoring, normalization, retries) and integration concerns (FMP timeouts, Anthropic retries) inside a single 300+ line file.

---

## 4. Security posture

### What's already good

- **HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control** are all set in `next.config.js` for `/(.*)`.
- **`validateEnv()`** runs at startup (`src/lib/env.js`) and hard-fails production if `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` are missing. Optional integration keys produce warnings.
- **Sentry** is fully wired (browser + server + edge configs, profiling, structured logs, source-map upload gated on `SENTRY_AUTH_TOKEN`, tunnel route at `/monitoring` to defeat ad-blockers).
- **Stripe + Alpaca webhooks** correctly bypass middleware so the raw body is preserved for signature verification (`src/middleware.js`).
- **Cron handlers** check `CRON_SECRET` (e.g. `cron/portfolio-snapshot`, `notifications/generate`).

### What's missing or weak

| Concern                      | Current state                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Distributed rate limiting    | `src/lib/rate-limit.js` is an in-process `Map`. On Vercel each lambda instance gets its own counter; an attacker hitting different regions/cold-start instances bypasses it.    |
| Coverage of the rate limiter | Only **4 of 186** routes invoke `withApiGuard` (`partner/profile`, `partner/badges`, `partner-application/submit`, `market-data/quotes`).                                       |
| CSRF                         | **Zero** mentions of `csrf` in `src/`. Same-site cookies + bearer auth reduce the textbook XSS-driven CSRF surface, but there is no explicit control.                           |
| RBAC                         | No central authorization module. Admin checks are spread across `admin/*` routes and re-implemented locally.                                                                    |
| Audit logging                | No append-only audit table or middleware. Some `admin/*` routes log to Supabase manually; behavior is per-route.                                                                |
| Service-role exposure        | `supabaseAdmin` is imported from `@/lib/plaid.js` into 67 routes. The blast radius if one of those routes is missing a user check is a service-role client running with no RLS. |
| Dependency vulnerabilities   | `npm audit` reports 13 vulnerabilities (5 moderate, 7 high, 1 critical) — including a published `next@14.2.15` security advisory.                                               |

---

## 5. Observability

| Capability          | State                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Error tracking      | **Done** (Sentry browser + server + edge, `onRequestError` forwarded).                                           |
| Performance tracing | **Done** (10% sampled in prod, 100% in dev).                                                                     |
| CPU profiling       | **Done** (`@sentry/profiling-node`, `profileLifecycle: 'trace'`).                                                |
| Structured logs     | **Partial** — `Sentry.logger.*` is enabled server-side; nothing structured on the client.                        |
| Metrics dashboards  | **None** beyond Vercel's built-in.                                                                               |
| Request tracing     | **None** — no central request-ID middleware, no `traceparent` propagation between client/server/Sentry.          |
| Health checks       | **Partial** — `src/app/api/health/*` routes exist but are not consolidated; no `/healthz` `/readyz` distinction. |
| Uptime monitoring   | **Unknown / external.**                                                                                          |

---

## 6. Frontend data layer

- 20 hooks under `src/hooks/` call `fetch` directly. Each one re-implements: bearer-token attach, JSON parsing, error shaping, optional retry, local cache or `useState` cache. There is no single contract.
- A wrapper (`src/lib/api-service.js`, `class ApiService`) does exist with a single 401-retry pattern — used by **exactly one** file (`useMarketData.js`).
- Top 10 hooks by line count:

| Lines | File                                   |
| ----: | -------------------------------------- |
|   450 | `src/hooks/useMockPortfolio.js`        |
|   375 | `src/hooks/useGlobalPowerMap.ts`       |
|   364 | `src/hooks/useFinnhub.js`              |
|   353 | `src/hooks/useMessages.js`             |
|   293 | `src/hooks/useWatchlists.js`           |
|   264 | `src/hooks/useAchievements.js`         |
|   252 | `src/hooks/use-toast.tsx`              |
|   238 | `src/hooks/useProfileActivity.js`      |
|   208 | `src/hooks/useActiveTask.js`           |
|   178 | `src/hooks/useWatchlistPriceAlerts.js` |

There is no query cache, no request deduplication, and no centralized retry/backoff. SWR / React Query are not installed.

---

## 7. Component / design-system state

| Area                                  | State                                                                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind tokens                       | `tailwind.config.js` has `theme.extend.fontFamily.sans` mapped, but `theme.extend.colors` is **half-mapped to CSS vars and half hard-coded hex**.                 |
| CSS design tokens                     | `src/app/theme-variables.css` defines backgrounds, surfaces, text, brand emerald + gold, danger, accents, radius, shadow, navbar, scrollbar, chart tokens.        |
| Token consumption                     | `grep` counts > 199 files still hard-code `#10b981`, `#0a0e13`, `#f0f6fc`, etc. The tokens exist; most CSS hasn't migrated to them.                               |
| Shared primitives                     | `src/components/ui/` has 57 files. Recently added: `TimeRangeSelector`, `StatCard`, `GradientAreaChart`, `SortableTable`. Not yet composed into a documented kit. |
| Storybook / visual regression         | **None.**                                                                                                                                                         |
| Monoliths (top 11 files > 1000 lines) | See list below.                                                                                                                                                   |

**Top monoliths**

| Lines | File                                               |
| ----: | -------------------------------------------------- |
|  1933 | `src/app/(dashboard)/market-analysis/page.js`      |
|  1836 | `src/app/(dashboard)/empire-ranking/page.js`       |
|  1467 | `src/components/home/HomeTerminalSummary.jsx`      |
|  1450 | `src/components/community/CommunityPageClient.jsx` |
|  1356 | `src/app/(dashboard)/trading/mock/page.js`         |
|  1275 | `src/app/(dashboard)/betting-markets/page.js`      |
|  1240 | `src/app/(dashboard)/kairos-signal/page.js`        |
|  1233 | `src/components/settings/SettingsPanels.jsx`       |
|  1194 | `src/app/(dashboard)/home-dashboard/page.js`       |
|  1087 | `src/app/(dashboard)/watchlist/page.js`            |
|  1020 | `src/app/(dashboard)/inside-the-capitol/page.js`   |

These are the highest-leverage targets for decomposition — every one of them combines route shell, data fetching, business logic, and >5 inline subcomponents.

---

## 8. Tooling, testing, CI

| Item                        | State                                                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ESLint                      | `eslint-config-next` only. No standalone `.eslintrc` or `eslint.config.js`. No custom rules.                      |
| Prettier                    | **Not installed.**                                                                                                |
| `.editorconfig`             | **Missing.**                                                                                                      |
| husky / lint-staged         | **Not installed.**                                                                                                |
| Tests (any kind)            | **None.**                                                                                                         |
| GitHub Actions              | **None.**                                                                                                         |
| Dockerfile / docker-compose | **None.**                                                                                                         |
| Type system                 | Mostly JavaScript (.js / .jsx). A small number of `.ts` / `.tsx` files exist but the project is not strict-typed. |

---

## 9. Realtime + cache

- **Supabase Realtime channels** are used in `useMessages.js` (`community:presence`, `conversation:*`, typing). No central manager — each consumer subscribes inline.
- **No Redis / Upstash / Pub-Sub layer.** No SSE, no native WebSockets, no shared cache between lambdas.
- **Background work** runs as Vercel cron (`vercel.json` has 11 schedules pointing into `/api/cron/*`). No queue (no Inngest, no Trigger.dev, no BullMQ).

---

## 10. Strengths to preserve

It's worth saying explicitly which parts already meet the bar so we don't burn cycles re-working them:

- **Security headers + dynamic root layout + theme-flash blocker** in `src/app/layout.js` — the SSR theme reconciliation is genuinely good engineering and prevents a class of bugs most apps still ship.
- **Sentry coverage is end-to-end** (browser, server, edge, profiling, source maps gated on auth token, ad-blocker tunnel). Nothing to redo here.
- **Env validation hard-fails missing prod secrets**, which is more than most apps do.
- **Webhook carve-outs in middleware** are correct (raw body preserved for signature verification).
- **The new `src/lib/supabase/index.js` facade is the right destination** — we just haven't migrated the rest of the routes onto it yet.
- **`src/components/ui/` primitives are real** (`TimeRangeSelector`, `StatCard`, `GradientAreaChart`, `SortableTable`). They need a doc page and adoption, not invention.
- **`country-state-city` cascading dropdowns + dark-lock contrast fixes + Plus Jakarta Sans typography lock** were shipped in recent sessions and are the model for how each future polish landing should look.

---

## 11. Target architecture (where the roadmap is taking us)

The goal is **not** to introduce new frameworks or rewrite from scratch. The repo already has the pieces; they need consolidation, not replacement. The target end state, framed in the same diagram as §1:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Browser                                                                    │
│  ── Pages still in App-Router (RSC + Client)                               │
│  ── Single shared <ApiProvider> with TanStack Query (or SWR) for caching  │
│  ── Single fetch wrapper with traceparent header + Sentry breadcrumbs     │
│  ── Design system: tokens consumed via Tailwind theme.extend (no hex)     │
│  ── Shared primitives: ui/ kit documented in /docs/design-system.md       │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────────────────┐
│ API routes                                                                 │
│  ── Single auth pattern: requireUser(req) → { user, client }              │
│  ── Single admin pattern: getAdminClient() — only inside guarded handlers │
│  ── api-guard wraps every authenticated mutation (rate limit + Sentry tag)│
│  ── Distributed rate limiter (Upstash Ratelimit)                          │
│  ── Audit-log middleware on every admin/* route                           │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────────────────┐
│ src/lib                                                                    │
│  /supabase   ── single facade (admin + user + edge)                       │
│  /services   ── third-party clients (fmp, finnhub, plaid, stripe, ...)    │
│  /domain     ── per-feature data + pure helpers (echo, learning, ...)     │
│  /server     ── HOFs (withApiGuard, withAdminAudit, withRateLimit)        │
│  /client     ── browser-side helpers (api client, query keys, formatters) │
│  env.js      ── zod-typed config schema                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

This is the architecture each phase in `REFACTOR_ROADMAP.md` chips at, in the order that delivers the biggest risk reduction per PR.

---

## 12. How this document is meant to be used

- Read it once to calibrate. Most "we should do X" requests later will reference a specific gap above.
- The companion `REFACTOR_ROADMAP.md` translates these gaps into PR-sized phases. Pick a phase to execute; the doc explicitly calls out the risk and rollback cost of each.
- This file should be re-audited every ~6 months. The numbers in §2 and §3 are the easiest "did the migration actually move the needle?" checkpoints.
