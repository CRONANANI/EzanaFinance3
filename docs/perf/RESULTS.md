# Performance pass: results

Measured against the Phase 0 baseline (`BASELINE.md`, commit `6ef1374a`). Every
figure is from `npm run lint:perf` on a real production build, gzipped.

This document reports what the pass actually achieved, including where it
achieved little and why. Two of the audit's headline hypotheses did not survive
measurement; both are recorded rather than removed.

## Bundle: per-route first-load JS

| Route                                 | Before | After |     Delta |
| ------------------------------------- | -----: | ----: | --------: |
| `/layout`                             |  397.2 | 392.7 |  **-4.5** |
| `/help-center/user`                   |  349.0 | 336.9 | **-12.1** |
| `/settings`                           |  348.2 | 347.4 |      -0.8 |
| `/auth/signin`                        |  347.6 | 347.6 |         0 |
| `/`                                   |  287.3 | 287.3 |         0 |
| `/(dashboard)/home`                   |  445.2 | 445.2 |         0 |
| `/(dashboard)/market-analysis`        |  535.1 | 535.1 |         0 |
| `/(dashboard)/ezana-echo/[articleId]` |  712.8 | 712.8 |         0 |
| Shared chunks                         |    246 |   246 |         0 |

**This is a small result and it should be read as one.** The bundle work that
would move these numbers meaningfully is blocked on decisions this pass was not
allowed to make; see "Not taken" below.

## What changed

### Shell (provider split)

Six context providers with zero consumers outside the dashboard moved from the
root layout into `(dashboard)/layout.js`: Settings, ActiveTask, Congress,
PinnedCards, BeginnerLevel, OrgTheme. Six stayed, because they are genuinely
global: Theme and Auth everywhere, ProGate and Toast reached from shared
components, and Partner and Org read by `/settings`, which sits outside the
`(dashboard)` segment.

Byte effect: small, as the table shows. Runtime effect: six fewer providers
mount and subscribe on every public page render. Kept for the second reason.

### Fonts

The Cinzel `@import` is gone from `globals.css:2` and Cinzel now rides the
existing font `<link>` in `layout.js`. A CSS `@import` of a remote stylesheet
cannot begin downloading until the importing stylesheet has itself downloaded
and parsed, so this removed one serialized round trip from every page load. It
does not show up in a JS budget; it shows up in the request waterfall.

Cinzel was moved rather than deleted because it is used, by
`HomeTerminalSummary.jsx:568` and `centaur-intelligence.css:450`.

### Dependencies

`react-icons` and `react-grid-layout` removed from `package.json` (zero import
sites anywhere in the repo). `react-icons` also removed from
`optimizePackageImports`, where it had been listed while optimising nothing.

Install-size only: neither was reaching the client bundle, so no route moved.

### Data layer

`src/app/api/sonar/query/route.js` — the profile read, the org-membership
lookup, the partner check and the daily-usage count are mutually independent.
**Four sequential round trips collapsed into one `Promise.all`.** The global
circuit-breaker count deliberately stays sequential and first: its entire
purpose is to return before any further work happens.

`src/app/api/community/posts/route.js` — likes, saves and poll votes over the
same post ids. **Three round trips to one.**

These are latency wins on the server, invisible to a bundle budget, and they
are the most valuable change in this pass.

### Candidate indexes

`supabase/migrations/20260920120000_perf_candidate_indexes.sql`, written and
**not executed**, per the standing migration workflow. Six indexes, each cited
to the query it serves, using `CONCURRENTLY` so none locks a table. The file
also records what was deliberately left out and why.

## Hypotheses that did not survive measurement

Recorded because the audit's first revision was acted on before they were
tested.

**1. "The twelve root providers are the 246 kB floor."** Wrong. Splitting six
of them out moved `/layout` 4.5 kB and `/auth/signin` zero. Next's per-route
chunking was already keeping unused provider code off those routes. The floor
is ~201 kB of React and Next, 54.1 kB of `@supabase`, and 39.8 kB of
`lucide-react`.

**2. "Seven packages are dead."** Wrong for five. A reachability grep truncated
by `head -4` hid the live import at `market-analysis/page.js:7`. `proj4`,
`topojson-client`, `world-atlas` and three `@turf` packages are all reachable
and shipping, including a 107 kB TopoJSON atlas. They are code-splitting
targets, not deletions. Full chain in `PERFORMANCE_MAP.md`.

## Not taken, and why

Ranked by remaining value.

**1. `lucide-react`, 39.8 kB on every route.** The largest single byte win
available on public pages. Not taken because `Navbar.js`'s nine icons are the
deliberate source of truth for the Sonar orbital map's `DIMENSION_ICON`
mapping, so replacing them with Bootstrap Icons would visibly change the
Datasets dropdown. That collides with this pass's zero-visual-change guardrail.
It is a product decision. **Recommend taking it next**, with design sign-off on
the nine icon swaps.

**2. The 107 kB TopoJSON atlas on market-analysis.** `latLngToAlpha2Cached` and
its `world-atlas` import only run when a point needs resolving to a country, so
the module can load on demand. Note `market-analysis/page.js:15-19` documents
that `WorldMap` itself is eagerly imported on purpose as that route's LCP
element: defer the atlas, not the map.

**3. Middleware public-path short-circuit (Phase 7).** Not shipped. The gate
logic is intricate: `/` is treated as public only inside the authenticated
branch (`middleware.js:306`), auth pages carry their own `!user` redirects
(`:224`), and there are two separate `profiles` reads (`:172`, `:269`).
Verifying the six required behaviours (unauthenticated redirect, unverified
email, incomplete questionnaire, org routing, partner routing, MFA) needs real
sessions. A wrong short-circuit here is a security regression, and the brief
marks auth flows untouchable, so this was specified rather than guessed.
The collapse of `:172` and `:269` into one narrow select remains the right
change, done with session-level testing.

**4. Server/client boundary refactor (Phase 3).** The 92% client share is real
and the monoliths are real: `home/page.js` has 16 client fetch sites,
`market-analysis/page.js` 13. Converting them is the largest structural win
left. It is also per-route, high-risk work that needs manual interaction
verification on each route, which is why the brief scheduled it one route per
commit with review between.

**5. Nunito's six weights for one CSS rule.** `--font-display` has exactly one
consumer, `oecd-explorer.css:67`, yet the font link requests 400 through 900.
Narrowing the range would likely be invisible, but "likely" is not the standard
when the guardrail is zero visual change, and the one consumer is on a route
that was not visually audited here.

**6. CSS payload (Phase 8).** 3.6 MB of source CSS across 308 files, untouched.
Dead-selector removal needs per-route coverage capture to be safe; a grep-based
pass would delete rules referenced by template strings.

## Reproducing

```bash
ANALYZE=true npm run build
npm run lint:perf
```
