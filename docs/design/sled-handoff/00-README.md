# Social ledger section, handoff package v2 (Ezana integration)

Everything Claude Code needs to rebuild the LAYOUT of the social investing section (`src/components/landing/SocialLedgerSection.jsx` + `social-ledger.css`) while keeping the section's shipped typography and its shipped chart.

## Scope, read this first

Adopted from the design handoff (files `01` to `06`):

- The design, sizing, positioning and layout: the fluid formulas, proportional grid, rule system, ledger and standings sheets one height by structure, the rating block as the hero object, table columns, spacing, and the section geometry at every width.
- The 7.2s choreography (one clock; ledger line writes and pushes rows down; rating ticks by the delta; standings row updates in place per the fixture correction), except where it touches the chart (below).
- The fixture, including the in-place standings correction.

Kept exactly as shipped (NOT adopted from the handoff):

- **Typography.** Every text role keeps its current face, weight, letter-spacing, casing and color rules from the existing `social-ledger.css`, which route through the platform `--type-*` tokens. The spec's section 8 type scale is not applied. Only SIZES that the new layout defines move: the rating figure (hero size per spec section 6) and the headline and subhead fluid clamps that the grid depends on. Everything else keeps its current size.
- **The chart.** The existing recharts chart is retained with its current aesthetics and interactivity: emerald gradient area with dashed grid, current tick styling, current stroke widths, dynamic domain, the tooltip, the cohort pills and their 400ms switching. Not adopted: the prototype's hand-drawn geometry, underline tabs, direct end-labels, fixed 1390 to 1540 domain, endpoint halo treatment. Only the chart container's dimensions and position follow the spec.

`07-EZANA-INTEGRATION.md` records exactly which rules are frozen and how the choreography's chart beat maps onto the retained recharts chart. It wins over the design files where they conflict.

## Files

| File                      | What it is                                                                                  | Status                   |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| `00-README.md`            | This index, scope, and the prompt to paste                                                  | v2                       |
| `01-BRIEF.md`             | Product truths, direction, palette rule, copy, constraints                                  | Claude Design, unchanged |
| `02-TIMELINE.json`        | The 7.2s loop as beats                                                                      | Claude Design, unchanged |
| `03-TOKENS.css`           | Section-scoped tokens, both shells                                                          | Claude Design, unchanged |
| `04-SPEC.md`              | The measured spec, formulas first                                                           | Claude Design, unchanged |
| `05-ACCEPTANCE.md`        | Ship checklist                                                                              | Claude Design, unchanged |
| `06-prototype.html`       | Full prototype source                                                                       | Claude Design, unchanged |
| `07-EZANA-INTEGRATION.md` | Frozen typography and chart rules, chart-beat mapping, preserved code, acceptance additions | v2                       |

Prototype: https://claude.ai/artifact/QnSH28NkHEqipT7ovpkz1k

## How to use it

1. Delete any existing `sled-handoff*` folder at the repo root, unzip this package there so the paths below resolve.
2. Paste the prompt below.
3. Keep the prototype open beside the dev server for layout comparison; for type and chart comparison, the reference is the CURRENT production section, not the prototype.

## Prompt to paste

```
Rebuild the LAYOUT of the social investing section of the Ezana landing page
(src/components/landing/SocialLedgerSection.jsx + social-ledger.css). The
section works and its typography and chart are approved; what changes is the
composition: fluid grid, rule system, sheets one height by structure, the
rating block as the hero, table columns, spacing, and the 7.2s choreography.

Read all of these first, in order:
  sled-handoff-v2/00-README.md            scope: what is adopted, what is kept
  sled-handoff-v2/07-EZANA-INTEGRATION.md frozen typography and chart rules;
                                          wins over the design files on conflict
  sled-handoff-v2/01-BRIEF.md             product truths, direction, copy
  sled-handoff-v2/04-SPEC.md              measured spec, formulas first
                                          (section 8 type scale NOT applied;
                                          section 7 chart: container size and
                                          position only)
  sled-handoff-v2/02-TIMELINE.json        the 7.2s loop
  sled-handoff-v2/03-TOKENS.css           layout tokens for both shells
  sled-handoff-v2/05-ACCEPTANCE.md        ship checklist, as amended by 07
  sled-handoff-v2/06-prototype.html       reference for geometry and motion

Then survey the codebase before writing anything: read the current
SocialLedgerSection.jsx and social-ledger.css in full and inventory every
typography rule (face, weight, tracking, casing, color per role) and the
entire recharts chart block (data, cohort pills, switching, tooltip, props);
those are frozen and must be carried into the new markup unchanged. Find the
--landing-gap rhythm system, the IntersectionObserver pattern, and
src/app/theme-variables.css for the --type-* tokens the section already uses.

Deliverable: SocialLedgerSection.jsx and social-ledger.css rebuilt to the
spec's layout system and timeline, with the shipped typography and the
shipped chart intact, every item in 05-ACCEPTANCE.md satisfied except the
ones 07 amends, and the responsive matrix in 07 passed with screenshots.

Hard rules:
  - Fluid layout: proportional grid columns and the spec's formulas; no
    per-breakpoint fixed widths.
  - Typography frozen: existing face/weight/tracking/casing/color per role.
    Only the rating figure size (spec section 6) and the headline and subhead
    fluid clamps change. No other size, weight or tracking edits.
  - Chart frozen: the existing recharts chart, pills, switching and tooltip
    are moved into the new grid cell, not restyled. Do not port the
    prototype's chart, tabs, direct labels or domain.
  - Sheets one height by structure (align-items: stretch, flex: 1 1 0 entries),
    never by tuned padding.
  - One clock drives the loop; the rating, the chart's extending segment
    (via the existing recharts draw) and the standings never drift apart.
  - The ledger line animates height so rows below are pushed down.
  - prefers-reduced-motion resolves to the composed frame; nothing at zero
    height or opacity. Ticks only in viewport; pause, do not unmount.
  - No Math.random, no new dependencies, no framer-motion or GSAP, Bootstrap
    Icons only, no em dashes (unrated events show a middle dot).
  - Not a takeover: normal scrolling section, no lock, no arrows.
  - Fixture only, spec section 11 with the in-place standings correction.

Work in this order and stop after each for me to look:
  1. A short plan: files to touch, the frozen typography inventory, the frozen
     chart block, and the conventions found.
  2. Static markup, tokens and rule system at 1440, light shell, no motion,
     with the existing chart and pills mounted in their new cell.
  3. The dark shell, then verify cohort switching and tooltip still work.
  4. The choreography per 02-TIMELINE.json.
  5. Fluid behaviour across the matrix in 07, then reduced motion, viewport
     gating and a11y.
```
