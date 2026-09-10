# Ezana Finance

Financial intelligence platform: portfolio tracking across brokerages, market and
congressional-trading intelligence, company research, community, competitions, and
the Ezana Echo editorial surface.

**Production:** deployed on Vercel from `main` — every push to `main` ships.

## Stack

- **Next.js 14 (App Router)** + React 18 — `src/app` pages and 480 API route handlers
- **Supabase** — Postgres + Auth + RLS + Storage + Realtime
- **Tailwind CSS** + design tokens (`src/app/theme-variables.css`, `src/components/ds`)
- **Integrations** — Plaid, SnapTrade, Alpaca, Stripe, FMP, Finnhub, Resend, Anthropic, Polymarket
- **Observability** — Sentry (browser / server / edge) + structured logger (`src/lib/logger.js`)
- **Vercel crons** — 35 scheduled jobs defined in `vercel.json`

## Repository layout

```
src/
  app/            App Router pages (140 pages) + api/ (480 route handlers)
  components/     React components, grouped by domain (capitol, echo, org, ...)
  contexts/       React context providers
  hooks/          Shared client hooks
  lib/            Server + shared domain logic
    supabase/     THE canonical Supabase client surface (see below)
    services/     External API clients (fmp, finnhub, stripe, resend, massive-news)
    ...           Domain modules (echo/, rag/, portfolio/, congress/, ...)
  config/         Static configuration/registries
app-legacy/       Static HTML/CSS legacy pages, copied to public/ at build time
supabase/         SQL migrations + edge assets
scripts/          Build helpers, seeds, and node:test unit suites (check-*.mjs)
docs/             Architecture, roadmap, guides, product specs
```

## Data access & auth (API routes)

All server-side Supabase access goes through **`@/lib/supabase`** — the only
sanctioned entry point (enforced by ESLint `no-restricted-imports`):

```js
import { requireUser, getUserClient, getAdminClient } from '@/lib/supabase';

export async function GET(request) {
  const { user, client } = await requireUser(request); // 401s if unauthenticated
  const { data } = await client.from('foo').select('*'); // RLS-scoped
  const admin = getAdminClient(); // service-role, bypasses RLS — use deliberately
}
```

- `requireUser(request)` — authenticate or throw 401; returns `{ user, client }`
- `getAuthUser(request)` / `getAuthContext(request)` — null-returning variants
- `getUserClient()` — cookie-scoped client (RLS enforces ownership)
- `getAdminClient()` — service-role singleton (bypasses RLS)
- `isServerSupabaseConfigured()` — for graceful 503s on misconfigured deploys

Rate limiting + safe error responses live in `src/lib/api-guard.js`
(`withApiGuard`, `safeErrorResponse`).

## Getting started

```bash
npm ci
cp .env.example .env.local   # fill in real values (see comments in the file)
npm run dev
```

## Quality gates

```bash
npm run lint          # ESLint (legacy-import bans are errors)
npm test              # 7 node:test unit suites (whale score, ELO, financial metrics, ...)
npm run lint:ds       # design-system hex guard
npm run lint:a11y     # accessibility guard
npm run lint:css      # CSS var() fallback guard
npm run build         # production build
```

CI (`.github/workflows/ci.yml`) runs format check, ESLint, CSS guards, the unit
suites, and a production build with stubbed env on every push/PR to `main`.
Husky runs Prettier via lint-staged on commit and blocks pushes to any remote
that is not `CRONANANI/EzanaFinance3`.

## Documentation

- `docs/ARCHITECTURE.md` — layer map, inventory, honest gap analysis
- `docs/REFACTOR_ROADMAP.md` — phased refactor plan + status
- `docs/CONTRIBUTING.md` — commit/lint/build workflow
- `docs/ECHO_ARTICLE_AUTHORING.md` — Echo editorial standard (metadata, figures)
- `docs/SCALING.md`, `docs/VERCEL_DEPLOY.md`, `docs/STRIPE_SETUP.md` — ops guides
- `docs/product-specs/` — product working specs (Echo skills, RAG system, ...)
- `CLAUDE.md` — standing conventions for AI-assisted development
