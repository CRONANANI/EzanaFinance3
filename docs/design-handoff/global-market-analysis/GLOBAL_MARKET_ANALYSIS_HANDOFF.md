# Claude Code Prompt: Global Market Analysis redesign and dotted-map repair

## How to use this package

Put these files in the repo under `docs/design-handoff/global-market-analysis/`:

| File                                     | What it is                                                 |
| ---------------------------------------- | ---------------------------------------------------------- |
| `GLOBAL_MARKET_ANALYSIS_HANDOFF.md`      | This file: the prompt and the full spec (source of truth)  |
| `global-market-analysis.png`             | Annotated wireframe at 1440px (callouts 1 to 8)            |
| `global-market-analysis-phone.png`       | The same wireframe at 390px, showing how it stacks         |
| `GlobalMarketAnalysis.wireframe.dc.html` | The wireframe as HTML (design reference, not code to copy) |

Then paste everything between the two `---PROMPT---` markers into Claude Code. This build needs no database migration.

---PROMPT---

## Context

Repo: CRONANANI/EzanaFinance3 (Ezana Finance). Next.js App Router. Follow the repo's `CLAUDE.md` for git workflow and remotes. Read `docs/ENGINEERING.md`, `docs/CTO_ONBOARDING.md` and `docs/EZANA_BRANDING_GUIDE.md` (especially section 7, the home canvas) before writing code.

We are redesigning the **Global Market Analysis** page (`/market-analysis`) and fixing the dotted world map, whose dots form visible rows and diagonal lines. The spec is `docs/design-handoff/global-market-analysis/GLOBAL_MARKET_ANALYSIS_HANDOFF.md` (this file, below the prompt). Look at `global-market-analysis.png` and `global-market-analysis-phone.png` before you start. The wireframe is greyscale on purpose: build it in Ezana tokens, dark mode first, with `body.light-mode` working too.

This is a **re-layout of the existing page, not a rewrite**. Keep every existing behaviour, panel and data source unless the spec says otherwise:

- Page: `src/app/(dashboard)/market-analysis/page.js` (`MarketAnalysisPage`, `CategoryPanel`, `FilterPanel`, `SettingsPanel`, `CityNewsPanel`, `ChainView`, `DATA_LAYER_GROUPS`, `FINANCIAL_CITIES`)
- Styles: `market-analysis-world-monitor.css`, `market-analysis-monitor.css` (same folder), plus the legacy imports at the top of `page.js`
- Map: `src/components/ui/world-map.tsx` (`WorldMap`, `scoreToColor`); `src/components/market-analysis/*` (`GlobalPowerMapControl`, `ShowMeDataButton`, `ISRFeedCard`, `ISRArticleModal`, `TutorialOverlay`, `DataLayerBar`)
- Landing hero map: `src/components/landing/HeroDottedMap.jsx` + `public/images/landing/hero-dotted-map-{sparse,dense}.svg`
- Data: `src/config/marketAnalysisData.js`, `/api/market-data/*`, `/api/fmp/movers`, `useGlobalPowerMap`, `useBillionairesData`

Work in three phases and **stop for review after Phase 1**:

1. **Phase 1: map renderer** (section 2). Fix the dot artifacts first and send before/after screenshots at 1x and 2x pixel density, at default zoom and at 2x zoom, with the power map on and off.
2. **Phase 2: page layout** (sections 3 to 9) using data the page already has.
3. **Phase 3: new data** (section 10): stat-strip series, country performance and most-active movers.

Before coding, post a short plan: confirm or correct the root-cause analysis in section 2.1, map each numbered part of the wireframe to the code you will change, and list anything that conflicts with the branding guide or the lint gates.

---PROMPT---

## 1. What changes, at a glance

