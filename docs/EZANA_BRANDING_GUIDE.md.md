# Ezana Finance: Branding and Design System Guide

> Single source of truth for visual identity. All new components, pages, and modals must follow this guide. All design tokens are defined in `src/app/theme-variables.css`. Use them; never hardcode hex values.

> **Correction, Oct 14 2026 (read first):** the Oct 2026 switch to Space Grotesk / IBM Plex Mono described in section 2 was reverted the same day. The repo is on **Plus Jakarta Sans** (`--font-sans`) and **JetBrains Mono** (`--font-mono`), as `src/app/theme-variables.css` and `src/app/fonts.css` show. Every rule in section 2 about _where_ sans vs mono is used still applies; only the family names changed back. Where section 2 says Space Grotesk, read Plus Jakarta Sans (weights up to 800 are available again). Where it says IBM Plex Mono, read JetBrains Mono. Always reference the token, never the family name, so this never matters in component code.

---

## 1. Brand identity

| Aspect                    | Value                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Primary brand color**   | Emerald `#10b981` (user product)                                                                                                |
| **Secondary brand color** | Gold/Champagne `#d4a853` (partner product)                                                                                      |
| **Logo**                  | The Walia ibex mark (`public/davinci_edit_minimal_flat_vector_logo_of_a_stylized_angular_wal.png`), emerald, sometimes outlined |
| **Primary mode**          | Dark mode (default for all logged-in pages)                                                                                     |
| **Secondary mode**        | Light mode (toggleable per-user)                                                                                                |
| **Tone of voice**         | Authoritative, data-driven, professional. Bloomberg/FT-style, not retail. No em dashes anywhere in UI copy.                     |

---

## 2. Typography

### Font families (see correction note at top)

```css
--font-sans:
  'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
  Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
--font-serif: 'Newsreader', Georgia, 'Times New Roman', serif;
```

Components always reference the token, never the family name. `npm run lint:branding` fails on a raw family name in CSS `font-family`, in a local custom property, or in a JSX `fontFamily` prop or style.

**`--font-sans`** is the primary typeface for all interface text: page and section titles, navigation, dropdowns, buttons, tabs, filters, form labels and inputs, card titles, body copy, company and entity names, modals, notifications, onboarding, empty states.

**`--font-mono`** is used **selectively** for technical and numerical information: tickers and identifiers, prices, percentages, financial metrics, timestamps and dates, chart axes and tick values, coordinates and node metadata (Sonar), transaction references, code, and the uppercase eyebrow/kicker labels of the type ramp. It is fixed-width, so changing values never shift layout; still add `font-variant-numeric: tabular-nums` on numeric elements. **Never** use mono for paragraphs, long descriptions, news headlines or summaries, or navigation links.

**`--font-serif`** (Newsreader) is editorial only: Ezana Echo headlines, pull quotes and figure titles. Echo body copy keeps its own serif stacks (`--echo-font-serif`, and the Charter stack on `.echo-article-body`); Echo in-article section heads (h2/h3) use `--font-sans`.

**Sanctioned exceptions** (the only places a family is named outside the tokens):

- Cinzel: the Centaur Intelligence wordmark only.
- Third-party logo marks drawn in SVG (brokerage and asset icons).
- Standalone documents rendered outside the app shell (org report PDF, Research Library export, `global-error.js`), where the tokens do not exist.

### Font loading

Fonts are self-hosted, never loaded from Google Fonts. `scripts/build-fonts.mjs` copies the woff2 files from the Fontsource packages into `public/fonts/site/` and generates `src/app/fonts.css`. To add or change a family or weight: edit `SOURCES` in the script, run `npm run fonts:build`, never hand-edit `fonts.css`.

**Canvas** cannot read CSS variables. Use the helper:

```js
import { fontStack } from '@/lib/font-stack';
ctx.font = `600 9px ${fontStack('--font-mono')}`;
```

