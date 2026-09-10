# ADR 003 — External providers behind server-side clients

**Status:** Accepted · **Date:** 2026-09-10 (documented; decision predates)

## Context

Ezana consumes many paid/limited APIs (FMP, Finnhub, Alpha Vantage, Plaid,
SnapTrade, Alpaca, Stripe, Resend, Anthropic, Polymarket, Mux). Early legacy
code shipped provider keys to the browser (a real leak, remediated).

## Decision

Every provider is called server-side only, through a dedicated module
(`src/lib/services/*`, `src/lib/plaid.js`, `src/lib/snaptrade.js`, …) that
owns the key, base URL, caching TTLs, and response normalization. Browsers
get data via authenticated `/api/*` proxy routes. Provider keys are
server-only env vars — never `NEXT_PUBLIC_`.

## Consequences

- Keys are not in any client bundle (verified in the Sep 2026 sweep).
- Rate limits and caching are enforced in one place per provider.
- Swapping a provider means rewriting one module + its normalizer, not the app.
