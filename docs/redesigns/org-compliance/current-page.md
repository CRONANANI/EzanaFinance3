# Ezana Compliance page (organizational): how it works today

Page: Compliance. Version: organizational (university student-managed investment funds). Route: /org-team-hub/compliance. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run; screenshots of the live page are supplied separately.

## 1. Summary

Compliance is where an investment council writes down the limits of its investment policy statement (IPS), tests a proposed buy against them, and sees the policy breaches that have been logged. It is an internal student-fund tool. It is not a legal, regulatory or brokerage control, and nothing on it stops a trade at a broker.

- Who uses it: executives (set rules, resolve, read the audit log; a faculty advisor is an executive with that title), portfolio managers (resolve, test a buy), analysts (read rules, test an idea before pitching).
- Decision it supports: does this idea fit our policy, which limits are in force, which breaches are still open and who clears them.
- How they get to it: the Team Hub sidebar (executives and portfolio managers only, red count of open breaches), the Command Center ("Open breaches" figure, attention item, setup step "Set IPS rules"), the Trading Desk ("Open compliance"), fund settings. Analysts have no sidebar link but the address opens for any member.
- What they do next: Pitch Pipeline, Trading Desk, Fund Analytics, or back to the Command Center.
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon-and-text links beside one hairline, already redesigned and live. This redesign covers only the page body to its right.

| Action                                                 | Executive | Portfolio manager | Analyst |
| ------------------------------------------------------ | --------- | ----------------- | ------- |
| Read rules, run the pre-trade check, see open breaches | Yes       | Yes               | Yes     |
| Add, disable, enable or delete a rule                  | Yes       | No                | No      |
| Resolve a breach                                       | Yes       | Yes               | No      |
| Read the audit log                                     | Yes       | No                | No      |

## 2. What is on the page today

Desktop, top to bottom.

1. Header: a small "Compliance" label, the title "Compliance & IPS", one intro sentence, and on the right a status chip: "N hard breaches open" (red), else "N open flags" (amber), else "All clear" (green).
2. Five tabs as buttons: Pre-trade gate (red count of open hard breaches), Mandate Rules (count of active rules), Personal Trading, Attestations, Audit. The chosen tab is not kept in the address.
3. Pre-trade gate tab, two columns (wider left).
   - Left, "Pre-trade gate": ticker, sector (free text), proposed size (% of fund), market cap ($); "Run pre-trade check" (needs a ticker) and "Reset". A run shows a verdict (Clear, Allowed with flags, Blocked), a banner of rule hits, then every active rule under hard, soft and "Portfolio-level (not evaluated pre-trade)", each with a pass, fail or dash icon, detail and a Hard or Soft tag. A run saves nothing.
   - Left, "Open breaches": unresolved breaches, newest first (up to 200): hard or soft icon, ticker, detail, and "Resolve" for managers, which acts at once with no confirmation. Empty: "No open breaches."
   - Right, "Rules in force": active rules by name under Hard and Soft, with a count.
   - Right, "Sector capacity planner": one bar per sector, its share of the fund against the cap ("31.2% / 35%"), a tick at the cap, amber within a tenth of it, red above. No cap rule: exposure only, said so. No holdings: nothing to plot.
4. Mandate Rules tab: for executives an "Add a mandate rule" form (type, value, severity "Soft: allow + log a flag" or "Hard: block the trade", "Add rule"); others see a read-only note. Rules under Hard, Soft and Disabled (dimmed), with "Disable"/"Enable" and a red "Delete" (no confirmation) for executives.
5. Personal Trading and Attestations tabs: one "coming to Ezana" notice each, nothing else.
6. Audit tab: executives see "Audit trail" with Refresh, an action filter, a table (When, Actor, Action, Target, Detail), 50 rows at a time, and "Load more". Everyone else sees "Executive access required".

States: the first screen arrives with data. Fallback loading is the line "Loading compliance" (the route skeleton no longer matches the page). Errors are one line with no Retry: "Could not load compliance data." or "This page is for organizational members only." A failed resolve or rule change shows the server message inline. No toasts or dialogs.

Under 900px the columns stack; fields and tabs wrap; the audit table scrolls sideways.

## 3. What the user can do

- Run a pre-trade check on a ticker, with optional sector, size and market cap; reset it.
- Read open breaches; resolve one (managers).
- Read rules in force and sectors against the cap.
- Add a rule with a type, value and hard or soft severity (executives).
- Disable, enable or delete a rule (executives).
- Refresh, filter and page the audit log (executives).
- In code with no button: list resolved breaches; reopen one; check current holdings against every rule (no page calls it). Editing a rule is not possible; delete and re-add.

## 4. Data we have

