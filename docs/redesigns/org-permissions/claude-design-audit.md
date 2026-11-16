# Claude Design audit: Team Permissions (org)

Project: https://claude.ai/design/p/0d18fe12-7210-4e79-a786-ff05e4bd7eda (file Team Permissions.dc.html; artboards 1a dark, 1b light). Transcribed from Claude Design's chat summary, 2026-11-16.

## Things Claude Design flagged first

- Logo: the design system only has the pegasus logo, not the Walia ibex. It used the pegasus at x=32 as a stand-in. (Build: never copy Claude Design's nav bar; the app's real one stays.)
- No primary-fg token in the design system: the Grant access button text uses --bg-primary. In light mode that is white on #059669, about 3.8:1, below 4.5:1 for 14px text. (Build: use the app's --btn-primary-fg per the branding guide.)
- The handoff folder was copied before its background check finished; if that check produced fixes, the handoff copy may be stale.

## Changes the audit made

1. Removed the eyebrow, page title and intro sentence; the KPI strip comes first: 48px tall, 28px icon tiles, mono values, hairlines between cells.
2. Replaced all names with the Sample council: Chidi Okoye viewing, with Amara Tesfaye, Mikael Bekele, Tomas Alvarez and Jonas Weber as direct reports.
3. Rebuilt the matrix with the corrected role defaults and five cell states, each with its own text and icon. View fund analytics, Create events and Approve deliverables never show Grant.
4. Took Upload deliverables out of the matrix as one locked line underneath. Added a one-line key to the five states below it (not in the wireframe).
5. Added "Recipient members (direct reports)" over the member columns; second column called "Description".
6. Member details corrected to Amara as Senior analyst, with her Manage positions extra granted by Chidi Okoye on 2026-10-14. Reference table is for Senior analyst.
7. Analyst view changed to Mikael Bekele with text-only values.
8. Dialog changed to granting Manage positions to Mikael, in the design system's Modal look, Cancel as plain text and Grant access as the only solid emerald button.
9. Sentence case everywhere: "View org chart", "Team hub", "Learning center" and the sidebar items (overrides "View Org Chart").
10. Every em dash replaced with a colon, comma or line break.
11. Show council data switch made text only (On / Off, selected in emerald), no track.
12. Removed pill backgrounds behind the 9+ and 4/19 notification counts (plain mono text).
13. Active Team hub nav item changed from purple to emerald text; profile and settings icons grey; Sonar a filled emerald pill; logout icon red.
14. Every icon switched to Bootstrap Icons; every number, date and count in JetBrains Mono.
15. Side-by-side columns 64px apart, 32px clear space each side of vertical rules. Sections flat, separated only by hairlines.
16. Table row hover changes text colour only.
17. Real loading skeletons in the final layout, one-line empty state with the org chart link, inline error with Retry.
18. Every colour from a design system token, including light mode.

## Notes for the build (agent's, not Claude Design's)

- Nav bar and sidebar labels in the design are stand-ins (pegasus logo, "Team hub" casing); the real Team Hub shell and top nav are not part of this redesign and must not be edited.
- Primary button text: use --btn-primary-fg from theme-variables, not --bg-primary.
- Check the KPI value size in the handoff against the guide's 18px mono.
