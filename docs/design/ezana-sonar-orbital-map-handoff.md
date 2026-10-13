# Ezana Sonar — Orbital Intelligence Map · Claude Code Handoff Package

**Reference design:** the isometric "SIGNAL FOUND" device scene (attached image), rebuilt 1:1 in Ezana's palette on the Design canvas.
**What to build:** that scene, as the hero visualization of the Sonar page, implemented as production SVG/React in the existing Next.js 14 codebase (`CRONANANI/cronanani`), wired to real Sonar ping results.

Read Part A (design spec) and Part C (reference SVG) first. Part B is the engineering brief and the definition of done.

---

## Part A — Design spec (match the reference exactly)

### A1. Palette swap (reference → Ezana)

| Reference element | Reference colour | Ezana replacement |
|---|---|---|
| Lime glow (rings, sweep, bars, cubes, label) | lime `#c8ff3c`-ish | **Emerald** `#10b981`, highlights `#34d399`, hot core `#d1fae5` / `#ecfdf5` |
| Cube faces | lime shades | top `#34d399` · right `#059669` · left `#047857` |
| Purple accent lines on base plate | violet | **Pale mint** `#a7f3d0` @ 75% + soft glow (gold is reserved for the Partner app — never mix with emerald) |
| Background | near-black | `#06080a` with radial vignette `#0b1012 → #040607` |
| Slab top | charcoal | gradient `#1d2228 → #14181d`, bezel stroke `#262c33` |
| Slab sides / rails | darker charcoal | `#0e1115`, bottom edge line `rgba(255,255,255,.06)` |
| Recessed screen | near-black | `#0a0e12 → #0c1115`, inner shadow stroke `#05070a` 3px |
| Dotted surface / world map | grey dots | field dots `#232a31` r0.9 on 7px grid; continent dots `#3a4550` r1.1 |
| Glass panels | white glass | fill `white 10% → 3%`, stroke `rgba(255,255,255,.28)`, top-edge highlight `rgba(255,255,255,.25)`, inner emerald blur blobs @ 12–22% |
| Panel text | lime mono | `#6ee7b7` @ 90% / 65%, JetBrains Mono 7–7.5px |
| "SIGNAL FOUND" plaque | lime on dark glass | face `rgba(16,185,129,.10)` + stroke emerald 75%; text `#34d399`, Plus Jakarta Sans 700, 15.5px, tracking .06em, glow |
| Keycap | lime | emerald cube faces (above) with large glow |
| Fog | white haze | `#9ca3af` blurred ellipses @ 5–9%, blur 22 |

Typography: use the fonts the repo currently loads. Ezana's design system is **Plus Jakarta Sans** (UI/labels) + **JetBrains Mono** (readouts, tabular-nums). If the repo has already moved to Space Grotesk / IBM Plex Mono, use those instead — do not add a second font pipeline.

### A2. Projection and geometry (1440×810 stage; scale proportionally)

- True 2:1 isometric. Ground-plane point (u, v) → screen via `matrix(0.866 0.5 -0.866 0.5 cx cy)`. Height z subtracts from screen y.
- **Slab** (device): ground rect −300…300, rx 48, top-face centre `cx=720, cy=364`; extruded 36px (stack of translated copies or a proper side path). Bezel stroke 1px.
- **Recessed screen**: ground rect −252…252, rx 34, same centre. Clip the dotted field + world map + grid to it.
- **Base plate** (glass): ground rect −350…350, rx 44, centre `(720, 400)`, 8px thick, fill `#0b0e11`, stroke white 7%. Mint accent lines on its back-left and front-right edges, inset ~10px, partial length (`M250 322 L470 195`, `M900 646 L1200 473`).
- **Radar** (in ground space, centre 0,0): rings r = 70 / 141 / 212 (emerald 45% / 55% / 85%, 1–1.4px, outer ring glowed); tick ring r = 226, stroke-width 6, dasharray `1.2 10.6`, emerald 55%. Core radial glow r150 (emerald 38% → 0). Centre dot r4 `#d1fae5` with large glow.
- **Sweep wedge**: `M0 0 L-150 -150 A212 212 0 0 1 150 -150 Z` (screen 12 o'clock → 3 o'clock). Linear gradient along x from the leading edge (`#34d399` 62%) to trailing edge (0%). Leading-edge line `(0,0)→(150,−150)`, mint 95%, 1.6px, glowed.
- **Front light bars**: on the slab's two front side faces, mid-height, inset: `M300 440 L640 636` and `M800 636 L1140 440`. Dark channel 16px under a 6px bar with horizontal gradient (fade both ends), large glow.
- **Plaque "SIGNAL FOUND"**: raised block on the back-left rim, oriented along −v: body `470,236 610,155 610,201 470,282` (+ shadow offset −4,+8); glass face inset 8px; text transform `matrix(0.866 -0.5 0 1 486 258)`. Keycap cube at (655,150) s≈14 (glowed); dark button cube at (708,126) s≈18; small port light at (312,332).
- **Glass panels** (vertical parallelograms standing on the surface; text uses the matching skew):
  - A (large, back-right, faces −v): `775,320 945,222 945,32 775,130` · text `matrix(0.866 -0.5 0 1 775 130)`
  - B (far right, faces u): `1050,320 1170,389 1170,259 1050,190` · text `matrix(0.866 0.5 0 1 1050 190)`
  - C (left, faces −v): `335,414 445,350 445,190 335,254` · text `matrix(0.866 -0.5 0 1 335 254)`
  - D (front, faces u): `585,560 730,644 730,529 585,445` · text `matrix(0.866 0.5 0 1 585 445)`
