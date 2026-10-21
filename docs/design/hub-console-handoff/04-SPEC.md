# Datasets hub console rail, measured spec

All sizes in px unless noted. Colours are `03-TOKENS.css` names; `--dim` is
the strip's dimension hue. Numbers and the status line are `--dcr-mono` with
tabular numerals; names are `--dcr-sans`. The reference board is
`06-wireframe/Hub-V1B.dc.html` at 1440.

## 1. Scene order (desktop, top to bottom)

1. Shared top bar with the restyled belt (section 2).
2. Search pill and Ping (existing, untouched).
3. Status line (section 3).
4. Sonar deck (existing, untouched).
5. Bus (section 5).
6. Console rail, seven strips (section 4).

The rail column is 1240 wide, centred. The deck keeps its current size and
position; the rail sits below it with the bus bridging the gap.

## 2. The belt (news ticker)

- One band: height 46, radius 12, fill `--dcr-belt-bg`. **No border, no
  shadow, no per-item pill.** Soft-edge mask 56px each side (keep today's
  mask pattern).
- Item: inline row, padding 0 20, gap 10, single line.
  - Icon 13px in `rgba(255,255,255,0.8)`, `aria-hidden`.
  - Headline 13.5 / 500, tracking -0.01em, `--dcr-ink-soft`; the money or
    delta inside it is 600 in `--dcr-belt-value`.
  - Meta mono 10 / 600, tracking 0.08em, uppercase, `--dcr-belt-meta`.
- Divider: `border-left: 1px solid --dcr-belt-divider` on every item except
  the first. This replaces the pill ring entirely.
- Motion, pause, reduced-motion and both mounts unchanged from
  `NewsBelt.jsx`.

## 3. Status line

Centred, mono 10.5 / 600, tracking 0.18em, uppercase, `--dcr-ink-mute`; the
`{live} OF {total} DATASETS LIVE` segment in `--dcr-mint`. 10px below it the
deck begins. Counts from `taxonomyCounts`, never literals.

## 4. A channel strip

Seven strips in one row: `display: flex; gap: 12px`, each `flex: 1 1 0;
min-width: 0` (about 167 wide at 1240).

Anatomy, top to bottom (padding 12 12 10, column gap 9):

| Part     | Spec                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Chrome   | fill `--dcr-strip-bg`, 1px `--dcr-strip-border`, radius `--dcr-strip-radius`                                       |
| Head     | 7px hue dot with a soft hue glow + name 11.5 / 600, tracking -0.01em, `--dcr-ink-soft`, single line ellipsis        |
| Waveform | full width x 34, SVG, `aria-hidden`. Baseline 1px `rgba(255,255,255,0.1)`. Line 1.5px `--dim`, round joins. Amplitude proportional to live share (max ±11 from baseline). Roadmap: flat line on the baseline, dash `3 5` |
| Ticks    | one per dataset: 10 x 4, radius 2, gap 4. Live: filled `--dim`. Roadmap: transparent with a 1px inset ring `--dcr-tick-hollow` |
| Foot     | count mono 12 / 700 `--dcr-ink-soft` left; status mono 9 / 600, tracking 0.14em right: `LIVE` in `--dcr-live`, `ROADMAP` in `--dcr-road` |

States:

- Hover: fill `--dcr-strip-bg-hover`, border `--dcr-strip-border-hover`,
  0.15s.
- Selected: border solid `--dim`, fill `--dcr-strip-selected-tint`,
  `aria-pressed="true"`; stem at `--dcr-stem-selected`.
- Roadmap: whole strip at `--dcr-road-opacity`.
- Focus: 2px `--dcr-focus` ring, offset 2.
- Loading (counts not yet known): shimmer blocks in place of ticks and count;
  head renders immediately.

## 5. The bus

Sits between deck and rail, height 64, `aria-hidden`, presentational only:

- **Feed line:** at the rail's horizontal centre, 1px wide, from y -10 to the
  bus hairline (height 47), gradient from transparent down into
  `rgba(110,231,183,0.5)`-strength mint; a 7px `--dcr-node` dot with a soft
  glow at its top, tucked under the deck's base.
- **Bus hairline:** full rail width at y 37, 1px, horizontal gradient
  transparent → `--dcr-bus` (18% to 82%) → transparent.
- **Stems:** each strip draws a 1px stem rising 27 from its top centre
  (spanning bus y 37 to 64), gradient from `--dcr-stem` at the strip up into
  near-transparent, meeting the hairline exactly. Selected strip's stem uses
  `--dcr-stem-selected`.
- Optional pulse: a 2px dot travelling a live stem every few seconds; off
  under reduced motion.

## 6. Responsive

| Width     | Rail                                                                                      | Belt                                   |
| --------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| >= 1200   | Seven strips in one row, bus as specified                                                 | As specified                           |
| 900-1199  | One row, gap 10, strip padding 10; names may ellipsize harder                             | As specified                           |
| 640-899   | Two rows (4 + 3), the bus hairline spans the full width above row one; stems only on row one, row two strips carry a 3px top rule in their hue instead | Item padding 0 16                      |
| < 640     | Strips become full-width rows (head left, ticks + count right), stacked under the deck; no bus, each row keeps its 3px left rule in its hue | Headline 13, reduced-motion rules as today |

No horizontal page scroll at any width. The deck's own responsive behaviour
is unchanged.

## 7. What gets deleted

The dimension marks `OrbitalMap` draws around the deck today (cubes, glow
dots, their links and captions) and their CSS in `orbital-map.css`, once the
strips carry selection. The deck drawing and its hover cards stay. Remove
dead selectors in the same change; do not leave the old marks behind a flag.
