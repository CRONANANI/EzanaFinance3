# Datasets hub console rail, handoff package

Everything Claude Code needs to restyle the `/datasets` overview (the Sonar
floor) to the approved **V1.1 "Console rail below the deck"** design:

1. The news belt loses its white-ringed pills and becomes one dark glass band
   with mint hairline dividers.
2. The seven-dimension visualization around the sonar deck is replaced by a
   console rail of seven channel strips docked BELOW the deck, each edged in
   its dimension's colour, wired to the deck through a bus line.
3. The sonar deck itself (the isometric radar card), the search bar, the Ping
   button and the globe ground stay exactly as they are.

The design canvas is the Design artifact "Prediction Markets Wireframe",
page **Datasets hub** (https://claude.ai/artifact/T6MUeJtFEPXcg2WYwEJ88Y).
The approved board is **Hub V1.1 · Console rail below the deck**; its source is
copied into `06-wireframe/` so this package stands alone.

## Files

| File                   | What it is                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `00-README.md`         | This index and the prompt to paste                                                    |
| `01-BRIEF.md`          | What changes, what stays, copy, honesty rules, constraints                            |
| `02-INTERACTIONS.json` | Strip behaviour, selection, ticker, states, keyboard                                  |
| `03-TOKENS.css`        | Page-scoped `dcr-` custom properties mapped onto the theme and band tokens            |
| `04-SPEC.md`           | **The measured spec.** The band, the rail, a strip's anatomy, the bus, responsive     |
| `05-ACCEPTANCE.md`     | Ship checklist                                                                        |
| `06-wireframe/`        | Canvas source: `Hub-V1B.dc.html` (approved), `Hub-V1.dc.html` (rail-above alternate)  |

### About `06-wireframe/`

The `.dc.html` files are Design canvas components: plain HTML with inline
styles plus a small `renderVals()` script holding fixture data. Read them for
structure, spacing and copy. Do not port the markup verbatim: the mock inlines
hex values because the canvas cannot read the app's stylesheets; the build uses
the tokens in `03-TOKENS.css`. The mock's nav strip, search pill and the flat
CSS stand-in for the sonar deck are placeholders for components that already
exist and are not part of this change.

## Read this before building

- **The deck is untouched.** The isometric radar card, its rings, sweep and
  blips are the existing `OrbitalMap` deck. This change only replaces the
  dimension marks around it and restyles the news belt.
- **No invented data.** Strip counts, ticks and live/roadmap status come from
  `DATASET_TAXONOMY` exactly as today's `ORBIT_DIMS` mapping derives them.
  The waveform is an ambient signal mark, `aria-hidden`, with no axes and no
  implied time series: amplitude scales with the live share, a flat dashed
  line for roadmap dimensions. Never present it as a chart.
- **Dimension colours are the fixed dot colours** from the shared chrome
  contract (see `03-TOKENS.css`). Never reassign them.
- **The belt is calm.** One band, hairline dividers, no pills, no white ring,
  no new border anywhere on it. Keep the existing marquee behaviour, hover
  pause and the `prefers-reduced-motion` hand-scroll fallback.

## Prompt to paste

```
Restyle the /datasets overview (Sonar floor) to the approved V1.1 "Console
rail below the deck" design.

Read all of these first, in order:
  docs/design/hub-console-handoff/01-BRIEF.md          what changes, what stays, copy, honesty rules
  docs/design/hub-console-handoff/04-SPEC.md           the measured spec, every number
  docs/design/hub-console-handoff/02-INTERACTIONS.json strip behaviour, selection, ticker, states, keyboard
  docs/design/hub-console-handoff/03-TOKENS.css        page tokens mapped onto theme-variables.css
  docs/design/hub-console-handoff/05-ACCEPTANCE.md     the ship checklist
  docs/design/hub-console-handoff/06-wireframe/        canvas source; Hub-V1B.dc.html is the approved board

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md and docs/EZANA_BRANDING_GUIDE.md; read
src/app/datasets/page.js, src/app/datasets/sonar/* (OrbitalMap.jsx, Radar.jsx,
OrbitalNewsTicker.jsx, SonarSelection.jsx, derive.js, sonar.css,
orbital-map.css), src/components/datasets/NewsBelt.jsx, news-belt.css,
DatasetChrome.jsx, and src/lib/datasets/taxonomy.js. Map exactly which marks
OrbitalMap draws for the seven dimensions today and where the deck ends and
the dimension scene begins.

Deliver in this order and stop after each for me to look:

  1. A short plan: the component boundary you found between the deck and the
     dimension marks, the files you will touch, and what gets deleted.

  2. THE BELT. Restyle NewsBelt to the glass band (no pills, no white ring)
     per 04-SPEC section 2, keeping NewsBelt.jsx's marquee, hover pause,
     useTickerSpeed and reduced-motion behaviour, and both of its mounts.

  3. THE RAIL, STATIC AT 1440. Replace the dimension marks around the deck
     with the console rail docked below it: seven strips from ORBIT_DIMS in
     taxonomy order, the bus, the stems, the deck feed line. Deck, search,
     status line and globe untouched. dcr- prefix, tokens from 03 only.

  4. BEHAVIOUR. Strip select wires into the existing SonarSelection (same
     ?dimension= URL state and panels as today's marks), keyboard and focus
     per 02-INTERACTIONS.json, roadmap strips at reduced opacity routing to
     the dimension's roadmap view.

  5. States (loading shimmer on counts, ticker empty, selection), responsive
     at 1200, 900 and 375 per 04-SPEC section 6, a11y, then npm run lint,
     lint:branding, lint:css, lint:a11y and check:copy.

Hard rules:
  - Do not touch the deck, the search pill, the Ping button, GlobeBackground
    or the ping/results flow.
  - Tokens only, no hard-coded hex outside the fixed dimension dot colours,
    which live once as the dcr- hue tokens in 03-TOKENS.css.
  - The waveform is decorative and aria-hidden; counts and ticks are real
    taxonomy values. No invented numbers anywhere.
  - No pills and no outline on the belt; hairline dividers only.
  - Mono tabular numerals for counts and the status line; names in sans.
  - No em dashes in UI copy. Bootstrap Icons only. No new dependencies.
  - This page is light-locked green: verify it renders identically with the
    app in light mode and in dark mode.
```
