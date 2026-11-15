# Ezana Trading Desk, organizational (`/org-trading`): page body handoff

Scope: the page body to the right of the Team Hub sidebar. The global nav bar and the 200px sidebar already exist in the Command Center build and are drawn here for context only. Do not rebuild them from this package.

Source files:

- `Trading Desk Page.dc.html`: the full page markup (inline styles) and sample data (`renderVals()`). Prop `mode`: `dark` | `light`.
- `Org Trading Desk.dc.html`: shows both themes side by side and sets the token variables on each wrapper.
- `tokens.css`: the same tokens as `.ez-dark` / `.ez-light` classes, ready for the app.

This page records trades the fund already made at its broker. It must not include an order ticket, buy or sell buttons, paper cash or a reset.

## Layout (1440px desktop)

- Body column: x=224 to x=1408. That is the sidebar (0 to 200), a 1px hairline, 24px of clear space, then the content, with 32px of right padding. Top padding is 28px and bottom padding is 64px.
- Section order:
  1. KPI strip, with the page actions on the right.
  2. A note line.
  3. A hairline.
  4. Two columns.
  5. A hairline.
  6. Holdings.
  7. A hairline.
  8. Two columns.
  9. A hairline.
  10. Role scope.
  11. A hairline.
  12. State examples.
- Two-column rows: grid `600px 1px minmax(0,1fr)` with a 32px column gap. That gives 64px between the sections, and the 1px rule sits in the middle with 32px of clear space on each side (the minimum is 24px).
- The two two-column rows:
  - Fund book (left) and Flags awaiting response (right).
  - Discussion and outcomes (left), and Member flag accuracy above Compliance and coverage gaps (right).
- Fund book inside: donut column 200px, then 64px, then the chart (336 × 200). Sector teams table sits below.
- Role scope and State examples: grid `1fr 1px 1fr 1px 1fr` with a 32px gap.
- Horizontal section rules: 1px `--border-hover`, 32px margin above and below. Table header underline: `--border-hover`. Table row lines: `--border-primary`.
- KPI strip: Fund value, Benchmark and Today, each followed by a vertical rule with 24px of clear space on each side. Then Open flags awaiting response, Open compliance breaches and Unpriced positions with 24px between them. The actions go on the right with a 20px gap.

## Components

- **Section title**: 24px / 600, -0.01em, `--text-primary`. Subsection title: 20px / 600. Chart and field label: 12px / 500, `--text-muted`.
- **Cards**: flat. No fill, border, shadow or radius. Sections are separated only by hairlines and whitespace.
- **Text tabs and selectors** (Inbox / Sent / Resolved, sector filters, 1M / 3M / YTD / 1Y): 14px / 500, `--text-muted`. The selected item is `--emerald` at 600. No underline, pill or track.
- **Primary button** (one per group: Flag inbox, Accept, Add position in the empty state, Retry): `--emerald` fill, `--bg-primary` text, 13px / 600, padding 9×16, radius 8. Hover uses `--emerald-hover`.
- **Text buttons**: 13px / 600 `--text-primary`, turning `--emerald` on hover. Destructive actions (Remove position, Reject) use `--negative`.
- **Search**: borderless. A `bi-search` icon plus an unstyled input, 380px wide, with the placeholder in `--text-muted`.
- **Tables**: CSS grid rows.
  - Headers: 12px `--text-muted`, sentence case.
  - Cells: 13px. Numbers are right-aligned.
  - Row hover: `--surface-card-hover`.
  - Holdings columns: `64 100 112 88 64 56 76 84 100 104 76 72 1fr`, with an 8px gap.
