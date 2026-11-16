# Claude Design audit: Sonar Research (organizational)

Project: https://claude.ai/design/p/8039cbb8-10cb-49ca-bedc-e19f3a6309fa (file "Sonar Research.dc.html", 2 pages: 1a dark, 1b light). Copied from the Claude Design chat on 2026-11-15; wording lightly condensed.

## What the audit changed (as reported by Claude Design)

- All lowercase copy changed to sentence case.
- Page content runs from x=256 to x=1408. The two columns have 32px of clear space on each side of the rule.
- Navigation bar runs from x=32 to x=1408. Sonar is a filled emerald pill and the logout icon is red.
- KPI strip: 28px icon tiles, 12px labels, 18px mono values, hairlines between cells. The tiles sit ABOVE the labels, because side by side the strip and its buttons did not fit in 1152px.
- Sample content switch is now a text toggle, On / Off.
- Underline bars on the tabs and on Fund fit / Open question removed. Selected items are emerald text only.
- Boxes around the comment field, version picker, part selector, dialog title field and visibility menu removed.
- The dialog's radio buttons and checkboxes are now text options, with check icons on the checkboxes.
- Primary button text is DARK instead of white ("white on emerald was too low in contrast"). In light mode the button uses a darker emerald.
- Names in Plus Jakarta Sans. Every number, date, timestamp, version and pitch ID in JetBrains Mono.
- The dash in Challenges is now N/A.
- Check and warning characters replaced with Bootstrap icons.
- Pitch links and the "hardware" collection no longer underlined, except on hover.
- The Sonar answer is an unfilled dashed block labelled "Sonar answer".
- Table header text made lighter (wireframe grey was too low in contrast).
- Delete draft is red text.
- Ellipses removed from "Loading more results" and "Add a comment".

## Two things it asked the owner to decide

- Logo: the design system only has the pegasus logo, so the nav bar uses it in place of the Walia ibex. The README says to swap in the ibex from the codebase.
- Tokens named in the request that the design system does not have: --emerald-text, --btn-primary-bg, --btn-primary-fg, --ez-rule, --ez-rule-subtle. Each was set to an existing design-system value; the README lists them. (They do exist in the app's theme-variables.css, so the build uses the app's real values.)

It also asked: "Do you want screenshots of both modes added to the handoff package?" Not answered (no further messages were sent).

## Follow-up fixes from its own background checks

Round 1:

- Research archive table ran past the column rule into the right column. Its nine columns now have set widths adding up to the 747px left column; report, author, claims and challenges cells can wrap.
- "64 / 100" in the KPI strip was breaking onto two lines; now stays on one. Cell padding slightly reduced.

Round 2:

- Research archive Status column widened to 110px so "Under review" and "Superseded" no longer run into Visibility; other columns narrowed.
- KPI strip cell padding, gaps and button padding tightened so "Run deep research" ends inside x=1408.

The handoff folder's copy of the page carries all four fixes (per Claude Design).

## Notes for the build stage

- Guide wins over the audit on button text: use --btn-primary-fg (the pilot settled this the same way), not dark text.
- KPI tiles above labels conflicts with the KPI strip pattern (icon tile beside label/value, about 48px tall). Follow the live org pages' strip.
- Column gutters: audit used 32px each side of the rule; the guide says 24px clear space beside a vertical rule and 64px between side-by-side sections.
