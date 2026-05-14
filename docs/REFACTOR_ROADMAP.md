# Refactor Roadmap — Ezana Finance

**Companion to:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
**Last updated:** May 13 2026

This document turns the gaps surfaced in the architecture audit into a sequenced execution plan. Every phase is sized to fit in a single reviewable PR (or a short series of obviously-related PRs). For each phase you get:

- **Goal** — what "done" looks like in one sentence.
- **Why now** — what the audit said it costs us today.
- **Concrete deliverables** — file-level scope.
- **Risk** — what could break and how we contain it.
- **Estimate** — focused engineering hours, not calendar time.
- **Sequencing notes** — what it depends on and what it unblocks.

Phases are ordered by **(risk reduction × leverage) ÷ blast-radius**. Phases 1–4 are pure platform / infrastructure and barely touch UX. Phases 5–8 reach into product surfaces, where the user's daily experience starts to visibly improve. Phases 9–10 are the deep refactors that should only run after the platform foundations are solid.

---

## Phase 0 — Done already (delivered in recent sessions)

These are listed for honest accounting; do **not** re-do them.

| Item                                                                       | Where it lives                                                                       |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Repo cleanup: dead Python backends, junk root files, orphan component dirs | git history, `docs/` consolidation                                                   |
| Supabase facade module                                                     | `src/lib/supabase/index.js`                                                          |
| Service-client extraction                                                  | `src/lib/services/{fmp,finnhub,massive-news,resend,stripe}.js`                       |
| Shared UI primitives                                                       | `src/components/ui/{TimeRangeSelector,StatCard,GradientAreaChart,SortableTable}.jsx` |
| Design tokens declared                                                     | `src/app/theme-variables.css`                                                        |
| Sentry browser + server + edge with profiling + logs                       | `sentry.{client,server,edge}.config.js`, `instrumentation.js`, `next.config.js`      |
| Auth contrast fixes (signin-dark-lock + light-mode overrides)              | `src/app/globals.css`, `auth/partner-login/partner-login.css`                        |
| Country/city cascading dropdowns                                           | `src/app/api/locations/{countries,cities}/route.js`, partner application form        |
| Plus Jakarta Sans typography lock on landing + auth                        | `src/app/globals.css`                                                                |
| Partner-application step 1 button breathing room                           | `src/app/auth/partner/apply/partner-apply.css`                                       |

---

## Phase 1 — Engineering hygiene (pre-commit + format + lint + CI)

**Goal:** every commit lands with consistent formatting, lint pass, and a green `next build` on PR.

**Why now:** the codebase has 0 tests, 0 CI, 0 Prettier, 0 `.editorconfig`, 0 husky. None of the bigger refactors are safe without a feedback loop. This is the cheapest, highest-leverage starting point.

**Concrete deliverables:**

- `prettier@^3` + `eslint-config-prettier` as devDeps. `.prettierrc.json` (single quotes, 100-col, trailing commas, no semicolons inside JSX expressions).
- `.editorconfig` (LF, UTF-8, 2-space, final newline).
- `eslint.config.js` (flat config) extending `next/core-web-vitals`, `next/typescript`, `prettier`, with one custom rule: `no-restricted-imports` blocking `@/lib/supabase-server`, `@/lib/supabase-service-role`, `@/lib/auth-helpers`, and `supabaseAdmin from @/lib/plaid` to stop the legacy patterns from spreading further.
- `husky` + `lint-staged`: on commit, run Prettier + ESLint --fix on staged files only.
- `.github/workflows/ci.yml`: matrix on Node 20, runs `npm ci`, `npm run lint`, `npm run format:check`, `npm run build`. Required PR check.
- `npm run format`, `npm run format:check`, `npm run typecheck` scripts in `package.json`.
- `docs/CONTRIBUTING.md`: 30-line quickstart on commit/lint/build.

**Risk:** **Low.** Tooling-only. The lint rule that bans legacy imports might surface existing offenders — start with `warn` then upgrade to `error` once existing offenders are migrated in Phase 2.

**Estimate:** 2–3 hours.

**Sequencing:** must land before Phase 2.

---

## Phase 2 — Auth + data-access consolidation

**Goal:** every API route uses exactly one user-client pattern (`requireUser`) and exactly one admin pattern (`getAdminClient`). Legacy facades become thin re-exports that emit deprecation warnings, then disappear.

**Why now:** five overlapping Supabase patterns (61 / 29 / 43 / 21 / 67 / 8 — see audit §3) is the single biggest source of inconsistency in the repo, and the only path to actually using `withApiGuard` everywhere (Phase 3) cleanly.

