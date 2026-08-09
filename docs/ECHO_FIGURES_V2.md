# Ezana Echo — Figure System v2 (six new branded chart types)

Six native-SVG figure components added to the Echo figure library. Each renders
through the shared `EchoFigureShell` (so it inherits the FIG label / kicker /
hint / source chrome and the scroll-reveal behaviour) and is registered in the
renderer switch in
`src/app/(dashboard)/ezana-echo/[articleId]/EchoArticleClient.jsx`.

**Common rules (all six):**

- Colours come only from design tokens (`--echo-chart-green|blue|red|orange|purple|grid|annotation`,
  plus `--emerald`, `--bg-tertiary`, text/border tokens). No hardcoded hex.
- Figure titles use `--font-serif`; every numeric / ticker / axis label uses
  `--font-mono` with `tabular-nums`.
- Deterministic render only — no `Math.random`, no `Date` in render — so SSR and
  first client paint match.
- Every figure block object carries `type`, `figureLabel`, and optionally
  `kicker`, `hint`, `source`, which pass straight through to the shell.
- Scroll-reveal: the shared shell adds `is-revealed` the first time the figure
  enters the viewport; each component's internals stage their draw-in off that
  class and are fully inert under `prefers-reduced-motion`.
- Dense figures scroll horizontally inside `.echo-fig-scroll` rather than
  shrinking text below the 15-viewBox-unit floor.

---

## `radial-stack` — inverted polar stacked bars (`EchoRadialStack`)

One radial bar per category; each bar's total sweep (≤ `maxAngle`) scales to the
category's total, and its segments stack proportionally along the arc. Segment
colours are pinned by first-appearance order so a segment label is the same
colour across every bar. Reveal: arcs sweep in via `stroke-dashoffset`.

```
{
  type: 'radial-stack',
  figureLabel, kicker, hint, source,
  categories: [{ label, segments: [{ label, value }] }],  // 3–8 categories, ≤5 segments each
  segmentPalette?: string[],   // token strings; defaults green→blue→purple→orange→red
  maxAngle?: number,           // max sweep in degrees for the largest bar (default 270)
}
```

Example:

```jsx
{
  type: 'radial-stack',
  figureLabel: 'FIG. 2 · Revenue mix by desk',
  kicker: 'Gross revenue, $M · segments stack outward per desk',
  source: 'Ezana Research',
  maxAngle: 270,
  categories: [
    { label: 'Equities', segments: [ { label: 'Advisory', value: 42 }, { label: 'Financing', value: 28 } ] },
    { label: 'Credit',   segments: [ { label: 'Advisory', value: 24 }, { label: 'Financing', value: 31 } ] },
  ],
}
```

## `variable-pie` — variable-radius donut (`EchoVariablePie`)

Slice **angle** encodes `y`; slice **radius** encodes `z` (with a minimum-radius
floor so small-`z` slices stay visible). Slices sort ascending by `z` for a
scannable radius progression. 20% donut hole. Reveal: slices grow + fade in.

```
{
  type: 'variable-pie',
  figureLabel, kicker, hint, source,
  slices: [{ label, y, z }],   // 3–10 slices; y = angle magnitude, z = radius magnitude
  yLabel, zLabel,              // label words for the two encodings
  minRadiusPct?: number,       // smallest-z radius as % of max (default 45)
}
```

## `bubble-field` — three-variable scatter (`EchoBubbleField`)

`x`/`y` position plus bubble **area** (sqrt scale) for `z`. Optional dashed
threshold lines and a translucent token-tinted "zone" band. Reveal: bubbles pop
in, staggered by z-rank.

```
{
  type: 'bubble-field',
  figureLabel, kicker, hint, source,
  points: [{ label, x, y, z }],   // 4–20 points
  xLabel, yLabel, zLabel,
  xThreshold?, yThreshold?,       // numbers → dashed guide lines
  zoneLabel?,                     // shades the region beyond the thresholds
}
```

## `multi-axis` — colour-linked multi-axis combo (`EchoMultiAxis`)

One bar series plus up to two line series, each on its own independently-scaled
y-axis, tick labels coloured to their series. Shared hover readout lists every
series at the hovered x. Reveal: bars grow, lines draw in. `series[0]` must be
the bar (left axis); extras beyond three are ignored.

```
{
  type: 'multi-axis',
  figureLabel, kicker, hint, source,
  categories: [string],
  series: [{ label, kind: 'bar' | 'line', unit, values: [number], dash? }],
}
```

## `tile-grid` — equal-weight tilemap / cartogram (`EchoTileGrid`)

One equal-size tile (hex or square) per unit at manual `{x, y}` grid coordinates,
coloured by a discrete value class. Includes a legend and an `aria-label`
narrating the distribution. Class → colour ramp (lightest → darkest):
`--emerald-bg-subtle → --echo-chart-green → --echo-chart-blue → --echo-chart-purple → --echo-chart-orange → --echo-chart-red`.
Reveal: tiles cascade in diagonally.

```
{
  type: 'tile-grid',
  figureLabel, kicker, hint, source,
  tiles: [{ code, label, x, y, value }],       // ~5–40 tiles; x/y are integer grid coords
  classes: [{ upTo, label }],                  // ascending thresholds; value ≤ upTo ⇒ that class
  shape?: 'hex' | 'square',                     // default 'hex'
}
```

## `market-treemap` — squarified two-level treemap (`EchoMarketTreemap`)

Groups → leaves. Leaf **area** = `size`; leaf **fill** = a diverging performance
scale on `perf` (clamped ±10%): `--echo-chart-red` → neutral `--bg-tertiary` →
`--echo-chart-green`, implemented as token + `fillOpacity` buckets. Group headers
are bold uppercase serif; leaves too small for a ≥15-unit label fall back to a
`<title>` tooltip. Static (no drill-down). Reveal: leaves fade/scale in.

```
{
  type: 'market-treemap',
  figureLabel, kicker, hint, source,
  groups: [{ label, leaves: [{ label, size, perf }] }],  // 2–6 groups, 2–12 leaves each
}
```

perf → fill buckets: `≤ -6` red @0.85 · `-6…-1.5` red @0.45 · `-1.5…1.5` neutral ·
`1.5…6` green @0.45 · `≥ 6` green @0.85.
