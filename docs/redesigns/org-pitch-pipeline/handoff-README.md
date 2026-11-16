<!-- Read on screen from Claude Design project 160d81d0-f017-41fd-a20d-21b98ef7353d, file
handoff/README.md, on 2026-11-15. All 95 editor lines were read (two passes, with overlap).
Blank lines and wrapped lines were re-joined by the stage 2 agent; list nesting is inferred.
The HTML and CSS source (handoff/Pitch Pipeline.dc.html, about 43 KB) could not be downloaded;
see the claude-design-*.jpg screenshots. -->

# Pitch Pipeline (org) handoff

Route: `/org-team-hub/pitches`. Organizational version for university student-managed investment funds.

Scope: the page body to the right of the Team Hub sidebar, plus its two dialogs and state examples. The navigation bar and the Team Hub sidebar are existing components and are not part of this handoff.

Source: `Pitch Pipeline.dc.html` (in this folder). All markup and styles are inline; token values are in the `<style>` block at the top, scoped by `[data-theme="dark"]` and `[data-theme="light"]`.

## Layout (1440px desktop)

- Content edges: x=32 (left of logo) to x=1408 (right of logout icon).
- Sidebar 200px, 1px full-height hairline (`--ez-rule`), 24px clear space, then the page body (1151px).
- Page body, top to bottom:
  1. KPI strip (left) and global actions (right), hairline below.
  2. Stage strip, hairline below.
  3. Two columns: main (flex 1, 32px right padding) | 1px `--ez-rule` | side column 300px (32px left padding, 268px content). 32 + 1 + 32 gives 64px between sections and at least 24px beside the rule.
- Below the body: pitch dialog (896px) and submit dialog (416px), 64px apart.
- Bottom: State examples row, top hairline `--ez-rule`, three cells split by `--ez-rule-subtle` with 24px padding.
- Vertical rhythm: 24px under the stage strip, 40px between main tables, 36px between side sections, 64px before dialogs and before states.

## Tokens

| Token                         | Dark                        | Light                       |
| ----------------------------- | --------------------------- | --------------------------- |
| `--bg-primary`                | #0a0e13                     | #ffffff                     |
| `--bg-deep` (dialog surface)  | #0f1419                     | #ffffff                     |
| `--text-primary`              | #f0f6fc                     | #0f172a                     |
| `--text-secondary`            | #e2e8f0                     | #1e293b                     |
| `--text-muted`                | #8b949e                     | #64748b                     |
| `--text-faint`                | #6b7280                     | #94a3b8                     |
| `--emerald`                   | #10b981                     | #059669                     |
| `--emerald-text`              | #10b981                     | #047857                     |
| `--positive`                  | #10b981                     | #059669                     |
| `--negative`                  | #ef4444                     | #dc2626                     |
| `--warning`                   | #fbbf24                     | #d97706                     |
| `--btn-primary-bg`            | #10b981                     | #047857                     |
| `--btn-primary-fg`            | #0a0e13                     | #ffffff                     |
| `--ez-rule`                   | rgba(16,185,129,0.20)       | rgba(0,0,0,0.12)            |
| `--ez-rule-subtle`            | rgba(16,185,129,0.08)       | rgba(0,0,0,0.08)            |
| `--shadow-xl` (dialogs)       | 0 20px 60px rgba(0,0,0,.45) | 0 16px 48px rgba(0,0,0,.10) |
| `--radius-md` / `--radius-xl` | 8px / 16px                  | same                        |

If `--emerald-text`, `--btn-primary-*` or `--ez-rule*` already exist in the app's `theme-variables.css`, use the app values; the values above are mapped from the design system.

Type: Plus Jakarta Sans for text, JetBrains Mono for every number, date, count and ticker.

- Section titles 18px / 700, letter-spacing -0.01em, `--text-primary`.
- Table headers 11px / 600 uppercase, 0.05em tracking, `--text-muted`, `--ez-rule` underline. Rows 12px, 10px vertical padding, `--ez-rule-subtle` separators.
- KPI: 28px icon tile (`--emerald-bg`, radius 8, emerald icon 14px), 12px label `--text-muted`, 18px / 600 mono value.
- Dialog titles 20px / 700; dialog sub-headings 15px / 700.

## Components

