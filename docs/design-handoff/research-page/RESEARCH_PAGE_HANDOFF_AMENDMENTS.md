# Claude Code Prompt: Research page redesign, amendments to the handoff

Use this together with the handoff package (`RESEARCH_PAGE_HANDOFF.md` + `Dossier.wireframe.dc.html`). Put all three files in the repo under `docs/design-handoff/research-page/` and paste everything between the two `---PROMPT---` markers into Claude Code. The code below the second marker is the target shape for the new pieces.

---PROMPT---

## Context

Repo: CRONANANI/EzanaFinance3 (Ezana Finance). Next.js 14 App Router. Follow the repo's `CLAUDE.md` for git workflow and remotes. Read `docs/ENGINEERING.md`, `docs/CTO_ONBOARDING.md` and **`docs/EZANA_BRANDING_GUIDE.md`** before writing code.

We are building the Company view redesign of `/company-research` from `docs/design-handoff/research-page/RESEARCH_PAGE_HANDOFF.md` (reference wireframe: `Dossier.wireframe.dc.html`). This file **amends** that handoff. Where they disagree, **this file wins**. Everything in the handoff not mentioned here still applies, including its phases, "do not change" list and acceptance checklist.

Four amendments:

1. The page must follow the Ezana branding guide exactly (section A).
2. The Company / Industry / Portfolio toggle and the search pill span the full width of the page canvas (section B).
3. The section tabs under the stock chart (Overview, Models, Valuation, Earnings, News, Peers) **swap content in place** instead of scrolling to anchors (section C).
4. Each section can be **pinned**; pinned sections stay on the page and get pushed down when another tab is opened (section C).

Before coding, post a short plan that maps each existing component to its section and lists any branding conflicts you find beyond the ones in section A. Then build in the handoff's phases. The new section-stack logic (C.4) and its test go in Phase 1 with the foundations. Stop after Phase 1 for review.

---

## A. Branding compliance (overrides the handoff where they differ)

Source of truth: `docs/EZANA_BRANDING_GUIDE.md` and `src/app/theme-variables.css`. Concretely:

1. **Tokens only, use the real names.** The handoff uses generic names; map them to the tokens that exist:
   - Surfaces: `--surface-card` (cards), `--surface-card-hover`, `--surface-2` / `--inset` (inset areas like the chart well and the analysis rail), `--surface-tinted` (callouts). Page background: `--bg-primary`.
   - Text: `--text-primary`, `--text-secondary` (body), `--text-muted` (labels, eyebrows), `--text-faint` (microcopy).
   - Brand and state: `--emerald`, `--emerald-bg`, `--emerald-bg-subtle`, `--emerald-text`; premium `--gold`, `--gold-bg`, `--gold-text`; `--positive` / `--positive-bg`, `--negative` / `--negative-bg`; neutral rating `--warning`.
   - Charts: `--chart-line`, `--chart-fill-start`, `--chart-fill-end`, `--chart-axis`, `--chart-cat-1..8`, and the `CHART` props from `src/lib/chart-theme.js`. Recharts axis ticks at 11px.
   - Radius: `--radius-sm` 4, `--radius-md` 8, `--radius-lg` 12 (cards, modals), `--radius-xl` 16 (header band, analysis reader, search pill), `999px` for pills and the view toggle. Never declare these tokens anywhere else.
   - Shadows: `--shadow-sm` / `--shadow-md` only on cards (the guide forbids harsh shadows in light mode), `--shadow-glow` for the search focus.
   - Fonts: `var(--font-sans)` and `var(--font-mono)` only, never a family name.
   - If something is missing, add a token to `theme-variables.css` for both dark and `body.light-mode`; prefer `color-mix()` on an existing token over a new literal.
2. **Type ramp, not pixel sizes.** Replace the handoff's raw px sizes with the `--type-*` tokens: page title, section (`--type-section-*`, sans 600), card title (`--type-card-title-*`, **sans 600**), body (`--type-body-*`), caption, eyebrow (`--type-eyebrow-*`, **mono uppercase**), micro, `--type-value-lg-*` / `--type-value-sm-*` / `--type-value-xl-size` for numbers.
   - **Correction to handoff 4.1:** card titles are **sans** (card title token), not mono uppercase. Mono uppercase is for the eyebrow line above a title only. The guide forbids prose and navigation in mono, so tab labels and button labels are sans.
   - Max 2 weight levels per card.
