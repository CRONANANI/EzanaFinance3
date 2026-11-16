# Ezana Org Chart page (organizational): how it works today

Page: Org Chart. Version: organizational (university student-managed investment funds). Route: /org-team-hub/org-chart. An older address ending in /hierarchy forwards here.
What I want from the redesign: open brief.
Keep or drop: nothing specified. Section 6 lists what must keep working.
Written from the code at commit 741e755 (main, November 15, 2026). The page was not run while writing this. Screenshots of the live page come separately.

## 1. Summary

The Org Chart is the council's structure on one page: who leads, which sector team each member sits on, who reports to whom and what rank each holds. It is also where a member's rank is changed.

- Who uses it: every active council member can read it. Executives and portfolio managers (PMs) re-rank the people below them. Analysts find their sector head and teammates. Faculty advisors have no role of their own; they sign in as executives.
- Decision it supports: is every sector team staffed and led, is every sector covered by a named analyst, and does each member hold the right rank? The answers decide who receives position flags, who votes on pitches and who sees whose work.
- How they get to it: "Org Chart" in the Team Hub sidebar; the "I oversee" link and the setup step "Assign sector coverage" on the Command Center; "Open org chart" on the Trading Desk; the coverage gaps panel on Fund Analytics; "Manage sector coverage on the org chart" in council settings; "Hierarchy" in the phone menu.
- What they do next: open a profile, message a member, or go to Settings to invite people and manage teams.
- Shell: the page sits inside the shared Team Hub shell, a 200px sidebar of 17 icon-and-text links beside one hairline, already redesigned and live. This redesign covers only the page body.

## 2. What is on the page today

One layout for every role. Only the rank controls and one button differ.

