# Performance baseline

Measured 2026-09-20 against commit `6ef1374a`, via `ANALYZE=true npm run build`
on the production configuration. Everything below is a measurement, not an
estimate. Phase 0 of the performance pass changed no application code.

## How to read these numbers

Two figures exist for the same thing and they do not match, so both are stated:

- **Next's build table** reports gzipped first-load JS per route.
- **`npm run lint:perf`** computes the same quantity from
  `.next/app-build-manifest.json` plus the shared chunks, also gzipped.

They agree within about 5% (market-analysis: 507 kB per Next, 535.1 kB per the
checker). The checker runs slightly high because it counts polyfills that
Next's "shared by all" line excludes. The checker is the budget authority
because it is reproducible without scraping stdout; Next's table is the
cross-check.

An earlier draft of the checker measured raw bytes on disk and reported ~3x
these figures. Raw bytes are not what crosses the wire. If a number here looks
implausibly large next to the build output, check which basis it used.

## Per-route first-load JS (gzipped)

Floor: **246 kB**. Every route pays it, including `/_not-found`.

|    kB | Route                                 |
| ----: | ------------------------------------- |
| 712.8 | `/(dashboard)/ezana-echo/[articleId]` |
| 535.1 | `/(dashboard)/market-analysis`        |
| 492.3 | `/(dashboard)/watchlist`              |
| 454.0 | `/(dashboard)/company-research`       |
| 445.2 | `/(dashboard)/home`                   |
| 429.2 | `/(dashboard)/empire-ranking`         |
| 426.3 | `/(dashboard)/learning-center`        |
| 397.2 | `/layout` (the root shell itself)     |
| 386.2 | `/(dashboard)/kairos-signal`          |
| 359.1 | `/(dashboard)/ezana-echo`             |
| 350.3 | `/(dashboard)/centaur-intelligence`   |
| 348.2 | `/settings`                           |
| 347.6 | `/auth/signin`                        |
| 346.0 | `/auth/signup`                        |
| 335.6 | `/(dashboard)/community`              |
| 320.7 | `/(dashboard)/inside-the-capitol`     |
| 312.5 | `/(dashboard)/sonar`                  |
| 287.3 | `/` (landing)                         |
| 270.7 | `/(dashboard)/for-the-quants`         |
| 257.7 | `/(dashboard)/betting-markets`        |

Next's own table for cross-reference: `/` 254 kB, `/market-analysis` 507 kB,
`/_not-found` 212 kB, shared-by-all 212 kB (39 + 113 + 53.8 + 6.17 kB chunks),
middleware 85.6 kB.

### The single most important number here

**`/auth/signin` is 347.6 kB.** A sign-in form is a heading, two inputs and a
button. It costs within 60 kB of the home dashboard because the root layout
wraps every route in twelve client context providers:

`src/app/layout.js:7-18` — ThemeProvider, AuthProvider, ProGateProvider,
PartnerProvider, OrgProvider, OrgThemeProvider, CongressProvider,
PinnedCardsProvider, ToastProvider, SettingsProvider, ActiveTaskProvider,
BeginnerLevelProvider.

The floor of 246 kB and the `/layout` figure of 397.2 kB are the same finding
from two angles. Cutting 50 kB off this shell beats cutting 50 kB off any
single page, because it is multiplied by 143 routes. This reframes the pass:
the shared shell is a larger prize than any individual route refactor.

## Module and dependency inventory

### Client/server split

| Scope                | `'use client'` | Total |   Share |
| -------------------- | -------------: | ----: | ------: |
| `src/components`     |            577 |   628 | **92%** |
| `src` (all .js/.jsx) |            763 |  1754 |     43% |

The task brief cited "762 of 884 (86%)". The component-scoped figure is the
one that matters and it is worse than stated: 92%.

**Every priority route's `page.js` is a client component**, landing included:

| Route                                          | Lines | Type              |
| ---------------------------------------------- | ----: | ----------------- |
| `/`                                            |   145 | client            |
| `/(dashboard)/home`                            |  2392 | client            |
| `/(dashboard)/market-analysis`                 |  2674 | client            |
| `/(dashboard)/kairos-signal`                   |  2416 | client            |
| `/(dashboard)/empire-ranking`                  |  1843 | client            |
| `/(dashboard)/inside-the-capitol`              |  1364 | client            |
| `/(dashboard)/betting-markets`                 |  1477 | client            |
| `ezana-echo/[articleId]/EchoArticleClient.jsx` |  3097 | client            |
| `components/ui/interactive-globe.jsx`          |  2221 | client (three.js) |

