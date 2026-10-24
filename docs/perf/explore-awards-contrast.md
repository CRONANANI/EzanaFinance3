# "Explore all awards" card: cause and contrast

**Cause.** Not an accident of class reuse or a missing light-mode override: the Oct 13 redesign of `.gcx-exp` (`src/app/datasets/government/contracts/gov-contracts.css`) deliberately painted the card with the Sonar band's surface, `background: var(--brand-band-green)`, and white ink mixes (`color-mix(in srgb, white 92%, transparent)` and friends) for text, plus black mixes for the filter well, fields and header row, and `color-scheme: dark` on the selects. That produced a green block in both themes.

**Fix.** The card now sits on the page canvas (`--bg-primary`, the same variable `.gcx-page` uses) with the card shell (radius `--radius-lg`, `--shadow-sm`, no outside border). Ink is `--text-primary` / `--text-secondary` / `--text-muted`; accents (count, amount column, focus ring, row hover rule) are `--emerald-text`, never emerald on emerald. Fields and pager buttons use `--surface-input`; the header row uses `--bg-secondary`. Control borders use `--text-muted` so they meet the 3:1 non-text minimum.

**Other dataset pages.** No other dataset card uses the band surface. `--brand-band-green` remains only on deliberate full-width bands (the Sonar page, the dataset ticker belt, the category bar, the news belt), which are not cards.

## Ratios

Computed by `node scripts/a11y/contrast-explore-awards.mjs` (tokens resolved from `theme-variables.css` in headless Chromium, dark = `:root`, light = `body.light-mode`).

```

dark
PASS  17.78:1 (min 4.5)  Title / body ink  --text-primary on --bg-primary
PASS  15.70:1 (min 4.5)  Table cells  --text-secondary on --bg-primary
PASS  6.29:1 (min 4.5)  Labels, headers, placeholders  --text-muted on --bg-primary
PASS  6.29:1 (min 4.5)  Header row labels  --text-muted on --bg-secondary
PASS  10.07:1 (min 4.5)  Amount column (emerald text)  --emerald-text on --bg-primary
PASS  10.07:1 (min 3)  Count (emerald text)  --emerald-text on --bg-primary
PASS  19.29:1 (min 4.5)  Input text on field  --text-primary on --surface-input
PASS  6.29:1 (min 3)  Input and pager button borders (UI control)  --text-muted on --bg-primary
PASS  10.92:1 (min 3)  Focus ring (emerald)  --emerald-text on --surface-input

light
PASS  17.85:1 (min 4.5)  Title / body ink  --text-primary on --bg-primary
PASS  14.63:1 (min 4.5)  Table cells  --text-secondary on --bg-primary
PASS  4.76:1 (min 4.5)  Labels, headers, placeholders  --text-muted on --bg-primary
PASS  4.76:1 (min 4.5)  Header row labels  --text-muted on --bg-secondary
PASS  5.48:1 (min 4.5)  Amount column (emerald text)  --emerald-text on --bg-primary
PASS  5.48:1 (min 3)  Count (emerald text)  --emerald-text on --bg-primary
PASS  16.22:1 (min 4.5)  Input text on field  --text-primary on --surface-input
PASS  4.76:1 (min 3)  Input and pager button borders (UI control)  --text-muted on --bg-primary
PASS  4.98:1 (min 3)  Focus ring (emerald)  --emerald-text on --surface-input
```
