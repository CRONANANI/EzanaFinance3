# ADR 005 — Security trust model

**Status:** Accepted · **Date:** 2026-09-10

## Context

Sep 2026 security sweep findings clustered around trust decisions, not
missing tooling: an admin gate trusted user-writable metadata, a webhook
failed open, client-reported signals drove account disabling.

## Decision

Codified trust rules:

1. Identity: only `requireUser`/`getAuthUser` server-side; roles only from
   `app_metadata`, `ADMIN_EMAILS`, or membership rows. `user_metadata` is
   user-writable and is NEVER an authorization input.
2. Inbound machine traffic (webhooks/crons) fails CLOSED: missing secret =>
   reject, plus signature and freshness checks.
3. Client-reported telemetry (e.g. login attempt reports) may inform alerts
   but never state changes with security consequences.
4. Untrusted content is escaped at the render sink; submitted URLs and
   redirect targets go through `httpUrlOrNull`/`safeInternalPath`.
5. npm-audit criticals fail CI unless allowlisted with written justification
   tied to our actual deployment (Vercel/Linux) and a tracked real fix.

## Consequences

Regression tests in `scripts/check-security-guards.mjs` pin rules 3–4;
ESLint pins the data-access surface; `security-reports/` documents each
sweep. Restoring hard login lockout requires server-side sign-in proxying
(tracked in CTO_ONBOARDING §14).