3. **No Tailwind utility classes** in any new or touched component (guide section 11). The current research cards (`KeyMetrics`, `EarningsCard`, `CompetitorsCard`, etc.) use Tailwind and inline styles; migrate whatever you touch to page-scoped CSS. Use the page prefix **`crx-`** for all new classes, in `src/app/(dashboard)/company-research/dossier.css` (or co-located CSS for shared components).
4. **Use `@/components/ds`** for primitives instead of hand-rolling: `Button`, `IconButton`, `Badge` (tier badges), `Tabs`/`.ds-tab` styles, `Skeleton*`, `EmptyState`, `ErrorState`, `NumericValue`, `Ticker`, `Table`, `Toggle` (Explain simply), `Modal`, `Tooltip`. If a primitive needs a new option, extend it in `src/components/ds` rather than forking it.
5. **Cards:** no borders or outlines on component cards (product direction for all three app versions). This intentionally overrides the 1px border in the guide's "standard card" snippet; everything else in that pattern (surface, radius-lg, shadow-md, padding 1.5rem, hover to `--surface-card-hover`) applies. Separate cards by surface and elevation; the 1px gold ring on the active model is a selection state via `box-shadow`, which is fine.
6. **Motion:** hover/focus 0.15s ease, card lift 0.2s, numbers 0.3s ease-out, shimmer 1.5s. **No spinners** (the current cards' spinning loaders go); shimmer skeletons only. Every animation disabled under `prefers-reduced-motion: reduce`.
7. **Icons:** Bootstrap Icons only, `aria-hidden="true"` on decorative icons, `aria-label` on icon-only buttons. GRPV uses the Walia ibex mark via `EzanaNavLogo`.
8. **Copy:** no em dashes, no vendor or infrastructure names, findings only, analyst data labelled as reported by analysts.
9. **Gates:** `npm run lint:branding`, `npm run lint:ds`, `npm run check:vendor-copy`, the em dash guard (`scripts/check-echo-emdash.mjs` if it accepts paths, otherwise grep touched files for `—`) and `npm run lint` must pass on every commit.

## B. Full-width view toggle and search pill (overrides handoff 3.2)

- The **Company / Industry / Portfolio** segmented control spans the **full width of the page content column** (the same 1280px max-width canvas as the header band below it). Three equal segments (`grid-template-columns: repeat(3, 1fr)`), height 48px (44px minimum on phone), pill shape (`999px`), track `--surface-card`, active segment `--emerald` fill with `--color-on-primary` text, inactive `--text-secondary`, hover `--surface-card-hover`. Icon plus label in each segment, labels never wrap. Keep `role="tablist"` and the `?view=` URL behaviour exactly as today.
- The **search pill** spans the same full width: **remove the handoff's 760px max-width**. Height 64px (56px on phone), `--radius-xl`, `--surface-input` fill, focus `--surface-input-focus` plus `--shadow-glow`. Typeahead dropdown matches the pill width. Recent chips stay left-aligned under it.
- Toggle, search and header band share left and right edges so the column reads as one block. Applies to the Industry and Portfolio views too, since they render the same header.

## C. Section tabs become in-place panels with pinning (overrides handoff 3.4 and the anchor behaviour)

### C.1 Behaviour

- The tab bar (**Overview, Models, Valuation, Earnings, News, Peers**) sits directly under the header band and stays sticky as in the handoff (inset hairline shadow, no border; optional compact ticker and price once stuck).
- **Clicking a tab does not scroll to an anchor.** It renders that section's component cards **in the slot directly below the tab bar**, replacing whatever unpinned section was there. Remove scroll-spy and the `#models` style anchors.
- Default on load: **Overview**.
- Each section has a **pin button in its top-right corner** (section header, not the individual cards). Pinned sections stay on the page.
- Display order: **the active tab's section first, directly under the tab bar, then every pinned section** below it, most recently pinned first. So opening a new tab pushes the pinned sections down; they are never removed by switching tabs.
- Clicking a tab whose section is already pinned moves it to the top slot (it is rendered once, never duplicated).
- Unpinning the **active** section keeps it on screen (it's still the active tab). Unpinning any other section removes it from the page.
- After a tab click, if the top of the panel slot is above the viewport (user scrolled down), scroll it into view smoothly (instant under reduced motion), offset by the sticky bar height. Otherwise don't move the page.
- In the tab bar, pinned tabs show a small `bi-pin-angle-fill` before the label; the active tab keeps the 2px emerald underline.
- Pins persist per browser across tickers in `localStorage` (key `ezana.research.pinnedSections.v1`, wrapped in try/catch, page works without it). The active tab is reflected in the URL as `?section=valuation` (omitted for Overview) with `router.replace`, never disturbing `?view=`.

### C.2 Section contents

| Tab           | Cards (from the handoff)                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**  | At-a-glance digest: company profile (reuse `CompanyOverview` if it renders the description), analyst consensus mini (consensus label + price target bar), latest earnings quarter card, top 3 news items with a "See all news" button that **opens the News tab** (not a scroll). |
| **Models**    | Models grid (handoff 3.5) and, when a model is opened, the analysis reader (3.6) under the grid inside this section.                                                                                                                                                              |
| **Valuation** | Analyst card + 4 grouped metric cards (3.7).                                                                                                                                                                                                                                      |
| **Earnings**  | Quarter cards + "Show table" history (3.8). Team action in the card action slot.                                                                                                                                                                                                  |
| **News**      | Full news list (3.9), 5 then "Show more" up to 20.                                                                                                                                                                                                                                |
| **Peers**     | Peer comparison table (3.9).                                                                                                                                                                                                                                                      |

News and Peers are now separate tabs, so the handoff's 7/12 + 5/12 side-by-side layout no longer applies; each takes the full width.

### C.3 State must survive reordering

- Keep `activeModel`, the analysis result, and each card's fetched data in state that lives above the section stack (page level or the existing hooks' caches). Render the stack as a keyed list (`key={sectionId}`) so React moves pinned sections instead of remounting them: pinning Models with an open GRPV analysis, then opening Valuation, must not re-run the analysis or refetch.
- Sections that are neither active nor pinned are unmounted. Their hooks re-fetch from cache when reopened; if a hook has no cache, that's acceptable but call it out in the Phase 1 report.

### C.4 Pure logic module and test (Phase 1)

Implement the ordering rules as a pure module `src/lib/research/sectionStack.js` (scaffold below) and a node:test file `scripts/check-research-sections.mjs` following the repo's existing pattern (`scripts/check-sector-detail.mjs`, loaded with `register-sonar-loader.mjs`). Add `"test:research-sections"` to `package.json` and append it to the `test` chain.

### C.5 Two pin icons, no confusion

The handoff's card action slot already has **Pin to Home** (`bi-pin-angle`). To avoid two identical icons with different meanings:

- **Section pin (keep on this page):** `bi-pin-angle` / `bi-pin-angle-fill`, in the section header, `aria-pressed`, label "Pin section" / "Unpin section", tooltip "Keep this section on the page".
- **Card Pin to Home:** change its icon to `bi-house-add` (`bi-house-check-fill` when pinned), label "Add to Home" / "On your Home". Behaviour unchanged. Only on this page's `ResearchCard`; don't change `PinnableCard` elsewhere.

### C.6 Accessibility

- Tab bar: `role="tablist"`, each tab `role="tab"`, `aria-selected`, `aria-controls` pointing at its section. Arrow-key navigation between tabs, Home/End to first/last.
- Each rendered section: `role="tabpanel"` for the active one, `role="region"` with `aria-labelledby` for pinned ones (several are visible at once). Section heading is an `h2`.
- Announce changes via a polite live region: "Valuation opened" / "Peers pinned" / "Peers unpinned".
- Touch targets 44px; tab bar scrolls horizontally on phone.

## Report back after Phase 1

Plan mapping, branding conflicts found, the passing output of `test:research-sections` and the branding gates, and screenshots of the full-width toggle and search pill in dark and light mode at 1280px and 375px.

---PROMPT---

---

## Code scaffold (adapt to the repo; no Tailwind, tokens only)

### `src/lib/research/sectionStack.js`

```js
/**
 * Research page section stack. Pure, framework-free, tested by
 * scripts/check-research-sections.mjs.
 *
 * Rules:
 *  - the active section renders first, directly under the tab bar
 *  - pinned sections follow, most recently pinned first
 *  - a section is never rendered twice
 *  - switching tabs never unpins anything
 *  - unpinning the active section keeps it on screen
 */

export const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'bi-grid-1x2' },
  { id: 'models', label: 'Models', icon: 'bi-cpu' },
  { id: 'valuation', label: 'Valuation', icon: 'bi-cash-stack' },
  { id: 'earnings', label: 'Earnings', icon: 'bi-bar-chart-line' },
  { id: 'news', label: 'News', icon: 'bi-newspaper' },
  { id: 'peers', label: 'Peers', icon: 'bi-people' },
];

export const DEFAULT_SECTION = 'overview';
const IDS = new Set(SECTIONS.map((s) => s.id));

export const isSectionId = (id) => IDS.has(id);

/** @typedef {{ active: string, pinned: string[] }} StackState */

/** @returns {StackState} */
export function initStack({ active, pinned } = {}) {
  const cleanPinned = [...new Set((pinned ?? []).filter(isSectionId))];
  return {
    active: isSectionId(active) ? active : DEFAULT_SECTION,
    pinned: cleanPinned,
  };
}

/** Open a tab. Pins are untouched. */
export function selectSection(state, id) {
  if (!isSectionId(id) || state.active === id) return state;
  return { ...state, active: id };
}

/** Pin or unpin a section. Newly pinned sections go to the front of the pinned list. */
export function togglePin(state, id) {
  if (!isSectionId(id)) return state;
  const isPinned = state.pinned.includes(id);
  return {
    ...state,
    pinned: isPinned ? state.pinned.filter((p) => p !== id) : [id, ...state.pinned],
  };
}

export const isPinned = (state, id) => state.pinned.includes(id);

/** Ordered list of section ids to render. */
export function visibleSections(state) {
  return [state.active, ...state.pinned.filter((p) => p !== state.active)];
}
```

### `scripts/check-research-sections.mjs`

```js
/**
 * Research page section tabs: in-place panels with pinning. The ordering
 * rules live in src/lib/research/sectionStack.js; these checks pin them down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { initStack, selectSection, togglePin, visibleSections, isPinned, DEFAULT_SECTION } =
  await import('@/lib/research/sectionStack');

test('defaults to Overview with nothing pinned', () => {
  const s = initStack();
  assert.equal(s.active, DEFAULT_SECTION);
  assert.deepEqual(visibleSections(s), ['overview']);
});

test('clicking a tab replaces the unpinned section', () => {
  const s = selectSection(initStack(), 'valuation');
  assert.deepEqual(visibleSections(s), ['valuation']);
});

test('a pinned section is bumped down when another tab opens', () => {
  let s = initStack({ active: 'models' });
  s = togglePin(s, 'models');
  s = selectSection(s, 'valuation');
  assert.deepEqual(visibleSections(s), ['valuation', 'models']);
  s = selectSection(s, 'news');
  assert.deepEqual(visibleSections(s), ['news', 'models']);
});

test('most recently pinned sits directly under the active section', () => {
  let s = initStack({ active: 'models' });
  s = togglePin(s, 'models');
  s = selectSection(s, 'earnings');
  s = togglePin(s, 'earnings');
  s = selectSection(s, 'peers');
  assert.deepEqual(visibleSections(s), ['peers', 'earnings', 'models']);
});

test('opening a pinned tab moves it to the top without duplicating it', () => {
  let s = initStack({ active: 'models', pinned: ['models', 'earnings'] });
  s = selectSection(s, 'earnings');
  assert.deepEqual(visibleSections(s), ['earnings', 'models']);
});

test('unpinning the active section keeps it on screen', () => {
  let s = initStack({ active: 'valuation', pinned: ['valuation'] });
  s = togglePin(s, 'valuation');
  assert.equal(isPinned(s, 'valuation'), false);
  assert.deepEqual(visibleSections(s), ['valuation']);
});

test('unpinning a background section removes it', () => {
  let s = initStack({ active: 'news', pinned: ['models'] });
  s = togglePin(s, 'models');
  assert.deepEqual(visibleSections(s), ['news']);
});

test('ignores unknown ids and duplicate pins from storage', () => {
  const s = initStack({ active: 'bogus', pinned: ['models', 'models', 'nope'] });
  assert.equal(s.active, DEFAULT_SECTION);
  assert.deepEqual(s.pinned, ['models']);
  assert.equal(selectSection(s, 'nope'), s);
});
```

`package.json`:

```json
"test:research-sections": "node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-research-sections.mjs"
```

(append `&& npm run test:research-sections` to the `test` script)

### `src/components/research/dossier/useSectionStack.js`

```js
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  initStack,
  selectSection,
  togglePin,
  visibleSections,
  DEFAULT_SECTION,
} from '@/lib/research/sectionStack';

const STORAGE_KEY = 'ezana.research.pinnedSections.v1';

function readPins() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePins(pins) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    /* storage unavailable: pins last for this visit only */
  }
}

export function useSectionStack() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState(() =>
    initStack({ active: searchParams.get('section') ?? DEFAULT_SECTION }),
  );
  const [announcement, setAnnouncement] = useState('');
  const hydrated = useRef(false);

  // Pins come from storage after mount so server and first client render match.
  useEffect(() => {
    setState((s) => initStack({ active: s.active, pinned: readPins() }));
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (hydrated.current) writePins(state.pinned);
  }, [state.pinned]);

  // Mirror the active tab into ?section=, leaving ?view= and everything else alone.
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    if (state.active === DEFAULT_SECTION) sp.delete('section');
    else sp.set('section', state.active);
    const next = sp.toString();
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [state.active]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = useCallback((id, label) => {
    setState((s) => selectSection(s, id));
    if (label) setAnnouncement(`${label} opened`);
  }, []);

  const pin = useCallback((id, label) => {
    setState((s) => {
      const next = togglePin(s, id);
      if (label) setAnnouncement(`${label} ${next.pinned.includes(id) ? 'pinned' : 'unpinned'}`);
      return next;
    });
  }, []);

  const order = useMemo(() => visibleSections(state), [state]);

  return { state, order, open, pin, announcement };
}
```

### `src/components/research/dossier/SectionTabs.jsx`

```jsx
'use client';

import { useRef } from 'react';
import { SECTIONS } from '@/lib/research/sectionStack';

export function SectionTabs({ state, onOpen, compactQuote = null }) {
  const listRef = useRef(null);

  const onKeyDown = (e) => {
    const tabs = [...listRef.current.querySelectorAll('[role="tab"]')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      next.focus();
      next.click();
    }
  };

  return (
    <nav className="crx-tabs-bar" aria-label="Company research sections">
      {compactQuote}
      <div
        ref={listRef}
        className="crx-tabs"
        role="tablist"
        aria-label="Sections"
        onKeyDown={onKeyDown}
      >
        {SECTIONS.map((s) => {
          const selected = state.active === s.id;
          const pinned = state.pinned.includes(s.id);
          return (
            <button
              key={s.id}
              id={`crx-tab-${s.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`crx-section-${s.id}`}
              tabIndex={selected ? 0 : -1}
              className="crx-tab"
              onClick={() => onOpen(s.id, s.label)}
            >
              {pinned && <i className="bi bi-pin-angle-fill crx-tab-pin" aria-hidden="true" />}
              {s.label}
              {pinned && <span className="crx-visually-hidden"> (pinned)</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

### `src/components/research/dossier/SectionStack.jsx`

```jsx
'use client';

import { useEffect, useRef } from 'react';
import { IconButton, Tooltip } from '@/components/ds';
import { SECTIONS } from '@/lib/research/sectionStack';

const LABEL = Object.fromEntries(SECTIONS.map((s) => [s.id, s.label]));

/**
 * Renders the active section first, then pinned sections. Keyed by id so React
 * moves pinned sections instead of remounting them (open analyses survive).
 *
 * renderSection(id) returns the section body; titles are passed in `titles`
 * so a section can read "Run a model on AAPL" instead of just "Models".
 */
export function SectionStack({
  state,
  order,
  onPin,
  renderSection,
  titles = {},
  stickyOffset = 64,
}) {
  const slotRef = useRef(null);
  const prevActive = useRef(state.active);

  // On tab change, bring the slot into view only if the user has scrolled past it.
  useEffect(() => {
    if (prevActive.current === state.active) return;
    prevActive.current = state.active;
    const el = slotRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < stickyOffset) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: window.scrollY + top - stickyOffset - 8,
        behavior: reduce ? 'auto' : 'smooth',
      });
    }
  }, [state.active, stickyOffset]);

  return (
    <div ref={slotRef} className="crx-stack">
      {order.map((id) => {
        const active = id === state.active;
        const pinned = state.pinned.includes(id);
        const headingId = `crx-section-${id}-title`;
        return (
          <section
            key={id}
            id={`crx-section-${id}`}
            role={active ? 'tabpanel' : 'region'}
            aria-labelledby={active ? `crx-tab-${id}` : headingId}
            className={`crx-section${active ? ' is-active' : ''}${pinned ? ' is-pinned' : ''}`}
          >
            <header className="crx-section-head">
              <div className="crx-section-titles">
                {pinned && !active && <span className="crx-eyebrow">Pinned</span>}
                <h2 id={headingId} className="crx-section-title">
                  {titles[id] ?? LABEL[id]}
                </h2>
              </div>
              <Tooltip content={pinned ? 'Unpin section' : 'Keep this section on the page'}>
                <IconButton
                  icon={pinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'}
                  label={pinned ? `Unpin ${LABEL[id]}` : `Pin ${LABEL[id]}`}
                  aria-pressed={pinned}
                  className={`crx-section-pin${pinned ? ' is-on' : ''}`}
                  onClick={() => onPin(id, LABEL[id])}
                />
              </Tooltip>
            </header>
            <div className="crx-section-body">{renderSection(id)}</div>
          </section>
        );
      })}
    </div>
  );
}
```

### `src/components/research/dossier/ViewToggle.jsx`

```jsx
'use client';

const VIEWS = [
  { id: 'company', label: 'Company', icon: 'bi-building' },
  { id: 'industry', label: 'Industry', icon: 'bi-grid-3x3-gap' },
  { id: 'portfolio', label: 'Portfolio', icon: 'bi-pie-chart' },
];

/** Full-width segmented control. Keeps the existing setView / ?view= contract. */
export function ViewToggle({ view, setView }) {
  return (
    <div role="tablist" aria-label="Research view" className="crx-view-toggle">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          role="tab"
          aria-selected={view === v.id}
          className="crx-view-toggle-btn"
          onClick={() => setView(v.id)}
        >
          <i className={`bi ${v.icon}`} aria-hidden="true" />
          <span>{v.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### Page wiring (inside the Company view of `company-research/page.js`)

```jsx
import { ViewToggle } from '@/components/research/dossier/ViewToggle';
import { SectionTabs } from '@/components/research/dossier/SectionTabs';
import { SectionStack } from '@/components/research/dossier/SectionStack';
import { useSectionStack } from '@/components/research/dossier/useSectionStack';
import './dossier.css';

// ...inside the component
const { state: sectionState, order, open, pin, announcement } = useSectionStack();

const renderSection = (id) => {
  switch (id) {
    case 'overview':
      return <OverviewSection symbol={selectedStock} onOpenSection={open} />;
    case 'models':
      // activeModel + analysis state stay at page level so they survive reordering
      return (
        <ModelsSection
          symbol={selectedStock}
          activeModel={activeModel}
          onOpenModel={handleModelClick}
          onCloseModel={handleCloseAnalysis}
        />
      );
    case 'valuation':
      return <ValuationSection symbol={selectedStock} />;
    case 'earnings':
      return <EarningsSection symbol={selectedStock} />;
    case 'news':
      return <NewsSection symbol={selectedStock} />;
    case 'peers':
      return (
        <PeersSection
          symbol={selectedStock}
          onSelectPeer={(p) => handleSelectStock(p, { fromPeer: true })}
        />
      );
    default:
      return null;
  }
};

// JSX order in the deep-dive state:
<div className="crx-canvas">
  <ViewToggle view={view} setView={setView} />
  <div className="crx-search">{/* existing AnimatedGlowingSearchBar, restyled full width */}</div>
  {/* recent chips */}
  {/* header band: ticker, price, actions, range selector, chart, stat strip */}
  <SectionTabs state={sectionState} onOpen={open} />
  <SectionStack
    state={sectionState}
    order={order}
    onPin={pin}
    renderSection={renderSection}
    titles={{ models: `Run a model on ${selectedStock}`, valuation: 'Valuation and analyst view' }}
  />
  <p className="crx-visually-hidden" aria-live="polite">
    {announcement}
  </p>
</div>;
```

Overview's "See all news" calls `onOpenSection('news', 'News')`, never a scroll. Opening a model from the Overview state (no ticker) keeps the existing empty state.

### `src/app/(dashboard)/company-research/dossier.css` (excerpt, tokens only)

```css
/* Company research dossier. Page-scoped (crx-), tokens only, no Tailwind. */

.crx-canvas {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  font-family: var(--font-sans);
  color: var(--text-primary);
}

/* ── Full-width view toggle ─────────────────────────────── */
.crx-view-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  padding: 0.25rem;
  gap: 0.25rem;
  background: var(--surface-card);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
}

.crx-view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: var(--type-body-size);
  font-weight: var(--weight-strong);
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.crx-view-toggle-btn:hover {
  background: var(--surface-card-hover);
  color: var(--text-primary);
}

.crx-view-toggle-btn[aria-selected='true'] {
  background: var(--emerald);
  color: var(--color-on-primary);
}

.crx-view-toggle-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--btn-ring);
}