`community/page.js` (9 lines) and `learning-center/page.js` (7 lines) are
already thin shells delegating to split components. They are the pattern the
others should follow.

### Dependencies: what is actually in the bundle

The brief lists a set of "heavy deps present". Measured by import site, most of
them are not in the client bundle at all:

| Package             | Import sites in `src` | Status                                                       |
| ------------------- | --------------------: | ------------------------------------------------------------ |
| `lucide-react`      |                   146 | **real weight**, shipping                                    |
| `recharts`          |                    22 | real weight, shipping                                        |
| `framer-motion`     |                    18 | real weight, shipping                                        |
| `dotted-map`        |                     3 | shipping (landing hero map)                                  |
| `three`             |                     2 | shipping (globe, aurora shader)                              |
| `react-pdf`         |                     2 | shipping (PDF preview, Echo)                                 |
| `lottie-web`        |                     1 | shipping                                                     |
| `react-icons`       |                 **0** | dead dependency                                              |
| `react-grid-layout` |                 **0** | dead dependency                                              |
| `gsap`              |        **0 in `src`** | only `app-legacy/*.html` static files, never webpack-bundled |
| `world-atlas`       |           0 reachable | only `src/lib/latLngToCountryAlpha2.ts`                      |
| `topojson-client`   |           0 reachable | only `src/lib/latLngToCountryAlpha2.ts`                      |
| `@turf/*` (3 pkgs)  |           0 reachable | only `src/lib/latLngToCountryAlpha2.ts`                      |
| `proj4`             |           0 reachable | only `src/components/ui/world-map.tsx`                       |

`src/lib/latLngToCountryAlpha2.ts` and `src/components/ui/world-map.tsx` have
**zero importers anywhere in the repo**. They are orphaned TypeScript files in
a JavaScript codebase, and they are the sole reason five geo packages sit in
`package.json`.

Consequence for Phase 4: the geo stack, `gsap`, `react-grid-layout` and
`react-icons` need no code-splitting work. They need deleting. `react-icons` is
additionally listed in `optimizePackageImports` (`next.config.js:34`) where it
optimizes nothing.

### Icon systems

Two ship, not three: Bootstrap Icons (CSS font from jsDelivr,
`src/app/layout.js:207`, loaded `media="print"` then flipped to `all` by an
inline script at `:218`, so it is already non-render-blocking) and
`lucide-react` across 146 files, including shared `src/components/ui/*`
components that land in common chunks. `react-icons` has zero import sites.

### CSS

| Scope        |   Files |                  Bytes |
| ------------ | ------: | ---------------------: |
| `src`        |     191 |              2,765,813 |
| `app-legacy` |     117 |              1,011,971 |
| **Total**    | **308** | **3,777,784** (3.6 MB) |

`globals.css` is 3,065 lines with 23 `@import`s. Line 2 is a render-blocking
Google Fonts import for Cinzel:

```css
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');
```

A CSS `@import` of a remote stylesheet cannot begin downloading until
`globals.css` itself has downloaded and parsed, so this serializes a font
request behind the entire stylesheet.

Fonts otherwise come from one `<link>` at `src/app/layout.js:192` (JetBrains
Mono, Newsreader, Nunito 400-900, Plus Jakarta Sans 200-800 with italics) with
preconnects at `:189-190`. A comment at `:182` records that a prior `next/font`
migration caused rendering drift and was reverted; leave it reverted.

### Routes and rendering

| Metric                          |        Count |
| ------------------------------- | -----------: |
| App pages                       |          143 |
| API routes                      |          484 |
| API routes with `force-dynamic` |      **480** |
| API routes using `Promise.all`  | **98** (20%) |
| `dynamic()` call sites          |           25 |

480 of 484 API routes opt out of static optimisation. Some must; the audit in
`PERFORMANCE_MAP.md` flags the ones that need not.

### Middleware

`src/middleware.js`, 418 lines, matcher at `:417` catching every non-static
path. CSP nonce minted per request at `:86`. **Two** separate
`.from('profiles')` reads at `:172` and `:269`, plus `supabase.auth.getUser()`
at `:151` and four `createServerClient` constructions (`:132`, `:181`, `:281`,
`:343`). A comment at `:116-119` already documents that link prefetch produces
a burst of these calls.

## Reproducing this

```bash
ANALYZE=true npm run build     # treemaps in .next/analyze/client.html
npm run lint:perf              # per-route budgets from the manifests
```

Budgets were seeded from this build plus 10% headroom into
`docs/perf/budgets.json` (201 routes). They tighten in Phase 9.
