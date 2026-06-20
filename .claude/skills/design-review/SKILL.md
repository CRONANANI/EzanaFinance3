---
name: design-review
description: Review new or changed UI against the Ezana Design System and theme tokens. Use when adding/altering any component, page, or styles — validates token usage, mono numerics, focus states, light/dark legibility, and that UI routes through the ds library instead of being hand-rolled.
---

# Design Review

Validate that UI changes conform to the Ezana Design System (`src/components/ds`)
and the token system (`src/app/theme-variables.css`). Run this before committing UI.

## 1. Inventory the diff

- `git diff --name-only` → list changed `.jsx/.tsx/.css` files.
- For each, ask: does this introduce a button/input/card/badge/modal/tab/table/
  numeric display that **should** be a `ds` component instead of hand-rolled?

## 2. Hard gates (must all pass)

Run the enforcement script on changed UI paths:

```
npm run lint:ds                          # the ds library itself
node scripts/check-ds-hex.mjs <path>     # any migrated dir/file
```

- [ ] **Zero hardcoded hex.** Every color references a token: `var(--…)` or the
      `token` map. The only allowed literal is `white` for text on emerald/danger fills.
- [ ] **No new global tokens.** Consume `theme-variables.css`; never add to it here.
- [ ] **Numerics are mono.** Every price/percent/count/ticker uses `<NumericValue>`
      / `<Ticker>` / `.ds-num` → JetBrains Mono + `tabular-nums`. No bare
      `toFixed()`/`toLocaleString()` rendered in a sans span.
- [ ] **Routes through the library.** New buttons/inputs/cards/badges/modals/tabs use
      `@/components/ds`, not a fresh `<button style={…}>` or `ez-*`/bespoke class.
- [ ] **Focus-visible.** Every interactive element shows a visible focus ring
      (the `.ds-*` layer provides emerald rings; custom controls must match).

## 3. Brand fidelity (visual)

- [ ] Spacing matches the `.ds-*` anatomy (Button `8px 14px` / `--radius-md`; Card
      `--radius-lg`; Badge pill). No off-scale padding/radius.
- [ ] Hover states: primary lifts + emerald glow; secondary/ghost shift surface.
- [ ] Typography: text in `--font-sans` (Plus Jakarta Sans); icons are Bootstrap Icons.

## 4. Light / dark legibility

- [ ] Toggle `body.light-mode` and re-check every changed surface for contrast.
- [ ] No element hardcodes a color that only works in one mode (the token flip
      handles both; hardcoding breaks one).
- [ ] Forced-dark scopes (`.force-dark-theme`, market-analysis, legal) still read.

## 5. Guardrails (must NOT be touched by UI work)

- [ ] `theme-variables.css` token **definitions** unchanged.
- [ ] Shared mock data files unchanged (enrich via client-side mappers instead).
- [ ] API auth layer (`withApiGuard` / `requireUser` / `getAdminClient`) untouched.

## 6. Verdict

Summarize: PASS, or a checklist of specific fixes with `file:line`. If a `ds`
component is missing a needed variant, prefer extending the library over a one-off.