- **Nodes & links** (screen coords): links from centre (720,364) → `(1045,405)→(1125,414)`, `(960,300)→(975,262)`, `(545,520)`, `(720,540)`, `(650,352)`; white 42%, 1px. Hollow ellipse markers rx7 ry4.5 at (1045,405) and (960,300). Iso cubes at (650,352) s13, (880,338) s11, (1125,414) s18, (720,540) s8. Glow dots at (975,262), (545,520)+ring r9, (1000,283), (1060,470); hot contact dot (790,340) r5 `#ecfdf5` with soft halo.
- **Fog**: 4 blurred ellipses over the surface (see SVG), drawn *above* nodes and *below* panels. Ambient emerald pool under the slab: ellipse (720,700) rx420 ry40 @ 7%, blur 22.

### A3. Layer order (bottom → top)
1 background vignette · 2 base plate + mint lines · 3 slab extrusion · 4 slab top + bezel · 5 recess · 6 dotted field, world map, grid (clipped) · 7 radar glow, sweep, rings, centre · 8 links · 9 markers, dots, cubes · 10 fog · 11 light bars · 12 plaque + keys · 13 glass panels + text · 14 ambient pool.

### A4. Data binding (replace demo text with real Sonar results)
- Centre = active subject (ticker/name from the Ping).
- Cubes / dots = related entities returned by the sweep; each carries a stable `id`, `kind` (company · person · investor-13F · congressional-trade · contract-lobbying · patent-filing · theme-macro), `ring` (1 direct · 2 capitol & filings · 3 themes & macro) and `angle`. Place on ring radius by `ring`, at `angle`. Use iso cubes for entities with ≥1 cited record, plain glow dots for weaker/thematic nodes.
- Links only where an edge exists in the result. No strength encoding unless the API returns one.
- Panel A = top findings list (source · entity · record type). Panel B = themes/macro with scores if the API provides them, else counts. Panel C = direct + capitol lists. Panel D = briefing meta (swept-at, node/edge counts, depth, quota).
- Plaque reads **SIGNAL FOUND** when ≥1 cited record; **NO SIGNAL** on empty; **SWEEPING** while loading (sweep wedge animates only in that state, then settles).
- All demo strings in the reference SVG (NVDA, BLK, PTR H-0931, 0.91, 06:42 ET…) are placeholders. Never ship fabricated records; show a "sample data" badge whenever the map renders demo content.