| Section             | What it shows                                                                                                                  | Controls                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Performance tape    | FUND with total value and return, then each sector team with its value and return                                              | None                                                                                                            |
| Centred header      | A caps line (fund, university, today's date), the headline "The investment council.", a line "N members, N desks, N vacancies" | None                                                                                                            |
| Stats line          | Members, Desks, Leadership, Vacancies, Top desk (best team return), Avg desk ROI                                               | "Add member" (outlined pill), executives and PMs only. It opens the Assignments page, which cannot add a member |
| I. Chain of command | A legend (Leadership, Sector head, Analyst, Vacant) and the chart                                                              | Layout switch: Tiers, Radial, Columns. "Committee overlay" toggle with a count                                  |
| II. The roster      | "N of N members" and one bordered card per group: Leadership, then each sector team                                            | Filter pills: All desks, Leadership, Desk leads, Analysts                                                       |

Chart layouts:

- Tiers (default): President and Vice President joined by a line; other executives below; then one small card per sector team in a sideways-scrolling strip with team name, team return, the head and the other members (senior analysts marked SR). An empty team shows a dashed "Desk head, Vacant" seat.
- Radial: a fixed 560px circle with the President in the middle, other leadership on an inner ring and one node per team on an outer ring.
- Columns: one column for Leadership and one per team, each a stack of member cards.

Every person is a button that opens the profile dialog, with an initials circle coloured by rank group (amber leadership, indigo PMs, emerald analysts). The committee overlay adds an "IC" tag to every executive and PM, the members who can vote on pitches.

### The roster

Each group card has a title, the team's sleeve value and return, and a head count. Each row: initials, name, title, the person they report to, and a rank chip (PRESIDENT, VP, EXEC, SR PM, PM, JR PM, SR ANALYST, QUANT, ANALYST, JR ANALYST). The viewer's own row is highlighted.

### Rank change popover

Where the viewer may re-rank a member, the chip opens a popover: "Change role: name", the ranks the viewer may give with CURRENT on the present one, Cancel and Save. Success shows a toast "name is now rank"; a refusal shows its reason in a red toast.

### Member profile dialog

A 440px card over the page with no dimming: initials, name, role and team; "View analyst scorecard" (hit rate, average return, average alpha, pitches, votes cast, notes, calls by ticker); competition trophies if any; Contact; Sector coverage chips if any; Reports to; up to eight direct reports for executives and PMs; a message box with Send (not on one's own profile).

### States

- Loading: grey bars in place of the tape, figures, chart and roster. The first-load skeleton shows a title block the page does not have.
- Empty: a filter with no matches reads "No desks to show."
- Error: there is none. A failed load draws zeros, N/A and empty sections.
- Non-member: "This page is for organizational members only."

### Tablet and phone

Under 1000px the roster goes to one column. Under 720px the tape scrolls sideways and the "reports to" column is hidden. The Radial circle stays 560px wide. Nothing else adapts.

## 3. What the user can do

- Switch the chart layout; turn the committee overlay on and off; filter the roster by rank group
- Open a member's profile, scorecard and trophies; send them a direct message
- Change a member's rank (table below)
- "Add member": goes to Assignments (wrong destination)
- In the code with no control on any page: set a member's title, manager, term dates and graduating marker, and assign the sectors a member covers. The save path exists, limited to executives and PMs, but no screen uses it.
- Done elsewhere: invite, move or deactivate a member (Settings, executives only); create, rename or delete a sector team (Settings, executives and PMs); set a new member's title, manager and mentor (Recruiting).

Who can change a rank:

| Viewer      | Whose rank they can change                                                                                         | Ranks they can give                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| President   | Anyone except themselves                                                                                           | Any, including a successor President |
| Anyone else | Only members ranked strictly below them who are in their reporting line (at any depth) or on their own sector team | Only ranks below their own           |
| Everyone    | Never their own                                                                                                    | N/A                                  |

The ten ranks, top to bottom: President, Vice President, Executive, Senior Portfolio Manager, Portfolio Manager, Junior Portfolio Manager, Senior Analyst, Quant Trader, Analyst, Junior Analyst. Each rank belongs to one of three role groups (executive, portfolio manager, analyst) that gate features across the app. A rank change also updates the role group, the permission level when it was still the default, and the title unless a custom one was set. Each change is logged with who made it.

## 4. Data we have

| Field                                                          | What it means                                                                   | Public source            | Freshness                      | Missing for                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ | ------------------------------ | ------------------------------------------------------------------ |
| Member name                                                    | Display name                                                                    | Council roster           | On load                        | "Unnamed" when blank                                               |
| Rank and role group                                            | One of ten ranks in three groups                                                | Council roster           | On load and after a change     | Falls back to the role group                                       |
| Title                                                          | Custom title such as "Head of Research"                                         | Council roster           | On load                        | Optional; rank name shown instead                                  |
| Sector team                                                    | The team a member sits on                                                       | Council teams            | On load                        | Members with no team                                               |
| Reports to, and direct reports                                 | The member directly above; those below                                          | Council roster           | On load                        | Unclear how often it is filled                                     |
| Sectors covered, with a primary marker                         | Which of the eleven standard market sectors a member covers                     | Council coverage records | On load                        | Shown only in the profile dialog. Empty unless set outside the app |
| Term start, term end, graduating marker                        | Tenure and handover                                                             | Council roster           | On load                        | Loaded, never shown; unclear how often they are filled             |
| Whether the viewer may re-rank each member, and to which ranks | Edit rights                                                                     | The rules in section 3   | On load                        | None                                                               |
| Investment committee membership                                | Executives and PMs                                                              | Derived from role group  | On load                        | None                                                               |
| Team value and team return on cost                             | One team's sleeve                                                               | Fund book                | Prices as of the last US close | Return is N/A for a team with no cost basis                        |
| Fund total value and return                                    | Whole fund                                                                      | Fund book                | Same                           | N/A with no positions                                              |
| Counts: members, teams, leadership, vacancies                  | Summary figures                                                                 | Derived                  | On load                        | None                                                               |
| Analyst scorecard                                              | Hit rate, average return and alpha, pitches, votes cast, notes, calls by ticker | Pitch and vote records   | When the profile opens         | Members with no pitches                                            |
| Competition trophies                                           | Placement, competition name                                                     | Competition records      | When the profile opens         | Members with none                                                  |
| Rank change log                                                | Who changed whom, from and to, when                                             | Recorded on every change | On change                      | Stored and readable by members, shown nowhere                      |

## 5. Data we do not have

Do not design around these.

- Photos. Members are initials only.
- Email, phone, major, year of study or biography. The Contact line always reads N/A here.
- A faculty advisor role. Advisors are executives in the data.
- University-specific rank names. The page knows only the ten fixed ranks plus a free-text title.
- A target head count, open seats to fill, or a hiring plan per team. A "vacancy" is only a team with no members.
- Workload, attendance or online status; per-member returns beyond the scorecard.
- Secondary coverage: every coverage record the app saves is marked primary.
- Drag and drop between teams.

## 6. Must keep working

- Every active member can read the chart; inactive members and alumni never appear.
- The rank rules in section 3, enforced on the server, the change log, and the role group, permission level and default title staying in step.
- A profile from any person: scorecard, trophies, reporting line, direct reports, direct message.
- The investment committee marker: executives and PMs.
- The old /hierarchy address and every inbound link in section 1.
- Team value and return from the one fund book, matching the other org pages.
- The Team Hub shell and the "members only" message.

What the chart feeds on other pages (the redesign must not change these meanings):

| Reads the chart                  | How                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flag routing on the Trading Desk | Covering analyst: the analyst on the latest pitch for the ticker, else the sector's primary covering analyst, else any analyst on the team. Sector head: the team's PM. If neither exists, an executive. The person flagging never chooses |
| Trading Desk views               | PMs see their team's book; analysts see positions in sectors they cover                                                                                                                                                                    |
| Pitch and meeting votes          | Only executives and PMs vote                                                                                                                                                                                                               |
| Assignments                      | A manager also sees work given to direct reports                                                                                                                                                                                           |
| Permission grants                | Only to direct reports                                                                                                                                                                                                                     |
| Feature access everywhere        | Role group and permission level decide who can flag, manage positions and see analytics                                                                                                                                                    |
| Recruiting                       | An accepted applicant's manager and mentor are picked from this roster                                                                                                                                                                     |
| Cohort handover                  | Sectors a graduating member covers need a handoff note                                                                                                                                                                                     |
| Fund Analytics, Command Center   | Coverage gaps and the "Assign sector coverage" setup step count coverage records and link here                                                                                                                                             |

## 7. Problems with the current page

### Design problems

- It breaks nearly every branding rule (centred title block, bordered and filled cards, pill filters, an outlined button, a tracked segmented control, coloured rings, roman numerals) and does not look like the rebuilt Command Center and Trading Desk beside it.
- Members, desks and vacancies are printed twice; team returns appear four times on a page about people.
- Four views of the same people, yet none shows sector coverage, tenure, graduating members or who a flag would route to.
- Four names: Org Chart, Organization, The investment council, Hierarchy.
- The profile dialog has an older look.

### Bugs and gaps

- "Add member" opens Assignments. Still true at this commit.
- Sector coverage cannot be assigned anywhere, though four pages send users here for it and flag routing depends on it.
- Title, manager, term dates and the graduating marker cannot be edited after a member is created.
- A team's "head" is its highest ranked member, so a team of analysts shows no vacancy while flag routing looks for a PM and finds none.
- A PM or analyst with no team, or on the leadership team, is counted but appears in neither chart nor roster.
- A failed load looks like an empty council, with no message or Retry.
- Top desk and Avg desk ROI are always green, even when negative.
- No sample content exists for this page.

## 8. Design rules the mock must follow

The new page must match the rebuilt Command Center and Trading Desk: the same KPI strip, flat sections, text-only toggles, hairline tables and one-line states.

1. Cards are flat: no fill, border, shadow, glow or rounded panel, in dark or light mode. A person in the chart is initials, a name and a rank as text, not a box.
2. Content runs from the Ezana logo's left edge to the logout icon's right edge (x = 32 to 1408 at 1440px). The Team Hub sidebar occupies the left of that span; draw it as it is, start page content 24px after its hairline, end on the right line.
3. Tabs, toggles and filters are text only: emerald text for selected, grey for the rest. No track, pill or underline.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text.
5. Search has no border, fill or focus ring.
6. No page title block, eyebrow, date line, headline, intro sentence or roman numerals.
7. Bootstrap Icons only. No emoji, logos or photos. People are initials.
8. Plus Jakarta Sans for interface text; JetBrains Mono for numbers, tickers, dates and counts.
9. Sentence case. No em dashes.
10. Describe, never advise. Returns are as of the last close; never say "real-time".
11. Dark mode first; light mode must work.
12. Nothing drawn touches text. Chart connectors are grey hairlines that stop short of names. A selected or own row is emerald text only.
13. Side-by-side sections 64px apart, stacked 20px.
14. KPI strip about 48px tall: 12px grey label, 18px mono value, hairlines between cells, page actions on its right.
15. Tables: 11px caps grey headers, hairlines between rows, numbers right-aligned in mono, no zebra.
16. Rank group is said in words; colour alone never carries it. Missing values read N/A and are never coloured as gains.
17. Do not redesign the top navigation bar or the Team Hub sidebar.
18. Only overlays (rank menu, member panel, dialogs) have a solid surface, border, shadow and radius.
19. Every section has a skeleton in its final layout, a one-line empty state with one action, and an inline error with Retry.

| Name            | Dark    | Light   |
| --------------- | ------- | ------- |
| Page ground     | #0a0e13 | #ffffff |
| Primary text    | #f0f6fc | #0f172a |
| Secondary text  | #e2e8f0 | #1e293b |
| Muted text      | #8b949e | #64748b |
| Faint text      | #6b7280 | #94a3b8 |
| Emerald         | #10b981 | #059669 |
| Emerald as text | #34d399 | #047857 |
| Negative        | #ef4444 | #dc2626 |
| Warning         | #fbbf24 | #d97706 |
| Gold            | #d4a853 | #b8922f |

## 9. Open questions for me

Each carries the default that will be used.

1. Build sector coverage assignment here? Default: yes, for executives and PMs, on the existing save path.
2. Let managers edit title, manager, term dates and the graduating marker here? Default: yes, in the member panel.
3. Where should "Add member" go? Default: renamed "Invite members", opening council settings, where invitations live.
4. Keep three chart layouts? Default: one tree plus a roster table. Radial and Columns are dropped.
5. Keep the performance tape? Default: no. Team value and return become two columns in a sector teams table.
6. What counts as a vacancy? Default: a sector team with no PM reads "No sector head", matching flag routing.
7. Show members with no team? Default: yes, as "Unassigned".
8. Show the rank change log? Default: yes, as "Recent changes".
9. Page name? Default: "Org chart" everywhere, no visible title block.
10. Sample content for demo and admin accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Org Chart. Route: /org-team-hub/org-chart. Version: organizational (university student-managed investment funds). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states.

Page-specific asks. First, draw the Team Hub sidebar as it is and do not redesign it; the redesign covers only the page body, which must look like the rebuilt Command Center and Trading Desk. Second, make the structure readable at a glance without boxes. Third, include 4 to 8 features tailored to university investment councils, built only on section 4 data, for example: a coverage map of the eleven sectors with the covering analyst and any uncovered sector, assignable by managers; who a flag routes to for each sector team; teams with no sector head; the investment committee voters; graduating members and term end dates for succession planning; a member panel with rank, manager, direct reports, coverage and scorecard; and recent rank changes. Show how the page differs for an executive, a portfolio manager and an analyst.

Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
