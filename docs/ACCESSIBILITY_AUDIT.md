# Accessibility + Multi-Device Audit

Audit of the core flows for keyboard, low-vision/screen-reader, and multi-device
(desktop / tablet / ~375px phone) users. Conducted by static analysis across four
areas (community/profile, Echo, learning/video, global shell/forms). Severity:
**P0** blocks a core action for keyboard/SR users · **P1** high-impact · **P2/P3** refinement.

> **Validation note.** This is a headless environment with no display or backend
> credentials, so live browser/keyboard click-through wasn't possible. Findings and
> fixes are validated by code analysis, the production build, and the automated
> gates (`lint:a11y`, `lint:ds`). A visual pass in a real browser (both themes) is
> the remaining check before broad rollout.

## Tooling added

- `npm run lint:a11y` — flags `<img>` without `alt` and unlabeled file inputs.
- `npm run lint:ds` — flags hardcoded hex (contrast/theming regressions).
- `.claude/skills/a11y-review` — reviewer checklist (keyboard, SR, states, responsive, contrast).
- DS accessible primitives: `Spinner`, `Alert` (role=alert/status), `EmptyState`,
  `ErrorState`, `IconButton` (requires label), `VisuallyHidden`; `Modal` now uses
  `aria-labelledby`; `.ds-sr-only` / `.ds-skip-link` utilities; reduced-motion respected.

## Fixed in this pass

| Area      | File                                                         | Fix                                                                                  |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Video     | learning/video/VideoUploader.jsx                             | File input `aria-label`; progress bar `role="progressbar"` + `aria-valuenow/min/max` |
| Video     | learning/video/MuxVideoPlayer.jsx                            | `<video>` `aria-label` (label passed from `VideoModule`)                             |
| Community | community/redesign_v2/EvoComposer.jsx                        | Image preview `alt`; conviction range slider `aria-label` + `aria-valuetext`         |
| Studio    | (dashboard)/partner-learning/page.js                         | Tab strip `role="tablist"/"tab"` + `aria-selected`; decorative icons `aria-hidden`   |
| Theming   | lib/creator-calls.js, lib/post-types.js, lib/video-format.js | Hardcoded status hex → semantic tokens (light/dark safe)                             |

## Open findings (prioritized — recommended next)

### Global shell / forms (P0–P1)

- **P0** `app/auth/signup/page.js:142–182` — first/last/username inputs: `<label>` without `htmlFor` and inputs without `id`. Add matching `id`/`htmlFor`.
- **P0** `app/auth/{signup,signin,login}/page.js` — no `<main id="main-content">` landmark (dashboard has one). Wrap content in `<main>`.
- **P1** `app/auth/signup/page.js:131` — error box needs `role="alert"`; submit button needs `aria-busy`. (Use DS `<Alert tone="error">`.)
- **P1** `app/auth/signup/page.js:150,163,181,226` — hardcoded `#161b22` / `#10b981` → `var(--inset)` / `var(--emerald)`.
- **P1** mobile-responsive.css:36,201,268,480 — nav touch targets 36–40px; raise to ≥44px.
- **P1** `app/settings/page.js:395,399` — save-bar `#f87171`/green → `var(--negative)`/`var(--positive)`; add `role="tablist"` to settings nav + Escape on mobile dropdown.
- **P1** MobileAuthNavDrawer — add Tab focus trap while open (Escape already closes).
- **P1** 23 decorative `<img alt="">` (leaderboard, settings, hero avatars) — add `aria-hidden="true"` or meaningful alt (e.g. comment author name).

### Community / Profile (P0–P2)

- **P0** community/redesign_v2/PostCard.jsx:~362–385 — share social icon buttons lack `aria-label`; conviction popup lacks Escape handler. (Use `<IconButton>` + Escape.)
- **P2** profile/redesign/CreatorTrackRecord.jsx — vote buttons `aria-pressed={active}`.
- **P2** community.css `.lpill` (LensBar) — add `:focus-visible` ring.
- **P1** profile/redesign/IdentityHero.jsx:~99 — `minWidth:280` progress block; collapse to `width:100%` under ~760px.
- **P1** community/redesign_v2/ConvictionMap.jsx — grid `minmax(140px,1fr)` can overflow <375px; reduce min at small widths.

### Echo (P0–P2)

- **P0** (dashboard)/ezana-echo/page.js:~371 — clickable tag `<span onClick>` → `<button>` or add `role/tabIndex/onKeyDown`.
- **P0** ezana-echo/page.js H1 `white-space:nowrap` — breaks ~375px; allow wrap / lower clamp floor.
- **P1** ezana-echo/page.js — hub has no loading state; show `<Skeleton>` cards while fetching. Empty state should be an `<h2>`.
- **P1** echo/ArticleEditor.jsx:193–201 — save messages need `role="alert"`/`aria-live` (use DS `<Alert>`).
- **P1** ezana-echo.css `.echo-v3-chip` — add `:focus-visible`.

### Learning / Video (P0–P2)

- **P1** learning/LearningCoursePage.jsx:274,705 — error text `#f87171` → `var(--negative)`.
- **P1** learning/LearningCoursePage.jsx:506,511 — quiz ✓/✗ are color-only; add `<VisuallyHidden>Correct/Incorrect</VisuallyHidden>`.
- **P1** learning/chapter/SectionRenderer.jsx — two-column sidebar (280px) should stack <700px; stepper needs tab roles.
- **P2** learning/LearningCoursePage.jsx:496 — wrap quiz options in `<fieldset><legend>`.
- **P2** learning/chapter/Stepper.jsx — progress needs `role="progressbar"` + `aria-valuenow`.

## Remaining risks

- The open findings above (esp. auth form labels/landmarks and PostCard share buttons) are real P0s for SR/keyboard users and should be the next pass.
- No automated axe/Lighthouse run or real-browser keyboard walk was possible here; treat this as a code-level audit pending that visual/AT verification.
- Touch-target sizing and focus-trap items need on-device checks at 375px and with a screen reader.
