# Claude Design audit: council Learning Center

Project: https://claude.ai/design/p/c350cdc6-4866-44f5-b6f4-bfb4ce430e8c (frame 4a, "Audit against the Ezana Branding and UI Guide", read from the canvas on screen). Claude Design audited against docs/EZANA_BRANDING_GUIDE.md from the repo because the attached design system does not contain the guide.

1. Council renamed from Ezana Sample Investment Council to Sample council. A Sample content label sits in the KPI row, before Saved courses.
2. Logo is the Walia ibex from the repo (public/waliaibex.png), sized so the glyph is 54px tall and its left edge sits on x = 32.
3. Navigation bar redrawn to guide section 12: notifications bell and checklist icon added after the logo; Team Hub lost its purple fill (plain text, org users get Team Hub in place of Dashboard); the settings gear went from emerald to secondary text; Learning Center is emerald text as the current page; Sonar stays a filled emerald pill; logout uses the negative token and its glyph ends on x = 1408. (Build note: the nav is a stand-in; never copy it. Use the existing navbar.)
4. Council learning tabs: the emerald underline bar under Assigned to me (3) is removed. Selected is emerald text only.
5. Council path step numbers lost their filled grey circles and are plain mono numerals.
6. Explainer lines under Council path, Team progress and Faculty/advisor queue moved into info-icon tooltips (section 4.2).
7. Team progress: the grey skeleton row inside the populated table was removed (it now lives in the loading frame). Number columns are right-aligned, and Learning score ends on the card edge.
8. Grade feedback rewritten to describe what each grade counts: participation counts session attendance and discussion posts; overall combines core concept quizzes and required assignments.
9. Onboarding gate read "2 items remaining" with 2 of 5 tasks done. It now reads 3 and is computed from the checklist.
10. Status words (Due soon, Overdue, Assigned) carry a Bootstrap icon. Overdue keeps its word and adds a warning-token triangle, so colour is never the only signal.
11. Daily quest rewards (+10 ELO, +20 ELO, +5 ELO) changed from emerald to secondary text so no score is coloured green.
12. The partial fill on the Stocks & Investing progress bar was removed: the track is 0 / 31.
13. Every number, date, duration, count in parentheses, year, score and letter grade is JetBrains Mono. Labels and text are Plus Jakarta Sans.
14. Unicode arrows and triangles replaced with Bootstrap Icons (bi-arrow-right, bi-play-fill, bi-diamond-fill with the tier tokens).
15. Course filter field and the Saved (0) toggle are borderless text. Only Start learning and Browse courses are filled; every other button is text.
16. Side-by-side cards are 64px apart with the hairline centred in the gap; KPI and context-strip rules have 24px of clear space on each side.
17. Row hover on every list is a text colour change to the emerald text token. No wash, no accent bar.
18. Hairlines use --ez-rule and --ez-rule-subtle; the primary button uses --btn-primary-bg, --btn-primary-fg and --btn-primary-bg-hover; selected text uses --emerald-text. No raw hex.
19. Design system gap: the attached Ezana Finance Design System (colors_and_type.css) has no primary button text token (--btn-primary-fg), no --emerald-text and no --ez-rule. These were taken from the repo's theme-variables.css and home-canvas.css. Its README also still names Lucide and the pegasus mark, which the guide replaces.
20. Light mode uses the repo's .force-light-theme token scope. Nothing else changes.
21. Token gap: the repo's theme-variables.css has no pill radius token (the attached design system's --radius-pill is not in the repo). The Sonar pill uses --radius-xl (16px), which is more than half its 30px height, so it renders fully rounded.
22. Flagged, not changed: Stocks, Bonds, and ETFs Explained is 12 min in the course list but 15 min in Starter lessons and Recommended for you.
23. Flagged, not changed: Current streak shows 3 days while Active days this week is empty and Best streak is 0 days.
24. Flagged, not changed: LearningELO 128 and network position 128 share a value; confirm they are different figures.
25. No course list is drawn for Silver, Gold or Platinum. Those tabs show one line instead of invented courses.
26. Owner may want to reverse: table headers stay in sentence case as the brief asks, where the guide uses 11px caps.

Also reported in chat after a final check: the board background pointed to a token that does not exist and now uses the page background token.
