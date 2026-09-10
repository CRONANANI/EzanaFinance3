# CTO Onboarding — Ezana Finance

**Read this first.** It is the 30-minute orientation for a new CTO or senior
engineer: what the system is, where everything lives, and where the bodies are
buried. Every claim here is verifiable against the repo; when this document and
the code disagree, the code wins — then fix this document.

_Last verified against the codebase: September 10, 2026._

---

## 1. What Ezana is

A financial intelligence platform for retail investors and university
investment orgs: portfolio tracking across real brokerages (Plaid, SnapTrade,
Alpaca), market and congressional-trading intelligence ("Inside the Capitol"),
company research, an editorial surface (Ezana Echo), community, learning
paths, competitions/pitches for university orgs, and Stripe-billed
subscriptions.

## 2. System architecture

One **modular monolith** on Next.js 14 (App Router) deployed to Vercel from
`main` — every push to `main` is a production deploy.

```
Browser (React 18 client components, Tailwind, Recharts)
   ↓ fetch /api/*
Next.js API route handlers (480 files under src/app/api/**)
   ↓
src/lib/** domain + infrastructure modules
   ├─ @/lib/supabase        ← THE auth/data-access surface (see §6)
   ├─ @/lib/api-guard       ← rate limit + safe errors wrapper
   ├─ @/lib/services/*      ← external provider clients (fmp, finnhub, stripe, resend, massive-news)
   └─ domain dirs           ← echo/, rag/, portfolio/, congress/, competitions/, …
   ↓
Supabase (Postgres + Auth + RLS + Storage + Realtime)
External: Plaid · SnapTrade · Alpaca · Stripe · FMP · Finnhub · Alpha Vantage ·
          Resend · Anthropic · Polymarket · Mux · USASpending
Jobs: 35 Vercel crons (vercel.json) → /api/cron/** (Bearer CRON_SECRET)
Observability: Sentry (client/server/edge) + structured logger (src/lib/logger.js)
```

## 3. Repository structure

```
src/app/            140 pages (App Router) + api/ (route handlers)
src/components/     ~46 domain-grouped component dirs (capitol, echo, org, ds, ui, …)
src/contexts/       React providers (Portfolio, Org, Settings, Toast, …)
src/hooks/          shared client hooks
src/lib/            server/domain logic — the heart of the app
src/config/         static registries (pricing, card registry, checklists)
src/middleware.js   CSP nonce, CORS allowlist, auth redirects, MFA gate
app-legacy/         static HTML pages copied to public/ at build (legacy; candidate for deletion)
supabase/migrations SQL migrations (applied via Supabase MCP/CLI)
scripts/            build helpers + node:test unit suites (check-*.mjs)
docs/               this file, ARCHITECTURE, REFACTOR_ROADMAP, ENGINEERING, decisions/, product-specs/
security-reports/   dated security sweep reports
```

"Where does X live?" — portfolio logic: `src/lib/portfolio/` + `/api/portfolio*`;
auth: §6; financial metric math: `src/lib/profile-metrics.js` (tested);
org/university: `src/lib/org-*` + `/api/org/**`; Echo: `src/lib/echo/` +
`src/lib/ezana-echo-article-*.js`; entitlements/billing: `/api/stripe/**`,
`src/config/pricing.js`.

## 4. Core domains