**Concrete deliverables:**

- `src/lib/supabase/index.js`: ensure `requireUser`, `getCurrentUser`, `getAdminClient`, `getUserClient` are the entire surface. Document each export with a JSDoc block.
- `src/lib/auth-helpers.js`, `src/lib/supabase-server.js`, `src/lib/supabase-service-role.js`, `src/lib/supabase.js`: convert to thin re-exports of the new surface, prefixed with a `@deprecated` JSDoc.
- Remove `supabaseAdmin` export from `src/lib/plaid.js`. Anywhere that imported it now imports `getAdminClient` from `@/lib/supabase`.
- Migrate routes in **batches by directory** (one PR per batch):
  1. Low-risk: `api/elo/`, `api/learning/`, `api/login-history/`, `api/account/`, `api/data-request/`, `api/notifications/` (~25 routes).
  2. Medium: `api/community/`, `api/echo/`, `api/messages/`, `api/leaderboard/` (~30 routes).
  3. High-risk financial: `api/portfolio/`, `api/trading/`, `api/mock-portfolio/`, `api/alpaca/`, `api/plaid/`, `api/stripe/`, `api/partner-application/`, `api/cron/` (~50 routes — done last so we can compare deltas in Sentry).
  4. Tail: everything else.
- Eight raw `createClient` callers in route handlers (`debug-portfolio`, `centaur/*`, `stripe/webhook`, `trading/webhook`, `auth/verify-code`, `mock-portfolio`, `market-data/analyze-event`, `debrief-items`) get individual review and rewrite — webhooks especially need a careful diff.

**Risk:** **Medium.** Auth changes are inherently RLS-sensitive. Mitigation:

- One PR per batch, with the lint rule in Phase 1 blocking new offenders.
- Sentry tag every migrated route with `route: '<path>'` so we can compare 4xx/5xx rates pre/post per batch.
- Keep the legacy modules in place for one full week per batch before deleting.

**Estimate:** 4 batches × 3–4 h = 12–16 h, spread over a fortnight.

**Sequencing:** Phase 1 must be in. Unblocks Phase 3.

---

## Phase 3 — Distributed rate limiting + audit logging

**Goal:** every authenticated mutation route is wrapped with `withApiGuard` (rate limit + Sentry tag), and every `admin/*` mutation writes to an append-only audit table.

**Why now:** today only **4 of 186** routes are rate-limited, and the limiter is in-process so it doesn't survive cold starts or scale across regions. There is no audit trail on `admin/*` routes that lock accounts, push releases, modify org membership, etc.

**Concrete deliverables:**

- Add `@upstash/ratelimit` + `@upstash/redis` deps. Provision Upstash from Vercel marketplace; add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to env.
- Rewrite `src/lib/rate-limit.js` to use Upstash sliding-window, with a sensible default (60 req/min/user, 10 req/min/IP for unauthenticated paths).
- Extend `withApiGuard` (`src/lib/api-guard.js`) to: (a) accept an `audit` flag that writes to a new `audit_log` Supabase table, (b) attach Sentry tags `route`, `userId`, `orgId`, (c) attach a generated `request_id` to the response and Sentry scope.
- Run a Supabase migration creating `audit_log (id, user_id, org_id, action, target, payload jsonb, ip, ua, created_at)` with RLS service-role-only.
- Wrap every `admin/*` route with `withApiGuard({ rateLimit: 'admin', audit: true })`.
- Wrap every authenticated mutation (`POST/PUT/PATCH/DELETE` outside webhooks/cron) with `withApiGuard({ rateLimit: 'user' })`.
- Document intentional public mutations (`waitlist`, `support/contact`) and apply IP-only rate limiting.

