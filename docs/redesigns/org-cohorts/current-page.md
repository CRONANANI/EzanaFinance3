# Ezana Cohorts page (organizational): how it works today

Page: Cohorts. Version: organizational (university student-managed investment funds). Route: /org-team-hub/cohorts (one route, four tabs, no sub-routes; alumni is a tab here). Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run; screenshots are supplied separately.

## 1. Summary

A cohort is one analyst class or term of an investment council: a name ("Class of 2028"), a term type (semester, quarter, year), an entry term, an expected graduation term, a status (recruiting, active, graduating, alumni, archived) and a "current" flag held by one cohort at a time. The page follows a class from recruiting, through onboarding and the roster, to graduation into an alumni record.

- Who uses it: executives and the faculty advisor (create and graduate classes), portfolio managers (recruiting, onboarding, roster changes, alumni updates), analysts (read; they can score an applicant).
- Decisions: who to admit, who may pitch, whether leavers handed over coverage, where graduates went.
- How they get there: the Team Hub sidebar link "Cohorts", shown to executives only, with a count of applicants awaiting a decision. Any member can open it.
- What they do next: the Org Chart (successors), Assignments, the Research Library (handoffs), settings (invites, set current).
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon-and-text links beside one hairline, already redesigned and live. This redesign covers only the page body to its right.

| Action                                                                           | Analyst                            | Portfolio manager | Executive, advisor |
| -------------------------------------------------------------------------------- | ---------------------------------- | ----------------- | ------------------ |
| Read cohorts, roster, onboarding, alumni                                         | Yes                                | Yes               | Yes                |
| See applicants                                                                   | Only ones they scored              | Yes               | Yes                |
| Score an applicant                                                               | Yes                                | Yes               | Yes                |
| Add applicants, move stages, accept and create the member, form, blind screening | No                                 | Yes               | Yes                |
| Onboarding tasks, mentors, lifecycle status, alumni placement                    | No                                 | Yes               | Yes                |
| Tick an onboarding task                                                          | Own only (server rule, no control) | Anyone's          | Anyone's           |
| Create, graduate (archive), rename a cohort, set current                         | No                                 | No                | Yes                |

## 2. What is on the page today

Desktop, top to bottom, right of the sidebar.

**Header.** Eyebrow "People", title "Cohort" (singular; the sidebar says "Cohorts"), an intro. On the right, the cohort selector: a pill with name, coloured status chip and chevron. Its menu lists every cohort, newest first, with a tick on the chosen one, then "New cohort" (executives), "Graduate [name]" in gold (executives, not archived), "Track record" (archived cohorts only).

**Tabs.** Roster (default), Recruitment, Onboarding, Alumni, each with an icon and a count that appears only once the tab has been opened. The page opens on the current cohort; Recruitment switches to the recruiting cohort unless the user picked one by hand.

**Roster tab.** Tiles: Active, Retention (share not departed), Avg rating (mean Ezana Rating, provisional excluded), Sectors covered. Name search, status, sector and role dropdowns, a grid or table switch. Grid: cards with initials, name, title, status chip, rating, pitches, sectors, join date. Table: Name, Role, Status, Rating, Pitches, Joined (sortable). The member panel (460px): status, rating ("prov." if provisional), pitches, sectors, mentor, departure. Managers get Promote to active, Mark on leave, Return to active, Begin graduation (gold), Depart (red, reason asked in a browser prompt). Empty: "No members in this cohort yet." with "Go to Recruitment".

**Recruitment tab.**

| Element          | Detail                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tiles            | Applicants, Interviewed, Offers, Yield (accepted over offers).                                                                                                                                                                                                                       |
| Toolbar          | Blind screening switch (names, schools, files hidden until Interview; managers), Funnel and Form builder (scroll down), Add applicant (managers).                                                                                                                                    |
| Board            | Applied, Screened, Interview, Pitch, Offer, Accepted, with counts. A card: initials, name or "Applicant XY" when blind, program, year, average star score, Resume and Pitch chips, "2 of 3 in". Opened, not dragged.                                                                 |
| Archive lanes    | Rejected, Declined, collapsed, with reasons. A rubric summary shows one applicant the page picks.                                                                                                                                                                                    |
| Funnel           | Bars per stage; table by source: Applied, Accepted, Conversion.                                                                                                                                                                                                                      |
| Form builder     | Open or Closed, blind screening, fields (text, dropdown, file, ticker), a "public link".                                                                                                                                                                                             |
| Applicant dialog | Details, files, answers; the viewer's rubric (Technical, Communication, Culture fit, Prior experience, 0 to 5, notes; Save draft, Submit); others' notes locked until the viewer submits. Managers: Reject, Declined, Schedule interview, Advance, Send offer, Accept and provision. |
| Provision dialog | Title (default Junior Analyst), Reports to, Mentor. Creates the account, puts the person in this cohort as onboarding, emails a set-password link.                                                                                                                                   |

