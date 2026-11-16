# Handoff README (verbatim from Claude Design, handoff/README.md)

Project: https://claude.ai/design/p/f76ae451-6976-4e3e-ae49-32b4e42867fd (file handoff/README.md, 66 lines, read with get_page_text plus PageDown on 2026-11-16; one wrapped line re-joined).

---

# Compliance page handoff (Team Hub, organizational)

Route: `/org-team-hub/compliance` · Desktop 1440px · Dark default, light via `.light-mode` scope.
Source in this folder:

- `CompliancePage.dc.html` — the page, all states and dialogs (props: `theme`, `view`, `dialog`, `frameHeight`).
- `Compliance Redesign.dc.html` — canvas of artboards (1a dark, 1b light, 1c Add rule, 1d Resolve breach, 1e loading, 1f empty, 1g error, 1i audit).
- `ezana-tokens.css` — design system tokens (copied from Ezana `colors_and_type.css`, light scope extended to `.light-mode`).
- `assets/ezana-nav-logo.png` — nav mark.
  The HTML uses inline styles only; translate each inline style into your component styles using the tokens below. Logic (state, data, handlers) is in the `class Component` block at the bottom of `CompliancePage.dc.html`.

## Layout

- Shell is unchanged: 64px nav (logo left edge x=32, logout icon right edge x=1408), Team Hub sidebar 200px (x=32 to 232) with a 1px `--border-primary` right rule, Compliance selected (emerald text, weight 600, no pill).
- Main column x=256 to 1408 (1152px): 24px clear space after the sidebar rule. Padding top 24, bottom 48.
- Two-column rows: `grid-template-columns: minmax(0,1fr) 1px 320px; column-gap: 32px` = 64px gutter with a centred 1px rule. Left column 767px.
- Sections are flat: no fill, border, shadow or radius. Sections are separated by 1px `--border-primary` horizontal rules with 32px above and below.
- Order: top row → KPI strip → rule → info line → Breaches | Policy summary → Rules in force | Sector headroom → Idea check (767px) → Council activity log (767px, executives only) → footer line.

## Components

- **Top row** (40px): "Sample content" (16/600), "Show council data" + text options On / Off; right: role preview text options (Executive, Portfolio manager, Analyst), Add rule (primary, executives only), View resolved, Refresh (plain text). 24px gaps.
- **KPI strip**: 48px tall, 4 equal cells, cells 2 to 4 have a 1px left rule with 24px clear space. Each: 28px tile (`--emerald-bg`, `--radius-md`, 14px emerald icon), 12px `--text-muted` label, 18px JetBrains Mono 600 value.
- **Text tabs/options**: 14 or 16px, selected `--emerald` weight 600, others `--text-secondary`. No underline bar, pill or track.
- **Primary button**: 36px high, 0 16px padding, `--radius-md`, bg `--emerald`, text `--bg-primary` (acts as btn-primary-fg), 14/600; hover bg `--emerald-hover`; disabled opacity 0.4, `not-allowed`. One per group.
- **Text button**: no box, 14px, `--text-secondary`, hover `--emerald`. Actions (Resolve, Retry, Load more, View resolved in empty state) use `--emerald` 600. Destructive (Delete, Delete rule) use `--negative`.
- **Tables**: CSS grid rows, header 12/500 `--text-faint` sentence case, rows 14px with 1px `--border-primary` bottom rule. Row hover changes text colour to `--emerald` only.
- Breaches: `80px 104px 56px 56px 120px 1fr 64px`, gap 12.
- Rules: `1fr 64px 220px 96px 112px`.
- Idea fields: `120px 160px 1fr 1fr`, gap 24. Idea results: `128px 220px 1fr`.
- Activity log: `152px 112px 120px 1fr 120px`.
- **Status words**: always a word, optional icon. hard = `--negative` word + `bi-exclamation-triangle`; soft = `--text-secondary` word + `--warning` icon; resolved = `bi-check-lg` `--positive`; within `--positive`; over `--negative`; N/A `--text-muted`; recorded only `--text-secondary`; idea results breach / within / not evaluated.
- **Sector headroom**: per sector grid `88px 96px 1fr`; bar 6px, `--radius-sm`, track `--border-primary`, fill `--positive` or `--negative`. Bar scale: 0 to 58% (fill width = value / 58).
- **Fields**: inputs, selects and textarea have no border and no fill; ticker and numeric fields use JetBrains Mono.
- **Dialog (Modal)**: absolute overlay `--bg-overlay`, centred 480px panel, bg `--bg-primary`, 1px `--border-primary`, `--radius-xl`, `--shadow-xl`, 24px padding, close `bi-x-lg`. Click outside or Cancel closes.

