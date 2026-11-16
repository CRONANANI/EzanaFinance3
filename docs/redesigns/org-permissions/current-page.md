# Ezana Team Permissions page (organizational): how it works today

Page: Team Permissions. Version: organizational (university student-managed investment funds). Route: /org-team-hub/permissions. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Team Permissions is where a council member who supervises others switches on extra rights for the people who report to them, on top of what their role already gives them.

- Who uses it: executives (including the faculty advisor) and portfolio managers grant. Analysts and junior portfolio managers see it view only.
- Decision it supports: should this report flag positions, add positions, see fund-wide analytics, schedule meetings, approve others' research or send to the team, beyond their role's defaults.
- How they get to it: the last link in the Team Hub sidebar (key icon, accent style), shown to every role.
- What they do next: the page where the right is used, or the Org Chart to fix who reports to whom.
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon and text links beside one full-height hairline, already redesigned and live. The shell is not part of this redesign; it covers only the page body to the right of the hairline.

How rights work, as the code defines it:

- Role and sub-role decide default rights, which cannot be removed here. A supervisor can add extras from a fixed list of eight to a direct report. Rights are defaults plus extras; a role change never removes extras.

Default rights by role (the eight that appear on this page):

| Right (label on page)                    | Executive | Senior PM | PM  | Junior PM | Senior Analyst | Analyst | Junior Analyst | Quant Analyst |
| ---------------------------------------- | --------- | --------- | --- | --------- | -------------- | ------- | -------------- | ------------- |
| Flag positions                           | Yes       | Yes       | Yes | Yes       | Yes            | No      | No             | No            |
| Manage positions                         | Yes       | Yes       | Yes | Yes       | No             | No      | No             | No            |
| Upload deliverables                      | Yes       | Yes       | Yes | Yes       | Yes            | Yes     | Yes            | Yes           |
| View team analytics                      | No        | Yes       | Yes | Yes       | Yes            | Yes     | No             | Yes           |
| View fund analytics                      | Yes       | No        | No  | No        | No             | No      | No             | No            |
| Create events                            | Yes       | Yes       | No  | No        | No             | No      | No             | No            |
| Approve deliverables                     | No        | Yes       | No  | No        | No             | No      | No             | No            |
| Send to team                             | Yes       | Yes       | Yes | Yes       | Yes            | Yes     | No             | Yes           |
| Can grant others (not shown as a toggle) | Yes       | Yes       | Yes | No        | No             | No      | No             | No            |

Roles also carry rights that never appear here and that no server check reads (manage members, manage tasks, manage analysts, mentor juniors, run models, create posts and others); manage org settings is read only for the research methodology. An unknown sub-role gets the PM or Analyst defaults.

## 2. What is on the page today

Desktop, top to bottom:

1. Header block: mono eyebrow "PERMISSIONS · university name", title "Team Permissions" with a tinted pill "You can grant permissions" or "View only", and one sentence: "Control what your direct reports can do. Role defaults are always on; toggle the extras."
2. Error line: a tinted amber box with the server's message after a failed change.
3. A grid of filled, rounded member cards (about three across at 1440px), one per active direct report, by name: name, title (or sub-role, or role), a hairline, then eight bordered, rounded rows, one per right:
   - On and a role default: lock icon, tinted, disabled, tooltip "Role default, always granted".
   - On as an extra: check icon, emerald tint and border. Clicking revokes it.
   - Off: no icon, grey border. Clicking grants it.
   - Saving: a spinning arrow on that row only.
   - For a viewer without the right to grant, every row is disabled.

States:

- Loading: centred "Loading permissions…" text (only when the server could not supply the first load).
- No direct reports: centred text "You have no direct reports. Permissions for your subordinates appear here once your council's reporting structure is set up."
- Load failure with no data: the error message alone, centred.
- No toast, dialog, search, filter, history or sample content. Tablet: two columns, then one; phone: one.

## 3. What the user can do

- Grant one extra right to one direct report (one click, applied at once, no confirmation).
- Revoke one extra right (one click).
- See which rights are role defaults (locked) and which are extras.
- Nothing else: no bulk change, reason, expiry, undo or history, and nobody beyond direct reports. After a failure the matrix reloads by itself.

## 4. Data we have