**Onboarding tab.** Tiles: Enrolled, Avg completion, Fully onboarded, Blocked (amber). A warning line when the gate is on. "Task progress": tasks with a gate chip, done over total, a bar, "Who is outstanding", remove; managers add tasks. "Members": "3 of 5", blocked, mentor and "account pending" chips, a checkbox per task (managers). "Mentor pairing": a dropdown per new member and mentees per senior.

**Alumni tab.** Tiles: Total alumni, Placement rate, Top sector, Engaged. A gold banner "[N]% placed in finance within 6 months" with counts by destination (Investment Banking, Private Equity, Asset Management, Consulting, Other, Undisclosed) and "Export PDF" (prints it). Industry and engagement filters (Guest speaker, Mentor, Recruiter, Donor). Cards: name, term, former role and sectors, current role at employer, frozen final rating and pitches, engagement chips. The alum panel: frozen scorecard, coverage; managers edit employer, industry, role title, profile link, placed within 6 months, engagement. Empty: "No alumni yet."

**Dialogs.** New cohort: Name, Term type, Entry term, Expected graduation, gate checkbox. Graduate: if a flagged member covers a sector with no published handoff document it stops, lists member and sector, and offers "Graduate anyway" (red). Track record: Fund value, Hit rate, Avg alpha, Positions, roster, pitches (Ticker, Decision, Return, Alpha).

**States.** The route skeleton shows a board, not the Roster. Tabs show "Loading roster...". Errors are one line, no Retry. No cohorts: "No cohorts yet." with "Create the first cohort" for executives. No toasts; some failures use browser alerts.

**Tablet and phone.** Under 1024px two per row and the board scrolls sideways; under 900px the sidebar moves above; under 640px one per row.

## 3. What the user can do

- Switch cohort and tab; search, filter, sort the roster; grid or table; open a member, change status, record a departure
- Add, score, advance, reject, decline, accept and provision applicants
- Build, open or close the form; switch blind screening
- Add or remove onboarding tasks, mark gates, tick tasks, pair mentors
- Filter alumni, edit placement, print the banner; executives create, graduate, open a track record
- In the code with no control here: rename a cohort or change status, terms or gate; set current (settings only); an analyst ticking their own task; a manual alumni record; editing graduation term.
- Not possible anywhere: moving a member between cohorts. The cohort is set when an invite that names one is accepted, or when an applicant is provisioned.

## 4. Data we have

| Field                                                             | Meaning                                                           | Source                | Freshness     | Missing for                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------- | ------------- | -------------------------------------------------------------- |
| Name, term type, terms, status, current flag, gate, archived date | The class                                                         | Executive             | On load       | Terms optional; status changes only at creation and graduation |
| Member name, role, title, joined                                  | Roster                                                            | Council records       | Tab open      | Members with no cohort                                         |
| Lifecycle status, departure date and reason                       | Onboarding, active, on leave, graduating, alumni, departed        | Managers              | After action  | Reason optional                                                |
| Ezana Rating, provisional flag                                    | Council score, starts at 1,250, provisional under 10 rated ideas  | Resolved pitches      | Tab open      | Unrated (N/A)                                                  |
| Pitches, sectors, mentor, mentees                                 | Activity, coverage                                                | Council records       | Tab open      | Can be zero                                                    |
| Applicant details, stage, reason                                  | Recruiting                                                        | Manager entry         | Tab open      | Hidden when blind                                              |
| Resume and pitch links, form answers                              | Application                                                       | Stored                | Dialog        | Usually empty                                                  |
| Rubric scores, notes, average star                                | Four criteria, 0 to 5                                             | Interviewers          | Dialog        | Before submission                                              |
| Onboarding tasks, gate, completion, blocked                       | Who has done what                                                 | Managers, submissions | After action  | None                                                           |
| Alum former role, sectors, graduation term                        | Who graduated                                                     | Frozen                | Tab open      | None                                                           |
| Final rating, final pitches                                       | Frozen once                                                       | Calculated            | Fixed         | Unrated                                                        |
| Employer, industry, role, link, placed in 6 months, engagement    | Placement                                                         | Manager entry         | After save    | Until entered                                                  |
| Stats on every tab, funnel, destinations                          | Counts and rates listed in section 2                              | Calculated            | Tab open      | N/A when empty                                                 |
| Archive snapshot                                                  | Fund value, hit rate, alpha, positions, pitches, roster, outcomes | At graduation         | Fixed         | Not yet graduated                                              |
| Handoff check                                                     | Sectors of graduating members lacking a published handoff         | Research library      | At graduation | None                                                           |

Not shown: rating tier, member team, cohort dates.

## 5. Data we do not have

Do not design around these.

- A public application page. The form shows a link, but nothing exists there and nothing receives submissions.
- Resume uploads, photos, interview dates, interviewer assignment, applicant emails.
- A history of stage or status changes, or time in stage.
- Return, alpha or hit rate by class. The snapshot is the whole fund at that moment.
- Rating history or class averages over time.
- Successors: no field, no automatic promotion or coverage reassignment (done by hand on the Org Chart).
- Alumni across all classes in one list, alumni contact details, events, donations.
- Per-member graduation date, major, grades, class targets.
- Sample content. This page has none for demo accounts today.

## 6. Must keep working

