# Performance map

Phase 1 of the performance pass. Audit only, from code inspection against
commit `6ef1374a`. No fixes applied. Every claim carries `file:line` evidence.
Sizes are gzipped first-load JS from `npm run lint:perf`; see
`BASELINE.md` for the measurement basis.

Read this before starting Phase 2. It changes the order the brief proposed.

---

## The floor: what is actually in it

Every route pays a 246 kB floor and the root shell is 397.2 kB. `/auth/signin`
costs 347.6 kB to render a form with two inputs.

**An earlier revision blamed this on the twelve client context providers in
`src/app/layout.js`. That hypothesis was tested and was mostly wrong.** Moving
the six providers with no consumers outside the dashboard into the
`(dashboard)` layout moved `/layout` by 4.5 kB and `/help-center/user` by
12.1 kB, and moved `/auth/signin` not at all. Next's per-route chunking was
already keeping most unused provider code off those routes.

The split was kept, because it is still correct: six fewer context providers
mount and subscribe on every public page render, which is hydration and CPU
work rather than bytes. But it is not where the floor comes from.

Measured by chunk, `/auth/signin`'s 347.6 kB is:

|    kB | Chunk                   | What it is         |
| ----: | ----------------------- | ------------------ |
| 110.4 | `6243-*`                | framework          |
|  52.6 | `fd9d1056-*`            | framework          |
|  38.2 | `52774a7f-*`            | framework          |
|  54.1 | `7195-*`                | **`@supabase`**    |
|  39.8 | `2912-*`                | **`lucide-react`** |
|   ~12 | route + webpack runtime | app code           |

Roughly 201 kB is React and Next themselves, which is the price of the
framework. Supabase at 54.1 kB is genuinely needed on an auth page.

That leaves **lucide at 39.8 kB on every route**, reaching public pages through
`ConditionalNavbar` -> `Navbar.js`, which imports nine icons.

**It was not removed, and should not be without a decision.** Those nine icons
are the source of truth for the Sonar orbital map's `DIMENSION_ICON` mapping,
by design, so the two surfaces cannot drift. Swapping the Navbar to Bootstrap
Icons would visibly change the Datasets dropdown, which this pass's zero-visual-
change guardrail forbids. It is a product decision, not a performance one, and
it is the single largest remaining byte win on public routes.

---

## Dependency reachability, corrected

**An earlier revision of this document claimed seven packages were dead. That
was wrong for five of them, and the error is recorded here rather than quietly
edited out, because the wrong version was acted on.**

The mistake: the reachability grep used `head -4`, and four CSS class-name
matches in `HeroDottedMap.jsx` consumed the output, truncating the real import
at `market-analysis/page.js:7`. Never truncate a reachability check.

The actual chain is live and is a direct cause of market-analysis being the
second-heaviest route:

```
market-analysis/page.js:7
  -> components/ui/world-map.tsx
       -> dotted-map
       -> proj4
       -> lib/latLngToCountryAlpha2.ts
            -> @turf/bbox, @turf/boolean-point-in-polygon, @turf/helpers
            -> topojson-client
            -> world-atlas/countries-110m.json   (107,761 bytes of TopoJSON)
```

So `proj4`, `topojson-client`, `world-atlas` and the three `@turf` packages are
all shipping, and a 107 kB country atlas is bundled into a client route. These
are code-splitting targets, as the brief originally said, not deletions.

One caveat before splitting: `market-analysis/page.js:15-19` documents that
`WorldMap` is eagerly imported _on purpose_ because it is that route's LCP
element, and the neighbouring controls are already dynamic. Deferring the map
itself would trade first-load JS for a worse LCP. The win to chase is the
atlas: `latLngToAlpha2Cached` and its TopoJSON only run when a point needs
resolving to a country, so that module can load on demand behind the map.

Genuinely unreachable, verified without truncation:

