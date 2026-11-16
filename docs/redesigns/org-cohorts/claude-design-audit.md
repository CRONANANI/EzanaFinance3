# Claude Design audit: org Cohorts

Project: https://claude.ai/design/p/7a7b6bdc-433f-4411-9e9f-54e6079610a4 ("Ezana Cohorts page redesign").
Board file "Cohorts Redesign.dc.html", artboard 1g "Audit against the Ezana Branding and UI Guide".
The chat summary said 32 items; the artboard actually lists 35 (transcribed from screenshots).

Artboards: 1a full page dark 1440; 1b applicant evaluation dialog dark; 1c graduate class
confirmation dark; 1d full page light; 1e / 1f the two dialogs in light; 1g audit list.

## Shell and canvas

1. Replaced the wireframe top bar with the production navigation bar: Walia ibex logo (54px), bell with 9+ count, checklist 4/19, Team Hub (current, emerald text), Research, Trading, Sonar as a filled emerald pill, Watchlist, Learning Center; profile, settings and a red logout icon. 64px tall with one hairline.
2. Replaced the Amina Cole block with the Team Hub sidebar (TeamHubSidebar): invented member Lena Marsh, Executive. 200px column, Bootstrap icons from team-hub-nav, counts as plain mono numbers, Cohorts marked current by emerald text only, Team Permissions in its accent colour.
3. Set the envelope to x=32 to x=1408. Sidebar text starts on the logo line; the last table column, right-hand notes and the primary buttons end on the logout line. Table first and last cells carry no outer padding.
4. One full-height hairline between sidebar and page, and between the roster table and the Selected member column, each with 24px of clear space on both sides.
5. Side-by-side sections (Source conversion and Application form, Onboarding tasks and gate status, Placement destinations and Alumni detail) now sit 64px apart.
6. All cards are flat: transparent ground, no border, shadow or radius. Hairlines use text-primary at 8% instead of the emerald-tinted borders in the wireframe.

## Controls

7. Show council data switch (track and knob) became a text toggle, Show / Hide, with the selected option in emerald text. The council is labelled Sample council data.
8. Cohort selector, filters (statuses, sectors, roles, classes, industries, engagement) and the Table / Grid toggle are text only. The glyph caret was replaced with bi-chevron-down. Table / Grid now switches the roster view.
9. Tabs are text only with emerald for the selected tab and no underline bar. Counts are mono, 8px from the label. Tabs scroll to their section in this concept.
10. Search members is borderless with bi-search and no outline or focus ring.
11. One solid emerald primary per group: Graduate class, Add applicant, Add task, Submit rubric. Add task was emerald text in the wireframe and is now the group primary.
12. Every other button is plain text that turns emerald on hover: New cohort, Set as current, Funnel, Form builder, Task settings, Print placement summary, Mark on leave, Begin graduation, Edit placement, Save draft, Advance, Send offer, Cancel, Retry. Mark on leave and Begin graduation were emerald in the wireframe.
13. Destructive actions (Depart, Reject, Graduate anyway) are text in the negative colour and confirm in a modal.
14. Blind screening on and Gate enabled are text toggles in emerald (selected). Gate enabled was amber, which is reserved for warnings.

## Dialogs

15. The applicant evaluation panel and the graduation dialog were inline panels. Both are now ds Modal overlays (bg-secondary, border-primary, radius-lg, shadow-xl, header with title and bi-x-lg close, footer hairline) over the page dimmed with bg-overlay, drawn as separate artboards.
16. Rubric footer: Advance, Send offer and Reject on the left as text; Save draft as text and Submit rubric as the one primary on the right.
17. Graduation footer: Cancel as text, Open Research Library as a text link, Graduate anyway as negative text.
18. With the evaluation panel removed from the page, the candidate pipeline spans the full content width.

## Type, numbers and copy

19. Plus Jakarta Sans for all text and JetBrains Mono (tabular) for every count, rating, score, date, fraction, percentage and applicant ID. Cohort names such as 2026 analyst class stay in sans because they are names.
20. KPI values are 18px JetBrains Mono 600. KPI labels changed from caps to 12px grey sentence case, per the guide.
21. Section headings (Roster, Recruitment, Onboarding, Alumni) at 22px 700; card titles at 18px 700. Table headers 11px caps, 600, 0.08em, grey.
22. Top destination reads Tied with the caption 3 industries, 1 alumnus each, in place of N/A · Tied. N/A is kept for the case with no placements.
23. Missing values read N/A in mono (Elena Rossi rating, A-014 rubric average, Noor Rahman rating and employer).
24. Term note set as Academic year 2026-27 with no en or em dash.
25. Unicode glyphs replaced with Bootstrap Icons: bi-check-lg (published, ready), bi-exclamation-triangle (missing, blocked, warnings), bi-arrow-right (links), bi-arrow-up (sort), bi-plus-lg (add), bi-lock (gate, locked notes).
26. Warnings carry an icon and words, never colour alone: Onboarding blocked 1, Blocked from first pitch 1, Missing handoff.

## Rows and states

27. Row hover is a text colour change only (to emerald), 0.15s. No wash and no accent bar. The selected roster member and selected alumnus are emerald text.
28. Provisional moved under the rating as a small amber word, without the leading separator.
29. Loading, empty and error states drawn for all five sections. Loading uses skeleton bars in each table's final column grid; empty is one line and one action; error is an inline message with an icon and Retry.
30. Light mode built from the same tokens (light-mode scope). Emerald text uses emerald-hover, which resolves to the guide's emerald-text values in both modes.

## For the owner to review

31. Guide 9 asks for a faint wash on table row hover; this brief asked for text colour only, which was followed.
32. Guide 21 builds destructive confirms with variant danger (solid red). Graduate anyway is red text here to keep one emerald primary per group.
33. Conversion and completion rates are shown unsigned because they are rates, not changes. Signed percentages are reserved for deltas.
34. Sample data check: Jordan Vale has 8 pitches, below the 10 needed for a non-provisional rating, but the frozen rating is not marked provisional.
35. Primary button text uses the literal white, as ds.css does; there is no on-accent token. Hairlines are color-mix of text-primary because the canvas rule token is not in the token list.

## My observations from the screenshots (Claude, not Claude Design)

- Item 20 says KPI values are 18px mono, but on the rendered board the KPI numbers (7, 18, 1, 4; 87%; Applied 18 etc.) look like Plus Jakarta Sans. Build them in mono per the guide.
- The roster's first row (Amara Tesfaye) is drawn entirely in emerald as the selected row; the alumni first row (Ria Kapoor) likewise.
- Jordan Vale's frozen rating should get the Provisional marker (or 10+ pitches) in the build's sample data.
- In the build use --btn-primary-fg and --ez-rule / --ez-rule-subtle instead of the literal white and color-mix (item 35).