| #   | Part                     | Today                                                                                | New                                                                                                                                     |
| --- | ------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | View row                 | THE MAP / THE CHAIN buttons + gold GLOBAL EMPIRE RANKINGS link, floating help button | Same three destinations: a segmented tablist (The Map, The Chain), Rankings as an outlined link, "Updated" time, help button in the row |
| 2   | Stat strip               | None                                                                                 | New: five-cell ruled strip with value, change and sparkline                                                                             |
| 3   | Left rail                | Floating overlay sidebar over the map                                                | In-flow rail split off by a vertical hairline; same controls                                                                            |
| 4   | Map                      | Full-bleed map; dots form lines                                                      | Map stage with a header and chips; **new dot renderer, no linear artifacts**                                                            |
| 5   | Controls                 | Floating overlay column                                                              | In-flow column to the right of the map; same five buttons                                                                               |
| 6   | Top Performing Countries | None                                                                                 | New band                                                                                                                                |
| 7   | Market Movers            | None                                                                                 | New band (US-listed)                                                                                                                    |
| 8   | Key Global Events        | Calendar data feeds The Chain only                                                   | New band, same data                                                                                                                     |

The Chain view, the city panel, category panels, Filter and Settings panels, ISR feed and the tour keep their current behaviour and styling in this build.

## 2. Phase 1: dotted map repair

### 2.1 Root cause (verify, then fix)

`world-map.tsx` and the hero build their dots the **same way**: `new DottedMap({ height: 170, grid: 'diagonal' })`, radius `0.18` grid units. So the problem is not a different dot pattern. Our analysis:

1. **A regular lattice at sub-pixel size.** `grid: 'diagonal'` puts dots on a fixed lattice (every other row offset by half a cell). On the Market Analysis stage the map is roughly 900 to 1300 CSS px wide, so one grid cell is about 2.7 to 3.9 px and a dot is about 1 to 1.4 px across. Dots that small on a perfectly regular lattice beat against the screen's pixel grid: neighbouring dots get rounded differently, and the eye joins them into rows and diagonals (moiré). The hero shows the same lattice at a size and density where it reads as texture.
2. **Zoom is a CSS scale of a raster layer.** `.world-map-inner` uses `transform: translate(...) scale(...)` with `will-change: transform` and `backface-visibility: hidden`. That promotes the map to a GPU layer rasterised at one scale and then resampled, so at fractional zoom levels the dots alias further, and they blur when zoomed in. The `shapeRendering="geometricPrecision"` comment shows earlier attempts to patch the banding.
3. **Two stacked renderings.** The base map is a `next/image` of an SVG data URL; when the power map is on, about 30k individual `<circle>` elements (some with blur filters) are drawn in an SVG on top. That is heavy, and its anti-aliasing differs from the base image.

If your investigation finds a different or additional cause, say so in the plan.

### 2.2 Required result

The Market Analysis map must read like the landing hero: an even, soft field of dots with clean coastlines and **no visible rows, columns, diagonals, stripes or moiré** at any zoom level, on 1x and 2x displays, in dark and light mode.

### 2.3 How to build it

