# Claude Design handoff README: Team Permissions (org)

Source: design_handoff_team_permissions/README.md in https://claude.ai/design/p/0d18fe12-7210-4e79-a786-ff05e4bd7eda , read on screen 2026-11-16 (get_page_text plus PageDown; wrapped lines re-joined). Note from Claude Design: the handoff folder was copied before its background check finished.

---

# Handoff: Ezana Team Permissions (redesign)

Route: `/org-team-hub/permissions` (organizational version, university student-managed investment funds).

## Overview

A supervisor (here: Chidi Okoye, Portfolio manager, Sample council) switches on extra rights for their direct reports on top of their role defaults. A supervisor can only grant rights they hold themselves.

## About the design files

The files in this bundle are **design references created in HTML**: prototypes showing intended look and behavior, not production code. Recreate them in the target codebase (the Ezana Next.js app: `src/app/theme-variables.css`, Tailwind, shadcn-style primitives) using its established patterns. Do not ship the HTML directly.

- `Team Permissions Page.dc.html`: the page. Prop `theme` = `dark` | `light`. Template (inline-styled HTML) is between `<x-dc>` tags; logic and data are in the `<script data-dc-script>` class.
- `Team Permissions.dc.html`: canvas showing dark (1a) and light (1b) side by side.
- `support.js`: runtime that lets the `.dc.html` files open in a browser. Not part of the implementation.
- `assets/ezana-nav-logo.png`: brand mark from the design system.

## Fidelity

**High fidelity.** Final colors, type, spacing and states. Recreate pixel-accurately at 1440px desktop.

## Layout (1440px frame)

- **Nav bar**: height 72px, padding 0 32px, 3-column grid (`1fr auto 1fr`), 1px bottom rule `--border-hover`.
  - Left: logo 40px tall (left edge x=32), mirrored `scaleX(-1)`; bell with red mono count `9+`; flag with emerald mono count `4/19` (counts are bare text, no pill).
  - Center (gap 28px, 14px/500, `--text-muted`): Team hub (current, emerald text), Research + chevron, Trading + chevron, **Sonar** (filled emerald pill, `--radius-pill`, padding 8px 18px, text `--bg-primary`, 600), Watchlist, Learning center.
  - Right (gap 24px, 20px icons): profile, settings (`--text-muted`), logout `bi-box-arrow-right` in `--negative`, right edge x=1408.
- **Sidebar**: width 248px (padding 24px 24px 48px 32px, so content spans x=32 to x=224), 1px right rule `--border-hover`.
  - Profile: 40px circle avatar (`--emerald-bg`, emerald "C"), name 14/600 `--text-primary`, role 12/500 emerald. 20px bottom padding + rule.
  - 17 items, 40px tall, 14px, icon 16px muted, gap 12px, counts right-aligned JetBrains Mono 12px muted. Current item (Team permissions) is emerald 600 text, no background.
- **Main**: padding 24px 32px 64px 24px (content x=272 to x=1408, ~1112px wide). Sections are flat (no fill, border, shadow, radius), separated by 1px `--border-hover` rules with 32px padding above.

### Sections in order

