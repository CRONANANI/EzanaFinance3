# ADR 002 — Single Supabase client surface (`@/lib/supabase`)

**Status:** Accepted · **Date:** 2026-09-10

## Context

Five overlapping auth/data-access patterns had accumulated (auth-helpers,
supabase-server, supabase-service-role, a service-role client exported from
the Plaid module, inline createClient calls). Every handler re-decided which
to use; the service-role/RLS boundary was easy to get wrong.

## Decision

`src/lib/supabase/index.js` is the only sanctioned entry point:
`requireUser`, `getAuthUser`/`getAuthContext`, `getUserClient` (RLS-scoped),
`getAdminClient` (service-role singleton), `isServerSupabaseConfigured`.
Legacy modules were migrated (168 files) and deleted;
`no-restricted-imports` is an ESLint **error** so they cannot return.

## Consequences

- One place to reason about auth; RLS-vs-service-role is an explicit choice.
- Rule that keeps it safe: every `getAdminClient()` query carries its own
  ownership/org filter or sits behind an admin/cron/webhook gate.
- Migration lesson (2026-09-10): a codemod that rewrites identifiers must
  verify imports per file — eight files briefly referenced `getAdminClient`
  without importing it. `scripts/check-security-guards.mjs`-style sweeps and
  the same-day security audit are the backstop.
