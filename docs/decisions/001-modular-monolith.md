# ADR 001 — Modular monolith on Next.js + Supabase + Vercel

**Status:** Accepted (standing) · **Date:** 2026-09-10 (documented; decision predates)

## Context

Ezana spans many product surfaces (portfolio, capitol, echo, org, community,
learning, billing) built by a very small team, deployed continuously to
production from `main`.

## Decision

One Next.js 14 App Router application: pages + 480 API route handlers in a
single deployable, backed by one Supabase Postgres. No microservices, no
separate backend service, no queues beyond Vercel crons.

## Consequences

- One build, one deploy, one auth story; a small team can own everything.
- Domain isolation is enforced by module boundaries (`src/lib/<domain>`,
  `/api/<domain>`) and lint rules instead of network boundaries.
- Extraction seams if scale demands: cron ingestion jobs, provider clients
  (`src/lib/services/*`), and the org tenant scope (`org_id`) are already
  isolated. See docs/SCALING.md for the load-path plan (cache → read models).
- Cost: everything shares one blast radius — CI (lint/tests/build) and the
  drive-to-green discipline on `main` are the mitigation.
