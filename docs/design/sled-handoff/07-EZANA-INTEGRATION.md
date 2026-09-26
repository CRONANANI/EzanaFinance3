# 07: Ezana integration decisions (wins over 01 to 06 on conflict)

## A. Typography: frozen to the shipped section

The spec's section 8 type scale is NOT applied. Carry the existing rules from `social-ledger.css` into the rebuilt markup unchanged. Inventory as shipped (verify against the file; it is the source of truth):

| Role                                                                             | Shipped rule (keep)                                                                                                                              | Size change allowed?                                                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Eyebrows (`.sled-eyebrow`, `.sled-chart-label`)                                  | `var(--font-mono)`, `var(--type-eyebrow-size)` / `-weight` / `-tracking-marketing`, uppercase, tabular                                           | No                                                                                                                |
| Headline (`.sled-heading`)                                                       | `font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary)`                                                                          | Size only: adopt the spec's fluid clamp for the headline because the grid depends on it; weight and tracking stay |
| Subhead (`.sled-sub`)                                                            | `color: var(--text-muted)`, current weight                                                                                                       | Size only: adopt the spec's fluid clamp                                                                           |
| Rating figure (`.sled-rating`)                                                   | `var(--font-mono)`, weight 700, tabular, current color                                                                                           | Size only: adopt spec section 6 hero size (`clamp(62px, 8.6vw, 124px)`), this IS the layout change                |
| Ledger row body (`.sled-row-body`)                                               | 13.5px sans, `--text-secondary`, strong at 700 `--text-primary`                                                                                  | No                                                                                                                |
| Deltas (`.sled-delta`)                                                           | mono 12px 700 `var(--emerald)`                                                                                                                   | No (see palette note)                                                                                             |
| Timestamps (`.sled-time`)                                                        | mono 11px `--text-faint`                                                                                                                         | No                                                                                                                |
| Standings name (`.sled-tile-name`)                                               | 14px 600 `--text-primary`                                                                                                                        | No                                                                                                                |
| Standings rating (`.sled-tile-elo`)                                              | mono 1rem 700 tabular; your row `var(--emerald)`                                                                                                 | No                                                                                                                |
| Cohort pills (`.sled-pill`)                                                      | sans 12px 500 `--text-muted`, current active style                                                                                               | No: pills stay pills (the spec's underline tabs are not adopted)                                                  |
| Table column heads, foot rows, ladder tick labels (new elements from the layout) | Use the shipped eyebrow rule for column heads and the shipped timestamp rule for ladder ticks and foot notes, so no new type style is introduced | n/a                                                                                                               |

Palette note: the handoff splits emerald into `--sled-pos` (text) and `--sled-pos-mark` (marks) because `#10b981` is 2.21:1 on white; shipped deltas and your standings rating use `var(--emerald)` as text in light mode. Per the freeze this is NOT changed by default. Opt-in (one line each) if the operator wants the light-mode contrast fix: point `.sled-delta` and the your-row `.sled-tile-elo` color at a text-safe emerald token; nothing else.

## B. Chart: frozen to the shipped recharts block

Move the existing chart block into the spec's chart cell without restyling it:

- Keep: recharts `AreaChart` with the current data builder, `key={cohort}` remount for the 400ms draw, current gradient, `CartesianGrid` dashed `3 3`, current tick styling, current stroke widths and colors (`var(--emerald)` you, `var(--text-faint)` / `var(--text-ghost)` comparisons), the dynamic `['dataMin - 16', 'dataMax + 16']` domain, the tooltip component and its CSS, the cohort pills and their switching.
- Not adopted from spec section 7 or the prototype: hand-drawn geometry, underline tabs, direct end-labels with halos, the fixed 1390 to 1540 domain and its tick set, endpoint dot treatment, the 760 x 260 internal padding table.
- Adopt from spec section 7: the chart CONTAINER's dimensions and position in the grid, and the `ResponsiveContainer` height that produces them at each width.
- Fixture: the friends leader series ends at 1512 (Daniel R.) per the handoff's revision; update the data constants only.

Chart beat in the choreography: the timeline's "chart extends its last segment" beat is implemented by the existing recharts draw (remount or data update on the master clock), not by a custom path animation. The rating tick and the chart update fire on the same clock tick so the causal read holds.

## C. Preserved code

The existing IntersectionObserver gating, reduced-motion handling, `sled-` prefix, and `--landing-gap` participation are re-wired to the new structure, not rewritten. Copy is unchanged. Section position on the page is unchanged (between Getting Started and Integrations).

## D. Responsive matrix (Stage 5 gate)

The spec is fluid by formula; verify it, both shells, at: 1280 x 720, 1366 x 768, 1440 x 900, 1536 x 864, 1600 x 900, 1920 x 1080, 2560 x 1440, 1024 x 768, 768 x 1024, 390 x 844, 360 x 800, 430 x 932. At each: ledger and standings sheets share top and bottom edges, the chart cell matches the spec's computed size within rounding, no clipped numerals, headline wraps to at most two lines, pills and tooltip usable (tap on touch).

## E. Acceptance amendments

Apply `05-ACCEPTANCE.md` except: any item asserting the spec type scale (faces, weights, trackings, 9.5px column heads, `.18em` labels) is replaced by "typography matches the shipped section rule for that role"; any item asserting the prototype chart treatment (underline tabs, direct labels, fixed domain, halo) is replaced by "the shipped recharts chart, pills, switching and tooltip are present and unchanged inside the new cell". Additions: `npm run build` green; standing check scripts green; `grep -n "Math.random"` on the section returns nothing; no framer-motion or GSAP import in the section; the Echo frozen canonical is untouched (this work does not touch it, verify only).