**Charts**: recharts axes spread `CHART.tick` from `src/lib/chart-theme.js`, which already sets `fontFamily: 'var(--font-mono)'` at 11px. Category axes that carry words (sector or company names) pass `{ ...CHART.tick, fontFamily: 'var(--font-sans)' }`. SVG `<text>` inherits the CSS font, so set families via the token, not a literal.

### Type scale

The `--type-*` ramp in `theme-variables.css` is the source of truth; use the tokens rather than these raw values.

| Element                   | Font            | Weight | Size                           | Color                              |
| ------------------------- | --------------- | ------ | ------------------------------ | ---------------------------------- |
| **Hero headline**         | sans            | 700    | `clamp(1.5rem, 4vw, 2.625rem)` | `--text-primary` or emerald accent |
| **Page title**            | sans            | 700    | `1.875rem` (30px)              | `--text-primary`                   |
| **Section heading**       | sans            | 600    | `1.25rem` (20px)               | `--text-primary`                   |
| **Card title**            | sans            | 600    | `1rem` (16px)                  | `--text-primary`                   |
| **Body text**             | sans            | 400    | `0.875rem` (14px)              | `--text-secondary`                 |
| **Label / caption**       | sans            | 500    | `0.75rem` (12px)               | `--text-muted`                     |
| **Eyebrow / kicker**      | mono, uppercase | 600    | `0.6875rem` (11px)             | `--text-muted`                     |
| **Microcopy**             | sans            | 400    | `0.7rem` (11px)                | `--text-faint`                     |
| **Numeric value (large)** | mono            | 700    | `1.5rem`+                      | `--text-primary`                   |
| **Numeric value (table)** | mono            | 600    | `0.875rem`                     | `--text-primary`                   |

### Letter-spacing conventions

- Headings: `letter-spacing: -0.02em`
- All-caps labels: `letter-spacing: 0.05em`; eyebrows use `--type-eyebrow-tracking`
- Body text: default (`0` or `-0.005em`)

---

## 3. Color tokens

**Never use hex values directly in component CSS. Always reference the variable.** This is the only way to support light/dark mode correctly. Prefer `color-mix()` on a token over any new literal. The tokens `--border-color` and `--text-tertiary` do not exist; never use them.

### Backgrounds

| Token            | Dark mode         | Light mode        | Use                            |
| ---------------- | ----------------- | ----------------- | ------------------------------ |
| `--bg-primary`   | `#0a0e13`         | `#ffffff`         | Page background, top nav       |
| `--bg-secondary` | `#0d1117`         | `#ffffff`         | Card backgrounds               |
| `--bg-tertiary`  | `#161b22`         | `#f1f5f9`         | Nested elements, table headers |
| `--bg-overlay`   | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.4)` | Modal backdrop                 |

### Surfaces (component fills)

| Token                   | Dark mode               | Light mode | Use                |
| ----------------------- | ----------------------- | ---------- | ------------------ |
| `--surface-card`        | `rgba(16,185,129,0.02)` | `#ffffff`  | Standard card fill |
| `--surface-card-hover`  | `rgba(16,185,129,0.04)` | `#f3f4f6`  | Card on hover      |
| `--surface-input`       | `rgba(16,185,129,0.04)` | `#f3f4f6`  | Form input fields  |
| `--surface-input-focus` | `rgba(16,185,129,0.06)` | `#ffffff`  | Focused input      |

### Borders

| Token                | Dark mode               | Light mode              | Use                  |
| -------------------- | ----------------------- | ----------------------- | -------------------- |
| `--border-primary`   | `rgba(16,185,129,0.08)` | `rgba(0,0,0,0.08)`      | Standard card border |
| `--border-secondary` | `rgba(16,185,129,0.06)` | `rgba(0,0,0,0.05)`      | Subtle dividers      |
| `--border-hover`     | `rgba(16,185,129,0.2)`  | `rgba(16,185,129,0.25)` | Border on hover      |
| `--border-focus`     | `rgba(16,185,129,0.4)`  | `rgba(16,185,129,0.5)`  | Focused element      |
| `--border-input`     | `rgba(16,185,129,0.1)`  | `rgba(0,0,0,0.12)`      | Input borders        |