### A5. Interaction
- Hover node → tooltip (dark card, emerald 20% border, eyebrow in the node's kind colour, name, record type, source, "Open in briefing").
- Click node → selected ring @90%, its links brighten to emerald 95%, unrelated nodes/links dim to 28%; detail opens per existing Sonar behaviour. Click centre → clear selection.
- Keyboard: nodes are focusable `<g role="button" tabindex="0">` with a 2px emerald focus rect; Enter/Space selects; Esc clears.
- Motion: 160ms ease-out transitions; sweep wedge rotates only while loading; no perpetual rotation; `prefers-reduced-motion` → no sweep animation, instant state changes.

### A6. Responsive
- Desktop ≥1280: full scene at stage aspect 16:9, max-width 1440, centred in the Sonar content grid.
- Tablet 768–1279: same scene scaled via `viewBox`; hide panel text under 9px rendered, keep panel shapes.
- Mobile <768: deliberate composition — drop panels B and D, keep plaque + panel A as a stacked list below the slab; rings 70/141 only; ≤8 nodes; touch targets ≥44px via invisible hit circles; no horizontal overflow.
- Test at 1920, 1440, 1024, 768, 390, 320.

---

## Part B — Engineering brief (original, unchanged)

# Ezana Sonar — Signature Orbital Intelligence Map Redesign

Act as a senior creative technologist, principal frontend engineer, and product designer specializing in premium fintech, intelligence platforms, geospatial visualization, and sophisticated data interfaces.

Your task is to redesign the central orbital map on the **Ezana Sonar page** into a distinctive, polished, production-quality financial intelligence visualization.

The result should feel like a combination of an institutional investment research terminal, a global intelligence network, and a premium modern software product. It must be visually compelling without looking like a generic sci-fi dashboard, an arcade radar, or an overdesigned Dribbble concept.

## 1. Inspect the existing implementation first

Before changing code:

* Locate the Sonar page, its current orbital map, related components, stylesheets, scripts, and data sources.
* Understand how the current map is rendered and how its nodes, cards, connections, tooltips, and interactions work.
* Identify which elements are functional, which are decorative, and which are placeholders.
* Inspect the existing design-token system, typography, dark/light theme behavior, and responsive layout.
* Reuse the existing architecture and dependencies where practical. Do not introduce a new visualization framework unless there is a compelling technical reason.

Do not rebuild the entire Sonar page unnecessarily. Prioritize the orbital visualization and the surrounding elements required to integrate it seamlessly.

## 2. Core creative direction

Create a sophisticated, layered orbital network that communicates how different entities, events, and markets relate to one another.

The visualization should convey:

* **Financial gravity:** major companies, capital flows, influential institutions, and significant market entities.
* **Relationships:** connections between companies, congressional activity, government contracts, lobbying, patents, institutional investors, and emerging market themes.
* **Discovery:** the ability to select a central subject and explore its surrounding network.
* **Intelligence:** an organized, information-rich system rather than an abstract decorative animation.

The overall appearance should be restrained, precise, and premium. Use visual hierarchy, negative space, delicate geometry, and selective highlights instead of excessive glow, bright gradients, or unnecessary ornamentation.

## 3. Orbital composition

Design the visualization around a strong central subject and several concentric orbital layers.

### A. Central intelligence node

Create a visually distinct central node representing the currently selected company, person, ticker, market theme, or subject.

It should contain, where applicable:

* The subject's name or ticker.
* A restrained central emblem or abstract geometric mark.
* A concise status indicator.
* A subtle visual treatment that establishes its importance.

The central node should be the clearest focal point. It must remain legible at all supported screen sizes.

Avoid an oversized glowing sphere or a generic spinning planet. The centerpiece should feel like an elegant analytical instrument.

### B. Concentric orbital rings

Build three or four carefully proportioned orbital layers around the central subject.

Each layer should represent a meaningful degree of relationship or intelligence category, rather than being purely decorative.

Possible categories include:

* **Inner orbit:** direct company relationships, major investors, executives, or immediate counterparties.
* **Middle orbit:** congressional trades, government contracts, lobbying connections, patents, and sector relationships.
* **Outer orbit:** broader market themes, macroeconomic signals, international relationships, and indirect influences.

Adapt these categories to the actual data and functionality available in the repository. Do not imply that an entity has a real relationship when no supporting data exists.

Use fine, low-contrast circular paths with occasional dashed segments, subtle ticks, or discreet markers. Rings should be visible enough to establish structure but never compete with the nodes.

### C. Orbital nodes

Place nodes along the orbital paths with a clear visual hierarchy.

Differentiate nodes according to their actual category or importance. Use a restrained system of node sizes, shapes, labels, and accent colors.

For example:

* Companies and tickers.
* Government and congressional entities.
* Investors and institutions.
* Contracts and lobbying relationships.
* Patents and emerging technologies.
* Market themes and macroeconomic signals.

Use small, clean symbols or abbreviated labels where they improve recognition. Avoid filling every node with a large logo or block of text.

Prevent node collisions, label overlap, clipping, and ambiguous connections.

### D. Relationship lines

Connect relevant nodes with thin, elegant paths.

Connections should make the underlying network understandable at a glance.

Where the data supports it, line styling may communicate relationship type, direction, or strength. Provide a clear and restrained legend for any encoding that is not self-explanatory.

Use subtle opacity differences and line weights. Avoid thick neon connections, excessive crossing lines, or animated beams.

Only show relationship strength or directional flow when those properties are supported by real data.

### E. Orbital labels

Introduce minimal, well-positioned labels for orbital categories.

Use compact uppercase labels or restrained technical typography, with consistent spacing and alignment.

Labels should feel like part of a professional analytical instrument rather than decorative HUD text.

Keep the central area uncluttered. Prioritize readability over showing every possible label simultaneously.

## 4. Visual design system

Use Ezana's existing design tokens as the starting point and refine them where necessary.

Recommended direction:

* Background: deep evergreen-black.
* Secondary surfaces: subtle variations of dark forest green.
* Primary text: soft white.
* Secondary text: muted sage gray.
* Main accent: controlled emerald.
* Secondary highlights: pale mint or a restrained neutral tone.
* Borders and orbital lines: low-contrast, translucent neutrals.

Use green to establish hierarchy, not to color every element. The result should remain elegant and calm.

Avoid:

* Excessive neon green.
* Purple or blue sci-fi gradients unless already integral to the established brand.
* Heavy glassmorphism.
* Thick borders around every object.
* Strong drop shadows on every node.
* Oversaturated glows.
* Decorative grid patterns that interfere with the data.

Use subtle lighting and depth sparingly. The visualization should still look excellent with animation disabled.

## 5. Typography

Use the project's newly selected typography system.

Preferred direction:

* Space Grotesk for headings, entity names, and important interface text.
* IBM Plex Mono for coordinates, timestamps, technical labels, and compact data readouts.

If the repository already has an approved font-loading approach, integrate with it. Avoid loading unnecessary font weights or duplicating font requests.

Create a consistent type scale for node labels, orbit labels, tooltips, and supporting metadata. Maintain clear contrast between important names and secondary information.

## 6. Interaction and motion

The orbital map should feel responsive and interactive, not like a static illustration.

Where existing functionality permits, implement or refine the following:

* Hovering over a node reveals a compact, well-designed tooltip.
* Selecting a node highlights it and its relevant connections.
* Unrelated nodes and connections become subtly less prominent when a node is selected.
* Selecting a related entity updates the active subject or opens its associated detail panel, following the existing application behavior.
* Clicking the central subject returns focus to the primary selection if that behavior makes sense for the existing interaction model.
* Any existing search or "Ping" action should update the map appropriately.
* Provide clear selected, hovered, focused, loading, empty, and error states wherever applicable.

Animation should be subtle and purposeful:

* Gentle transitions when nodes are selected.
* Slow, restrained motion only where it improves spatial understanding.
* Small opacity or position transitions for highlighting connections.
* No constant, distracting rotation of the entire map.
* No excessive pulsing, flashing, or continuously moving lines.

Respect `prefers-reduced-motion`. Keep interactions usable with a keyboard and ensure focus states are visible.

## 7. Technical implementation

Choose the rendering approach that best fits the existing codebase.

Consider SVG for crisp, scalable orbital paths, labels, nodes, and accessible interactive elements. If the existing implementation already uses Canvas or another appropriate renderer, evaluate whether extending it is preferable.

Requirements:

* Keep rendering and interaction code modular.
* Separate visualization data from presentation logic.
* Use stable identifiers for nodes and edges.
* Avoid unnecessary full-map re-renders.
* Keep coordinate calculations predictable and maintainable.
* Handle resize events using the project's established patterns.
* Prevent labels and nodes from extending beyond the visualization container.
* Avoid adding large dependencies for effects that can be implemented simply.
* Ensure the map remains sharp on high-density displays.
* Keep accessibility, performance, and maintainability in mind.

Do not fabricate live financial data, relationships, node counts, or intelligence claims. Preserve real data integrations and clearly distinguish actual records from demonstration data.

## 8. Responsive behavior

Desktop:

* Give the map sufficient space to establish a clear focal point.
* Preserve balanced spacing between the center, orbital layers, and surrounding Sonar cards.
* Ensure the map remains visually dominant without overwhelming the page.

Tablet:

* Scale the orbital composition proportionally.
* Reduce secondary labels and nonessential decorative detail.
* Preserve selection and tooltip functionality.

Mobile:

* Do not simply shrink the desktop map until everything becomes unreadable.
* Use a deliberate mobile composition with a compact center, fewer visible labels, and selectively displayed nodes.
* Keep touch targets usable.
* Prevent horizontal overflow.
* Ensure the map can coexist with the search control and related intelligence cards without clipping or overlap.

Test at representative widths of 1920, 1440, 1024, 768, 390, and 320 pixels.

## 9. Integration with the Sonar page

The orbital map must feel like an intentional part of the complete Sonar experience.

* Align the map with the page's established content grid.
* Coordinate its scale and visual weight with the search field and surrounding intelligence cards.
* Preserve the existing page hierarchy and primary call to action.
* Ensure surrounding cards do not obscure important nodes or labels.
* Maintain consistent spacing, typography, borders, and surface treatments.
* Avoid adding decorative elements that compete with the main visualization.

## 10. Quality assurance

After implementation:

1. Run the project's relevant tests, linting, and build commands.
2. Inspect the page in a browser if browser tooling is available.
3. Test interactions with mouse, keyboard, and touch where practical.
4. Test all listed viewport widths.
5. Verify that existing search, selection, navigation, and data behavior still work.
6. Check console errors, missing assets, font-loading failures, overflow, and layout shifts.
7. Confirm the map remains usable with reduced motion enabled.

Fix issues discovered during verification instead of merely listing them.

## 11. Definition of done

The finished orbital map must:

* Look like a signature Ezana Finance visualization, not a generic radar widget.
* Communicate relationships through deliberate spatial hierarchy.
* Have refined orbital geometry, elegant node styling, and restrained motion.
* Be readable, responsive, accessible, and performant.
* Preserve existing application behavior and real data integrations.
* Integrate cleanly with the Sonar page and its surrounding cards.
* Be implemented as maintainable production code.

Before coding, briefly state which files and rendering approach you intend to use. Then implement the changes, verify them, and report the files changed, the interactions preserved or improved, the tests performed, and any remaining limitations.

**Important:** Do not stop after producing a visual mockup or recommendations. Implement the actual working changes in the repository.

---

## Part C — Reference SVG (from the Design canvas, Ezana palette)

This is the exact scene as approved on the canvas. Port it into a React component (`SonarOrbitalScene.tsx` or the existing orbital component) — keep the `<defs>` (filters, patterns, gradients, iso shapes) and the layer order, then replace the hard-coded node/panel content with data from the Sonar result. Everything below uses literal hex; map these to theme tokens (`--emerald`, etc.) in the implementation per Ezana's "theme tokens only" rule.

```svg
<svg class="scene" role="img" aria-label="Isometric illustration of the Ezana Sonar device: a dark slab with a recessed dotted world map, emerald radar rings with a sweeping wedge, floating glass readout panels, a Signal Found plaque, cube nodes linked by thin lines, and glowing edge light bars" width="1440" height="810" viewBox="0 0 1440 810" style="position: absolute; inset: 0">
<defs>
  <!-- glows -->
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
  <filter id="glowL" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9" result="b"></feGaussianBlur><feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge></filter>
  <filter id="fog" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"></feGaussianBlur></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"></feGaussianBlur></filter>

  <!-- dotted surface -->
  <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="0.9" fill="#232a31"></circle></pattern>
  <pattern id="dotsMap" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" fill="#3a4550"></circle></pattern>

  <!-- gradients -->
  <radialGradient id="vignette" cx="50%" cy="45%" r="65%"><stop offset="0%" stop-color="#0b1012"></stop><stop offset="100%" stop-color="#040607"></stop></radialGradient>
  <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#10b981" stop-opacity="0.38"></stop><stop offset="60%" stop-color="#10b981" stop-opacity="0.08"></stop><stop offset="100%" stop-color="#10b981" stop-opacity="0"></stop></radialGradient>
  <linearGradient id="sweep" gradientUnits="userSpaceOnUse" x1="150" y1="-150" x2="-150" y2="-150"><stop offset="0%" stop-color="#34d399" stop-opacity="0.62"></stop><stop offset="45%" stop-color="#10b981" stop-opacity="0.28"></stop><stop offset="100%" stop-color="#10b981" stop-opacity="0"></stop></linearGradient>
  <linearGradient id="slabTopG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1d2228"></stop><stop offset="100%" stop-color="#14181d"></stop></linearGradient>
  <linearGradient id="recessG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0a0e12"></stop><stop offset="100%" stop-color="#0c1115"></stop></linearGradient>
  <linearGradient id="glassG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"></stop><stop offset="100%" stop-color="#ffffff" stop-opacity="0.03"></stop></linearGradient>
  <linearGradient id="barG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#10b981" stop-opacity="0.2"></stop><stop offset="20%" stop-color="#34d399"></stop><stop offset="80%" stop-color="#34d399"></stop><stop offset="100%" stop-color="#10b981" stop-opacity="0.2"></stop></linearGradient>

  <!-- iso shapes (ground plane u,v → screen) -->
  <rect id="slabTop" x="-300" y="-300" width="600" height="600" rx="48" transform="matrix(0.866 0.5 -0.866 0.5 720 364)"></rect>
  <rect id="baseTop" x="-350" y="-350" width="700" height="700" rx="44" transform="matrix(0.866 0.5 -0.866 0.5 720 400)"></rect>
  <clipPath id="recessClip"><rect x="-252" y="-252" width="504" height="504" rx="34" transform="matrix(0.866 0.5 -0.866 0.5 720 364)"></rect></clipPath>
</defs>

<!-- background -->
<rect width="1440" height="810" fill="url(#vignette)"></rect>

<!-- ===== glass base plate ===== -->
<g>
  <use href="#baseTop" y="8" fill="#07090b"></use>
  <use href="#baseTop" y="6" fill="#07090b"></use>
  <use href="#baseTop" y="4" fill="#07090b"></use>
  <use href="#baseTop" y="2" fill="#07090b"></use>
  <use href="#baseTop" fill="#0b0e11" stroke="rgba(255,255,255,0.07)" stroke-width="1"></use>
  <!-- mint accent lines (secondary highlight) -->
  <path d="M250 322L470 195" stroke="#a7f3d0" stroke-opacity="0.75" stroke-width="1.5" stroke-linecap="round" filter="url(#glow)"></path>
  <path d="M900 646L1200 473" stroke="#a7f3d0" stroke-opacity="0.75" stroke-width="1.5" stroke-linecap="round" filter="url(#glow)"></path>
</g>

<!-- ===== slab body (extruded) ===== -->
<g fill="#0e1115">
  <use href="#slabTop" y="36"></use><use href="#slabTop" y="34"></use><use href="#slabTop" y="32"></use><use href="#slabTop" y="30"></use>
  <use href="#slabTop" y="28"></use><use href="#slabTop" y="26"></use><use href="#slabTop" y="24"></use><use href="#slabTop" y="22"></use>
  <use href="#slabTop" y="20"></use><use href="#slabTop" y="18"></use><use href="#slabTop" y="16"></use><use href="#slabTop" y="14"></use>
  <use href="#slabTop" y="12"></use><use href="#slabTop" y="10"></use><use href="#slabTop" y="8"></use><use href="#slabTop" y="6"></use>
  <use href="#slabTop" y="4"></use><use href="#slabTop" y="2"></use>
</g>
<!-- bottom rail edge line -->
<use href="#slabTop" y="36" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"></use>

<!-- ===== slab top face + bezel ===== -->
<use href="#slabTop" fill="url(#slabTopG)" stroke="#262c33" stroke-width="1"></use>

<!-- recessed screen -->
<g transform="matrix(0.866 0.5 -0.866 0.5 720 364)">
  <rect x="-252" y="-252" width="504" height="504" rx="34" fill="url(#recessG)" stroke="#05070a" stroke-width="3"></rect>
  <rect x="-252" y="-252" width="504" height="504" rx="34" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"></rect>
</g>
<!-- dotted field + rough world map, clipped to the recess -->
<g clip-path="url(#recessClip)">
  <rect x="200" y="64" width="1040" height="600" fill="url(#dots)"></rect>
  <g transform="matrix(0.866 0.5 -0.866 0.5 720 364)" fill="url(#dotsMap)">
    <path d="M-210 -160c40 -34 112 -34 146 -4c22 30 -8 64 -40 86c-30 22 -64 12 -76 -8c-22 -12 -52 -34 -30 -74z"></path>
    <path d="M-96 18c32 0 54 32 44 74c-6 42 -32 74 -54 64c-22 -22 -32 -86 10 -138z"></path>
    <path d="M-12 -134c42 -12 84 0 94 32c10 42 0 126 -42 148c-42 10 -74 -42 -74 -94c-6 -42 0 -74 22 -86z"></path>
    <path d="M92 -176c74 -22 148 0 160 42c10 42 -42 86 -96 86c-54 0 -96 -42 -96 -86c0 -22 10 -32 32 -42z"></path>
    <path d="M152 44c32 -10 64 10 64 42c0 32 -42 42 -64 22c-22 -22 -22 -54 0 -64z"></path>
  </g>
  <!-- faint grid lines on the screen -->
  <g transform="matrix(0.866 0.5 -0.866 0.5 720 364)" stroke="rgba(255,255,255,0.035)" stroke-width="1" fill="none">
    <path d="M-252 -126h504M-252 0h504M-252 126h504M-126 -252v504M0 -252v504M126 -252v504"></path>
  </g>
</g>

<!-- ===== radar ===== -->
<g transform="matrix(0.866 0.5 -0.866 0.5 720 364)">
  <circle cx="0" cy="0" r="150" fill="url(#coreGlow)"></circle>
  <!-- sweep wedge -->
  <path d="M0 0L-150 -150A212 212 0 0 1 150 -150Z" fill="url(#sweep)"></path>
  <path d="M0 0L150 -150" stroke="#a7f3d0" stroke-opacity="0.95" stroke-width="1.6" stroke-linecap="round" filter="url(#glow)"></path>
  <!-- rings -->
  <circle cx="0" cy="0" r="212" fill="none" stroke="#10b981" stroke-opacity="0.85" stroke-width="1.4" filter="url(#glow)"></circle>
  <circle cx="0" cy="0" r="226" fill="none" stroke="#10b981" stroke-opacity="0.55" stroke-width="6" stroke-dasharray="1.2 10.6"></circle>
  <circle cx="0" cy="0" r="141" fill="none" stroke="#10b981" stroke-opacity="0.55" stroke-width="1.1"></circle>
  <circle cx="0" cy="0" r="70" fill="none" stroke="#10b981" stroke-opacity="0.45" stroke-width="1"></circle>
  <!-- centre -->
  <circle cx="0" cy="0" r="4" fill="#d1fae5" filter="url(#glowL)"></circle>
</g>

<!-- ===== links + nodes on the surface ===== -->
<g fill="none" stroke="rgba(255,255,255,0.42)" stroke-width="1" stroke-linecap="round">
  <path d="M720 364L1045 405L1125 414"></path>
  <path d="M720 364L960 300"></path>
  <path d="M960 300L975 262"></path>
  <path d="M720 364L545 520"></path>
  <path d="M720 364L720 540"></path>
  <path d="M720 364L650 352"></path>
</g>
<!-- ring markers -->
<g fill="#0b0e11" stroke="#e5e7eb" stroke-opacity="0.9" stroke-width="1.2">
  <ellipse cx="1045" cy="405" rx="7" ry="4.5"></ellipse>
  <ellipse cx="960" cy="300" rx="7" ry="4.5"></ellipse>
</g>
<!-- glowing dots -->
<g filter="url(#glow)">
  <circle cx="975" cy="262" r="3" fill="#34d399"></circle>
  <circle cx="545" cy="520" r="4" fill="#34d399"></circle>
  <circle cx="1000" cy="283" r="2.5" fill="#6ee7b7"></circle>
  <circle cx="790" cy="340" r="5" fill="#ecfdf5"></circle>
  <circle cx="1060" cy="470" r="2.5" fill="#34d399"></circle>
</g>
<circle cx="790" cy="340" r="14" fill="#ecfdf5" fill-opacity="0.35" filter="url(#soft)"></circle>
<circle cx="545" cy="520" r="9" fill="none" stroke="#10b981" stroke-opacity="0.6" stroke-width="1"></circle>

<!-- iso cubes: left/right faces then top -->
<g filter="url(#glow)">
  <!-- cube 1 (inside radar) s=13 -->
  <polygon points="638.7,345.5 650,352 650,365 638.7,358.5" fill="#047857"></polygon>
  <polygon points="650,352 661.3,345.5 661.3,358.5 650,365" fill="#059669"></polygon>
  <polygon points="650,339 661.3,345.5 650,352 638.7,345.5" fill="#34d399"></polygon>
  <!-- cube 2 s=11 -->
  <polygon points="870.5,332.5 880,338 880,349 870.5,343.5" fill="#047857"></polygon>
  <polygon points="880,338 889.5,332.5 889.5,343.5 880,349" fill="#059669"></polygon>
  <polygon points="880,327 889.5,332.5 880,338 870.5,332.5" fill="#34d399"></polygon>
  <!-- cube 3 (far right) s=18 -->
  <polygon points="1109.4,405 1125,414 1125,432 1109.4,423" fill="#047857"></polygon>
  <polygon points="1125,414 1140.6,405 1140.6,423 1125,432" fill="#059669"></polygon>
  <polygon points="1125,396 1140.6,405 1125,414 1109.4,405" fill="#34d399"></polygon>
  <!-- small cube front s=8 -->
  <polygon points="713.1,536 720,540 720,548 713.1,544" fill="#047857"></polygon>
  <polygon points="720,540 726.9,536 726.9,544 720,548" fill="#059669"></polygon>
  <polygon points="720,532 726.9,536 720,540 713.1,536" fill="#34d399"></polygon>
</g>

<!-- ===== fog ===== -->
<g filter="url(#fog)" fill="#9ca3af">
  <ellipse cx="830" cy="300" rx="130" ry="46" fill-opacity="0.09"></ellipse>
  <ellipse cx="1000" cy="430" rx="150" ry="52" fill-opacity="0.08"></ellipse>
  <ellipse cx="560" cy="430" rx="120" ry="44" fill-opacity="0.06"></ellipse>
  <ellipse cx="740" cy="560" rx="110" ry="36" fill-opacity="0.05"></ellipse>
</g>

<!-- ===== edge light bars (front rails) ===== -->
<g stroke-linecap="round">
  <path d="M300 440L640 636" stroke="#05070a" stroke-width="16"></path>
  <path d="M300 440L640 636" stroke="url(#barG)" stroke-width="6" filter="url(#glowL)"></path>
  <path d="M800 636L1140 440" stroke="#05070a" stroke-width="16"></path>
  <path d="M800 636L1140 440" stroke="url(#barG)" stroke-width="6" filter="url(#glowL)"></path>
</g>

<!-- ===== SIGNAL FOUND plaque + keys (back-left rim) ===== -->
<g>
  <!-- plaque body (raised block) -->
  <polygon points="466,244 606,163 606,209 466,290" fill="#0c0f12"></polygon>
  <polygon points="470,236 610,155 610,201 470,282" fill="#1b2026" stroke="#2c333b" stroke-width="1"></polygon>
  <!-- glass label face -->
  <polygon points="478,236 602,164 602,196 478,268" fill="rgba(16,185,129,0.10)" stroke="#10b981" stroke-opacity="0.75" stroke-width="1.2"></polygon>
  <text class="sans" transform="matrix(0.866 -0.5 0 1 486 258)" x="2" y="0" fill="#34d399" font-size="15.5" font-weight="700" letter-spacing="0.06em" filter="url(#glow)">SIGNAL FOUND</text>
  <!-- bright keycap -->
  <polygon points="641,158 669,174 669,182 641,166" fill="#047857"></polygon>
  <polygon points="669,174 683,166 683,174 669,182" fill="#059669"></polygon>
  <polygon points="641,158 655,150 683,166 669,174" fill="#34d399" filter="url(#glowL)"></polygon>
  <!-- dark button -->
  <polygon points="690,136 718,152 718,160 690,144" fill="#111519"></polygon>
  <polygon points="718,152 736,142 736,150 718,160" fill="#171c21"></polygon>
  <polygon points="690,136 708,126 736,142 718,152" fill="#22282f" stroke="#343b43" stroke-width="1"></polygon>
  <!-- small side port light (left rim) -->
  <ellipse cx="312" cy="332" rx="9" ry="5" fill="#0b0e11" stroke="#1f252b"></ellipse>
  <ellipse cx="312" cy="332" rx="3.5" ry="2" fill="#34d399" filter="url(#glow)"></ellipse>
</g>

<!-- ===== floating glass panels ===== -->
<!-- Panel A: large, back-right, faces right-up (-v) -->
<g>
  <polygon points="775,320 945,222 945,32 775,130" fill="url(#glassG)" stroke="rgba(255,255,255,0.28)" stroke-width="1"></polygon>
  <polygon points="775,130 945,32 945,36 775,134" fill="rgba(255,255,255,0.25)"></polygon>
  <ellipse cx="900" cy="70" rx="40" ry="26" fill="#10b981" fill-opacity="0.22" filter="url(#soft)"></ellipse>
  <ellipse cx="830" cy="250" rx="34" ry="22" fill="#10b981" fill-opacity="0.12" filter="url(#soft)"></ellipse>
  <g class="mono" transform="matrix(0.866 -0.5 0 1 775 130)" fill="#6ee7b7" font-size="7.5" fill-opacity="0.9">
    <text x="12" y="22">SONAR SWEEP · NVDA</text>
    <text x="12" y="34" fill-opacity="0.6">SUBJECT LOCKED · 14 SRC</text>
    <text x="12" y="52">▸ 13F  BLK  VANG  CITADEL</text>
    <text x="12" y="63" fill-opacity="0.6">   NEW POSITION · Q3 HOLDINGS</text>
    <text x="12" y="78">▸ PTR  HOUSE  PURCHASE  SEP</text>
    <text x="12" y="89" fill-opacity="0.6">   DISCLOSED · 1 RECORD</text>
    <text x="12" y="104">▸ USASPENDING  DOD  PRIME</text>
    <text x="12" y="115" fill-opacity="0.6">   CONTRACT · ACTIVE</text>
    <text x="12" y="130">▸ EDGAR  10-Q  Q3</text>
    <text x="12" y="141" fill-opacity="0.6">   FILED · CITED</text>
    <text x="12" y="156">▸ LD-2  LOBBYING  AKIN GUMP</text>
    <text x="12" y="167" fill-opacity="0.6">   DISCLOSURE · 2026</text>
    <text x="150" y="22" fill-opacity="0.5">01</text>
  </g>
</g>
<!-- Panel B: far right, faces right-down (u) -->
<g>
  <polygon points="1050,320 1170,389 1170,259 1050,190" fill="url(#glassG)" stroke="rgba(255,255,255,0.28)" stroke-width="1"></polygon>
  <polygon points="1050,190 1170,259 1170,263 1050,194" fill="rgba(255,255,255,0.25)"></polygon>
  <ellipse cx="1150" cy="300" rx="26" ry="18" fill="#10b981" fill-opacity="0.18" filter="url(#soft)"></ellipse>
  <g class="mono" transform="matrix(0.866 0.5 0 1 1050 190)" fill="#6ee7b7" font-size="7" fill-opacity="0.9">
    <text x="10" y="18">THEMES · MACRO</text>
    <text x="10" y="32" fill-opacity="0.65">AI INFRA        0.91</text>
    <text x="10" y="42" fill-opacity="0.65">EXPORT CTRL     0.78</text>
    <text x="10" y="52" fill-opacity="0.65">DC CAPEX        0.74</text>
    <text x="10" y="62" fill-opacity="0.65">TAIWAN EXP      0.69</text>
    <text x="10" y="72" fill-opacity="0.65">FED PATH        0.52</text>
    <text x="10" y="82" fill-opacity="0.65">SEMIS SECTOR    0.49</text>
    <text x="10" y="100">PRED MKT  FED CUT  68%</text>
    <text x="10" y="112" fill-opacity="0.65">POLYMARKET · CITED</text>
  </g>
</g>
<!-- Panel C: left, faces right-up (-v) -->
<g>
  <polygon points="335,414 445,350 445,190 335,254" fill="url(#glassG)" stroke="rgba(255,255,255,0.28)" stroke-width="1"></polygon>
  <polygon points="335,254 445,190 445,194 335,258" fill="rgba(255,255,255,0.25)"></polygon>
  <ellipse cx="410" cy="300" rx="30" ry="22" fill="#10b981" fill-opacity="0.16" filter="url(#soft)"></ellipse>
  <circle cx="400" cy="292" r="4" fill="#fca5a5" fill-opacity="0.6" filter="url(#soft)"></circle>
  <g class="mono" transform="matrix(0.866 -0.5 0 1 335 254)" fill="#6ee7b7" font-size="7" fill-opacity="0.9">
    <text x="10" y="18">DIRECT · 01</text>
    <text x="10" y="32" fill-opacity="0.65">MSFT   CUSTOMER   AZURE</text>
    <text x="10" y="42" fill-opacity="0.65">TSM    FOUNDRY    CPTY</text>
    <text x="10" y="52" fill-opacity="0.65">HUANG  CEO        FORM 4</text>
    <text x="10" y="62" fill-opacity="0.65">BLK    13F        TOP</text>
    <text x="10" y="72" fill-opacity="0.65">VANG   13F        TOP</text>
    <text x="10" y="90">CAPITOL · 02</text>
    <text x="10" y="104" fill-opacity="0.65">PTR  H-0931  BUY</text>
    <text x="10" y="114" fill-opacity="0.65">PTR  S-0417  SELL</text>
    <text x="10" y="124" fill-opacity="0.65">DOD  PRIME   ACTIVE</text>
    <text x="10" y="134" fill-opacity="0.65">LD-2 AKIN GUMP</text>
  </g>
</g>
<!-- Panel D: front, faces right-down (u) -->
<g>
  <polygon points="585,560 730,644 730,529 585,445" fill="url(#glassG)" stroke="rgba(255,255,255,0.28)" stroke-width="1"></polygon>
  <polygon points="585,445 730,529 730,533 585,449" fill="rgba(255,255,255,0.25)"></polygon>
  <ellipse cx="620" cy="520" rx="28" ry="18" fill="#10b981" fill-opacity="0.16" filter="url(#soft)"></ellipse>
  <g class="mono" transform="matrix(0.866 0.5 0 1 585 445)" fill="#6ee7b7" font-size="7" fill-opacity="0.9">
    <text x="10" y="18">BRIEFING · CITED</text>
    <text x="10" y="32" fill-opacity="0.65">FINDINGS ONLY · NEVER ADVICE</text>
    <text x="10" y="48" fill-opacity="0.65">SWEPT 06:42 ET</text>
    <text x="10" y="58" fill-opacity="0.65">NODES 18 · EDGES 21</text>
    <text x="10" y="68" fill-opacity="0.65">DEPTH STANDARD · Q 7/10</text>
    <text x="100" y="86" fill-opacity="0.5">001 1.0.4</text>
    <text x="100" y="96" fill-opacity="0.5">002 0.9.1</text>
    <text x="100" y="106" fill-opacity="0.5">003 0.8.7</text>
  </g>
</g>

<!-- outer soft ambient glow under the slab -->
<ellipse cx="720" cy="700" rx="420" ry="40" fill="#10b981" fill-opacity="0.07" filter="url(#fog)"></ellipse>
</svg>
```

## Part D — First message to send Claude Code

> Read `ezana-sonar-orbital-map-handoff.md` in full. Inspect the current Sonar page and orbital map first (Part B §1), state the files and rendering approach you will use, then implement Part A + Part C as production code bound to real Sonar data, verify per Part B §10, and report files changed, interactions, tests and limitations. Do not stop at a mockup.
