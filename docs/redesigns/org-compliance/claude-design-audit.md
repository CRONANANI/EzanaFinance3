# Claude Design audit: Compliance (organizational)

Project: https://claude.ai/design/p/f76ae451-6976-4e3e-ae49-32b4e42867fd (file "Compliance Redesign.dc.html", page component "CompliancePage.dc.html"). Generated 2026-11-16 in about 11 minutes.

Claude Design's summary: one canvas with seven artboards: dark page (1a), light page (1b), Add rule dialog (1c), Resolve breach dialog (1d), loading (1e), empty (1f), error (1g). The full audit list is also in artboard 1i and in handoff/README.md. The page is clickable (role preview, tabs, filters, run check, disable and enable, dialogs open and close).

## Audit changes (as reported by Claude Design)

- Layout: content runs from x=32 to x=1408, with 24px clear after the sidebar rule. Side-by-side sections have a 64px gap with the rule centred. Sections flat, no fill, border, shadow or radius.
- Dialogs: Add rule and Resolve breach moved out of the right column into centred dialogs over a dimmed page.
- Annotations: Role differences and Key states strips are no longer page sections. The role switch changes what each role sees; states are their own artboards.
- Show council data: the switch is now "On" and "Off" as text, selected one in emerald.
- Primary buttons: text is dark on emerald instead of white, one primary button per group.
- Delete: opens a confirmation dialog with a red text action.
- Fields: all borderless. The Reason field starts empty; Resolve breach stays disabled until a reason is entered.
- Headers: table headers in sentence case.
- KPI strip: set to the specified sizes.
- Fonts: every number, date and ticker in JetBrains Mono; status words in Plus Jakarta Sans.
- Missing values: dashes now read N/A or "not evaluated".
- Idea check icons: "breach" and "within" words sit beside the cross and check icons (state not shown by colour alone).
- Icons: all Bootstrap Icons.
- Idea check result: "1 hard and 1 soft rule would be breached. This check saves nothing."
- Resolved history: no longer names who resolved or the reason; says both are new data needed.
- Council activity log: carries a note that rule changes and breach resolutions are not stored today.
- Resolve breach dialog: adds "Storing the reason is new data needed."

## Things Claude Design flagged

- The design system has no Branding and UI Guide and no Walia ibex logo, so it audited against the rules in the prompt and used the design system's existing logo (a pegasus). Do not copy its navigation bar or logo.
- No btn-primary-fg token exists in the design system, so it used the page background colour for primary button text (dark on emerald in dark mode; white on emerald in light mode at about 3.8:1).
- Shell left as drawn: Sonar pill and the all-caps EXECUTIVE sidebar label stay.

## Notes for the build (stage agent, not Claude Design)

- Primary button text: the repo guide wins. Use var(--btn-primary-fg) with var(--btn-primary-bg), not the dark text in the handoff.
- KPI value: 18px mono per the guide, whatever the handoff CSS says.
- "New data needed" notes in the design (resolve reason, who resolved, rule and resolve entries in the activity log) are not to be shipped as live UI; storing a reason needs sql.md and an honest "not available yet" state.
- The "On / Off" text switch for Show council data and the role preview are presentation devices for sample content; check against the other rebuilt council pages for consistency.

## Extra items from the canvas audit artboard (1i), not in the chat summary

- Two-column rows: 64px gutter with the vertical rule centred (32px clear each side). Horizontal rules only between sections.
- Dialog look: radius-xl, border-primary, shadow-xl, bg-overlay behind.
- Add rule selects and value field borderless with a chevron only. Delete confirmation uses a red text "Delete rule" action.
- Row hover is a text colour change only (to emerald).
- KPI strip was bare icons with about 28px values in the wireframe; now 48px tall, 28px tile, 12px label, 18px mono value.
- Rule thresholds (12%, 35%, $5B), heading counts and sidebar counts set in mono; status words and dialog detail text in Plus Jakarta Sans.
- Loading text "Loading compliance data ..." dropped the ellipsis; loading shows skeletons in the final layout.

## Things to watch in the artboards (stage agent's own reading)

- Loading artboard (1e) still shows the idea check fields filled with sample values and a live "Load more"; the build should skeleton or hide those too.
- Error artboard (1g) keeps "Sample content" and the footer line; show the sample label only when sample data is actually showing.
- The activity log sample still shows rule and resolve entries (with a "new data needed" note); the build must not show those as live data.
- The Resolve breach dialog's reason field and "Storing the reason is new data needed." note: ship only with sql.md and an honest not-available state.
