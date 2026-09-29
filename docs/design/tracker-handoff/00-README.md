# Politician Tracker redesign, handoff package

Everything Claude Code needs to rebuild `/datasets/politician-tracker` to the
approved P3 "Portrait gallery" design: faces first, ranked by disclosed
volume, the House vs Senate comparison in a right rail, the rest of the
ranking as a dense list, and the existing member side panel kept.

This is a redesign of a page that already works. The data contract, the
model functions, the `?member=` panel, history and focus rules all stay. What
changes is the layout, the emphasis (rank and portrait), the filters the page
never had, and the known gaps listed in the spec.

The design canvas with all three directions is the Design artifact
"Government contracts page", fifth row; P3 is the approved board.

## Files

| File | What it is |
|---|---|
| `00-README.md` | This index and the prompt to paste |
| `01-BRIEF.md` | What the page is, what changes, what stays, copy, constraints |
| `02-INTERACTIONS.json` | Filters, sort, cards and rows, the member panel, states, keyboard, URL |
| `03-TOKENS.css` | Page-scoped `ptk-` custom properties mapped onto the theme variables |
| `04-SPEC.md` | **The measured spec.** Grid, toolbar, gallery cards, right rail, dense list, panel, type scale, responsive rules, fixture |
| `05-ACCEPTANCE.md` | Ship checklist |
| `06-SHARED-CHROME.md` | The contract for the top 76px of every datasets page. Unchanged from the House package; the tracker mounts it, never draws it |
| `07-wireframe-p3.html` | The approved board, resting state, 1440 wide, static HTML |
| `08-politician-tracker-page-spec.md` | The audit of the page as it exists today (data, model, behaviour, known gaps) |

## Read this before building

- **Volume is not net worth.** Every "disclosed volume" figure is the sum of
  the midpoints of the ranges members disclose, in the loaded window. Say so
  next to the number, every time. Never call it portfolio value, wealth or
  holdings in copy.
- **Ranking is by that volume.** Default sort becomes Disclosed volume (it was
  Most trades). Most trades and Latest trade remain as options.
- **Faces are the design.** Official congressional portraits by BioGuide ID,
  initials fallback, ring colour means chamber (House emerald, Senate info
  blue). Party is a neutral letter tag, never a colour. This fixes the red
  ring for Republicans.
- **Placeholders for people.** The fixture uses `[Member name]`. Do not attach
  invented trades to real members anywhere, including demos and screenshots.
- **The builder is light and small.** `EzanaQLBar` at its shared size and
  placement. Do not touch it.
- **Do not draw the chrome.** The green nav and ticker come from the datasets
  layout. The page publishes ticker items through `usePublishTicker`, nothing
  else.
- **Components render, the model calculates.** Anything new (rank, percent of
  first, window range, filter predicates, most-traded tickers) is a pure
  function in `tracker-model.js` with a test.

## Prompt to paste

```
Redesign the Politician Tracker page at /datasets/politician-tracker to the
approved P3 "Portrait gallery" design.

Read all of these first, in order:
  tracker-handoff/08-politician-tracker-page-spec.md   what the page does today, data, model, rules, known gaps
  tracker-handoff/01-BRIEF.md                          what changes, what stays, copy, constraints
  tracker-handoff/04-SPEC.md                           the measured spec, every number
  tracker-handoff/02-INTERACTIONS.json                 filters, sort, cards, rows, the member panel, states, keyboard, URL
  tracker-handoff/03-TOKENS.css                        page tokens mapped onto theme-variables.css
  tracker-handoff/06-SHARED-CHROME.md                  the nav + ticker contract; the page mounts it, never draws it
  tracker-handoff/05-ACCEPTANCE.md                     the ship checklist
  tracker-handoff/07-wireframe-p3.html                 the approved board at 1440

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md and EZANA_BRANDING_GUIDE.md; read every file in the spec's
section 2 table (PoliticianTracker.jsx, MemberPanel.jsx, Headshot.jsx,
politician-tracker.css, tracker-model.js, headshots.js, the two API routes,
datasets/layout.js); find EzanaQLBar and usePublishTicker; find the existing
skeleton/shimmer pattern from the brand guide section 9.

Deliver in this order and stop after each for me to look:

  1. A short plan naming the files you will touch, the conventions you found,
     and the new pure functions you will add to tracker-model.js.

  2. THE MODEL. In tracker-model.js add, with tests: rankMembers(members,
     sortKey) returning rank and pctOfFirst; loadedWindow(trades) returning
     min and max tradedAt; filterMembers(members, {chamber, party, side,
     query}); topTickers(trades, n). Default sort key is "volume". No React,
     no formatting in the model.

  3. THE PAGE, STATIC AT 1440. Shared chrome untouched, centred eyebrow and
     title, EzanaQLBar as is, the toolbar (search, chamber, party, RANK BY
     segmented control), the top-eight gallery beside the right rail
     (House vs Senate cards, four split rows, monthly chart, most traded
     tickers), the dense list from rank 9 on, footer, compliance line.
     Light and dark mode. ptk- prefix, tokens from 03 only.

  4. THE MEMBER PANEL. Keep MemberPanel.jsx and its behaviour (?member=, one
     history entry, Escape, focus return, scrim). Open it from cards as well
     as rows; the open member's card or row takes the selected treatment.
     Add the party tag and chamber ring to its identity block. Add a "Show
     all N trades" expander under the 10 most recent, and a real failure
     state for the contractor section.

  5. Filters honouring ?chamber= from the old redirects, sort, shimmer
     skeletons for loading, the empty and unavailable states, then
     responsive at 1000, 640 and 375 with no horizontal scroll, then a11y,
     then eslint on src/components/datasets/politician-tracker and
     src/lib/politicians. Remove the dead .dsc-chamber CSS. Redirect the
     orphaned /datasets/house/members/[slug] and /datasets/senate/members/
     [slug] routes to /datasets/politician-tracker?member=<slug>.

Hard rules:
  - "Disclosed volume" is always captioned as the sum of the midpoints of
    disclosed ranges. Never "portfolio", "net worth", "holdings" or "returns".
  - Zero data invention: counts and midpoints only. No performance figures.
  - Portrait ring colour = chamber. Party = neutral letter tag. No red.
  - Unknown values are a middle dot. No em dashes anywhere.
  - Mono tabular numerals for every figure, ticker, date, rank and percent.
  - Tokens only, no hard-coded hex; test dark (default) and light.
  - Do not restyle the shared chrome or EzanaQLBar. Mount them.
  - Fixture names are [Member name]. Never attach invented trades to a real
    person.
  - Bootstrap Icons only. No new dependencies.
```
