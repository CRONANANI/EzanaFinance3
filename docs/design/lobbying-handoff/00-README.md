# Lobbying Activity redesign, handoff package

Everything Claude Code needs to rebuild `/datasets/government/lobbying` to the
approved ten-card design: the Influence Pulse band, Spend Leaderboard, Issue
Landscape, Pressure Map, Quarterly Rhythm, Revolving Door, Public Company
Lens, Lobbying vs Contracts, Money to Members (the first UI for the LD-203
contributions data), and the Disclosures table, under one sticky filter bar.

The design canvas is the Design artifact "Prediction Markets Wireframe",
page **Lobbying** (https://claude.ai/artifact/T6MUeJtFEPXcg2WYwEJ88Y). Its
source is copied into `08-wireframe/` so this package stands alone.

## Files

| File                     | What it is                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `00-README.md`           | This index and the prompt to paste                                                             |
| `01-BRIEF.md`            | What changes, what stays, copy, honesty rules, constraints                                     |
| `02-INTERACTIONS.json`   | Filter bar, URL, per-card interactions, modals and drawer, states, keyboard                    |
| `03-TOKENS.css`          | Page-scoped `lbx-` custom properties mapped onto `theme-variables.css`                         |
| `04-SPEC.md`             | **The measured spec.** Grid, filter bar, each card's anatomy and numbers, responsive rules     |
| `05-ACCEPTANCE.md`       | Ship checklist                                                                                 |
| `06-DATA.md`             | Data contract per card: existing routes, the aggregates to add, honesty gates, model functions |
| `07-DATA-INVENTORY.md`   | The source audit this design was drawn from (volumes, fields, routes, gaps). Read it first     |
| `08-wireframe/`          | Canvas source: `Lobby-Main.dc.html` (full page), the ten `Lbx*.dc.html` cards, the `States-*` boards, `Lobby-Spec`, and `lbx.css` |

### About `08-wireframe/`

The `.dc.html` files are Design canvas components: plain HTML with inline
styles plus a `renderVals()` script holding fixture data. Read them for
structure, spacing, class names and copy; do not port markup verbatim and do
not copy fixture values into the app. `lbx.css` mirrors the theme tokens so
the mock renders standalone; the build reads the real tokens. The mock's nav
strip is a stand-in: the real page keeps the shared datasets chrome and
publishes ticker items through it.

## Read this before building

- **The brief's honesty rules are binding** (`07-DATA-INVENTORY.md` section
  1.6). The big ones: issue views are shares of filings, never dollars; money
  comes only from non-registration filings with amount above zero; the 300
  exact-name ticker matches must look different from the 29 verified ones;
  LD-203 honoree names render as filed and never link to member profiles.
- **No gold, no Lucide.** The current `CompanyCard.jsx` violates both; the
  redesign removes them. Bootstrap Icons only, emerald only.
- **Cards draw no outline** (`ds-cards.css`): `lbx-card` is already on the
  shell list. Separation is spacing plus each card's header rule.
- **Money to Members is new UI over an existing route.** `/api/lobbying/
  contributions` is live with 341,148 items; nothing on the page shows it
  today. Three small aggregates are the only new server work (see `06-DATA.md`).
- **Components render, the model calculates.** Shares, YoY deltas, heat
  scales, the awards-per-dollar ratio and clamping live in a pure
  `src/lib/lobbying/page-model.js` with tests.

## Prompt to paste

```
Rebuild the Lobbying Activity page at /datasets/government/lobbying to the
approved ten-card design.

Read all of these first, in order:
  docs/design/lobbying-handoff/07-DATA-INVENTORY.md    what data exists, volumes, fields, honesty rules, gaps
  docs/design/lobbying-handoff/01-BRIEF.md             what changes, what stays, copy, constraints
  docs/design/lobbying-handoff/06-DATA.md              data per card, the three new aggregates, model functions
  docs/design/lobbying-handoff/04-SPEC.md              the measured spec, every number
  docs/design/lobbying-handoff/02-INTERACTIONS.json    filter bar, URL, drawers and modals, states, keyboard
  docs/design/lobbying-handoff/03-TOKENS.css           page tokens mapped onto theme-variables.css
  docs/design/lobbying-handoff/05-ACCEPTANCE.md        the ship checklist
  docs/design/lobbying-handoff/08-wireframe/           canvas source; Lobby-Main.dc.html is the full page

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md and docs/EZANA_BRANDING_GUIDE.md; read
src/app/datasets/government/lobbying/* (LobbyingClient.jsx, CompanyCard.jsx,
lobbying.css), every file in src/lib/lobbying/, every route under
src/app/api/lobbying/, src/lib/lobbying/period.js and coverage.js, the
ds-cards.css outline rule, and the Politician Tracker and Government
Contracts pages as the family benchmark. Map what the current page renders
so nothing it does well is lost by accident.

Deliver in this order and stop after each for me to look:

  1. A short plan: files you will touch, what gets deleted (gold accents,
     lucide imports, the donut), the new pure functions for page-model.js,
     and the three aggregate endpoints.

  2. THE MODEL. src/lib/lobbying/page-model.js with tests
     (scripts/check-lobbying-page.mjs wired as test:lobbying-page, appended
     to npm test): yoyDelta, shareOfTotal, heatScale, issueShareRows,
     quarterSeries (with notYetFiled/partial flags), doorShare,
     awardsPerDollar, clampToPeriod, mappingBadge. No React, no formatting.

  3. DATA. The three aggregates from 06-DATA.md (pressure, rhythm,
     revolving-door) as cache-only reads through @/lib/supabase with
     withApiGuard-equivalent rate limiting like the existing routes; prior-
     period summary read for YoY (two calls to /summary, no new route).

  4. THE PAGE, STATIC AT 1440, DARK AND LIGHT. Shared chrome kept, header,
     sticky filter bar, the ten cards in the spec's order and spans, sign-up
     band, source and data-health lines. lbx- prefix, tokens from 03 only,
     no card outlines.

  5. BEHAVIOUR. Filters drive every card and the URL; client drawer;
     restyled filing modal; redesigned company modal (emerald, Bootstrap
     Icons); Money to Members tabs and type chips; CSV for signed-in users.

  6. States for every card (loading shimmer, filtered-to-empty naming the
     filters, partial period, error with per-card Retry), phone 390 with the
     filter sheet, a11y, then npm run lint, lint:branding, lint:css,
     lint:a11y, lint:arch, check:copy and the new test.

Hard rules:
  - Honesty rules from 07-DATA-INVENTORY.md section 1.6 are non-negotiable:
    no dollars per issue, no dollars from registrations, verified vs
    name-match always distinguishable, honorees as filed and never linked,
    dates clamped to the filing period, empty states name the filters.
  - No gold, no Lucide anywhere on this page when done:
    grep for both must return nothing under the page and its CSS.
  - Attribute only "Senate LDA (lda.gov)"; never name backend infrastructure.
  - No em dashes in UI copy. Mono tabular numerals for every number, ticker
    and date; never mono for prose.
  - Tokens only, no hex; the --echo-chart-* palette must be promoted to
    :root in theme-variables.css first if the Prediction Markets build has
    not already done it (check before adding).
  - Keep the filing modal's content and its lda.gov link; restyle only.
  - No new dependencies unless the plan names one and I approve it.
```
