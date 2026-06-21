# Ezana Design System (`ds`)

One unified, reusable component library. All UI should route through here instead
of hand-rolling buttons, inputs, cards, and numeric displays per page.

```jsx
import { Button, Card, CardHeader, Input, NumericValue, Badge } from '@/components/ds';
```

## Source of truth

- **Tokens:** `src/app/theme-variables.css`. Every value in this library references a
  token (via the `.ds-*` CSS layer or the `token` access object). **No hardcoded hex.**
  Dark mode is the default; tokens flip under `body.light-mode`.
- **Typography:** `--font-sans` (Plus Jakarta Sans) for text; `--font-mono`
  (JetBrains Mono) + `tabular-nums` for **all** numeric values — use `<NumericValue>`.
- **Icons:** Bootstrap Icons only (`<i className="bi bi-..." />`).
- **CSS prefix:** `.ds-*`, component-scoped. **Zero new global tokens** are introduced.

> Note: `EZANA_BRANDING_GUIDE.md` referenced by the project goal is not present in the
> repo. This library is therefore derived from the live token file and the established
> `ez-*` component anatomy already in the codebase, which encode the same brand rules.

## Components

| Component                               | Variants / props                                                                                  | Anatomy                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Button`                                | `variant` primary·secondary·ghost·danger, `size` sm·md·lg, `icon`, `iconOnly`, `loading`, `block` | emerald solid primary, `--radius-md`, hover lift + emerald glow, focus-visible emerald ring |
| `Input` / `Textarea`                    | `label`, `hint`, `error`/`invalid`                                                                | `--surface-input`, `--border-input`, focus → `--border-focus` + ring                        |
| `Select`                                | `options`, label/hint/error                                                                       | token-drawn caret, native a11y                                                              |
| `Checkbox` / `Toggle`                   | `label`, `checked`, `disabled`                                                                    | emerald check/track when on                                                                 |
| `Badge`                                 | `tone` brand·gold·positive·negative·warning·info·neutral                                          | pill; positive/negative render mono                                                         |
| `Card` / `CardHeader`                   | `pad` none·md·lg, `interactive`, `elevated`                                                       | `--surface-card`, `--border-primary`, `--radius-lg`                                         |
| `NumericValue` / `Ticker`               | `format` percent·price·compact, `sign`, `colorize` auto·pos·neg·muted                             | **mono + tabular-nums**, up/down color                                                      |
| `Modal`                                 | `open`, `onClose`, `title`, `footer`, `size`                                                      | portal, overlay `--bg-overlay`, Escape/scroll-lock                                          |
| `Tabs`                                  | `tabs`, `value`, `onChange`                                                                       | underline active in emerald                                                                 |
| `Tooltip`                               | `label`                                                                                           | hover/focus bubble                                                                          |
| `Dropdown` / `MenuItem` / `MenuDivider` | `trigger`, `align`                                                                                | outside-click + Escape close                                                                |
| `Table` + `THead/TBody/TR/TH/TD`        | `numeric` per cell                                                                                | numeric cells right-align + mono                                                            |
| `Skeleton`                              | `width`, `height`, `radius`                                                                       | shimmer, respects reduced-motion                                                            |

## Accessible state + feedback

| Component        | Purpose                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Spinner`        | Loading spinner; `role="status"` + label. Respects reduced-motion.                                                                                    |
| `Alert`          | Inline feedback; `tone` info/success/warning/error. Errors `role="alert"`, else `role="status"`/`aria-live`. Icon reinforces text (never color-only). |
| `EmptyState`     | `icon` + `title` + `description` + `action` for "nothing here yet".                                                                                   |
| `ErrorState`     | EmptyState tuned for failures; `role="alert"`.                                                                                                        |
| `IconButton`     | Icon-only button that **requires** a `label` (warns in dev if missing).                                                                               |
| `VisuallyHidden` | Screen-reader-only text (`.ds-sr-only`) — pair with color/icon status.                                                                                |

Plus `.ds-sr-only` / `.ds-skip-link` utilities, and `Modal` exposes `aria-labelledby`.
See `.claude/skills/a11y-review` and `docs/ACCESSIBILITY_AUDIT.md`. Gate with
`npm run lint:a11y` (image alt + file-input labels).

## Token access layer (`token`)

For the rare inline style that can't be a class:

```jsx
import { token } from '@/components/ds';
<div style={{ color: token.textMuted, borderColor: token.border }} />;
```

`token` is a frozen, read-only map onto existing `var(--…)` tokens — it adds nothing new.

## Migration map (one-off → library)

| Found in code                                                                | Replace with                              |
| ---------------------------------------------------------------------------- | ----------------------------------------- |
| `className="ez-btn ez-btn--primary"` / raw `<button>` with inline emerald bg | `<Button variant="primary">`              |
| `ez-btn--secondary` / `--ghost`                                              | `<Button variant="secondary" \| "ghost">` |
| inline `<input style={{…}}>` field blocks                                    | `<Input label hint error>`                |
| `<select className="echo-input">` etc.                                       | `<Select options>`                        |
| `ez-pill`, `ez-pill--gold/pos/neg/...`                                       | `<Badge tone=…>`                          |
| `ez-card` / `ledger-card` wrappers                                           | `<Card pad>` + `<CardHeader>`             |
| `ez-mono` spans wrapping figures, `toFixed`/`toLocaleString` inline          | `<NumericValue>` / `<Ticker>`             |
| bespoke fixed-overlay modals                                                 | `<Modal>`                                 |
| hand-rolled tab strips                                                       | `<Tabs>`                                  |
| `.ez-shimmer` skeletons                                                      | `<Skeleton>`                              |

## QA checklist (every migrated surface)

- [ ] **Zero hardcoded hex** — run `npm run lint:ds`.
- [ ] All numerics use `<NumericValue>` / `.ds-num` (JetBrains Mono + tabular-nums).
- [ ] Light **and** dark mode legible (toggle `body.light-mode`).
- [ ] `:focus-visible` ring present on every interactive element.
- [ ] No new global tokens; only existing `var(--…)` consumed.
- [ ] Shared mock data files untouched (enrich via mappers client-side instead).

## Do NOT change

- `src/app/theme-variables.css` token **definitions** (consume, don't add).
- Shared mock data files (e.g. `src/lib/*mock*`). Enrich client-side via mappers.
- API auth layer (`withApiGuard` / `requireUser` / `getAdminClient`). This library is
  UI-only.

## Rollback

All design-system work lands on the `design-system-refactor` branch before merge, so a
regression can be reverted by rolling back that branch's merge commit.