- Members only; others go home. The role rules in section 1, enforced by the server.
- The cohort selector, default cohort per tab, a hand pick sticking.
- One current cohort. It feeds the cohort label beside the Command Center KPI strip; the term on Assignments (new work is stamped with it, "Term completion" compares it with the prior cohort, the workload table has a row per cohort, a whole cohort can be an assignee); and new grades and fund reports.
- The Org Chart marks any member flagged graduating "Graduating" with their term end. "Begin graduation" here sets that flag.
- Graduation: executive only, handoff check and override, fund snapshot, freezing each graduate's Ezana Rating and pitch count, members becoming inactive alumni, the cohort archived and no longer current, the audit log entry.
- Recruiting: stages, server-side blind screening, independent scoring with locked notes, accept and provision with welcome email.
- Onboarding tasks are assignments; ticking records a submission; the gate blocks a first live pitch.
- Departure deactivates a member. Alumni editing, the banner, settings (invites naming a cohort; create, set current, archive), the sidebar count, Esc closing dialogs.

## 7. Problems with the current page

Design problems:

- An eyebrow, title and intro sentence open the page.
- Everything is boxed: tiles, board columns, cards, panels, filled chips, outlined buttons, a selector pill, a tracked switch, bordered dropdowns.
- Creating and graduating a class hide in the selector menu; graduation shows no list of who graduates.
- Four tiles per tab, no single view of the class; Recruitment stacks five blocks in one column.
- Alumni opens on the current class, which has no alumni yet. Nothing shows which cohort is current.
- Gold marks graduation; the guide reserves it.

Bugs:

- The sidebar link is hidden from portfolio managers, who hold most rights here.
- A new cohort becomes current at once, moving the Command Center label and Assignments term to a recruiting class.
- Graduation takes every flagged member in the council and files them under the chosen cohort.
- A member flagged on the Org Chart still reads "Active" on the roster, yet graduates.
- Onboarding lists every onboarding member of the council under any cohort; ticking one from another class fails.
- Archiving in settings skips the handoff override.
- The "public link" leads nowhere; the skeleton is wrong.
- Counts blank until a tab opens; nothing in the address.
- Browser prompts; no Retry; "pending" instead of N/A.

## 8. Design rules the mock must follow

Match the rebuilt Command Center, Trading Desk, Fund Analytics and Assignments pages: one compact KPI strip with page actions on its right, flat sections, text tabs, hairline tables, one-line states, a small "Sample content" label with a "Show council data" switch, and the same sample council (analysts Amara Tesfaye, Mikael Bekele, Elena Rossi; portfolio managers Selam Haile, Chidi Okoye, Ingrid Lindqvist, Daniel Park; teams Financials, Healthcare, Technology, Industrials; cohorts "2026 analyst class" and "2025 analyst class"). Invented names only.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode, including board columns, rows and stat cells.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). Page content starts 24px after the sidebar's hairline and ends on the right line.
3. Tabs, cohort selector, view switches and filters are text only: emerald when selected, grey otherwise. No track, pill, underline or bordered dropdown.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search has no border, fill or focus ring.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, logos or photos. People are initials.
8. Plus Jakarta Sans for text; JetBrains Mono for every number, date, rating and count.
9. Sentence case. No em dashes. Describe, never advise. Never "real-time".
10. Dark mode first; light mode must work.
11. Nothing touches text; vertical rules keep 24px clear; sections 64px apart side by side, 20px stacked.
12. KPI strip: about 48px tall, content width, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
13. Tables: 11px grey caps header over a hairline, hairlines between rows, numbers right-aligned.
14. Status is text with an optional icon, never a filled chip; blocked and departed carry a word and icon.
15. Missing values read N/A. Changes are signed. No figure without data from section 4.
16. Only overlays have a surface, border, shadow and radius. Draw the real bar and sidebar unchanged.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Show the link to portfolio managers? Default: yes, listed as a shell change, not made in this build.
2. New cohort becomes current at once? Default: no; a separate "Set as current" for executives.
3. Limit graduation to the chosen cohort? Default: yes, with a preview of who graduates.
4. Limit Onboarding to the chosen cohort? Default: yes, a bug fix.
5. Alumni across all classes? Default: yes, "All classes" first, with a class filter.
6. Move a member between cohorts? Default: yes for managers if existing rules permit; otherwise listed as left out.
7. Form builder with no public page? Default: keep fields, drop the link, say managers enter applications.
8. Cohort and tab in the address? Default: yes.
9. Gold for graduation and alumni? Default: no.
10. Sample content for master admin and demo accounts? Default: yes, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Cohorts. Route: /org-team-hub/cohorts. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Show the page as an executive sees it, respecting the role table in section 1, and draw the member panel, the applicant dialog with its rubric, and the graduation dialog with its handoff check. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a class overview strip naming the current cohort, a graduation readiness list (who is flagged, sectors covered, handoff published or missing), a recruiting funnel with source conversion, an onboarding gate tracker showing who is blocked from a first pitch, mentor load by senior, a roster ranked by Ezana Rating with provisional ratings marked, and an alumni placement summary by destination. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