| Package             | Status                                                                              | Action taken                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-icons`       | zero import sites anywhere                                                          | removed from `package.json`; also removed from `optimizePackageImports` (`next.config.js`), where it was optimising nothing                 |
| `react-grid-layout` | zero import sites anywhere                                                          | removed from `package.json`                                                                                                                 |
| `gsap`              | only `app-legacy/*.html` and `app-legacy/components/landing/card-swap/card-swap.js` | left in place; `app-legacy` is copied to `public/` and served statically, so gsap is never webpack-bundled and costs the app bundle nothing |

## Route audit

Ordered by first-load JS. "Client share" is judged from the page file and its
direct component imports.

### 1. `/(dashboard)/ezana-echo/[articleId]` — 712.8 kB

The heaviest route by 180 kB.

- `EchoArticleClient.jsx` is 3,097 lines, entirely `'use client'`.
- Imports `react-pdf`, which is only needed if the article embeds a PDF.
- Article body is server-renderable content: it comes from
  `public.echo_articles` and does not change per viewer.

**Top 3:** (1) render the article body server-side and keep only the reader
chrome as an island; (2) lazy-load `react-pdf` behind an actual PDF embed;
(3) split the 3,097-line component by section.

**Constraint:** the canonical article is frozen. Any change here must be
verified by byte-diffing the rendered route, so treat this as structural-only
and schedule it last, as the brief says.

### 2. `/(dashboard)/market-analysis` — 535.1 kB

- `page.js` is 2,674 lines, `'use client'`, with **13** `fetch('/api/...)`
  call sites in effects.
- That is a client waterfall: nothing paints until the bundle parses, then
  each fetch starts.

**Top 3:** (1) move first-paint data server-side; (2) `Promise.all` the
independent fetches that remain; (3) split the page into per-band islands so a
chart library is not in the initial parse.

### 3. `/(dashboard)/home` — 445.2 kB

- 2,392 lines, `'use client'`, **16** fetch sites in effects, the worst
  waterfall in the app.
- Stat bands are ideal Suspense candidates: shell streams, numbers fill in.

**Top 3:** (1) server shell plus streamed stat bands; (2) collapse the 16
fetches into a small number of server calls; (3) islands for interactive cards.

### 4-7. `watchlist` 492.3, `company-research` 454.0, `empire-ranking` 429.2, `learning-center` 426.3 kB

Same shape: large client page, chart libraries in the initial parse. Note
`learning-center/page.js` is a 7-line shell already, so its weight is entirely
in the component tree beneath it, which makes it a good candidate to prove the
island pattern on before touching `home`.

### 8. `/layout` — 397.2 kB

Covered above. Highest leverage in the codebase.

### 9-14. auth pages — 345 to 348.6 kB each

`/auth/signin` 347.6, `/auth/signup` 346.0, `/auth/reset-password` 346.5,
`/auth/org-login` 345.0, `/auth/partner/signin` 347.6,
`/auth/signin/backtest` 348.7.

These are forms. Their entire cost is the shell. They need no page work at
all, only the provider split. **Best effort-to-reward ratio in the audit.**

### 15. `/` landing — 287.3 kB

Already the best-architected route: `dynamic()` plus `sectionFallback` plus
`LandingErrorBoundary`, 25 `dynamic()` sites repo-wide and most are here.
`page.js` is 145 lines but still `'use client'`.

**Top 3:** (1) make the page shell a server component (the dynamic sections
already handle their own client needs); (2) `content-visibility: auto` on
below-fold section wrappers; (3) confirm `dotted-map` and `three` are not in
the hero's critical path.

### 16. `/(dashboard)/sonar` — 312.5 kB

Reasonable already. The cost is in the API route, not the bundle. See below.

---

## Global inventories

### Sequential await chains in API routes

Only **98 of 484** routes use `Promise.all`. The rest await serially.

**`src/app/api/sonar/query/route.js`** — the brief's named exemplar, confirmed:

| Line   | Await                 | Depends on        |
| ------ | --------------------- | ----------------- |
| `:133` | `globalToday` count   | nothing           |
| `:147` | `profile`             | nothing           |
| `:154` | `getCurrentOrgMember` | nothing           |
| `:155` | `isActivePartner`     | nothing           |
| `:169` | `usedToday` count     | tier, from `:147` |
| `:193` | `orchestrate(...)`    | all of the above  |

Lines 133, 147, 154 and 155 are mutually independent: four sequential round
trips collapsible to one `Promise.all`. `:169` must stay after `:147`.

**`src/app/api/community/posts/route.js`** — 40 awaits. Already parallel at
`:133`, but `:150` (likes), `:155` (saves) and `:163` (votes) are three
independent reads in series.

Other high-count candidates for the same treatment:
`org/cohorts/[id]/onboarding` (20), `org/pitch-competitions/[id]/structure`
(19), `cron/monthly-elo` (19), `org/research-notes/[id]/attachments` (17),
`org/assignments/[id]/attachments` (17), `learning/progress` (15),
`community/creator-calls` (15), `notifications/generate` (14), `messages` (14).

Each needs a dependency read before conversion; the counts locate the work,
they do not prove independence.

### Client fetch waterfalls

| Fetch sites | File                                                               |
| ----------: | ------------------------------------------------------------------ |
|          16 | `src/app/(dashboard)/home/page.js`                                 |
|          13 | `src/app/(dashboard)/market-analysis/page.js`                      |
|           7 | `src/app/(dashboard)/trading/mock/page.js`                         |
|           6 | `src/app/datasets/government/contracts/GovContractsClient.jsx`     |
|           6 | `src/app/(dashboard)/inside-the-capitol/page.js`                   |
|           4 | `src/app/datasets/political/PoliticalTradesClient.jsx`             |
|           4 | `src/app/(dashboard)/org-team-hub/compliance/ComplianceClient.jsx` |
|           4 | `src/app/(dashboard)/betting-markets/page.js`                      |

### `force-dynamic`

**480 of 484** API routes. Correct for user-scoped and RLS-backed handlers.
Candidates that likely need not be, for Phase 6 review: public dataset reads,
market/indicator lookups, and the Echo list endpoints, all of which serve
identical bytes to every caller.

### Icon systems

Bootstrap Icons is already well delivered: `src/app/layout.js:207` loads it
`media="print"` and an inline script at `:218` flips it to `all`, so it never
blocks render.

`lucide-react` spans 146 files, including shared `src/components/ui/*`
(`contact-support-dialog`, `pricing-module`, `faq1`, `profile-carousel`,
`footer-section`, `database-with-rest-api`, `floating-input`,
`animated-glowing-search-bar`). Because these are shared components, their
icon imports reach common chunks. `optimizePackageImports` includes
`lucide-react` (`next.config.js:33`), which helps tree-shaking but does not
remove the dependency from the shell.

### Middleware

`src/middleware.js`, matcher at `:417` catching every non-static path.

| Line                           | Work                                         |
| ------------------------------ | -------------------------------------------- |
| `:86`                          | CSP nonce minted (**preserve exactly**)      |
| `:132`, `:181`, `:281`, `:343` | four `createServerClient` constructions      |
| `:151`                         | `supabase.auth.getUser()` network round trip |
| `:172`                         | `.from('profiles')` read                     |
| `:269`                         | `.from('profiles')` read (second)            |

Public paths currently pay the auth round trip. A comment at `:116-119`
already notes that link prefetch multiplies this per prefetched link. Phase 7's
target (zero DB work on public paths, exactly one profile read on gated paths)
is achievable; the two reads at `:172` and `:269` are the collapse candidates.

---

## Recommended order, revised

The brief's phase order is sound except that its highest-leverage item is
buried. Proposed:

1. **Shell diet** (new, from Phase 3): move the nine dashboard-only providers
   out of the root layout. Affects all 143 routes; largest single win.
2. **Dead dependency removal** (from Phase 4): delete seven packages and two
   orphan files. Near-zero risk.
3. **Phase 2 quick wins** as written: Cinzel `@import`, CSS import chain,
   images.
4. **Phase 6 data layer**, starting with the Sonar exemplar: four round trips
   to one.
5. **Phase 7 middleware**, which compounds with (1) on public paths.
6. **Phase 3 route refactors**, starting with `learning-center` (already a
   7-line shell, so it proves the island pattern cheaply) rather than `home`.
7. Remaining phases as written. Echo last, as the brief says.

## Not investigated

- Runtime interaction cost (INP): needs a browser profile, not static reading.
- Actual per-route CSS delivered: needs per-route coverage capture.
- Database index needs: requires query plans against production data. Phase 6
  writes candidate migrations without executing them.
