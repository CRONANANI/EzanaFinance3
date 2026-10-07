# Capitol Watch hub redesign (final hybrid), handoff package

Everything Claude Code needs to rebuild `ezana.world/datasets/capitol-watch`
to the approved final hybrid design.

Top to bottom, the page is:

1. **The shared dimension nav**, unchanged (`06-SHARED-NAV.md`).
2. **Header with EzanaQL.** Left-aligned title, stats and EzanaQL bar; the
   generated results render as a table on the right.
3. **Top signals this week.** One high-signal event per view, full width,
   flipped with arrows and a preview strip of the next five.
4. **Tell us what high signal means to you.** A three-step rule builder:
   pick overlapping datasets, set conditions, preview and save as My
   signals.
5. **Signals across datasets.** One tabbed panel (A to E), opening on
   trades near contract awards with a price chart per row.
6. **Where oversight and ownership overlap.** The committee by sector
   heatmap, with a selected-cell detail.
7. **Who reads contract awards best.** The leaderboard, with the Quick Step
   badge icon in Ezana gold.
8. **Congress's portfolio.** Sixteen most widely held stocks in two columns.
9. **The five dataset cards, then the sources footer.**

The design canvas is the Design artifact "Capitol Watch hub redesign". The
approved board is the third row, marked FINAL. The explored directions, the
signal card variants, the member drawer and the mobile boards are above it.

## Files

| File | What it is |
|---|---|
| `00-README.md` | This index and the prompt to paste |
| `01-BRIEF.md` | What the page is for, what changes, what stays, copy, constraints, open decisions |
| `02-INTERACTIONS.json` | EzanaQL flow, the carousel, the rule builder, tabs, heatmap selection, drawer, states, URL, keyboard |
| `03-TOKENS.css` | Page-scoped `cwh-` custom properties mapped onto the theme variables, including the gold |
| `04-SPEC.md` | **The measured spec.** Every section, grid, column template, chart, type scale, responsive rules, data contract |
| `05-ACCEPTANCE.md` | Ship checklist |
| `06-SHARED-NAV.md` | **The top nav contract.** Identical on every dataset and hub page; this page mounts it |
| `07-wireframe-final.html` | The approved board, 1440 wide, static HTML |
| `reference/signal-card-variants.html` | The high-signal event card: three variants and all five states (the final uses the Dossier layout with Timeline's chart and facts) |
| `reference/member-drawer.html` | The drill-in profile drawer opened from any row |
| `reference/mobile-pattern.html` | The 390 wide pattern: collapsed nav, swipeable events, stacked rows |
| `09-capitol-watch-hub-design-brief.md` | Your original brief: what the page does today, data per module, new modules |

## Read this before building

- **The nav does not change.** Mount the shared dimension nav. If it is
  currently inline on each page, extract it once (see `06-SHARED-NAV.md`).
- **Honesty is part of the layout.** Amounts are disclosed ranges, holdings
  are "inferred", returns say what they are measured from, and every module
  ends with its window and named public sources. These lines are required
  elements, not footnotes to cut when space is tight.
- **Signal strength is a count, not a score.** "3 of 5 datasets" means three
  datasets link the event. Do not invent a composite score.
- **User rules filter public records.** The rule builder never predicts
  prices. Its copy says so.
- **Placeholders for people.** The fixture uses `[Member name]`,
  `[Insider name]`, `[Institution]` and `[Whale]`. Never attach invented
  trades to a real person in fixtures, stories or screenshots.
- **Gold is a deliberate exception.** The Ezana design system reserves gold
  (`#d4a853`) for the Partner app and says not to mix it with emerald. The
  founder chose gold for the Quick Step badge icon. Scope it to the badge
  icon and the Quick Step explainer only.
- No em dashes in UI copy. Bootstrap Icons only. Never name backend
  infrastructure; name only the public sources.

## Prompt to paste

```
Rebuild the Capitol Watch hub page at /datasets/capitol-watch to the approved
"final hybrid" design in this package.

Read all of these first, in order:
  cw-handoff/09-capitol-watch-hub-design-brief.md   what the page does today, data per module, sources
  cw-handoff/01-BRIEF.md                            what changes, what stays, copy, constraints
  cw-handoff/06-SHARED-NAV.md                       the top nav; identical on every dataset and hub page
  cw-handoff/04-SPEC.md                             the measured spec and the data contract
  cw-handoff/02-INTERACTIONS.json                   EzanaQL, carousel, rule builder, tabs, heatmap, drawer, states
  cw-handoff/03-TOKENS.css                          page tokens mapped onto theme-variables.css
  cw-handoff/05-ACCEPTANCE.md                       the ship checklist
  cw-handoff/07-wireframe-final.html                the approved board at 1440
  cw-handoff/reference/*                            signal card states, member drawer, mobile pattern

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md and EZANA_BRANDING_GUIDE.md; find the current Capitol
Watch hub route and components, the shared dimension nav, the EzanaQL bar and
its Capitol-scoped query endpoint, the five signal endpoints (trades near
awards, award readers, committee confidence, lobbying and contracts, raisers
who trade), the inferred-holdings source, the company card, the watchlist /
save / account modal, and the skeleton pattern.

Deliver in this order and stop after each for me to look:

  1. A short plan: files you will touch, which endpoints feed which module,
     what is new data versus existing, and what you will delete.

  2. THE DATA LAYER. Pure functions (no React) with tests:
     rankHighSignalEvents(events) by linked-dataset count then recency;
     matchSignalRule(rule, records) returning events and a count;
     heatmapCell(committee, sector) returning share, holders and members;
     congressPortfolio(holdings, {party, chamber}) returning member counts
     and summed disclosed-range estimates. No formatting inside them.

  3. THE PAGE, STATIC AT 1440. Shared nav mounted, the header grid with the
     EzanaQL bar left and the results table right, the top-signal carousel
     (one event, full width), the rule builder, the tabbed signals panel,
     heatmap plus leaderboard, Congress's portfolio, dataset cards, sources.
     cwh- prefix, tokens from 03 only. Light and dark mode.

  4. INTERACTION. EzanaQL generate and run into the results table; ticker to
     company card; carousel arrows, preview strip and keyboard; the rule
     builder's dataset toggles and conditions updating the live match count;
     saving a rule to My signals (account-gated); tab switching; heatmap
     cell selection; the member drawer from any member name with its own
     URL.

  5. Every state in 02-INTERACTIONS (loading per module, empty, error,
     signed out, preview), responsive at 1200, 1000, 640 and 375 with no
     horizontal page scroll, reduced motion, a11y, lint, and removal of the
     old layout's dead code.

Hard rules:
  - The top nav is the shared component, untouched.
  - Every module shows its time window and named public sources.
  - Amounts are disclosed ranges; holdings are "inferred"; returns state what
    they are measured from.
  - Signal strength is the count of linked datasets. No composite scores.
  - Gold #d4a853 appears only on the Quick Step badge icon and its explainer.
  - Emerald means brand, gain and selection; red only for losses. Party marks
    are blue (D) and orange (R), never red.
  - Mono tabular numerals for every number, ticker, date and percentage.
  - Fixture people are placeholders. Never invent trades for a real person.
  - No em dashes. Bootstrap Icons only. No new dependencies. Never name
    backend infrastructure in the UI.
```