### Text

| Token              | Dark mode | Light mode | Use                    |
| ------------------ | --------- | ---------- | ---------------------- |
| `--text-primary`   | `#f0f6fc` | `#0f172a`  | Headings, values       |
| `--text-secondary` | `#e2e8f0` | `#1e293b`  | Body text              |
| `--text-muted`     | `#8b949e` | `#64748b`  | Labels, de-emphasized  |
| `--text-faint`     | `#6b7280` | `#94a3b8`  | Captions, meta         |
| `--text-ghost`     | `#4b5563` | `#cbd5e1`  | Placeholders, disabled |

### Brand: emerald

| Token                 | Value                   | Use                                                                    |
| --------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `--emerald`           | `#10b981`               | Primary brand color, links, CTA, all interactive hover/selected states |
| `--emerald-hover`     | `#059669`               | Hover state on emerald buttons                                         |
| `--emerald-dark`      | `#047857`               | Pressed state                                                          |
| `--emerald-bg`        | `rgba(16,185,129,0.08)` | Subtle emerald fill                                                    |
| `--emerald-bg-hover`  | `rgba(16,185,129,0.12)` | Hover state on emerald fill                                            |
| `--emerald-bg-subtle` | `rgba(16,185,129,0.04)` | Very subtle emerald wash                                               |
| `--emerald-border`    | `rgba(16,185,129,0.15)` | Emerald accent border                                                  |
| `--emerald-glow`      | `rgba(16,185,129,0.25)` | Glow effects, halos                                                    |

### Brand: gold (partner product)

| Token              | Value                   | Use                     |
| ------------------ | ----------------------- | ----------------------- |
| `--gold`           | `#d4a853`               | Partner branding accent |
| `--gold-hover`     | `#b8922f`               | Hover on gold elements  |
| `--gold-bg`        | `rgba(212,168,83,0.08)` | Subtle gold fill        |
| `--gold-bg-hover`  | `rgba(212,168,83,0.12)` | Gold hover fill         |
| `--gold-border`    | `rgba(212,168,83,0.15)` | Gold borders            |
| `--gold-champagne` | `#d4af37`               | Premium accent          |

### Semantic: status

| Token           | Value                   | Use                                                                              |
| --------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `--positive`    | `#10b981`               | Gains, +X%, success                                                              |
| `--positive-bg` | `rgba(16,185,129,0.12)` | Positive cell fill                                                               |
| `--negative`    | `#ef4444`               | Losses, -X%, errors                                                              |
| `--negative-bg` | `rgba(239,68,68,0.08)`  | Negative cell fill                                                               |
| `--danger`      | `#ef4444`               | Destructive actions only (never for data decline; charts use `--echo-chart-red`) |
| `--danger-bg`   | `rgba(239,68,68,0.08)`  | Danger fill                                                                      |
| `--warning`     | `#fbbf24`               | Cautions, pending                                                                |
| `--warning-bg`  | `rgba(251,191,36,0.12)` | Warning fill                                                                     |
| `--info`        | `#3b82f6`               | Informational                                                                    |
| `--info-bg`     | `rgba(59,130,246,0.12)` | Info fill                                                                        |

### Accents

| Token      | Value     | Use                                       |
| ---------- | --------- | ----------------------------------------- |
| `--amber`  | `#f59e0b` | Highlight, tour spotlights, news severity |
| `--cyan`   | `#06b6d4` | Live data indicators                      |
| `--blue`   | `#3b82f6` | Secondary accent, links                   |
| `--purple` | `#a78bfa` | Tertiary accent                           |

### Data visualization