| Domain               | API                                                                                          | Logic                                                                        | Notes                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Portfolio/brokerage  | `/api/portfolio*`, `/api/plaid/**`, `/api/snaptrade/**`, `/api/alpaca/**`, `/api/trading/**` | `src/lib/portfolio/`, `plaid-sync.js`, `snaptrade.js`                        | Accounts always derived from authenticated `user.id`, never from the client                  |
| Capitol (gov intel)  | `/api/fmp/**`, `/api/congress/**`, `/api/gov-contracts/**`                                   | `src/lib/congress/`, `house-disclosures/`, `lobbying/`, `fec/`               | Provider data normalized before use                                                          |
| Echo (editorial)     | `/api/echo/**`                                                                               | `src/lib/echo/`, article modules                                             | Live reader served from `echo_articles` table, seeded from `curated-seed.js` (see CLAUDE.md) |
| Org / university     | `/api/org/**`, `/api/org-trading/**`                                                         | `org-position-book.js`, `org-trading-server.js`, `org-permissions-config.js` | Position book: `getOrgPositionBook` is the single source of truth                            |
| Community            | `/api/community/**`                                                                          | `src/lib/community/`                                                         | UGC — treat as hostile input                                                                 |
| Learning             | `/api/learning/**`                                                                           | `course-content*.js`, `learning-content.js`                                  |                                                                                              |
| Competitions/pitches | `/api/org/pitch-*`, `/api/competitions/**`                                                   | `src/lib/competitions/`, `src/lib/pitch/`                                    | Judge access via hashed, expiring magic-link tokens                                          |
| Subscriptions        | `/api/stripe/**`                                                                             | `src/config/pricing.js`                                                      | Webhook-driven; entitlements enforced server-side                                            |

## 5. Data flow

Client components call `/api/*` routes (fetch with cookie session). Routes
authenticate (§6), then either query with the RLS-scoped user client or the
service-role admin client **plus an explicit ownership filter**. External
provider data enters only through server routes / `src/lib/services/*` and is
cached (`src/lib/api-cache.js`, two-tier memory+Upstash `src/lib/cache.js`).

## 6. Authentication & authorization

- **Supabase Auth** with cookie sessions (`@supabase/ssr`); optional TOTP MFA
  (`/auth/mfa*`, gated in `src/middleware.js`).
- **The only sanctioned server data-access surface is `@/lib/supabase`**
  (ESLint-enforced): `requireUser` (throw-401), `getAuthUser`/`getAuthContext`
  (null-returning), `getUserClient` (RLS-scoped), `getAdminClient`
  (service-role singleton — bypasses RLS, so every use MUST carry its own
  ownership/org filter), `isServerSupabaseConfigured`.
- `withApiGuard` (`src/lib/api-guard.js`) wraps handlers: durable
  Supabase-backed rate limiting, auth requirement, safe error responses.
- **Admin** = `ADMIN_EMAILS` allowlist (`src/lib/admin-helpers.js`) or
  `app_metadata.role === 'admin'` (service-role writable only). **Never trust
  `user_metadata` for authorization** — users can write it themselves (this
  was a real vulnerability, fixed Sep 2026).
- Org roles resolve server-side via `getCurrentOrgMember`/`assertOrgRole`
  (`src/lib/org-trading-server.js`); every org query re-scopes by
  `member.org_id`.
- Crons: `Bearer CRON_SECRET`, fail closed. Webhooks: Stripe
  `constructEvent`, Alpaca HMAC + `timingSafeEqual`, Plaid JWT + body hash,
  Mux HMAC + freshness — all fail closed when unconfigured.

## 7. Financial calculations

Centralized, deterministic, UI-independent, unit-tested:
`src/lib/profile-metrics.js` (six profile metrics — P&L aggregation, monthly
returns, streaks, diversification; tested in
`scripts/check-profile-metrics.mjs`), `src/lib/whale-score.js` (tested),
`src/lib/org-fund-analytics.js` (org fund performance), `src/lib/council-elo`

- ELO suites (tested). Numbers arrive as Postgres numerics via PostgREST and
  are handled as JS numbers for display-grade metrics; ledger-grade money
  (Stripe amounts) stays in integer cents.

## 8. Database

Supabase Postgres, RLS-first. Schema changes go through
`supabase/migrations/*.sql` (also applied to prod via the Supabase MCP — keep
both in sync). Conventions: `snake_case`, uuid PKs, `created_at`/`updated_at`
triggers. RLS helpers (`auth_org_ids()` etc.) are SECURITY DEFINER functions
used inside policies — they must stay executable by `authenticated`. Tables
with RLS enabled and no policies are deliberately service-role-only.
Run `Supabase get_advisors` after DDL changes; the Sep 2026 hardening
migration (`20260910130000`) is the reference for function grants.

## 9. Frontend

