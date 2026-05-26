# ELO Leaderboard v2 — Dark Mode

## Cursor prompt (paste this)

```
Add dark mode to the ELO Leaderboard v2 redesign at `src/components/leaderboard/redesign/`.

When the user selects Dark in Settings → Appearance, the leaderboard must match the app shell (`#0a0e13` page, emerald accents from `theme-variables.css`). Light mode keeps the existing v2 "Sweet Spot" palette.

Requirements:
1. Do NOT change `src/lib/elo-tier-colors.js`, API routes, or mock-data.
2. Add `getEloTheme(isDark)` in `elo-design-tokens.js` with parallel light/dark token objects (page, brand, delta, zones, categoryAccents, shape).
3. Add `EloThemeProvider` + `useEloTheme()` that reads `useTheme()` from `@/components/ThemeProvider` (`theme === 'dark'`).
4. Wrap `EloLeaderboardPage` in `EloThemeProvider`; all redesign components use `useEloTheme()` instead of static `page`/`brand`/`delta` imports.
5. Tier chips in dark: background `${tier.base}1f`, text `tier.base`, border `${tier.base}40` (tier.ink is for light backgrounds).
6. `elo-redesign.css`: `html:not(.light-mode) .elo-page-wrap` text + focus ring + skeleton shimmer overrides.
7. Skeleton shimmer: `#161b22` / `#21262d` in dark.
8. Error banner on page: dark uses `rgba(239,68,68,0.12)` bg and `#fca5a5` text.

Dark token targets:
- page.bg `#0a0e13`, surface `#0d1117`, surfaceAlt `#161b22`
- page.ink `#f0f6fc`, inkSoft `#c9d1d9`, inkMuted `#8b949e`
- page.border `rgba(16, 185, 129, 0.1)`
- brand.base `#10b981`, brand.soft `rgba(16, 185, 129, 0.12)`
- delta.pos `#34d399`, delta.neg `#f87171`

Verify: `npm run build`. Toggle theme in Settings and confirm leaderboard updates live.
```

---

## Architecture

```
ThemeProvider (settings.theme)
       ↓
EloThemeProvider → getEloTheme(isDark)
       ↓
useEloTheme() in every redesign component
```

Light mode = `html.light-mode` / `body.light-mode` (user chose Light).  
Dark mode = absence of `.light-mode` (app default + user chose Dark).

---

## Files changed

| File                       | Change                                            |
| -------------------------- | ------------------------------------------------- |
| `elo-design-tokens.js`     | `getEloTheme()`, `ELO_LIGHT` / `ELO_DARK` bundles |
| `EloThemeContext.jsx`      | **New** — provider + hook                         |
| `EloLeaderboardPage.jsx`   | Wrap in provider; themed error banner             |
| `elo-redesign.css`         | Dark focus, text, skeleton shimmer                |
| All other `redesign/*.jsx` | `useEloTheme()` for colors                        |

---

## Key code

### `getEloTheme` (elo-design-tokens.js)

```js
export function getEloTheme(isDark) {
  const base = isDark ? ELO_DARK : ELO_LIGHT;
  return {
    isDark: !!isDark,
    page: base.page,
    brand: base.brand,
    delta: base.delta,
    zones: base.zones,
    categoryAccents: base.categoryAccents,
    shape: buildShape(base.page, !!isDark),
  };
}
```

### `EloThemeContext.jsx`

```jsx
export function EloThemeProvider({ children, isDark: isDarkProp }) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === 'dark';
  const value = useMemo(() => getEloTheme(isDark), [isDark]);
  return <EloThemeContext.Provider value={value}>{children}</EloThemeContext.Provider>;
}

export function useEloTheme() {
  const ctx = useContext(EloThemeContext);
  if (!ctx) return getEloTheme(false);
  return ctx;
}
```

### Page wrapper

```jsx
export default function EloLeaderboardPage() {
  return (
    <EloThemeProvider>
      <EloLeaderboardContent />
    </EloThemeProvider>
  );
}
```

### Component usage pattern

```jsx
import { useEloTheme } from './EloThemeContext';

export function LeaderRow({ user, isYou, zone }) {
  const { page, brand, delta: deltaTokens } = useEloTheme();
  // use page.surface, brand.soft, etc.
}
```

### CSS (elo-redesign.css)

```css
html:not(.light-mode) .elo-page-wrap,
body:not(.light-mode) .elo-page-wrap {
  color: #f0f6fc;
}

html:not(.light-mode) .elo-page-wrap a:focus-visible,
body:not(.light-mode) .elo-page-wrap a:focus-visible {
  outline-color: #10b981;
}
```

---

## Test plan

1. Settings → Appearance → **Light** → open `/leaderboard` (or route that mounts `EloLeaderboardPage`) → cream `#f8f8f9` page, white cards.
2. Settings → **Dark** → same route → `#0a0e13` page, `#0d1117` cards, light text, emerald CTA/focus.
3. Sticky YOU row, zone dividers, tier chips readable in both modes.
4. `npm run build` passes.

---

## Rollback

Revert the dark-mode commit; light v2 tokens remain the `ELO_LIGHT` defaults in git history.