Charts use the `--echo-chart-*` palette: blue neutral, green positive/live, orange watch/projected, `--echo-chart-red` for decline (never `--danger`), purple tertiary. Emerald is reserved for positive/growth and interactive states. No `Math.random()` in any rendered value; use seeded-sin for deterministic SSR output.

---

## 4. Spacing scale

| Value            | Use                                 |
| ---------------- | ----------------------------------- |
| `0.25rem` (4px)  | Tight grouping, icon-to-text        |
| `0.5rem` (8px)   | Compact components                  |
| `0.75rem` (12px) | Default inner padding (small cards) |
| `1rem` (16px)    | Standard component padding          |
| `1.5rem` (24px)  | Card padding                        |
| `2rem` (32px)    | Section spacing                     |
| `3rem` (48px)    | Large section gaps                  |
| `4rem`+ (64px+)  | Hero-level spacing                  |

---

## 5. Border radius scale

| Token         | Value                       | Use                          |
| ------------- | --------------------------- | ---------------------------- |
| `--radius-sm` | `4px`                       | Small buttons, badges, pills |
| `--radius-md` | `8px`                       | Form inputs, small cards     |
| `--radius-lg` | `12px`                      | Standard cards, modals       |
| `--radius-xl` | `16px`                      | Large hero cards, callouts   |
| `999px`       | Pills, full-rounded buttons |

`theme-variables.css` is the only file allowed to declare these; the guard fails a second declaration anywhere.

---

## 6. Shadows

| Token           | Value                            | Use                 |
| --------------- | -------------------------------- | ------------------- |
| `--shadow-sm`   | `0 1px 3px rgba(0,0,0,0.3)`      | Subtle elevation    |
| `--shadow-md`   | `0 4px 16px rgba(0,0,0,0.3)`     | Cards, dropdowns    |
| `--shadow-lg`   | `0 8px 32px rgba(0,0,0,0.4)`     | Modals, popovers    |
| `--shadow-xl`   | `0 20px 60px rgba(0,0,0,0.45)`   | Hero modals         |
| `--shadow-glow` | `0 0 20px rgba(16,185,129,0.15)` | Emerald accent glow |

---

## 7. The "Ezana standard card" pattern

Every component card in the app follows this skeleton. Both light and dark modes work automatically because everything uses tokens. New pages give their cards a page-scoped class prefix (`bs-`, `sl-`, `lpd-`, `ppo-`, `am2-`, `lc-` are existing examples) and route buttons, inputs, badges, tabs and numerics through `@/components/ds` rather than hand-rolling them.

```css
.ezana-card {
  background: var(--surface-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.ezana-card:hover {
  background: var(--surface-card-hover);
  border-color: var(--border-hover);
}

.ezana-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-secondary);
}

.ezana-card-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.ezana-card-subtitle {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.ezana-value {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.ezana-value--positive {
  color: var(--positive);
}
.ezana-value--negative {
  color: var(--negative);
}

.ezana-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--emerald-bg);
  border: 1px solid var(--emerald-border);
  color: var(--emerald);
}
```

---

## 8. Component patterns: quick reference

### Button, primary (emerald CTA)

```css
.btn-primary {
  background: var(--emerald);
  color: #ffffff;
  border: none;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.15s,
    box-shadow 0.15s;
}
.btn-primary:hover {
  background: var(--emerald-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--emerald-glow);
}
```

### Button, secondary (bordered)

```css
.btn-secondary {
  background: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-input);
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.btn-secondary:hover {
  border-color: var(--border-hover);
  background: var(--surface-card-hover);
}
```

### Form input

```css
.ezana-input {
  background: var(--surface-input);
  border: 1px solid var(--border-input);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.875rem;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  width: 100%;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.ezana-input:focus {
  outline: none;
  background: var(--surface-input-focus);
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--emerald-bg-subtle);
}
.ezana-input::placeholder {
  color: var(--text-ghost);
}
```

