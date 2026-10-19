# Ship checklist, Prediction Markets

Every box is checkable without asking the designer. Numbers come from
`04-SPEC.md`, behaviour from `02-INTERACTIONS.json`, data from `06-DATA.md`.

## Chrome and structure

- [ ] The page draws no nav and no ticker. It mounts the shared chrome and
      publishes 12 ticker items via `usePublishTicker`.
- [ ] Page order matches `01-BRIEF.md` section 4; column spans match
      `04-SPEC.md` section 1 at 1440.
- [ ] `DatasetDashboard` is no longer used by this page; the open markets
      table keeps its five columns.

## Compliance and honesty

- [ ] `grep -rniE "\bbuy\b|\bbet\b|take yes|kelly|stake|wager|profit per" src/components/datasets/prediction-markets src/app/datasets/prediction-markets`
      returns nothing in UI copy (trader position "side" chips excepted).
- [ ] Edge Board and Legislation each show the educational line in
      `--text-faint` and a "How we calculate this" link.
- [ ] No gap under 1 point net of half the spread renders anywhere.
- [ ] EV% and confidence come from `computeEdge` / `edgeConfidence`; the
      components contain no arithmetic.
- [ ] Polymarket dollars and Kalshi contracts are never added. Pulse shows them
      side by side; Category Map labels its unit.
- [ ] Kalshi leaderboard values show no currency symbol.
- [ ] No sample or fixture data renders in production; empty states do.
- [ ] `npm run check:copy` passes; UI attributes only "Source: Polymarket" /
      "Source: Kalshi". No em dashes: `grep -rn "—"` on the new files returns
      nothing.

## Brand

- [ ] `npm run lint:branding` and `npm run lint:css` pass. No hex in the page
      CSS; every colour is a `--pmk-*` token from `03-TOKENS.css`.
- [ ] `--echo-chart-*` is declared once in `theme-variables.css` (`:root` and
      light mode); Echo pages render unchanged.
- [ ] Every number is mono tabular; no question or paragraph is mono.
- [ ] Gold does not appear. Medals are emerald.
- [ ] Declines use `--echo-chart-red`, never `--danger`.
- [ ] Bootstrap Icons only; decorative icons `aria-hidden`.
- [ ] Dark (default) and light both checked at 1440 against
      `07-wireframe/Main.dc.html` and `Desktop-Light.dc.html`.

## Filters and URL

- [ ] Category, venue, window and search drive every card listed in
      `filters_apply_to`, and round-trip through the URL.
- [ ] Category chip counts are live and follow the venue filter.
- [ ] 7d and 30d are disabled with a tooltip until the snapshot table has 7
      days of rows; then they work and default to 7d.
- [ ] Clicking a Category Map tile sets the category chip and the URL.

## Cards

- [ ] Pulse: four tiles, split bar, side-by-side volumes, biggest mover with
      sparkline, 7-day closing bars with today in emerald.
- [ ] Chart: 0 to 100% y axis, 25/50/75 gridlines, volume histogram, two
      diamond annotations, range control, switcher with prev/next, crosshair
      tooltip, accessible summary caption, source footer and outbound link.
      Multi-outcome shows up to 4 lines with end labels.
- [ ] Every market listed in `load_market_into_chart.triggers` loads the chart
      and sets `?market=`; on mobile the chart scrolls into view.
- [ ] Movers: 8 rows of 62, sparkline, pill with arrow and sign, Hot flag,
      sort toggle, loaded row marked `aria-current`.
- [ ] Edge Board: two tabs with method lines, dumbbells, sort, High only,
      single-row expansion with the five-line math and liquidity; signed out the
      expansion is gated and the positions route returns 401.
- [ ] Top Traders: both tabs, controls per venue, medals, identicon fallback,
      verified and X chips, wallet copy with a polite announcement, efficiency
      bar, position expansion, footnotes.
- [ ] Category Map: squarified, colour by average move, venue toggle, selected
      tile, mobile stacked bar.
- [ ] Closing Soon: 7 columns from today in ET, pill intensity by
      decidedness, `+N more`, most-uncertain callout.
- [ ] Conviction: log x, spread y, trust zone and both quadrant labels,
      category colours, Kalshi hollow on volume, tooltip.

## States, motion, responsive

- [ ] Every card has loading (shape-matched shimmer), empty (names the
      filters) and error (with Retry that refetches only that card).
- [ ] Filter changes do not move the layout: row heights and card bodies are
      reserved.
- [ ] Number ticks 0.3s, card hover 0.2s, chip hover 0.15s; all off under
      `prefers-reduced-motion`.
- [ ] No horizontal page scroll at 1440, 1200, 900, 768, 375. Treemap,
      tables, Closing Soon and Edge rows follow the mobile rules.
- [ ] Mobile filter sheet opens from the Filters chip, traps focus, closes on
      Escape and returns focus.

## Accessibility

- [ ] Visible 2px emerald focus ring on every interactive element.
- [ ] Tabs are `tablist`/`tab`; chips and segments are `radiogroup`/`radio`;
      rows are buttons; expanders have `aria-expanded`; toggles `aria-pressed`.
- [ ] Charts have `role="img"` with a summary; Conviction has a visually hidden
      table fallback.
- [ ] Change is never colour alone: sign and arrow on every pill; text label
      on every confidence chip.
- [ ] `npm run lint:a11y` passes.

## Data and quality gates

- [ ] Snapshot migration applied; both crons write and prune it.
- [ ] Polymarket rows carry a category; `normalizeCategory` covers table 2.2.
- [ ] `/history`, `/leaderboard`, `/positions` use `withApiGuard`, are cached
      as specified, and fail to an empty payload the card renders as its error
      state.
- [ ] `page-model.js` functions are pure and covered by
      `npm run test:prediction-markets`, which is part of `npm test`.
- [ ] `npm run lint`, `lint:arch`, `test:security` pass.