/* ── Full-width search pill ─────────────────────────────── */
.crx-search {
  width: 100%;
}

.crx-search :where(input) {
  width: 100%;
  min-height: 64px;
  border-radius: var(--radius-xl);
  background: var(--surface-input);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--type-lead-size);
}

.crx-search :where(input):focus {
  background: var(--surface-input-focus);
  box-shadow: var(--shadow-glow);
}

/* the existing AnimatedGlowingSearchBar has its own max-width; neutralise it here */
.crx-search > * {
  max-width: none;
  width: 100%;
}

/* ── Sticky section tabs ────────────────────────────────── */
.crx-tabs-bar {
  position: sticky;
  top: var(--crx-sticky-top, 0px);
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-primary);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--text-muted) 18%, transparent);
}

.crx-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.crx-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: var(--type-body-size);
  font-weight: var(--weight-medium);
  white-space: nowrap;
  cursor: pointer;
  box-shadow: inset 0 -2px 0 transparent;
  transition:
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.crx-tab:hover {
  color: var(--text-primary);
}

.crx-tab[aria-selected='true'] {
  color: var(--text-primary);
  box-shadow: inset 0 -2px 0 var(--emerald);
}

.crx-tab-pin {
  font-size: 0.75rem;
  color: var(--emerald);
}