- **KPI strip**: four items (Active pitches 24, In portfolio 6, Aging >30d 5, Archived 92), each followed by a `--ez-rule-subtle` vertical rule with 24px on each side.
- **Global actions**: "Sample content" (emerald text label), "Show council data" text toggle (On in emerald / Off in muted), Pitch archive, Team Hub (text links), Submit new pitch (the one solid primary button, 36px, radius 8).
- **Stage strip**: text-only filter. Label 13px + mono count. Selected = `--emerald-text`, 700. No underline, pill or fill. A 1px rule separates terminal stages Rejected and Exited.
- **Awaiting you table**: Ticker, Company, Desk, Analyst, Stage, Gate progress, Next owner (bi-arrow-right + name), Days, Exp. return (signed, `--positive`), Status (icon + words).
  - Review due: `bi-exclamation-triangle`, `--warning`
  - Blocked: `bi-slash-circle`, `--negative`
  - Blind ballot open: `bi-lock`, inherits row colour
  - Aging: `bi-hourglass-split`, `--warning`
  - None: "N/A" in `--text-muted`
- **All active pitches table**: Ticker, Company, Desk, Analyst, Stage, Review due, Current, Target, Upside, Holds, Last action. Missing review date = "N/A".
- **Side column**: IC agenda (key/value grid with a 108px label column, numbered agenda, each item shows `bi-eye-slash` "Tallies hidden until meeting closes"), Aging by desk, Reviews due, Approved, ready for Trading Desk (rows end with the "Open Trading Desk" emerald text link), Analyst record.
- **Pitch dialog (ALFA)**: header (ticker, company, Sample content, stage, gates passed, next step) and three columns split by `--ez-rule-subtle` with 24px clear space:
  - Gates: icon + title + subtitle + status word. Passed `bi-check-circle` `--positive`, Failed `bi-x-circle` `--negative`, Pending `bi-circle` `--text-muted`. Cross-desk approvals expands to per-desk detail. One solid "Advance to next stage" button, "Override with reason" as text.
  - Tabs: text-only (Thesis, Deliverables, Discussion, Voting, Decision). Thesis is a 118px label / value list.
  - IC vote: meeting, ballot type, blind notice, quorum, eligible voters, Your vote (text selector Buy / Pass / Abstain), rationale (required, borderless textarea, max 500, live mono count).
  - Footer: stage history with `bi-arrow-right`, then `bi-info-circle` Trading Desk note.
- **Submit new pitch dialog**: text-only steps (mono number + label). Borderless fields: 11px muted label above a 13px value; selects use `bi-chevron-down`, lookup uses `bi-search`, date uses `bi-calendar3`. Prior pitches on this ticker expands. Policy line uses `bi-check-circle`. Footer: Cancel (text) and Submit pitch (solid).
- **Dialog surface**: `--bg-deep`, 1px `--ez-rule-subtle` border, `--shadow-xl`, `--radius-xl`, 24px padding. No emerald outline. On the real page they render over `--bg-overlay` and are centred; the design shows them side by side for review only.

## Blind ballot rule

While a ballot is blind, never render Buy / Pass / Abstain tallies or any other member's ballot anywhere: tables, agenda, dialog, tooltips, or exports. Only quorum (votes received / eligible) and the viewer's own selection may show. The API should not return per-member ballots or tallies before the meeting closes.

## States

- Hover on table rows, side rows and text links: text colour changes to `--emerald-text`. No background wash, no transform.
- Selected tab / step / stage / vote / toggle: `--emerald-text`, weight 700. Unselected: `--text-secondary`, 500.
- Loading: `bi-arrow-repeat` spinning 1s linear, "Loading pitches".
- Empty: `bi-file-earmark-text`, "No pitches found.", one action "Try a different filter" (clears filters).
- Error: `bi-x-circle` `--negative`, "Couldn't load pitches.", "Retry".
- Show council data Off hides Aging by desk and Analyst record.

## Interactions

- Stage strip click selects a stage and filters both tables to that stage (click again or choose another to change).
- Row click opens the pitch dialog for that ticker.
- Submit new pitch opens the 4-step dialog; steps are navigable; Submit pitch is enabled on Review once required fields are valid and the user is eligible.
- Advance to next stage is enabled only when all gates for the current stage pass; Override with reason opens a reason prompt and logs it to stage history.
- An approved pitch must be recorded on the Trading Desk before it can move to In Portfolio; "Open Trading Desk" deep-links with the ticker prefilled.

## Icons

Bootstrap Icons 1.11 only: lightning-charge, briefcase, hourglass-split, archive, arrow-right, exclamation-triangle, slash-circle, lock, eye-slash, check-circle, x-circle, circle, chevron-down, chevron-up, x-lg, info-circle, search, calendar3, arrow-repeat, file-earmark-text, folder2-open, chat.
