# Prediction Markets redesign, handoff package

Everything Claude Code needs to rebuild `/datasets/prediction-markets` from a
generic dataset template into an eight-card dashboard that answers four
questions at a glance:

1. What is the crowd pricing right now, and what is moving?
2. Where does a price disagree with a reference, and by how much?
3. Who are the best traders on Polymarket and on Kalshi?
4. How has this market's price moved over time?

This is a redesign of a page that already works. The server read
(`getOpenMarkets`), the open markets table columns, the
`LegislationMarketsSection` and its compliance rules stay. What changes is the
layout, eight new cards, a sticky filter bar that drives every card, and a few
new read paths the cards need (listed in `06-DATA.md`).

The design canvas is the Design artifact "Prediction Markets Wireframe"
(https://claude.ai/artifact/T6MUeJtFEPXcg2WYwEJ88Y). Its source is copied into
`07-wireframe/` so this package stands alone.

## Files

| File                     | What it is                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `00-README.md`           | This index and the prompt to paste                                                                           |
| `01-BRIEF.md`            | What the page is, what changes, what stays, copy, compliance, constraints                                    |
| `02-INTERACTIONS.json`   | Filters, URL, card interactions, the chart loader, expansions, states, keyboard                              |
| `03-TOKENS.css`          | Page-scoped `pmk-` custom properties mapped onto `theme-variables.css`                                       |
| `04-SPEC.md`             | **The measured spec.** Grid, filter bar, each card's anatomy and numbers, type scale, responsive rules       |
| `05-ACCEPTANCE.md`       | Ship checklist                                                                                               |
| `06-DATA.md`             | Data contract per card: what exists today, what is new, the gaps, the pure model functions and their tests   |
| `07-wireframe/`          | Canvas source for every board (`*.dc.html`) plus `pmk.css`. Reference only, see the note below               |
| `../tracker-handoff/06-SHARED-CHROME.md` | The nav + ticker contract every datasets page mounts. Unchanged here; the page mounts it, never draws it |

### About `07-wireframe/`

The `.dc.html` files are Design canvas components, not standalone pages: each
is plain HTML with inline styles plus a small `renderVals()` script holding the
fixture data. Read them for structure, class names, spacing and copy. Do not
port the markup verbatim and do not copy their fixture values into the app.

| Board                            | Shows                                                               |
| -------------------------------- | ------------------------------------------------------------------- |
| `Main.dc.html`                   | Full page, 1440, dark (props switch theme, viewport, card state)    |
| `Desktop-Light`, `Tablet`, `Mobile`, `Mobile-Filters` | The same page at light, 768, 375, and the filter sheet open |
| `Pulse`, `PriceChart`, `Movers`, `EdgeBoard`, `TopTraders`, `CategoryMap`, `ClosingSoon`, `Conviction` | Each card, default state |
| `States-*.dc.html`               | Each card in default, loading, empty and error                      |
| `Chart-Hover`, `Chart-Multi`     | Crosshair tooltip; four-outcome market                              |
| `Edge-Expanded`, `Traders-Expanded`, `Traders-Kalshi` | Row expansions signed in and signed out; Kalshi tab |
| `Spec.dc.html`                   | Component, colour-role and type tables                              |

The wireframe's top nav strip is a placeholder for context. **Do not build
it.** The real page mounts the shared datasets chrome (`DatasetChrome`) and
publishes ticker items through `usePublishTicker`.

## Read this before building

- **Informational, never a bet.** Every EV surface says "market-implied
  probability", "reference price", "Ezana model estimate", "gap" or "edge".
  Never "buy", "bet", "take YES", stake sizing, Kelly fractions or projected
  profit. `legislation-edge.js` already encodes the confidence tiers and EV
  formula; reuse it, do not re-derive it.
- **Units never mix.** Polymarket volume is dollars, Kalshi volume is
  contracts. Never sum them. Where a card needs one number across both venues,
  show the two side by side.
- **Ship 24h first.** The index stores 24h change and 24h volume only. The 7d
  and 30d windows need the snapshot table in `06-DATA.md`. Until it exists the
  window control shows 7d and 30d disabled with a tooltip, not fake numbers.
- **Components render, the model calculates.** Every number on the page that
  is not a raw column (net gap, EV%, efficiency, decidedness, hot flag,
  treemap layout, mover rank) is a pure function in
  `src/lib/prediction-markets/page-model.js` with a test.
- **No invented data.** The wireframe fixture is illustrative. Empty, loading
  and error states are real designs; ship them rather than sample rows.

## Prompt to paste

```
Redesign the Prediction Markets dataset page at /datasets/prediction-markets
to the approved eight-card design.

Read all of these first, in order:
  docs/design/prediction-markets-handoff/01-BRIEF.md          what changes, what stays, copy, compliance
  docs/design/prediction-markets-handoff/06-DATA.md           data per card: existing reads, new routes, gaps, model functions
  docs/design/prediction-markets-handoff/04-SPEC.md           the measured spec, every number
  docs/design/prediction-markets-handoff/02-INTERACTIONS.json filters, URL, chart loader, expansions, states, keyboard
  docs/design/prediction-markets-handoff/03-TOKENS.css        page tokens mapped onto theme-variables.css
  docs/design/tracker-handoff/06-SHARED-CHROME.md             the nav + ticker contract; mount it, never draw it
  docs/design/prediction-markets-handoff/05-ACCEPTANCE.md     the ship checklist
  docs/design/prediction-markets-handoff/07-wireframe/        canvas source; Main.dc.html is the full page

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md, docs/CTO_ONBOARDING.md and docs/EZANA_BRANDING_GUIDE.md;
read src/app/datasets/prediction-markets/*, src/lib/hive/store.js,
src/lib/prediction-markets/*, src/app/api/prediction-markets/trending/route.js,
src/lib/congress/legislation-edge.js, src/components/congress/
LegislationMarketsSection.jsx, the two index crons (index-prediction-markets,
index-kalshi), and the Government Contracts and Politician Tracker pages as the
visual and structural references. Find DatasetChrome, usePublishTicker and the
shimmer skeleton pattern.

Deliver in this order and stop after each for me to look:

  1. A short plan: files you will touch, conventions you found, the new pure
     functions for page-model.js, the new routes and the one migration.

  2. THE MODEL. src/lib/prediction-markets/page-model.js with tests
     (scripts/check-prediction-markets.mjs, wired as test:prediction-markets):
     netGap, evPct (reuse computeEdge/edgeConfidence), efficiency,
     decidedness, isHot, rankMovers, squarify, pulseStats, closingByDay,
     mostUncertain, convictionPoint, normalizeCategory. No React, no
     formatting in the model.

  3. DATA. The snapshot migration and the cron writes; Polymarket category
     ingest; /api/prediction-markets/history, /leaderboard and /positions
     routes per 06-DATA.md, all through withApiGuard and the @/lib/supabase
     surface, cached as specified.

  4. THE PAGE, STATIC AT 1440, DARK AND LIGHT. Shared chrome mounted, header,
     sticky filter bar, Pulse, Price Chart beside Movers, Edge Board, Top
     Traders beside Category Map, Closing Soon beside Conviction, the
     restyled open markets table, Legislation markets, the sign-up band.
     pmk- prefix, tokens from 03 only.

  5. INTERACTIONS. Filters drive every card and the URL; any market anywhere
     loads the chart; Edge Board and trader expansions with the signed-out
     gate; tabs, sorts, range control.

  6. States (shimmer, empty, error) for every card, responsive at 1200, 900
     and 375 with no horizontal page scroll, a11y, then npm run lint,
     lint:branding, lint:arch, check:copy and the new test.

Hard rules:
  - Informational only. Never "buy", "bet", "take YES", stake sizing, Kelly
    or projected profit. Every EV surface carries the educational line and a
    "How we calculate this" link.
  - Never add Polymarket dollars to Kalshi contracts.
  - Gaps are always net of half the spread; under 1 point is never shown.
  - No em dashes anywhere in UI copy. Never name backend infrastructure;
    attribute only "Source: Polymarket" / "Source: Kalshi".
  - Mono tabular numerals for every number; questions and paragraphs in sans.
  - Tokens only, no hard-coded hex; test dark (default) and light. Gold never
    appears on this page.
  - Do not draw the nav or ticker; mount DatasetChrome.
  - No third-party chart iframes. Bootstrap Icons only. No new dependencies
    unless the plan in step 1 names one and I approve it.
```