1. **KPI strip** (first element, no title block): row 48px tall. Five cells: 28px icon tile (`--emerald-bg`, `--radius-sm`, emerald 14px icon) + label 12px/16px `--text-muted` + value JetBrains Mono 18px/24px 600 `--text-primary`. 1px vertical rules between cells with 24px each side. Values: Direct reports 4, Role defaults 5, Active extras 3 (live count), Grantable rights 5, Restricted rights 3. Right side: "Sample content" (muted 13px), then "Show council data" with text toggle `On` / `Off` (selected = emerald 600, other = muted; no track, pill or underline).
2. **Viewer block**: "Portfolio manager, Sample council" 12px muted; "Chidi Okoye" 24px/700, -0.02em. "Direct reports (4)" 18px/600 (number mono). Two-column flush table (Name / Role), header 32px 12px muted, rows 40px, 1px `--emerald-border` rules. Rows: Amara Tesfaye, Senior analyst; Mikael Bekele, Analyst; Tomas Alvarez, Junior analyst; Jonas Weber, Analyst.
3. **Permissions matrix**: title 20px/600; description 14px muted. Grid `160px | 1fr | 4 x 148px`. Group label "Recipient members (direct reports)" spans the member columns; header row shows full name (13px/600 primary) + role (12px muted). 7 right rows (min 44px), name 14/600, one-line description 13px muted. Below: a locked line "Upload deliverables is a role default for every role and is always on." and a one-line legend of the five states.
4. **Security rule**: "Critical security rule: you can grant only rights you already hold." 16px/700 emerald, then 14px/1.65 muted paragraph (max 1000px).
5. **Three columns** (`1.25fr | 1px | 1fr | 1px | 1fr`, 32px gap each side of a rule = 64px between sections):
   - Member details: Amara Tesfaye. Label column 150px (12px muted): Role = Senior analyst; Default rights (4) = Flag positions, Upload deliverables, View team analytics, Send to team; Additional rights (1) = Manage positions (emerald 600); Sources and dates = "Role defaults from Senior analyst, since 2026-07-27" / "Manage positions granted by Chidi Okoye on 2026-10-14" (dates mono).
   - Role-default reference: Senior analyst. Right / Default table, 36px rows, all "Always on".
   - Where each right is used: Flag positions, Manage positions, Upload deliverables, View team analytics, Send to team; name 13/600 over usage line 13px muted.
6. **Analyst view + confirm dialog** (two equal columns, 64px gap):
   - "Analyst view only (for reference)", "You can view your access. Changes require an eligible supervisor." Table `200px | 1fr`, header "Right" / "Your access (Mikael Bekele, Analyst)", 38px rows, text only: Flag positions = Granted extra by Chidi Okoye; Manage positions = Not granted; Upload deliverables = Role default; View team analytics = Role default; View fund analytics, Create events, Approve deliverables = Not granted; Send to team = Role default.
   - Confirm dialog (Modal look): `--bg-deep` surface, 1px `--emerald-border`, `--radius-xl`, `--shadow-xl`. Header 18px 24px padding, title 18/600 "Confirm grant: Manage positions", close `bi-x-lg` muted. Body: "Grant Manage positions to Mikael Bekele?" 15/600 + 14px/1.6 muted copy. Footer (top rule, padding 16px 24px, gap 24px, right-aligned): Cancel (plain text, `--text-secondary` 600) and Grant access (solid `--emerald`, text `--bg-primary`, `--radius-md`, padding 10px 18px, 14/600).
7. **Other states** (three columns split by rules):
   - Loading: "Loading team permissions" + skeletons in the final layout (KPI tiles + 5 matrix rows), bars `--emerald-bg-hover`, `--radius-sm`.
   - Empty: "You have no direct reports." + link "View org chart" + `bi-arrow-right`.
   - Error: `bi-exclamation-circle` (negative) "Could not load team permissions." + "Retry" with `bi-arrow-clockwise` (emerald text button).

## Matrix cell states (text + icon, never colour alone)

| State                | Text                 | Icon               | Colour                                   | Interactive                                                                    |
| -------------------- | -------------------- | ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------ |
| Role default         | Role default         | `bi-lock`          | `--text-muted`                           | No                                                                             |
| Granted extra        | Granted extra        | `bi-check2-circle` | `--emerald` 600                          | Hover swaps the label to plain red text "Revoke" (`--negative`); click revokes |
| Grant                | Grant                | `bi-plus-circle`   | `--emerald` 600, hover `--emerald-hover` | Click opens confirm dialog                                                     |
| Needs a manager role | Needs a manager role | `bi-slash-circle`  | `--text-muted`                           | No (tooltip)                                                                   |
| Cannot grant         | Cannot grant         | `bi-dash-circle`   | `--text-muted`                           | No (tooltip "Cannot grant, you do not hold it")                                |