| Field              | Meaning                                                                                                                                                                         | Source                                                                                           | Freshness                    | Missing when                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------- |
| Rule type          | One of nine: max single position %, max sector exposure %, max single trade %, cash floor %, min positions, max positions, min market cap, prohibited ticker, prohibited sector | Set by an executive                                                                              | On save                      | Never                                                          |
| Rule value         | A percent, a count, a dollar amount, a ticker or a sector name                                                                                                                  | Same                                                                                             | On save                      | Never                                                          |
| Rule severity      | Hard (blocks) or soft (flags); soft unless set                                                                                                                                  | Same                                                                                             | On save                      | Never                                                          |
| Rule label         | Type plus value, e.g. "Max sector exposure 35%"                                                                                                                                 | Built on save                                                                                    | On save                      | Type name shown if blank                                       |
| Rule active        | On or off                                                                                                                                                                       | Executive toggle                                                                                 | On save                      | Never                                                          |
| Check result       | Blocked or not, one sentence per hit                                                                                                                                            | Computed from rules and holdings                                                                 | On request                   | Not stored from this page                                      |
| Breach detail      | The sentence from the check that logged it                                                                                                                                      | Logged at pitch submission                                                                       | At submission                | Never                                                          |
| Breach ticker      | Ticker pitched                                                                                                                                                                  | Same                                                                                             | Same                         | May be blank                                                   |
| Breach severity    | Hard or soft, copied from the rule                                                                                                                                              | Same                                                                                             | Same                         | Never                                                          |
| Breach source      | Pitch, trade or portfolio; only pitch is written today                                                                                                                          | Same                                                                                             | Same                         | No link to the pitch itself                                    |
| Breach rule        | The rule that was hit                                                                                                                                                           | Same                                                                                             | Same                         | Blank once the rule is deleted                                 |
| Breach logged date | When                                                                                                                                                                            | Same                                                                                             | Same                         | Not shown today                                                |
| Breach state       | Open or resolved, nothing else                                                                                                                                                  | Manager action                                                                                   | On resolve                   | Never                                                          |
| Open breach count  | Unresolved breaches, whole council                                                                                                                                              | Counted on load                                                                                  | On load; sidebar each minute | Never                                                          |
| Sector weights     | Each sector's share of the fund                                                                                                                                                 | Council holdings                                                                                 | On load                      | No holdings; holdings with no sector fall under "Unclassified" |
| Sector cap         | The lowest active sector cap                                                                                                                                                    | Rules                                                                                            | On load                      | No cap rule                                                    |
| Audit entry        | Time, actor, action code, target, detail                                                                                                                                        | Privileged actions elsewhere (roles, permissions, invitations, fund settings, branding, exports) | On load                      | Rule changes and resolutions are not recorded                  |
| Viewer role        | Executive, portfolio manager or analyst                                                                                                                                         | Membership                                                                                       | On load                      | Never                                                          |

## 5. Data we do not have

Do not design around these.

- Breach states beyond open and resolved: no acknowledged, waived, escalated or reopened state, no owner, no due date.
- Who resolved a breach, when, and why. No note, reason or evidence is stored.
- Personal trading disclosures, pre-clearance requests, a restricted or blackout list (only the prohibited ticker and prohibited sector rules exist), attestations or sign-offs.
- Trade-time enforcement. The Trading Desk records holdings and places no orders, so no rule is applied to a trade.
- A history of rule changes, rule versions or effective dates. An uploaded IPS document.
- Automatic monitoring: no scheduled check or alert.
- Cash balance (no cash floor reading); automatic sector or market cap for a typed ticker.
- Breach trends, time to resolve, per-member counts, compliance scores, any legal or regulatory review.

## 6. Must keep working

- The route, its links in (listed in section 1), and access for any council member.
- Executives only: add, disable, enable, delete rules, and read the audit log. Executives and portfolio managers: resolve. The server checks each of these; the page only hides controls.
- The check with four inputs, three verdicts, per-rule results, saving nothing.
- Resolving refreshes the list. The sidebar count, the Command Center "Open breaches" figure and the Trading Desk "Open breaches" and "Open compliance breaches (whole fund)" figures all read the same number: unresolved breaches for the whole council, shown to executives and portfolio managers.
- Rules keep feeding: the pitch form (blocks submission on a hard breach), Fund Analytics "Sectors over cap", the organizational Sonar fund-fit checks, and the setup step (done at one rule).
- The nine rule types and hard or soft as stored; audit filter, paging and executive gate.

## 7. Problems with the current page

Design problems

- Breaks the brand rules: title block, filled rounded panels, pill tabs with badges, filled chips, outlined buttons, bordered inputs.
- Two of five tabs are empty promises. The open breach list sits under a form.
- "Rules in force" repeats the Mandate Rules tab without values. The words gate, mandate, policy, flag, breach and violation are used for the same things.
- Breach rows lack date, rule, source and a pitch link. Resolve and Delete need no confirmation or reason.
- Audit actions are raw codes ("role_changed") and targets are a type plus a cut-off id.
- One loading line and one error line, no Retry. No sample content.

Rules stored but never checked, or checked less than the page implies

- Cash floor: stored, never evaluated. The page calls it "enforced against the live portfolio".
- Min positions: only evaluated by the portfolio check, which no page calls. In practice never checked.
- No rule is checked automatically against holdings. Nothing runs on a schedule or when a position is added.
- The only automatic check is at pitch submission, and the pitch form sends the ticker alone. So only prohibited ticker and max positions can ever log a breach. Sector cap, position size, trade size, market cap and prohibited sector fire only when someone types those fields into the check on this page, which logs nothing.
- The hard block runs in the pitch form only; the server does not check, and a failed check lets the pitch through.
- The Pitch Pipeline stage gate named "Compliance" always passes, with the text "Compliance engine not configured".
- A blocked pitch still logs a breach though no pitch exists, and each retry logs another.