## Tokens used

Colour: `--bg-primary --bg-overlay --bg-deep --text-primary --text-secondary --text-muted --text-faint --border-primary --emerald --emerald-hover --emerald-bg --emerald-bg-hover --positive --negative --warning --purple`.
Radius: `--radius-sm --radius-md --radius-xl --radius-pill` (pill only in the unchanged nav). Shadow: `--shadow-xl` (dialog only).
Type: `--font-sans` (Plus Jakarta Sans) for text, `--font-mono` (JetBrains Mono) for every number, date and ticker (13px inline inside 14px text). Sizes 12, 13, 14, 16, 18.
Note: the design system has no `--btn-primary-fg` token. `--bg-primary` is used in its place (dark text on emerald in dark mode, white in light). Add the token in the app if it exists there.

## Icons (Bootstrap Icons 1.11)

Nav: bell, person-arms-up, building, search, chevron-down, graph-up, broadcast, bookmark, mortarboard, person-circle, gear-fill, box-arrow-right.
Sidebar: speedometer2, bank, graph-up, clipboard-check, diagram-3, easel, archive, broadcast, camera-video, award, bar-chart, trophy, list-ol, people, shield-check, file-earmark-text, key.
Page: exclamation-triangle, exclamation-octagon, list-ul, layers, check-lg, x-lg, dash-lg, info-circle, x-circle, chevron-down.

## States

- **Loading** (`view="loading"`): final layout, labels and headings real, data replaced by skeleton bars (`--emerald-bg-hover`, `--radius-sm`, 12px high); info line reads "Loading compliance data".
- **Empty** (`view="empty"`): breach list shows one line "No open breaches logged." with one action, View resolved. KPIs read 0, 0, 7, 1.
- **Error** (`view="error"`): top row stays; below it one inline line, `bi-x-circle` in `--negative`, "Could not load compliance data." and Retry. Nothing else renders.
- **Roles**: Executive sees Add rule, rule controls, Resolve and the activity log. Portfolio manager sees Resolve only. Analyst reads rules and runs idea checks.

## Interactions

- Role preview and On / Off switch local state only.
- Open / Resolved tabs; View resolved switches to Resolved.
- Resolve opens the Resolve breach dialog for that row. Reason is required; Resolve breach stays disabled until the trimmed reason is non-empty. On confirm the breach moves to resolved. Storing the reason is new data needed (not stored today).
- Add rule opens the dialog (rule type, value, severity); Save rule appends to Rules in force.
- Disable / Enable moves a rule between Rules in force and Disabled rules. Delete opens a confirmation dialog; Delete rule removes it.
- Run check shows grouped results (Hard, Soft, Portfolio-level not evaluated pre-trade). Reset clears fields and results. A run saves nothing.
- Activity log filters All / Rules / Breaches / Other; Load more fetches the next page.

## Data rules

- Never say a rule is checked automatically unless the app checks it. Cash floor reads "Recorded only, not checked".
- Resolved history shows no resolver or reason; it shows a "new data needed" note.
- Rule changes and breach resolutions in the activity log are not stored today; the log carries a visible note saying so.
- Avoid: compliant, approved, safe, all clear, enforced, real-time. No em dashes. Missing values read N/A.
- All names, tickers, figures and dates are fictional sample content for Sample council.