### Cell logic (in this order)

1. Right in member's role defaults: Role default.
2. Right in member's granted extras: Granted extra.
3. Viewer does not hold the right: Cannot grant (View fund analytics, Create events, Approve deliverables for this viewer; never show Grant here).
4. Right would do nothing at the member's rank (View team analytics for Junior analyst): Needs a manager role.
5. Otherwise: Grant.

Role defaults: Senior analyst = Flag positions, Upload deliverables, View team analytics, Send to team. Analyst = Upload deliverables, View team analytics, Send to team. Junior analyst = Upload deliverables. Portfolio manager = Flag positions, Manage positions, Upload deliverables, View team analytics, Send to team (can grant). View fund analytics: executive only. Create events: executive and senior PM. Approve deliverables: senior PM.

Initial extras: Amara = Manage positions, Mikael = Flag positions, Tomas = Send to team.

## Interactions

- Table row hover (all flush tables and matrix): text colour changes to `--emerald`; no background, wash or accent bar.
- Grant: opens modal over `--bg-overlay`; Cancel / close / overlay click dismisses; Grant access adds the extra, closes, and updates Active extras.
- Revoke: removes the extra immediately (production: consider an undo toast; audit-log the action).
- Show council data: text toggle On/Off.
- Server must enforce: direct reports only, no self grant, defaults immutable, grantor must hold the right.

## State

`extras: Record<memberId, rightId[]>`, `hoverCell: string | null`, `pending: { member, right } | null`, `councilData: boolean`, plus fetch status `loading | empty | error | ready`.

## Design tokens (from Ezana `colors_and_type.css`)

Dark / light:

- `--bg-primary` #0a0e13 / #ffffff; `--bg-deep` #0f1419 / #ffffff; `--bg-overlay` rgba(0,0,0,0.6) / rgba(0,0,0,0.4)
- `--text-primary` #f0f6fc / #0f172a; `--text-secondary` #e2e8f0 / #1e293b; `--text-muted` #8b949e / #64748b
- `--emerald` #10b981 / #059669; `--emerald-hover` #34d399 / #047857; `--emerald-bg` rgba(16,185,129,0.08) / 0.06; `--emerald-bg-hover` rgba(16,185,129,0.12)
- `--emerald-border` rgba(16,185,129,0.15) / 0.20; `--border-hover` rgba(16,185,129,0.20) / 0.25
- `--negative` #ef4444 / #dc2626
- `--shadow-xl` 0 20px 60px rgba(0,0,0,0.45) / 0 16px 48px rgba(0,0,0,0.10)
- Radius: `--radius-sm` 4px, `--radius-md` 8px, `--radius-xl` 16px, pill 9999px
- Fonts: `--font-sans` Plus Jakarta Sans (all text); `--font-mono` JetBrains Mono (every number, date, count; tabular-nums)
- Type sizes used: 12, 13, 14, 15, 16, 18, 20, 24px. Spacing on the 4px scale (4, 8, 12, 16, 20, 24, 32, 48, 64).
- There is no `--primary-fg` token in the design system; primary button text uses `--bg-primary`.

## Icons

Bootstrap Icons 1.11.3 (`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`): bell, flag, buildings, search, graph-up, chevron-down, broadcast, bookmark, mortarboard, person-circle, gear, box-arrow-right, speedometer2, bank, clipboard-check, diagram-3, easel, archive, camera-video, award, clipboard-data, trophy, bar-chart-steps, people, shield-check, file-earmark-text, key, lock, check2-circle, plus-circle, slash-circle, dash-circle, x-lg, arrow-right, arrow-clockwise, exclamation-circle.

## Assets

`assets/ezana-nav-logo.png` from the Ezana design system. The wireframe shows a Walia ibex mark; the design system only ships the pegasus. Swap in the production ibex asset at the same size and position (40px tall, left edge x=32).
