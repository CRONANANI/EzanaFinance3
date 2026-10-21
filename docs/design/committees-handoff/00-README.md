# Committee Assignments redesign, handoff package

Everything Claude Code needs to rebuild `/datasets/committees` from a
directory into a dataset: Congress at a Glance, the Committee Atlas, Gavels,
the Committee Profile, the Oversight Map, Seat Load, Trades in Overseen
Sectors, the Committee Holdings Matrix (first UI for
`hub_committee_ticker_stats` on this page), Hearings (shipping with its
honest not-yet-available state), and Member Lookup, under one sticky control
bar.

The design canvas is the Design artifact "Prediction Markets Wireframe",
page **Committees** (https://claude.ai/artifact/T6MUeJtFEPXcg2WYwEJ88Y). Its
source is copied into `08-wireframe/` so this package stands alone.

## Files

| File                   | What it is                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `00-README.md`         | This index and the prompt to paste                                                                |
| `01-BRIEF.md`          | What changes, what stays, copy, honesty rules, constraints                                        |
| `02-INTERACTIONS.json` | Controls, URL and deep links, per-card interactions, states, keyboard                             |
| `03-TOKENS.css`        | Page-scoped `cmx-` custom properties mapped onto `theme-variables.css`                            |
| `04-SPEC.md`           | **The measured spec.** Grid, controls, each card's anatomy and numbers, responsive rules          |
| `05-ACCEPTANCE.md`     | Ship checklist                                                                                    |
| `06-DATA.md`           | Data contract per card: existing routes, the three small extensions, model functions              |
| `07-DATA-INVENTORY.md` | The source audit this design was drawn from (volumes, fields, routes, gaps). Read it first        |
| `08-wireframe/`        | Canvas source: `Cmx-Main.dc.html` (full page), the ten `Cmx*.dc.html` cards, the `States-*` boards, `Cmx-Spec`, and `cmx.css` |

### About `08-wireframe/`

The `.dc.html` files are Design canvas components: plain HTML with inline
styles plus a `renderVals()` script holding fixture data. Read them for
structure, spacing, class names and copy; do not port markup verbatim and do
not copy fixture values into the app. `cmx.css` mirrors the theme tokens so
the mocks render standalone; the build reads the real tokens. The mock's nav
strip stands in for the shared datasets chrome.

## Read this before building

- **The brief's honesty rules are binding** (`07-DATA-INVENTORY.md` section
  1.7): overseen-sector trades are a fact pattern, never implied misconduct;
  sector links are editorial and always carry the jurisdiction note; open
  positions are labelled inferred from disclosures; amounts are ranges;
  honest empties.
- **People are placeholders in every fixture**: `[Member name]` only. Real
  committee names, codes and seat counts are public structure and fine; no
  invented trade, holding or position ever attaches to a real person.
- **Party is never a colour.** The neutral bordered letter tag from
  Politician Tracker; majority vs minority is emerald vs chart blue with a
  text label beside every bar.
- **Cards draw no outline** (`ds-cards.css`): `cmx-card` is already on the
  shell list.
- **Hearings ship honest.** The default state is "Hearing schedules are not
  available yet." over a ghost timeline; the populated state is designed and
  waits for the ingest fix. Do not wire the 118 dateless rows into the UI.
- **Components render, the model calculates.** Shares, histograms, heat
  scales, timeline scaling and range parsing live in a pure
  `src/lib/congress/committees-page-model.js` with tests.

## Prompt to paste

```
Rebuild the Committee Assignments page at /datasets/committees to the
approved ten-card design.

Read all of these first, in order:
  docs/design/committees-handoff/07-DATA-INVENTORY.md   what data exists, volumes, fields, honesty rules, gaps
  docs/design/committees-handoff/01-BRIEF.md            what changes, what stays, copy, constraints
  docs/design/committees-handoff/06-DATA.md             data per card, the three small extensions, model functions
  docs/design/committees-handoff/04-SPEC.md             the measured spec, every number
  docs/design/committees-handoff/02-INTERACTIONS.json   controls, deep links, per-card behaviour, states, keyboard
  docs/design/committees-handoff/03-TOKENS.css          page tokens mapped onto theme-variables.css
  docs/design/committees-handoff/05-ACCEPTANCE.md       the ship checklist
  docs/design/committees-handoff/08-wireframe/          canvas source; Cmx-Main.dc.html is the full page

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md and docs/EZANA_BRANDING_GUIDE.md; read
src/app/datasets/committees/* (CommitteesClient.jsx, committees.css),
src/app/api/committees/** and /api/congress/meetings,
src/lib/congress/committee-sectors.js, where hub_committee_ticker_stats is
called today, the ds-cards.css outline rule, and the Politician Tracker
(member panel, party tag, headshot fallback) as the family benchmark. Map
what the current two-view page does so the ?committee= and ?member= deep
links keep working.

Deliver in this order and stop after each for me to look:

  1. A short plan: files you will touch, what gets deleted (the accordion,
     the two-view split), the new pure functions for
     committees-page-model.js, and the three data extensions.

  2. THE MODEL. src/lib/congress/committees-page-model.js with tests
     (scripts/check-committees-page.mjs wired as test:committees-page,
     appended to npm test): seatSplit, atlasSizeClass, seatHistogram,
     mostSeated, oversightLinks, heatScale, tradeSummary, rangeDotSize,
     timelineLayout, hearingsAvailable. No React, no formatting.

  3. DATA. The three extensions from 06-DATA.md: seat counts on the members
     list, the overseen-trades window summary with paging, and a route
     exposing hub_committee_ticker_stats for the matrix. Cache-only reads
     through @/lib/supabase, rate limited like the existing routes.

  4. THE PAGE, STATIC AT 1440, DARK AND LIGHT. Shared chrome kept, header,
     sticky controls, the ten cards in the spec's order and spans, sign-up
     band, source line and sector note. cmx- prefix, tokens from 03 only,
     no card outlines, headshots with initials fallback.

  5. BEHAVIOUR. Controls drive every card and the URL; any committee click
     loads the profile and any member click loads the lookup; ?committee=
     and ?member= deep links scroll their card into view; subcommittee chips
     swap the roster; oversight hover highlighting; matrix cell tooltips.

  6. States for every card (loading shimmer, filtered-to-empty naming the
     filters, error with per-card Retry; Hearings defaults to not yet
     available), phone 390 with the filter sheet (atlas as a list, matrix
     as a ranked list), a11y, then npm run lint, lint:branding, lint:css,
     lint:a11y, lint:arch and the new test.

Hard rules:
  - Honesty rules from 07-DATA-INVENTORY.md section 1.7 are non-negotiable;
    the disclosure-pattern footnote sits on Cards 7, 8 and 10, the sector
    note wherever sector links show, and inferred-from-disclosures wherever
    open positions show.
  - People in fixtures are [Member name]; never attach an invented trade,
    holding or position to a real member.
  - Party is the neutral letter tag; majority/minority bars are --emerald vs
    --echo-chart-blue with text labels; no new reds or blues; no gold.
  - Attribute only "House Clerk and Senate records via the
    congress-legislators project" and "Periodic Transaction Reports".
  - Trade amounts are disclosure ranges everywhere, including the belt.
  - No em dashes in UI copy. Mono tabular for numbers, tickers, dates and
    committee codes; never mono for prose. Bootstrap Icons only.
  - Tokens only, no hex; the --echo-chart-* promotion to :root is a shared
    prerequisite with the Prediction Markets and Lobbying packages (check
    whether a prior build already added it).
  - No new dependencies unless the plan names one and I approve it.
```