| Field                                    | What it means                                     | Where it comes from              | Freshness                          | Missing for                                                             |
| ---------------------------------------- | ------------------------------------------------- | -------------------------------- | ---------------------------------- | ----------------------------------------------------------------------- |
| Can grant                                | Viewer's role defaults include the right to grant | Role table in the app            | On page load                       | Ignores extras (none can grant it on this page)                         |
| Direct reports                           | Active members whose manager is the viewer        | Org chart reporting line         | On page load                       | Anyone not linked as a direct report                                    |
| Member name, title, sub-role, role, team | Card heading                                      | Council membership record        | On page load                       | Title often empty                                                       |
| Right on or off                          | Effective state for each of the eight rights      | Role defaults plus stored extras | On page load and after each change | Manage positions reads wrong for managers, see section 7                |
| Is role default                          | Locked row                                        | Role table                       | On page load                       | Same                                                                    |
| Is extra                                 | Stored grant exists                               | Stored extras                    | On page load                       | None                                                                    |
| Granted by, granted on                   | Who added an extra, when                          | Stored with each extra           | Until revoked                      | Not shown; lost on revoke                                               |
| Change history                           | Each grant and revoke: actor, member, right, time | Council audit trail              | Per change                         | Executives only, on Compliance and in Settings, not here; can be missed |

## 5. Data we do not have

Do not design around these:

- A reason or note for a grant, an expiry date, or a request and approve flow.
- A per-member change history on this page (only the executive audit trail exists, and it holds a member id, not a name).
- Grants to non-reports, teams, cohorts or roles at once.
- Custom per-university roles (read only for a display title).
- Any right beyond the eight listed. Mentor juniors has a label in the code but is deliberately not grantable.
- Notifications when a right changes, or usage counts per right.

## 6. Must keep working

Every rule below must hold exactly, whatever the design shows.

1. Only members whose role defaults include the right to grant (executive, Senior PM, PM) can change anything. The server checks this on every change, whatever the screen shows.
2. A change is allowed only for a member whose manager in the org chart is the viewer, in the same council. The server re-checks both on every change.
3. Only the eight listed rights can be granted or revoked through the page. Anything else is refused.
4. Role defaults are always on and cannot be revoked here. Removing a default means changing the member's role (Org Chart and Settings), which has its own ladder: only lower ranks, within your reporting line, never your own.
5. Nobody changes their own rights through the page: a member cannot be their own direct report.
6. Inactive members get no rights at all from the server's check, and do not appear on the page.
7. A change takes effect on the member's next server request (every check reads extras fresh), so a revoke stops the action at once; their screen catches up when their council status reloads.
8. Every grant and revoke writes an executive audit trail entry (action, actor, member, right, time) without ever blocking the change.
9. A failed change restores the server's state and shows the message.
10. Only council members can reach the page.

Where each right is checked on the server, and the page that reads it:

| Right                | Server check                                                                                                                                       | Page and control that reads it                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Flag positions       | Raising a flag; loading the flaggable holdings list                                                                                                | Trading Desk Raise flag, row menu, Flag inbox                                                   |
| Manage positions     | Adding by hand, spreadsheet or brokerage link; removing a position (role executive or PM, or the extra)                                            | Trading Desk Add position and Remove position, including granted analysts                       |
| Upload deliverables  | Research note attachments (right only); meeting deliverables (right plus manager role)                                                             | Research Library, Meetings                                                                      |
| View fund analytics  | Fund data health; council attention map; any member's scorecard; analytics sample                                                                  | Command Center and Fund Analytics data health, attention map, scorecard dialog                  |
| View team analytics  | Attention map and same-team scorecards, but only together with a manager role                                                                      | Fund Analytics                                                                                  |
| Create events        | Scheduling a meeting (right plus manager role)                                                                                                     | Meetings scheduling                                                                             |
| Approve deliverables | Publishing someone else's research note (right plus manager role; executives exempt); reviewing Sonar research reports (manager role or the right) | Research Library, Sonar Research                                                                |
| Send to team         | Sending a team message                                                                                                                             | Send to team on Watchlist, Market analysis, Company research, earnings cards, research articles |
| Can grant others     | This page's change check                                                                                                                           | This page                                                                                       |

The Settings "My role and access" panel reads the same rights and must stay in step.

## 7. Problems with the current page

Enforcement gaps (fix or flag before anything else):

1. A supervisor can grant rights above their own. A PM (who lacks fund-wide analytics, scheduling and approval by default) can give an analyst View fund analytics, which opens every member's scorecard and the fund data health. Nothing compares the right to the grantor's own rights or tier. The brief assumed this was blocked; the code does not block it.
2. The rule behind the stored grants is wider than the page. Through the database rule alone, any executive or portfolio manager can write grants for any member of their council (not only direct reports) and for any right name, not only the eight; an executive can even grant to themselves. Only portfolio managers are stopped from changing their own. The page's checks (direct reports, eight rights, no self) are enforced only in the page's own server step.
3. Granted but ignored: for an analyst, View team analytics and Create events do nothing, and Approve deliverables (research notes) and meeting uploads need a manager role too. The page gives no hint.
4. Shown wrong: the server gives Manage positions to executives and portfolio managers by role, but the page shows it off and clickable for them; toggling it changes nothing.
5. Upload deliverables is a default for every role: always locked, never grantable.
6. Role rights that nothing checks (section 1) still show as abilities in Settings.
7. Extras survive role changes, reporting-line changes and the grantor leaving, and are never reviewed.
8. Audit gaps: entries hold a member id, not a name; revoking deletes "granted by"; entries can be silently missed; supervisors cannot see their reports' history.
9. The "Can grant" label ignores stored extras while the server reads them; they can disagree after a grant made outside the page.
10. The page uses only the org chart's reporting line (an unused helper would have used team membership). A PM whose analysts are not linked to them sees nobody.