App Router pages (server components for shells/SEO, client components for
interactivity). Design system: tokens in `src/app/theme-variables.css`,
primitives in `src/components/ds` and `src/components/ui` — hand-rolled hex
values are lint-blocked (`npm run lint:ds`). State: React contexts + zustand;
server data via per-domain hooks (`src/hooks/`). CSP uses a per-request nonce
(`src/middleware.js`) — inline scripts must read the `x-nonce` header pattern
used in `layout.js`.

## 10. Testing

node:test suites in `scripts/check-*.mjs` — no framework, run directly
(`npm test` runs all 8: whale, house disclosures, competitions, judging,
recruiting consent, council ELO, profile metrics, security guards). Guard
scripts (`lint:ds`, `lint:a11y`, `lint:css`) enforce design/a11y invariants.
Gap: no E2E suite yet (see §15).

## 11. CI/CD & deployment

GitHub Actions (`ci.yml`): format check, ESLint (legacy-import bans are
errors), CSS guard, unit suites, and a stub-env production build.
`security-audit.yml`: npm audit with a justified critical-advisory allowlist
(see the workflow comments — do not add entries without justification).
Deploy: Vercel auto-deploys `main`; verify the pushed SHA appears in the
deployment's "Cloning…" log. Husky pre-push blocks pushing anywhere except
`CRONANANI/EzanaFinance3`.

## 12. Observability

Sentry on client/server/edge (`sentry.*.config.js`, `instrumentation.js`)
with profiling and a `/monitoring` tunnel; structured logger
(`src/lib/logger.js`); security events to `security_audit_logs`
(`src/lib/security-audit.js`). Vercel runtime logs + Supabase logs cover the
rest.

## 13. Security model

See `security-reports/` (dated sweeps) and `docs/security` practices embodied
in: middleware CSP/CORS, `withApiGuard`, the §6 rules, sanitize helpers
(`src/lib/sanitize.js`: `safeInternalPath`, `httpUrlOrNull`, `sanitizeHtml`
wrapper over DOMPurify), CSV formula-injection neutralization in every
exporter, SSRF guard (`src/lib/url-guard.js` — re-validate every redirect
hop). Provider keys are server-only; anything `NEXT_PUBLIC_` is public.

## 14. Known technical debt (honest list)

1. **Next.js 14 → 16 upgrade** — two npm-audit criticals are accepted risks
   only because we deploy on Vercel/Linux; the upgrade clears them properly.
2. **`app-legacy/`** — static legacy pages copied into `public/` each build;
   uses `innerHTML` on mock data; should be deleted or auth-gated.
3. **`src/lib/orgMockData.js`** (1,935 lines) — dead except `getFundCalendar`
   (Team Hub calendar); delete once demo seeds are no longer needed for
   pitches.
4. **Echo figure check** (`npm run check:echo-figures`) contradicts the
   documented 3-figure standard and fails — needs an editorial decision.
5. **No E2E tests** — critical journeys (signup→dashboard→portfolio,
   capitol→research, subscribe→entitlement) are manually verified only.
6. **Login lockout** is soft (alerting only) — hard lockout needs sign-in
   proxied server-side so failure counts are trustworthy.
7. Very large content modules at `src/lib/` root (course content, echo
   articles) — harmless but noisy; candidates for `src/lib/content/`.
8. `format:check` covers only adopted paths; full-repo Prettier enforcement
   is via husky.

## 15. Scaling path

See `docs/SCALING.md` (two-tier cache → Upstash, materialized-view read
models, tsvector search). The monolith extracts along existing seams: cron
ingestion jobs and provider clients are already isolated; the org/university
surface is tenant-scoped by `org_id` throughout (multi-tenancy assumption is
"user belongs to at most one active org" — search `getCurrentOrgMember` before
changing that).

## 16. Architectural decisions

`docs/decisions/` holds ADRs: modular monolith, canonical Supabase facade,
provider clients, node:test approach, security trust model. Read them before
proposing structural change.

## 17. Modifying a feature safely

1. Find the domain (§3/§4). 2. Read its API route + lib module. 3. Check who
   else imports the module (`grep -r "from '@/lib/<mod>'" src`). 4. Make the
   change; keep `getAdminClient()` queries ownership-filtered. 5. `npm run lint
&& npm test && npm run build`. 6. Small commit, push to `main`, watch CI +
   the Vercel deploy.