- **One shared geometry module**, `src/lib/geo/dotted-world.js` (or `.ts`): the projection (the same proj4 maths `world-map.tsx` uses today, so marker positions, the city list and `getPin`-style lookups stay correct), land-dot generation, and the dot to country-ISO mapping that `world-map.tsx` currently computes in chunks.
- **Break up the lattice** with deterministic sampling. Use blue-noise / Poisson-disk sampling with a fixed seed, or the existing lattice with a fixed-seed jitter of up to about 35% of a cell, keeping a point only if it is still on land. Same output on every load, server and client.
- **Size and space dots in screen pixels, not grid units.** Pick spacing from the rendered width so a dot is at least about 1.6 CSS px across and spacing stays visually even (target roughly the hero's look: dot diameter about 40% of spacing). Regenerate or re-filter when the stage width changes a breakpoint, not on every pixel of resize.
- **Draw on a `<canvas>`** sized to `cssWidth * devicePixelRatio` and scaled back with CSS, with `ctx.scale(dpr, dpr)`. On pan and zoom, **redraw with the transform applied to the coordinates**, instead of CSS-scaling a raster. Remove `will-change: transform` and the CSS `scale()` from the dot layer. Redraw on `resize`, DPR change (`matchMedia('(resolution: …)')`) and theme change. Throttle redraws with `requestAnimationFrame`.
- **Heat layers** (power map, data layers) colour the same dots per country using `scoreToColor`, on the same canvas. Replace the SVG blur filters with a cheap canvas glow (a second, larger, low-alpha circle for top-tier scores) so it looks the same without per-dot filters.
- **Interactive markers stay separate**: financial-centre pins, hover and click targets stay as DOM/SVG elements positioned with the shared projection on a layer above the canvas, so they keep focus, `aria-label`s and click handling. Country hover can hit-test via the dot to ISO map at the pointer.
- **Colours from tokens**: read `--emerald` (dots), the heat palette from `scoreToColor`, and the power-map background from a token (replace the hard-coded `#2a2a2a` with `--surface-2` or a new token declared for both themes in `theme-variables.css`). Re-read tokens on theme change.
- **Hero:** keep `HeroDottedMap` as a static, pre-generated asset (its comments explain the LCP and bundle reasons). Add `scripts/generate-dotted-map.mjs` that uses the shared module to regenerate both hero SVGs, so hero and app share one geometry. Only replace the hero files if the new output looks at least as good at the hero's size; if you do, keep the `<picture>` setup and file names.
- **Reduced motion:** no animated transitions on zoom when `prefers-reduced-motion: reduce`.
- **Performance budget:** first map paint no slower than today; pan/zoom redraw under about 8 ms on a mid-range laptop; no long task over 50 ms on load (keep the chunked ISO mapping, or precompute it in the generator script and ship it as JSON).

### 2.4 Phase 1 acceptance

- [ ] No visible linear patterns at default zoom and at 1.3x, 2x and max zoom; checked at DPR 1 and 2, dark and light. Attach screenshots.
- [ ] Coastlines recognisable; financial-centre pins sit on the right cities (spot-check New York, London, Tokyo, Sydney, São Paulo, Johannesburg).
- [ ] Power map and every data layer still colour countries correctly; hover tooltip and click to city panel still work.
- [ ] Zoom buttons, wheel, pinch, drag and reset behave as before.
- [ ] Landing hero unchanged visually (or improved, with screenshots).

## 3. Page layout and grammar (Phase 2)

Follow the **home canvas** grammar from the branding guide, section 7 (reference: `src/app/(dashboard)/home/broadsheet.css`). Write the new layout flat from the start, not through the `home-canvas.css` override list:

- One ground: top-level sections have **no fill, border, shadow or rounded panel**. Sections are defined by a header and the hairline under it. Side columns are split off by a vertical hairline. Rows divide with hairlines.
- Overlays (city panel, category panels, Filter, Settings, tooltips, menus) keep their solid surface and shadow (guide 7b).
- Nested fills stay subtle: segmented-control tracks, chips and tiles may use a faint wash.

**Container:** content max-width 1400px, centred, horizontal padding 24px (16px on phones), 24px vertical rhythm between sections.

**Order (top to bottom):** existing app nav and ticker tape (unchanged), view row (1), stat strip (2), workspace row (rail 3, map 4, controls 5), bottom bands (6, 7, 8).

**Workspace row:** flex with wrap, gap 24px. Rail `flex: 1 1 220px; max-width: 250px`; map `flex: 999 1 560px; min-width: 0`; controls `flex: 0 1 160px`. Below about 1024px the controls drop under the map as a horizontal wrapping toolbar; below 768px the rail stacks above the map.

**Phones:** the page keeps its current landscape rotate prompt for the map view. Everything else must still work when someone dismisses it or uses a tablet in portrait: see `global-market-analysis-phone.png`.

New page CSS goes in a new file `src/app/(dashboard)/market-analysis/market-analysis-canvas.css`, imported **after** the existing CSS, with the existing `ma-` class prefix. Do not delete the legacy imports in this build (the panels still depend on them), but the new sections must not depend on legacy classes.

## 4. View row (callout 1)

- Segmented `role="tablist"` with two tabs, **The Map** and **The Chain**, wired to the existing `view` state (`'map'` / `'chain'`). Track: faint wash (`--surface-2`), radius `--radius-lg`, 4px padding. Tab: 40px tall, radius `--radius-md`, Bootstrap icon + label, sans (not uppercase). Active: `--emerald` fill, `--color-on-primary` text. Arrow keys move between tabs.
- **Global Empire Rankings** stays a link to `/datasets/global-empire-lighthouse`, styled as an outlined button with a trailing `bi-arrow-up-right`. Use the gold partner accent only if the guide reserves it for this; otherwise emerald outline.
- Keep `ShowMeDataButton` (shows when the power map is active) in this row.
- Right side: "Updated HH:MM ET" (mono caption, `--text-faint`) from the latest quotes fetch, and the help button (`data-tour="help-icon"`, `aria-label` unchanged) moved into the row from its fixed position.

## 5. Stat strip (callout 2)

- Ruled top (`2px solid var(--text-primary)` or the broadsheet's ink rule token) and bottom (hairline). Five equal cells (`repeat(auto-fit, minmax(200px, 1fr))`), each split by a vertical hairline, content centred (guide 7, point 4).
- Cell: eyebrow label (mono, eyebrow tokens), value (`--type-value-lg-*`, mono, tabular), signed change and percent (mono, `--positive` / `--negative`), sparkline (last 30 daily closes, `CHART` props from `src/lib/chart-theme.js`, line in `--positive` or `--negative` by period direction, no axes).
- **Series:** S&P 500 (`SPX`), NASDAQ (`COMP`), VIX, Gold, WTI Crude. These are what we already fetch. The reference image's "Global Equity Index", "Global GDP (YoY)", "Commodities Index" and "DXY" have no data source in the app, so they are out.
- Each cell is a button that opens the existing Markets (indices) or Commodities category panel focused on that series.
- Until Phase 3 lands, Phase 2 binds value and change from the existing `liveMarkets` / `liveCommodities` state and hides sparklines. A cell with no value shows a skeleton, never a mock number.

## 6. Left rail (callout 3)

Same controls as today's `.ma-sidebar`, re-laid as an in-flow column with `border-right: 1px solid var(--border-primary)` and 20px right padding:

- Eyebrow "MARKET ANALYSIS".
- `GlobalPowerMapControl` first, full width, showing its on state (emerald fill when active). Keep the "try this" arrow behaviour.
- Category buttons: Markets, Central Banks, Indices, Commodities, Currencies (sans, sentence case, Bootstrap icons as today), 40px tall, `aria-pressed`, active state = faint emerald wash + `--emerald-text`. They open `CategoryPanel` exactly as now.
- Hairline, eyebrow "DATA LAYERS", then each `DATA_LAYER_GROUPS` group as a disclosure (`aria-expanded`) with a count badge of active layers. Layers are **multi-select checkboxes** (real `<input type="checkbox">` + `<label>`, or the DS `Checkbox`), wired to `handleDataLayerClick` and `selectedLayers`. Keep the loading state for Billionaires. Replace the per-layer hard-coded hex colours with tokens or the chart palette (`--chart-cat-*`); keep the colour as a small swatch next to the label.
- Hairline, then the **ISR feed** toggle (`aria-pressed`, on/off label), wired to `isrOpen`.
- Keep every `data-tour` attribute on the equivalent element: `sidebar-power-map`, `sidebar-${cat}`, `sidebar-isr`.

## 7. Map stage (callout 4)

- Header: title "Global Power Map" (card title tokens), chips for the active layers (e.g. "GDP + WEALTH", or "MARKETS" when no layer is on) and the count of financial centres shown, hint text "Drag to pan · scroll or pinch to zoom" (`--text-faint`, hidden on touch-only devices). Hairline under the header.
- Stage: the new canvas map from Phase 1, aspect ratio of the projection (about 337:170), no box. Keep `data-tour="globe-canvas"` and the click-to-clear-selection behaviour.
- Financial-centre pins: 12px, `--emerald` with a 4px `--emerald-bg` halo; hovered or selected pins grow to 16px. Each pin is a button with `aria-label="<City>, <Exchange>"`.
- Hover card (overlay, 7b surface): city, exchange, timezone, country power score when the power map is on, hint "Click for city news and regional data". Click opens `CityNewsPanel` as today.
- Legend overlay bottom-left: label of the active scale ("POWER SCORE" or the layer name), Low to High ramp from `scoreToColor`. Hidden when no heat layer is on.

## 8. Map controls (callout 5)

Same five actions as `.ma-controls`, in-flow: **Filter** (primary DS `Button`), **Zoom in**, **Zoom out**, **Reset view**, **Settings** (secondary DS `Button`s), 44px tall, icon + sentence-case label, `role="toolbar"`, gap 8px. They call the same handlers (`setFilterOpen`, `mapRef` zoom methods, `resetZoom`, `setSettingsOpen`). Remove the duplicate in-map zoom buttons inside `world-map.tsx` when the parent provides controls (add a `showControls` prop, default `true` for other users of `WorldMap`).

## 9. Bottom bands (callouts 6, 7, 8)

Three columns, `repeat(auto-fit, minmax(340px, 1fr))`, gap 32px. Each band: header (card title tokens) with a hairline under it; table heads 10px uppercase mono over a solid ink rule; rows 44px minimum, divided by hairlines; numbers mono, tabular, right-aligned. Wide tables scroll inside an `overflow-x: auto` box. Each band has its own skeleton (5 rows) and empty/error line; never mock numbers.

**6 · Top Performing Countries**

- Columns: rank, country + benchmark name, period return (signed, `--positive` / `--negative`), level.
- Period picker: 1D, 1W, 1M (default), 3M, YTD, 1Y (DS `Select` or `Dropdown`).
- Top 5 by return for the period. Clicking a row selects that country on the map (same as clicking it there) and scrolls the map into view.
- Data: Phase 3 route (section 10.2). In Phase 2, ship the band behind a flag or hidden until the route exists.

**7 · Market Movers** (eyebrow "US-LISTED")

- The movers source (`/api/fmp/movers`, Alpha Vantage top gainers/losers with FMP fallback) only covers US listings, so the band says so. No region column.
- Tabs: Gainers, Losers, Most active (DS `Tabs` or the same segmented style as the view row, small).
- Columns: ticker (mono) + company name (if the source provides it), price, change %. Rows link to company research for that ticker (use the existing route the app uses elsewhere).
- Data: `/api/fmp/movers?limit=5` for Gainers / Losers in Phase 2; Most active comes in Phase 3 (section 10.3). Hide the Most active tab until then.

**8 · Key Global Events**

- Next four upcoming events from the economic calendar the page already loads for The Chain (`/api/market-data/economic-calendar`, held in the page's chain-events state). Reuse that state; do not fetch twice. Prefer high-impact events if the data has an impact field.
- Row: date tile (month eyebrow + day), title, one-line description, time in UTC (mono).
- Header link "Open The Chain" switches `view` to `'chain'`.

## 10. Phase 3: data

Reuse the existing Alpha Vantage / FMP helpers; extract shared fetch code into `src/lib` rather than copying it. Every route: `withApiGuard`, `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`, and partial results instead of a failed response when one upstream symbol fails.

### 10.1 `GET /api/market-data/kpi-strip`

Returns `[{ key, label, value, change, changePct, series: number[] }]` for SPX, COMP, VIX (Alpha Vantage `INDEX_DATA` daily, as `layers-live` and `quotes-live` already call), Gold (gold history; if Alpha Vantage only returns spot, take the series from FMP) and WTI (Alpha Vantage `WTI` daily). `series` = last 30 closes, oldest first. Missing series: return `series: []` and the UI hides the sparkline.

### 10.2 `GET /api/market-data/country-performance?range=1M`

- Countries come from `TRACKED_INDICES` in `src/config/marketAnalysisData.js`. Add an `fmpSymbol` field per entry (e.g. India `^NSEI`, Brazil `^BVSP`, Mexico `^MXX`, Singapore `^STI`, Canada `^GSPTSE`, UK `^FTSE`, Germany `^GDAXI`, France `^FCHI`, Japan `^N225`, Hong Kong `^HSI`, Korea `^KS11`, Australia `^AXJO`).
- **Verify each symbol returns data from FMP**; leave out any country whose benchmark FMP does not serve (Vietnam may be one) rather than inventing a value, and list the dropped ones in your summary.
- Use the same FMP historical endpoint and `RANGE_DAYS` as `/api/market-data/stock-candles`. Return `[{ country, iso, benchmark, level, returnPct }]` sorted by return.

### 10.3 Most active movers

Extend `/api/fmp/movers` to also return `actives`: Alpha Vantage `most_actively_traded` from the same `TOP_GAINERS_LOSERS` response (currently ignored in `fetchAlphaTopMovers`), falling back to FMP's most-actives endpoint. Existing callers (`HomeTerminalSummary`, `MockSections`) must keep working unchanged.

## 11. Branding, accessibility and gates

- Tokens only, real names from `src/app/theme-variables.css`; no raw hex in CSS. Fonts via `var(--font-sans)` / `var(--font-mono)`. Type via `--type-*` tokens. Radius `--radius-sm/md/lg/xl` and `999px` for pills only.
- Use `@/components/ds` for `Button`, `IconButton`, `Tabs`, `Select`/`Dropdown`, `Checkbox`, `Skeleton`, `EmptyState`, `NumericValue`, `Ticker`, `Tooltip`. Extend a primitive in `src/components/ds` rather than forking it.
- Bootstrap Icons only; `aria-hidden="true"` on decorative icons; `aria-label` on icon-only buttons. No emoji, no Unicode glyph icons (the `⟲` in `world-map.tsx` goes).
- No Tailwind utilities in new or touched components.
- No em dashes in UI copy. No vendor names in UI copy (`npm run check:vendor-copy`).
- Touch targets at least 44px. Visible `:focus-visible` rings (`--emerald`). Text contrast 4.5:1 in both themes.
- Motion: 0.15s hover/focus, shimmer skeletons, no spinners in the new sections; everything off under `prefers-reduced-motion`.
- Gates on every commit: `npm run lint`, `npm run lint:branding`, `npm run lint:ds`, `npm run lint:a11y`, `npm run lint:css`, `npm run test:em-dash`, `npm run check:vendor-copy`.

## 12. Do not change

- The Chain view (`ChainView`) and its analysis, debrief and send-to-team flows.
- `CategoryPanel`, `CityNewsPanel`, `FilterPanel`, `SettingsPanel`, `ISRFeedCard`, `ISRArticleModal`: behaviour and styling (they may be repositioned as overlays relative to the new layout).
- The tutorial: `TutorialOverlay`, tour-seen API calls, and every `data-tour` target (`help-icon`, `globe-canvas`, `sidebar-power-map`, `sidebar-${cat}`, `sidebar-isr`).
- The ticker tape and its data, the app nav, the landscape rotate prompt.
- Data-layer semantics (`selectedLayers`, power-map scoring, billionaires loading).
- `WorldMap`'s public API for other pages that use it (new props are additive and default to today's behaviour).

## 13. Acceptance checklist (Phase 2 and 3)

- [ ] Layout matches `global-market-analysis.png` at 1440px and stacks as `global-market-analysis-phone.png` at 390px; no horizontal page scroll at any width.
- [ ] No boxed top-level cards: sections defined by headers and hairlines; overlays keep their surfaces.
- [ ] The Map / The Chain tabs work by mouse and keyboard; Global Empire Rankings link and ShowMeDataButton still work.
- [ ] Stat strip shows live values for all five series with sparklines (Phase 3); cells open the right category panel.
- [ ] Rail: power map toggle, five category panels, multi-select data layers with counts, ISR toggle all behave as before.
- [ ] Map header chips reflect active layers; legend matches the active scale; pins have labels and open the city panel.
- [ ] Controls work and are not duplicated inside the map.
- [ ] Countries band ranks real benchmark returns for each period; unsupported countries are absent, not faked.
- [ ] Movers band shows Gainers, Losers and Most active from real data, labelled US-listed; rows open company research.
- [ ] Events band shows the next four calendar events without a second fetch; "Open The Chain" switches view.
- [ ] Tour runs end to end and highlights the right elements.
- [ ] Dark and light mode both correct. All gates in section 11 pass.