Design problems:

- A header block with eyebrow, large title, pill and intro sentence (the guide forbids a title block).
- Filled, rounded cards and bordered, rounded, tinted toggle rows; a tinted pill; a tinted error box.
- No overview, no comparison across members, no confirmation for consequential rights, no success feedback.
- The empty state does not link to the Org Chart.
- A raw role word can appear as a title when title and sub-role are empty.
- No sample content for master admin and demo accounts.

Bugs: items 3, 4 and 9 above, and the raw role word fallback.

## 8. Design rules the mock must follow

The most often broken rules come first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode. Member rows and toggles are flat too.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line; the page body sits right of its hairline and ends exactly on the right line.
3. Tabs and toggles are text only: no track, pill, fill or border. Selected or on is emerald text (with an optional check icon); off is grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group. Secondary: plain text. Destructive (revoke): plain red text, confirmed in a dialog when it matters.
5. Search has no border, fill or focus ring: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence. The first thing is the KPI strip.
7. Bootstrap Icons only. No emoji, logos or illustrations.
8. Plus Jakarta Sans for interface text; JetBrains Mono for every number, date and count.
9. Sentence case. No em dashes. Describe, never advise.
10. Dark mode first; light mode must work.
11. Match the four rebuilt Team Hub pages (Command Center, Trading Desk, Fund Analytics, Assignments): a KPI strip about 48px tall (28px icon tile, 12px grey label, 18px mono value, hairlines between cells) with page actions on its right, primary last; flat sections; text tabs with counts; a small "Sample content" text label with a "Show council data" switch for master admin and demo accounts; and the same invented sample council used on those pages (four sector teams Financials, Healthcare, Technology, Industrials, and the same nine invented members). Nothing changed on sample rows is ever saved.
12. Tables: 11px grey caps header, hairlines between rows, mono counts right-aligned. Hairlines (1px, primary text at 7 to 10 percent) divide and never enclose. Side-by-side sections 64px apart, stacked 20px; a side column is split off by one full-height hairline.
13. Status is text with an optional icon, never a filled chip. Locked defaults read as grey text with a lock icon.
14. Missing values read N/A. Every skeleton matches the final layout; empty states are one line with one action; errors are inline with Retry.
15. Only overlays (dialogs, menus, tooltips) have a surface, border, shadow and radius.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Block grants above the grantor's own rights? Default: yes on the page and on the server: a grantor may only give rights they hold themselves (executives keep all eight). A database change, if needed, is written for the owner to apply, never run.
2. Narrow the database rule to match the page (direct reports, the eight rights, no self, executives included)? Default: yes, written as a change for the owner to apply; until then flagged.
3. Hide or mark rights that need a manager role when the member is an analyst? Default: show them as "Needs a manager role" and not clickable.
4. Treat Manage positions as a role default for executives and portfolio managers? Default: yes, locked on, a bug fix.
5. Drop Upload deliverables from the grid since everyone has it? Default: keep it as a locked line in a "Role defaults" summary, not a toggle.
6. Confirm before granting View fund analytics or Manage positions? Default: yes, a short dialog; other rights apply on one click.
7. Show a change history for the viewer's reports? Default: executives only, from the existing audit trail, until the server lets supervisors read it.
8. Build "Where each right is used" as a reference section? Default: yes, static text from section 6.
9. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Team Permissions. Route: /org-team-hub/permissions. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the page body to its right, matching the rebuilt Command Center, Trading Desk, Fund Analytics and Assignments pages (KPI strip, flat sections, text tabs, the Sample content label and the same invented sample council). Show the view of a portfolio manager who can grant and, in a small inset, the view-only state of an analyst. Make role defaults, granted extras, rights the member cannot use, and rights the grantor cannot give clearly different in text and icon, never by colour alone. Draw the confirm dialog for a consequential grant. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a member by right matrix for direct reports, a role defaults reference, where each right is used, recent changes for your reports, extras that outlived a role change, and a link to fix reporting lines in the Org Chart. Use invented sample names only. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
