# Design status: org Cohorts

2a, 2b and 2c done.

- 2a: live page https://ezana.world/org-team-hub/cohorts (sidebar link "Cohorts") showed the
  organizational version as expected. Three full-scale screenshots (Roster, Recruitment, Onboarding)
  were sent to ChatGPT. Real member names on screen were replaced locally in the page (display only,
  nothing saved) with invented names before each screenshot.
- 2b: ChatGPT (chat 6af3c68c...) worked 11m 36s and returned a rendered 1440 x 3399 full-page
  wireframe plus an HTML reference it could not hand over here. Seven slices saved as
  wireframe-part1.jpg to wireframe-part7.jpg; text in chatgpt-notes.md.
- 2c: seven fresh full-scale slices re-taken from the final PNG (file preview
  ezana_cohorts_redesign_1440.png in the ChatGPT chat) and uploaded with upload_image to a new
  Claude Design project; generation took about 11 minutes and finished cleanly.
  Project: https://claude.ai/design/p/7a7b6bdc-433f-4411-9e9f-54e6079610a4 ("Ezana Cohorts page
  redesign"). Seven artboards: 1a full page dark, 1b rubric dialog dark, 1c graduate dialog dark,
  1d full page light, 1e / 1f dialogs light, 1g audit (35 items, in claude-design-audit.md).
  Handoff folder design_handoff_cohorts (README.md, cohorts.css, colors_and_type.css, both .dc.html
  files, assets/logo-tight.png); README read in full (87 lines) into handoff-README.md. The CSS and
  HTML source were not transcribed. Screenshots: claude-design-1..14 (*.jpg). No move dialog
  appeared; the "moving December 14" banner was left alone. The permission check gave no verdict
  several times early on; retries after a pause went through. Nothing was refused.
- Caveats for the build: KPI numbers render in sans on the board despite audit item 20 (build them
  18px mono); Graduate anyway is red text (guide 21 says solid danger button, decide per runbook);
  literal white button text and color-mix hairlines should become --btn-primary-fg and --ez-rule;
  Jordan Vale (8 pitches) needs a Provisional marker; sidebar user "Lena Marsh" and the nav bar are
  stand-ins, do not copy; Top destination now reads "Tied" with caption "3 industries, 1 alumnus
  each", N/A only with no placements.