**Risk:** **Medium.** The rate limit can lock real users out of legitimate flows if numbers are too tight. Mitigation: shadow-mode for one week (limiter computes verdict but doesn't block, just emits Sentry breadcrumb), then enforce.

**Estimate:** 8–10 h plus one-week shadow window.

**Sequencing:** Phase 2 must be in (so we have a single auth surface to wrap). Unblocks Phase 7's request-tracing work.

---

## Phase 4 — Strict env config + secrets boundary

**Goal:** `src/lib/env.js` becomes a Zod schema; everywhere else imports `env` from a single typed object instead of reading `process.env.X`. Boot fails fast with a precise error if any required key is malformed.

**Why now:** today we hard-fail on a few keys but warn on the rest, and 50+ files do `process.env.X || fallback` independently. A typo or missing key surfaces as a runtime null deep in a handler instead of at boot.

**Concrete deliverables:**

- Add `zod`. Define `clientSchema` (only `NEXT_PUBLIC_*`) and `serverSchema` in `src/lib/env.js`. Export a frozen `env` object split into `clientEnv` / `serverEnv`.
- Replace `process.env.X` usages across `src/` with `env.X` (or `clientEnv.X` for browser code) — runs as a single `eslint --fix` codemod with a custom rule.
- Document required vs optional env in `.env.example` (already partially done; sync with the new schema).
- Wire env validation into the `next build` step so deploys fail before deploy if the Vercel project is missing a key.

**Risk:** **Low.** Zod schemas can be made strict-then-loosened without code changes. Risk only manifests if a required key is missing — which is the whole point.

**Estimate:** 4–5 h.

**Sequencing:** independent. Can run in parallel with Phase 2/3.

---

## Phase 5 — Frontend data layer (TanStack Query)

**Goal:** every `fetch('/api/...')` call from the browser goes through a single `apiClient` wrapper, and cached / deduplicated data fetching uses TanStack Query. Hooks become thin `useQuery` / `useMutation` wrappers around typed query keys.

**Why now:** 20 hooks call `fetch` directly, each with its own bearer-token attach, error shaping, and ad-hoc cache. Net effect: stale data on tab refocus, duplicate requests, no offline fallback, lots of duplicated try/catch.

**Concrete deliverables:**

- `src/lib/client/api-client.ts`: single `apiClient.get/post/...` with bearer auth, JSON parsing, structured `ApiError`, AbortController support, automatic Sentry breadcrumb, optional `traceparent` header.
- `src/lib/client/query-keys.ts`: hierarchical query keys (`['portfolio', 'summary', userId]`, `['watchlist', listId, 'items']`, ...) so cache invalidation is a single statement.
- `@tanstack/react-query` provider in root layout.
- Migrate hooks in batches (one feature per PR):
  1. Portfolio (`usePortfolio*`, `usePlaidPortfolioSummary`, `useAlpacaPortfolioSummary`, `usePortfolioValueSeries`).
  2. Watchlist (`useWatchlists`, `useWatchlistPriceAlerts`).
  3. Market data (`useFinnhub`, `useUpcomingEvents`, `useSectorPerformance`, `useEmpireScores`, `useMarketData`).
  4. Community (`useMessages`, `useEchoEngagement`, `useProfileActivity`, `useAchievements`).
  5. The rest.
- Delete `src/lib/api-service.js` once `useMarketData` is migrated.

**Risk:** **Medium.** Cache semantics change (data goes stale less often, but sometimes goes stale differently). Mitigation: each batch's PR includes a manual smoke-test list and the new query keys are reviewed by feature owners.

**Estimate:** 5 batches × 3–4 h = 15–20 h.

**Sequencing:** independent of Phase 2/3, but easier after Phase 1's lint rules.

---

## Phase 6 — Design system adoption (token consumption + Tailwind colors-from-vars)

**Goal:** zero hardcoded brand hex codes outside `theme-variables.css` and `tailwind.config.js`. Tailwind color palette is fully variable-driven so dark/light/partner themes flip cleanly.

**Why now:** 199+ files still hard-code `#10b981` / `#0a0e13` / `#f0f6fc`. Every new theme variant doubles the work to add. The tokens _exist_; they just aren't consumed.

**Concrete deliverables:**

- `tailwind.config.js`: replace hex colors in `theme.extend.colors` with `var(--token-name)` references. Add `emerald`, `gold`, `danger`, `surface`, `border`, `text-*` color groups.
- Codemod: replace hardcoded hex with Tailwind class or `var(--...)` reference, **only inside CSS files** (not JSX inline styles — too risky in one pass). Process by directory, ~7 dashboard CSS files at a time.
- New `docs/design-system.md`: snapshots of every primitive in `src/components/ui/` with prop signature and the design-token names it consumes.
- Add an ESLint rule via `eslint-plugin-tailwindcss` to flag hardcoded hex in `className`.

**Risk:** **Medium.** A token misnaming or stray space-vs-token confusion can produce visible regressions. Mitigation: per-directory PRs + screenshot diff of each affected page.

**Estimate:** 8–10 h spread across batches.

**Sequencing:** independent. Can run in parallel with Phase 5.

---

## Phase 7 — Realtime + cache infrastructure

**Goal:** a single `RealtimeProvider` manages all Supabase channels, and a Redis (Upstash) layer caches expensive integration calls (FMP politician profiles, FMP earnings, sector heatmap) with explicit TTLs.

**Why now:** today FMP / Polygon / Anthropic calls are made fresh per request; cron jobs warm some routes, but `/api/market-data/sector-detail` (306 lines, hot path) recomputes from scratch on every page view. Supabase channels are subscribed inline in `useMessages` — if we add another consumer (live-portfolio price ticks, live ELO), we'll re-create the same plumbing four times.

**Concrete deliverables:**

- `src/lib/server/cache.ts`: thin Upstash KV wrapper with `get`, `set`, `wrap(key, ttl, fn)`. Use the same Upstash Redis instance provisioned in Phase 3.
- Wrap the 5 highest-traffic FMP/Polygon endpoints with `cache.wrap` (TTL 60s for quotes, 5 min for politician profiles, 1 hr for sector detail).
- `src/components/realtime/RealtimeProvider.tsx`: central Supabase channel manager with `useChannel(name, handlers)` hook.
- Migrate `useMessages` to consume `useChannel`.
- Add `useChannel('user-portfolio:'+userId, ...)` for live-price updates (later — separate ticket).

**Risk:** **Medium.** Caching wrong data is worse than not caching. Mitigation: every `cache.wrap` includes a deterministic cache key (hash of params) and a release-by version bumper so we can invalidate everything by deploying.

**Estimate:** 6–8 h for the cache layer, 4–5 h for the realtime provider migration.

**Sequencing:** Phase 3 (Upstash provisioned).

---

## Phase 8 — Page decomposition (the monoliths)

**Goal:** every page file under 600 lines. Every page > 1000 lines today is split into a route shell + 4–8 feature components living next to it.

**Why now:** the audit's top-11 monoliths (1933 → 1020 lines) all combine route logic + data fetching + business logic + inline subcomponents. Each one is a regression-magnet, slow to read, slow to review, and impossible to unit-test.

**Concrete deliverables (one PR per page):**

| Target page                         | Plan                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `market-analysis/page.js` (1933)    | Extract `MarketSessions`, `RegionalNewsPanel`, `OptionsChainPanel`, `EconomicCalendar` into `src/components/market-analysis/`.          |
| `empire-ranking/page.js` (1836)     | Extract `EmpireHero`, `EmpireFiltersBar`, `EmpireRankingsTable`, `EmpireSpotlightDrawer`.                                               |
| `HomeTerminalSummary.jsx` (1467)    | Extract `PortfolioSnapshotCard`, `TopHoldingsCard`, `TopMoversCard`, `CongressionalTrackerCard`, `StreakCard`.                          |
| `CommunityPageClient.jsx` (1450)    | Extract `CommunityFeed`, `FollowSuggestions`, `CommunityFiltersBar`, `MessagesQuickLinks`.                                              |
| `trading/mock/page.js` (1356)       | Extract `PositionsTable`, `TradePanel`, `PortfolioStats`, `OrderHistory`.                                                               |
| `betting-markets/page.js` (1275)    | Extract `MarketCategoriesNav`, `MarketCardGrid`, `MarketDetailDrawer`.                                                                  |
| `kairos-signal/page.js` (1240)      | Extract `SignalsList`, `SignalDetailPanel`, `SignalConfigForm`.                                                                         |
| `SettingsPanels.jsx` (1233)         | Already sub-tabbed. Extract one panel per file: `AccountPanel`, `BillingPanel`, `NotificationsPanel`, `IntegrationsPanel`, `DataPanel`. |
| `home-dashboard/page.js` (1194)     | Extract `DashboardHero`, `DashboardCardsGrid`, `DashboardSidekickPanel`.                                                                |
| `watchlist/page.js` (1087)          | Extract `WatchlistHeader`, `WatchlistTabs`, `WatchlistDetailPanel`, `WatchlistChartPanel`.                                              |
| `inside-the-capitol/page.js` (1020) | Extract `CapitolHero`, `CapitolTradesTable`, `CapitolPoliticianDrawer`.                                                                 |

**Risk:** **Medium.** Inline subcomponents close over many state variables; extraction means lifting state to the parent or threading props. Mitigation: one page per PR + a manual screenshot diff list (each card visually unchanged before/after).

**Estimate:** 11 PRs × 2–3 h = 22–33 h.

**Sequencing:** ideally after Phase 5 (TanStack Query) so extracted components don't need to thread fetch logic through props.

---

## Phase 9 — Tests + visual regression

**Goal:** the core financial paths (portfolio summary, watchlist add/remove, mock trading buy/sell, partner application submit, login flows) have integration tests. The shared UI primitives (`src/components/ui/`) have snapshot tests.

**Why now:** zero tests today. Every refactor in Phases 2–8 is technically a leap of faith. Adding tests _as we go_ is how we make those leaps cheaper.

**Concrete deliverables:**

- Vitest + Testing Library for unit / hook tests.
- Playwright for end-to-end on the 5 critical paths above.
- One Playwright `@smoke` tag that runs on every PR (15 min budget). The full E2E suite runs nightly via GitHub Actions.
- `npm run test`, `npm run test:e2e`, `npm run test:smoke` scripts.
- A handful of snapshot tests for `TimeRangeSelector`, `StatCard`, `GradientAreaChart`, `SortableTable`.

**Risk:** **Low.** Pure additive.

**Estimate:** 12–15 h initial setup, then per-feature investment as work progresses.

**Sequencing:** Phase 1 (CI) must be in.

---

## Phase 10 — Docker + local dev parity

**Goal:** `docker compose up` starts the full stack (Next.js + Supabase local + Redis local + Mailhog for Resend stubs) so a new contributor goes from `git clone` to a logged-in `localhost:3000` in under 10 minutes.

**Why now:** today onboarding requires manual Vercel + Supabase + Stripe + FMP + Plaid + Anthropic key procurement. We can dramatically lower the floor.

**Concrete deliverables:**

- `Dockerfile` (multi-stage, Node 20-alpine, `corepack enable`, `npm ci`, `npm run build`, distroless runner).
- `compose.yaml`: services `web`, `supabase` (using `supabase/postgres` + `supabase/auth` + `supabase/realtime` images), `redis` (Upstash-compatible), `mailhog`.
- `scripts/dev-seed.ts`: idempotent Supabase seed (creates one demo user, one watchlist, one mock-portfolio).
- `docs/LOCAL_DEV.md`: 1-page quickstart.

**Risk:** **Low.** Docker config is isolated from production runtime (Vercel still deploys via its own pipeline).

**Estimate:** 6–8 h.

**Sequencing:** independent. Can run anywhere after Phase 1.

---

## Recommended execution order

For an external review, this is the sequence I'd recommend if you want the maximum risk reduction in the smallest cumulative footprint:

1. **Phase 1** — Engineering hygiene (2–3 h). Pre-requisite for everything.
2. **Phase 4** — Strict env config (4–5 h). Independent, low risk, prevents misdeploys.
3. **Phase 2 batch 1** — Migrate Elo / Learning / Login-history / Account / Notifications routes onto `requireUser` (3–4 h).
4. **Phase 3** — Upstash rate limiter + audit logging (8–10 h, plus 1 week shadow window).
5. **Phase 2 batch 2** — Community / Echo / Messages / Leaderboard.
6. **Phase 6 batch 1** — Tokenize global CSS (`globals.css`, `terminal-theme.css`, `mobile-responsive.css`) (3 h).
7. **Phase 5 batch 1** — TanStack Query for portfolio hooks (3–4 h).
8. **Phase 9** — Vitest + Playwright bootstrap (5 h initial; tests added per feature thereafter).
9. **Phase 2 batch 3** — Portfolio / Trading / Stripe / Plaid / Cron migrations.
10. **Phase 8** — Page decomposition, one monolith per PR.
11. **Phase 5 batch 2–5**, **Phase 6 batch 2–N**, **Phase 7**, **Phase 10** — interleave as bandwidth allows.

Total focused engineering time across all phases is roughly **80–110 hours** spread over ~6 weeks of part-time work, with the platform demonstrably hardening at every step.

---

## What NOT to do

- Do not attempt a full rewrite or a `v2` codebase. The current architecture has good bones (App Router, Sentry, Supabase, design tokens, env validation, security headers, webhook carve-outs); it just needs consolidation.
- Do not introduce a new framework (no NestJS, no tRPC, no GraphQL). Each phase above lands on top of what's already there.
- Do not migrate all Supabase patterns in one PR. The blast radius of a missed RLS check at scale is too high.
- Do not start Phase 8 (page decomposition) before Phase 5 (TanStack Query) — extracting components while data fetching is still inline produces worse code than doing nothing.
- Do not add tests retroactively to legacy code that's about to be decomposed. Add tests _as_ you decompose, not before.