- **Flag row**: the main row uses columns `48 72 1fr 76 72 60`. The message line below it is 12px `--text-muted`, indented 56px.
- **Flag detail**: two-column field list (112px label). Evidence items are plain emerald text links. The Answer row sits under a hairline.
- **Discussion**: 32px initials avatar on an `--emerald-bg` circle. The reply thread is indented 48px, with a left rule and 24px of clear space. Mentions are emerald text.
- **Donut**: r=82 and stroke 18, starting at 12 o'clock and running clockwise. Order: Financials (`--emerald`), Healthcare (`--pink`), Technology (`--blue`), Unassigned (`--text-muted`). The legend uses 8px dots.
- **Line chart**:
  - Fund: a 2px `--chart-line` line with an emerald-to-transparent fill.
  - Benchmark: a 1.5px dashed `--text-secondary` line.
  - Grid: `--border-primary`. Zero line: `--border-hover`.

## Typography

- Plus Jakarta Sans is used for all text.
- JetBrains Mono is used for every number, ticker, deadline, count, axis label and range label.
- Sentence case throughout the body. Product names (Trading Desk, Team Hub) stay capitalized.

## Number formats

- Money: `$1,234.56`.
- Returns and deltas are signed with two decimals: `+32.60%`, `-$2,176.20`.
- Shares of the fund (allocation, % of fund) use two decimals and are unsigned.
- Missing values show as `N/A`.

## Tokens

See `tokens.css`. These are the only colors used:

- Surfaces and text: `--bg-primary`, `--surface-card-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-ghost`.
- Borders: `--border-primary`, `--border-hover`.
- Accents and status: `--emerald`, `--emerald-hover`, `--emerald-bg`, `--positive`, `--negative`, `--pink`, `--blue`, `--chart-line`.
- Status colors:
  - Red flags, deadlines under 3 days, negative P/L, breaches and destructive actions use `--negative`.
  - Green flags, positive values and "Yes" for thesis on file use `--positive`.

## Icons (Bootstrap Icons 1.11)

- Nav: `bi-bell`, `bi-check2-square`, `bi-bank`, `bi-chevron-down`, `bi-broadcast` (Sonar), `bi-people`, `bi-person-circle`, `bi-gear`, `bi-box-arrow-right` (red).
- Body: `bi-search`, `bi-hand-thumbs-up`, `bi-chat`, `bi-people`, `bi-person`, `bi-mortarboard`, `bi-folder`, `bi-exclamation-circle`.

## States

- **Loading (holdings)**: 5 skeleton rows, each a 72px bar and a full-width bar. Bars are 10px tall, `--text-ghost` at 50% opacity.
- **Empty**: `bi-folder`, the title "No positions yet", the body text, then the primary button Add position.
- **Error**: `bi-exclamation-circle` in `--negative`, the title "Could not load Trading Desk", the body text, then the primary button Retry.
- Interactive states: row hover shows `--surface-card-hover`, and text buttons turn emerald on hover.

## Interactions

- **Flag inbox**: scrolls to or focuses Flags awaiting response.
- **Add position / Remove position**: open the record-position flows. Only executives and PMs (own team) can add positions.
- **Inbox, Sent and Resolved tabs**: switch the flag list.
- **Selecting a flag row**: loads that flag into the detail panel.
- **Answer actions**:
  - Accept, Acknowledge and Reject resolve the flag and move it to Resolved.
  - Escalate routes the flag to the escalation role.
- **Evidence links**: open the source document.
- **Sector filters and search**: filter the holdings table. Search covers ticker, company, analyst and thesis.
- **Review column**:
  - "Raise flag" opens the flag composer.
  - "Red flag" and "Green flag" open the existing flag.
  - "N open flags" filters the flag list to that ticker.
- **Chart ranges (1M, 3M, YTD, 1Y)**: change the time window. The legend values update to match.
- **Role scope**: data is filtered server-side by role, as described in the Role scope section.

---

Transcription note (stage 2 agent, not part of Claude Design's file): read on screen from the editor
(102 lines) with get_page_text and a screenshot; blank lines and list indentation were restored by hand.
The HTML and tokens.css source could not be downloaded into the workspace.
