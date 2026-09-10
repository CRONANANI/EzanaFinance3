# ADR 004 — node:test check-scripts instead of a test framework

**Status:** Accepted · **Date:** 2026-09-10 (documented; pattern predates)

## Context

The repo needs deterministic unit tests for business-critical logic (financial
metrics, ELO, judging, disclosures) without adding Jest/Vitest config,
transforms, and dependency weight to a Next.js app that doesn't otherwise
need them.

## Decision

Self-contained `scripts/check-*.mjs` files using Node's built-in `node:test`

- `assert/strict`, importing pure `src/lib` modules directly (Node's ESM
  syntax detection handles the plain `.js` sources). Each is wired as an npm
  script; `npm test` runs the whole set; CI runs it on every push.

## Consequences

- Zero test-framework dependencies; suites run in milliseconds.
- Constraint that keeps it working: tested modules must stay pure (no `@/`
  alias imports, no Next-only APIs) — which is also the right shape for
  financial logic (ADR 002/ENGINEERING rule 6).
- E2E remains a gap; when added it will be a separate Playwright layer, not a
  replacement for these suites.
