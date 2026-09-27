# House Financial Disclosures, handoff package

Everything Claude Code needs to build the House disclosures page in the
datasets family, and to make the top of every datasets page uniform while it is
there.

Two things ship from this package:

1. **The page** at `/datasets/house/disclosures`: the approved E1 design, trades
   first, a quiet light EzanaQL builder, and a member side panel with its own
   URL instead of stacked modals.
2. **The shared datasets chrome**: the green dimension bar and the ticker
   conveyor belt exactly as the Government Contracts page has them today,
   extracted into one component that every `/datasets/*` page mounts. This is
   the uniformity rule, and it is in its own file so it cannot be missed.

The design canvas with every board, including the three alternates that were
not chosen, is the Design artifact "Government contracts page", fourth row.

## Files

| File                           | What it is                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00-README.md`                 | This index and the prompt to paste                                                                                                                                      |
| `01-BRIEF.md`                  | The dataset honestly described, the jobs, the approved design, copy, constraints                                                                                        |
| `02-INTERACTIONS.json`         | Every drill path, the member panel's behaviour, filters, sorting, states, keyboard                                                                                      |
| `03-TOKENS.css`                | Page tokens with the contrast working; the positive colour split; panel and scrim                                                                                       |
| `04-SPEC.md`                   | **The measured spec.** Grid, the builder, the rail, metric row, tabs, the one chart, the trades table column template, the panel, type scale, responsive rules, fixture |
| `05-ACCEPTANCE.md`             | Ship checklist, with the chrome uniformity checks first                                                                                                                 |
| `06-SHARED-CHROME.md`          | **The contract for the top 76px of every datasets page.** Dimension bar, ticker, dot colours, the centred title block, what is and is not shared                        |
| `07-wireframe-resting.html`    | The page as approved, resting state, 1440 wide                                                                                                                          |
| `08-wireframe-panel-open.html` | The same page with a member's panel open and their row selected                                                                                                         |

## Read this before building

- The builder is **light and small on purpose**. One 44px pill and one line of
  grey mono. If it starts looking like a panel, or like the point of the page,
  it is wrong. The data is the point.
- **Do not restyle the chrome on this page.** Mount the shared component. If
  the shared component does not exist yet, this task creates it from the
  Contracts page's current nav and ticker, per `06-SHARED-CHROME.md`, and then
  makes the Contracts page mount it too.
- **Brackets, never figures.** No exact dollar amount can appear. Sorting by
  size shows `~est.`.
- **Placeholders for people.** The fixture uses `[Member name]`. Do not attach
  invented trades to real members anywhere, including demos and screenshots.
- The member panel **pushes a route**. The same route renders the profile as a
  full page. That is the shareable URL journalists need.

## Prompt to paste

```
Build the House Financial Disclosures page at /datasets/house/disclosures, and
make the top of every datasets page uniform while you do it.

Read all of these first, in order:
  house-handoff/06-SHARED-CHROME.md    the contract for the nav + ticker on EVERY datasets page
  house-handoff/01-BRIEF.md            the dataset, the jobs, the approved design, copy, constraints
  house-handoff/04-SPEC.md             the measured spec, every number
  house-handoff/02-INTERACTIONS.json   drill paths, the member panel, states, keyboard
  house-handoff/03-TOKENS.css          page tokens and the contrast rules
  house-handoff/05-ACCEPTANCE.md       the ship checklist
  house-handoff/07-wireframe-resting.html
  house-handoff/08-wireframe-panel-open.html

Then survey the codebase before writing anything: read the Government Contracts
page (route /datasets/government/contracts) for its current nav, ticker, filter
rail, EzanaQL builder and modal code; find the theme variables and Tailwind
config; find the existing recharts usage for the chart contract; find how routes
and modals are done today.

Deliver in this order and stop after each for me to look:

  1. A short plan naming the files you will touch and the conventions you found.

  2. THE SHARED CHROME. Extract the Contracts page's green dimension bar and
     ticker into one component (suggested DatasetsChrome) that takes ticker
     items as its only variable prop, matching 06-SHARED-CHROME.md to the pixel.
     Mount it on the Contracts page in place of the inline markup and confirm
     nothing there changed visually. Every future /datasets/* page mounts this.

  3. THE HOUSE PAGE, STATIC. Shared chrome, centred eyebrow and title, the
     light 720x44 builder pill with the one-line query under it, the rail, the
     metric row, tabs, the one chart, the leaderboard, the trades table,
     compliance line. Light canvas, hfd- prefix, tokens from 03. At 1440.

  4. THE MEMBER PANEL. 480 wide under the chrome, over a scrim, opened from any
     member name, pushing /datasets/house/members/[slug]; the same route renders
     the full-page profile. Content and states per 04-SPEC section 6 and
     02-INTERACTIONS. No stacked modals anywhere on this page.

  5. Filters, sorting with the ~est. rule, the builder's seed-and-expand
     behaviour, every state in 02-INTERACTIONS (loading, pending, none, sample,
     empty, no date, unknown type), then responsive down to 390 with the trades
     view as cards, then a11y.

Hard rules:
  - The builder is never dark and never larger than the 720x44 pill plus one
    mono line at rest. Expanded, it stays on white under 720 wide.
  - No exact dollar figure anywhere. Brackets verbatim. ~est. on any size sort.
  - Every trade row links to its source PDF at the Clerk.
  - Member names in the fixture are [Member name]. Never attach invented trades
    to a real person.
  - Sell is not red. Buy and sell use the two treatments in 03-TOKENS.css.
  - Mono tabular numerals for every figure, ticker, date, lag, bracket, rank.
  - No em dashes. Unknown values are a middle dot.
  - No new dependencies. Bootstrap Icons only. Recharts for the chart.
  - Do not restyle the shared chrome on this page. Mount it.
```