Wording that reads as assurance and is not true in the code

- "HARD limits block the trade", "Hard: block the trade", "block a trade at the gate", "before it reaches the desk": no trade is ever blocked.
- "Your council's IPS rules and blackout list already apply to fund trades on the Trading Desk": there is no blackout list and no trade check.
- "All clear": means only that no breach is logged.
- "Audit trail": holds no compliance actions.
- "The IPS engine enforces sector caps" and "Managers set these": nothing is enforced; only executives set rules.
- "Compliance", "attestations" and "pre-clearance" must not suggest legal or regulatory cover.

Bugs

- Audit detail is stored as structured data and drawn as text; entries with detail likely break the tab (not run).
- Three sector readings: the planner uses cost basis and the lowest cap; the check uses market value; Fund Analytics uses market value and the first cap rule it finds. They can disagree.
- Sector and prohibited sector matching is exact free text, so "Tech" never matches "Technology".
- Settings says a member granted "manage settings" can edit the IPS; the server allows executives only.
- Sonar fund-fit reads a prohibited ticker with no severity as hard; this page reads it as soft.
- The sidebar hides Compliance from analysts, yet the page works for them.

## 8. Design rules the mock must follow

The page must match the four rebuilt council pages (Command Center, Trading Desk, Fund Analytics, Assignments): the same KPI strip on the first row with page actions on its right, flat sections, text tabs, a small "Sample content" text label with a "Show council data" switch, and the same sample council (named "Sample council"; teams Financials, Healthcare, Technology, Industrials; members such as Amara Tesfaye, Chidi Okoye, Selam Haile; a 35% sector cap; 2 open breaches).

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode. Rows are flat too.
2. The navigation bar runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line; page content ends exactly on the right line.
3. Tabs and toggles are text only: no track, pill, fill, underline or badge. Selected is emerald text.
4. No outlined buttons. One solid emerald button per group (white text, 8px radius); the rest plain text. Destructive is red text, confirmed in a dialog.
5. Search and text fields have no border, fill or focus ring.
6. No page title, eyebrow or intro sentence. Bootstrap Icons only.
7. Plus Jakarta Sans for text; JetBrains Mono for every number, date, count and ticker.
8. Sentence case. No em dashes. Describe, never advise or assure: no "compliant", "approved", "safe", "all clear", "enforced" or "real-time". Say "no open breaches logged".
9. Dark mode first; light mode must work.
10. KPI strip: about 48px tall, only as wide as its content, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
11. Side-by-side sections 64px apart with 24px clear beside any vertical rule; stacked sections 20px apart.
12. Tables: 11px grey caps header over a hairline, hairlines between rows, numbers right-aligned in mono. Hairlines divide and never enclose.
13. Hard, soft, open and resolved are words with an optional icon, never filled chips, and never colour alone.
14. Missing values read N/A. Percentages keep their sign where they are changes.
15. Only overlays (dialogs, menus, tooltips) have a surface, border, shadow and radius.
16. Draw the real navigation bar and sidebar; redesign neither.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative, hard breach    | #ef4444          | #dc2626          |
| Warning, soft flag       | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Add acknowledged and waived states, with who, when and a reason? Default: draw resolve with a required reason in a dialog; ship the extra states only after you run the schema change, until then open and resolved only.
2. Show a resolved history? Default: yes, a text tab beside Open (the data exists).
3. Run the holdings check on page load so every rule shows its current reading? Default: yes, read-only, and it logs nothing.
4. How to show cash floor and min positions? Default: cash floor labelled "Recorded only, not checked"; min positions read from the holdings check.
5. Personal trading and attestations? Default: remove both tabs, one muted line.
6. Keep the audit log here? Default: yes, executives only, retitled "Council activity log", with plain action names.
7. Reword every claim of blocking or enforcement? Default: yes, and add one line: "A council policy record. Not legal or regulatory advice."
8. Fix other pages (pitch gate, Fund Analytics cap, analyst sidebar link)? Default: out of scope, listed.
9. Confirm before delete and resolve? Default: yes.
10. Sample content for master admin and demo accounts? Default: yes, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Compliance. Route: /org-team-hub/compliance. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Lead with a KPI strip (open breaches, hard breaches, rules in force, sectors over cap) and the open breach list, then the policy rules with each rule's current reading, the idea check, and the activity log for executives. Show how the page differs for an executive (sets rules, resolves, reads the log), a portfolio manager (resolves) and an analyst (reads and checks an idea), following the role table in section 1, and draw the add rule dialog and the resolve dialog with its reason field. Never draw wording that promises legal, regulatory or trade-blocking protection, and mark any rule that is recorded but not checked. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a policy summary for new members, each rule's reading against holdings, sector headroom, an idea check before pitching, a breach list with rule and date, a resolved history. Use invented sample names only. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