### Status badge

```css
.ezana-badge-positive {
  background: var(--positive-bg);
  color: var(--positive);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
.ezana-badge-negative {
  background: var(--negative-bg);
  color: var(--negative);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}
```

### Section divider

```css
.ezana-divider {
  height: 1px;
  background: var(--border-secondary);
  border: none;
  margin: 1.5rem 0;
}
```

---

## 9. Animation conventions

| Use case                      | Duration | Easing                                 |
| ----------------------------- | -------- | -------------------------------------- |
| **Hover/focus state changes** | `0.15s`  | `ease`                                 |
| **Card hover lift**           | `0.2s`   | `ease`                                 |
| **Modal entry**               | `0.35s`  | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| **Page transitions**          | `0.4s`   | `ease-out`                             |
| **Number ticks (live data)**  | `0.3s`   | `ease-out`                             |
| **Loading shimmers**          | `1.5s`   | `ease-in-out` infinite                 |

Avoid bouncy/overshoot animations, spinning loaders (use shimmer skeletons), and animations longer than 0.5s for state changes. Every animation must be wrapped in or disabled by `@media (prefers-reduced-motion: reduce)`.

---

## 10. Iconography

- **Icon library:** Bootstrap Icons (`bi-*` class names) only. No lucide-react or any other icon library; replace any you find in a file you touch.
- **Icon size:** Inherits font-size by default; size explicitly with `font-size: 1rem` or via the parent
- **Icon color:** `color: currentColor`; never hardcode
- **Decorative icons:** Always include `aria-hidden="true"`
- **Functional icons (in buttons):** Pair with text or `aria-label`

---

## 11. What NOT to do

- Never hardcode hex colors in component CSS. Hardcoded values break dark mode.
- Never use the Caveat / handwritten font for production UI.
- Never name a font family directly in a component. Use `var(--font-sans)`, `var(--font-mono)`, `var(--font-serif)`.
- Never use multiple fonts in one card. Sans for text, mono for numbers.
- Never set prose or navigation in mono.
- Never use harsh shadows on light mode. `--shadow-md` and below.
- Never use bright/saturated reds outside negative-state indicators.
- Never put more than 2 weight levels of emphasis in a single card.
- Never use em dashes in UI copy, labels, tooltips or empty states.
- Never name backend infrastructure in user-visible copy; attribute only the public data source.
- No Tailwind utility classes, no TypeScript, no shadcn.

---

## 12. Where to find this in the codebase

| What                        | Path                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------- |
| All design tokens           | `src/app/theme-variables.css`                                                           |
| Global CSS / overrides      | `src/app/globals.css`                                                                   |
| Design-system components    | `src/components/ds/`                                                                    |
| Standard card examples      | `src/app/(dashboard)/home-dashboard/home-dashboard.css`                                 |
| Reference dataset pages     | `src/components/datasets/politician-tracker/`, `src/app/datasets/government/contracts/` |
| Font files and `@font-face` | `scripts/build-fonts.mjs`, `public/fonts/site/`, `src/app/fonts.css` (generated)        |
| Canvas font helper          | `src/lib/font-stack.js`                                                                 |
| Chart presentation props    | `src/lib/chart-theme.js` (`CHART`)                                                      |
| Branding guard              | `scripts/check-branding.mjs` (`npm run lint:branding`)                                  |
| Hex guard                   | `scripts/check-ds-hex.mjs`                                                              |
| Em dash guard               | `scripts/check-echo-emdash.mjs`                                                         |
| Theme provider              | `src/components/ThemeProvider.js`                                                       |

To add a new component or page:

1. Do not write color values directly. Look up the closest token and use it.
2. Test BOTH light and dark mode before shipping.
3. Use `--font-mono` for any numeric value read at a glance. Use `--font-sans` for everything else.
4. Start from the standard card pattern in section 7 and specialize only as needed.
