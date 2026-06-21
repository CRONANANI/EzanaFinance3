---
name: a11y-review
description: Accessibility + responsive review for new or changed UI. Use when adding/altering any page, component, form, modal, media, or interactive control — validates keyboard operability, screen-reader semantics, focus, color-independent status, responsive behaviour (no overflow/overlap at phone widths), and light/dark contrast.
---

# Accessibility & Multi-Device Review

Validate UI changes against WCAG 2.1 AA and responsive behaviour. Run before
committing any UI. Pair with the `design-review` skill (tokens / DS usage).

## 1. Automated gate

```
node scripts/check-a11y.mjs <changed-path>    # <img> alt, file-input labels
node scripts/check-ds-hex.mjs <changed-path>  # hardcoded hex (contrast/theming)
```

## 2. Keyboard (no mouse)

- [ ] Every action reachable and operable with Tab / Shift+Tab / Enter / Space.
- [ ] Visible `:focus-visible` indicator on every interactive element (DS provides
      emerald rings; custom controls must add their own).
- [ ] Overlays (modal, dropdown, mobile menu) close on **Escape**; focus returns
      sensibly; focus is trapped while open where appropriate.
- [ ] No click handler on a bare `<div>`/`<span>` — use a `<button>`/`<a>`, or add
      `role` + `tabIndex={0}` + an `onKeyDown` (Enter/Space).

## 3. Screen-reader semantics

- [ ] `<img>` has meaningful `alt`, or `alt=""` + decorative intent.
- [ ] Icon-only buttons/links have `aria-label` (prefer DS `<IconButton label>`).
- [ ] Form controls have an associated `<label htmlFor>` or `aria-label`; inputs
      have `id`s. Group radios with `<fieldset>` + `<legend>`.
- [ ] Range sliders: `aria-label` + `aria-valuetext`. Progress: `role="progressbar"` + `aria-valuenow/min/max`. Tabs: `role="tablist"`/`tab"` + `aria-selected`.
- [ ] Async feedback announces: errors `role="alert"`, status `role="status"` /
      `aria-live="polite"` (prefer DS `<Alert tone>`).
- [ ] Status is never color-only — pair color with text/icon/`<VisuallyHidden>`.

## 4. States (every key view)

- [ ] Loading (skeleton/spinner with a label), empty (`<EmptyState>`), and error
      (`<ErrorState>` / `<Alert tone="error">`) states exist — not a blank screen.
- [ ] Disabled and busy states use `disabled` / `aria-busy`.

## 5. Responsive (desktop / tablet / 375px phone)

- [ ] No horizontal scroll, overlap, or clipped/truncated content at 375px wide.
- [ ] Fixed `minWidth`/`width` collapse on small screens; grids reflow.
- [ ] Touch targets ≥ ~44px on mobile nav/controls.

## 6. Contrast / theming

- [ ] Colors use tokens (`var(--…)`), so light + dark both stay legible. Toggle
      `body.light-mode` and recheck. No hardcoded hex.

## 7. Verdict

PASS, or a list of specific fixes with `file:line`. Prefer fixing in the DS so the
whole app benefits (e.g. add a missing accessible variant rather than a one-off).