/* ── Section stack ──────────────────────────────────────── */
.crx-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.crx-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: crx-section-in 0.2s ease;
}

.crx-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.crx-section-title {
  margin: 0;
  font-size: var(--type-section-size);
  font-weight: var(--type-section-weight);
  letter-spacing: var(--type-section-tracking);
  line-height: var(--type-section-leading);
  color: var(--text-primary);
}

.crx-eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--type-eyebrow-size);
  font-weight: var(--type-eyebrow-weight);
  letter-spacing: var(--type-eyebrow-tracking);
  text-transform: uppercase;
  color: var(--text-muted);
}

.crx-section-pin {
  min-width: 44px;
  min-height: 44px;
  color: var(--text-muted);
}

.crx-section-pin.is-on {
  color: var(--emerald);
  background: var(--emerald-bg-subtle);
}

.crx-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@keyframes crx-section-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crx-section {
    animation: none;
  }
  .crx-view-toggle-btn,
  .crx-tab {
    transition: none;
  }
}

@media (max-width: 639px) {
  .crx-canvas {
    padding: 0 1rem;
    gap: 1.5rem;
  }
  .crx-view-toggle-btn {
    min-height: 44px;
    padding: 0 0.5rem;
    gap: 0.375rem;
  }
  .crx-search :where(input) {
    min-height: 56px;
  }
}
```
