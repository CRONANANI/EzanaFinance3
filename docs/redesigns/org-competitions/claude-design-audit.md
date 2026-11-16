# Claude Design audit: org Competitions

Project: https://claude.ai/design/p/6a1c068a-fa58-4a0c-8309-d88f6670c0d7 (file "Org Competitions.dc.html", 2 pages: 1a dark, 1b light). Copied from the Claude Design chat summary on November 16, 2026.

## Notes Claude Design flagged

- The design system only has the pegasus logo, not the Walia ibex; it used the pegasus at x=32. (Build: never copy Claude Design's nav bar; the real one stays untouched.)
- The Team Hub sidebar is not drawn; content spans x=32 to x=1408 of the full 1440 width. (Build: the real shell and sidebar stay; the page body sits to its right.)
- The design system has no "Branding and UI Guide" document, so it audited against the rules in the brief plus the token file.
- It left out the wireframe's bottom notes block (Sections shown, Decisions you may reverse, Drawn beyond section 4) as wireframe notes, not page content. This also drops the "Withdraw" idea, which has no data path.

## Changes the audit made

- Westbridge Investment Council is now Sample council everywhere. Hosted event: Sample council investment summit; thesis file: SampleCouncil_NS2026_Thesis.pdf.
- Fund challenges standing has columns challenge, rank of field, return since entry, councils entered, end date. Sample council is 3 of 12 in Sample intercollegiate fund challenge.
- Scores add up to 100 at most. Criteria: thesis 30, analysis 30, presentation 20, Q&A 20. Results 92, 87, 84 (were 104, 98, 96); our breakdown 28/30, 26/30, 17/20, 16/20.
- The Sample council results row is emerald text only, no row fill.
- Judge A and Judge B labels removed from anonymous feedback.
- Circuit deadlines lists four invented external events (Granite Bay Pitch Classic, Harbor Lights Equity Open, Summit Ridge Value Cup, Redwood Analyst Challenge) instead of own entries.
- Workspace title is 20px (section-title size), not a large page title.
- No league table and no prize money anywhere. Council Rankings is a plain link.
- Show council data switch, Recruiting consent switch and New competition format choice are text (On/Off and option names), emerald for selected, no tracks.
- Tabs have no underline bar; selected tab is emerald text.
- Count bubbles (3, 6, 1, 4, 2), Sample content boxes and boxes on nav counts removed; plain text.
- KPI labels sentence case. Values 18px JetBrains Mono in a 48px strip.
- Table headers sentence case in Plus Jakarta Sans (were caps mono). (Build note: the description's rule 9 asks for an 11px grey caps header, which matches the other rebuilt org pages; follow the guide and existing org pages.)
- Every number, date, time, count, score, rank and ticker in JetBrains Mono. Dates read "Nov 18, 2026".
- Em dashes removed: "Live board · Round 1".
- "Ready (4/5)" is now "4 of 5 ready" in amber with an alert icon.
- "#2" is now rank 2 of 8 teams.
- Statuses and stages are text with optional icons; trailing check marks and ellipsis gone; In progress is amber.
- Trophies are neutral Bootstrap icons (were gold, silver, bronze). (Build note: the description's palette allows gold for Winner; decide per the guide.)
- Team Hub nav item emerald instead of purple, gear icon muted; Sonar filled emerald pill; logout red. (Build: do not touch the real nav.)
- Bootstrap Icons only.
- KPI dividers, column rules and breakdown rules have 24px or more clear space; side-by-side sections 64px apart.
- Each Open to join row ends in an Apply or Join text action, as the entry to the Join or apply dialog.
- Wireframe spinner replaced with real skeletons in the final layout; each section has a one-line empty state with one action; inline error with Retry.
- Six dialogs added in the design system's modal look (the only filled surfaces): New competition, Join or apply, Decline request confirmation, Hide results confirmation, Judge scoring link shown once (working Copy action), Edit dates and rules link.
- Colours, radii and shadows use design system tokens only.

## Follow-up corrections (second message, confirmed by Claude Design)

- Withdraw: no Withdraw control existed in the design; withdraw removed from the README's reversible actions with a note that it has no data path today.
- Decline request dialog: Decline request is plain red text beside Cancel, no filled button in that dialog. Hide results stays the one primary in its dialog.
- README data line now says each section loads and errors independently using the app's existing data access (invented endpoints removed).
