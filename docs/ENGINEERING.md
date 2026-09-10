# Engineering Handbook — Ezana Finance

The standing rules for working in this repository. Practical companion to
[`CTO_ONBOARDING.md`](./CTO_ONBOARDING.md) (orientation) and
[`CONTRIBUTING.md`](./CONTRIBUTING.md) (setup/workflow mechanics).

## Architecture rules (lint-enforced where possible)

1. **One data-access surface.** All server-side Supabase access goes through
   `@/lib/supabase`. The legacy modules are deleted and banned by
   `no-restricted-imports` (error). Never instantiate `createClient` inline in
   a route.
2. **Service-role queries carry their own authorization.** `getAdminClient()`
   bypasses RLS; every such query must filter by the authenticated
   `user.id` / `member.org_id` or sit behind an admin/cron/webhook gate.
3. **Authorization inputs must be trustworthy.** Server identity comes from
   `requireUser`/`getAuthUser`. Roles come from `app_metadata`, the
   `ADMIN_EMAILS` allowlist, or org membership rows — never from
   `user_metadata`, request bodies, or client state.
4. **Routes stay thin.** Parse/validate → call a `src/lib` module → shape the
   response. Business logic that two routes need lives in `src/lib`, not in
   either route.
5. **Providers are isolated.** External APIs are called from
   `src/lib/services/*` or a domain lib, never from components. Provider
   response shapes get normalized before they cross into domain logic.
6. **Financial math is centralized and tested.** New money/returns/risk logic
   goes into a pure `src/lib` module with a `scripts/check-*.mjs` suite —
   never inline in a component or duplicated per page.
7. **Secrets are server-only.** A `NEXT_PUBLIC_` var is public by definition;
   provider keys must never get that prefix. Browser data access goes through
   authenticated `/api/*` proxies.
8. **UGC and external data are hostile.** Escape at the render sink
   (`sanitizeHtml`, `esc()` patterns), neutralize CSV formula prefixes,
   validate submitted URLs with `httpUrlOrNull`, validate redirect targets
   with `safeInternalPath`.

## Conventions

- **Files/dirs:** kebab-case for lib modules and routes; PascalCase for React
  components; hooks are `useX.js`. DB is `snake_case`, uuid PKs,
  `created_at`/`updated_at`.
- **API:** REST-ish under `/api/<domain>/...`; mutations via POST/PATCH/DELETE
  wrapped in `withApiGuard`; errors as `{ error }` with correct status; never
  leak stack traces (use `safeErrorResponse`).
- **Commits:** `feat|fix|refactor|security|test|docs|chore(scope): summary`.
  Small, logically grouped; every commit should build.
- **Styling:** design tokens + `ds`/`ui` primitives; raw hex is lint-blocked;
  pages must pass the a11y and CSS-var guards.

## Quality gates (all must pass before push — CI re-runs them)

```bash
npm run lint       # ESLint, 0 errors (includes the layer-boundary bans below)
npm run lint:arch  # dependency-cruiser: no cycles; presentation never reaches the server DB surface
npm test           # all node:test suites
npm run build      # production build (stub env is fine — see ci.yml)
npm run lint:dead  # knip dead-code inventory — NON-blocking, review output only
```

## How regressions are caught (the guardrail inventory)

| Regression class                                                                                                                    | Caught by                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy Supabase import patterns returning                                                                                           | `no-restricted-imports` (**error**) in `.eslintrc.json`                                                                                                    |
| Presentation layer touching server infra (server Supabase surface, stripe/plaid/resend/anthropic SDKs, key-holding service clients) | `.eslintrc.json` override on `src/{components,hooks,contexts}` (**error**) + `dependency-cruiser` transitive-reachability rule (`npm run lint:arch`)       |
| Dependency cycles                                                                                                                   | `dependency-cruiser` `no-circular` (**error**)                                                                                                             |
| Broken build / failing unit suites                                                                                                  | CI `build` job + `npm test` (8 node:test suites)                                                                                                           |
| Known-vulnerable dependencies                                                                                                       | `security-audit.yml` (npm audit, justified-allowlist critical gate) + Dependabot weekly PRs (`.github/dependabot.yml` — humans merge, nothing auto-merges) |
| Injection/dataflow bug patterns                                                                                                     | CodeQL default suite (`.github/workflows/codeql.yml`, PRs + weekly)                                                                                        |
| Design-token / a11y / CSS-var drift                                                                                                 | `lint:ds`, `lint:a11y`, `lint:css`                                                                                                                         |
| Dead code accumulating                                                                                                              | `knip` (`lint:dead`) — non-blocking inventory, false positives expected                                                                                    |

## Database changes

Write a migration in `supabase/migrations/` AND apply it to the project
(Supabase MCP/CLI) — keep file and prod in sync. After DDL, run the Supabase
security/performance advisors. New functions: pin `search_path`, and revoke
`EXECUTE` from `anon`/`authenticated` unless PostgREST exposure is intended.
New tables: enable RLS; no policies = service-role-only (deliberate pattern).

## Dependency policy

Prefer the platform (Next/React/Supabase/Tailwind) over new packages. Any new
dependency needs a reason it can't be ~50 lines of code. `npm audit` criticals
fail CI unless allowlisted with a written justification in
`security-audit.yml`. Upgrade deliberately — never `npm audit fix --force`.

## When things break in production

Sentry issue → find the route tag → reproduce locally (`.env.local` stubs) →
fix with a regression test where practical → push to `main` (auto-deploys) →
verify the SHA in the Vercel deploy log and the Sentry issue's resolution.
