# Claude Design audit: org Recognition

Project: https://claude.ai/design/p/adb03cf7-9cfe-42ae-8b3b-43fe49d975b4 (board file "Recognition Board", page file "Recognition Page.dc.html").
Board frames: 1a dark mode, 1b dark mode with the award dialog open, 1c light mode.

Summary as Claude Design reported it in chat (it says the full list of 21 changes is in the handoff README):

## What the audit changed

- People and numbers: all names come from the nine-member sample council. Ria Kapoor became Priya Raman,
  Jordan Vale became Tomas Alvarez, Prof. Mehta became Daniel Park. Rated members reads 8/9, provisional
  3/9, auto-award coverage 8 members.
- Badges: only the six real types. Best Pitch became Best Call, Collaboration became Analyst of the
  Month, Research Impact became Best Deep Dive, Execution became Clutch Contributor. The first Latest
  recognition row now goes to Selam Haile, matching her scorecard.
- Tiers and labels: letter tiers became words (Senior Analyst, Analyst). "Bench return" became "Market
  return", with a note that excess return is against the broad market. Short labels spelled out
  ("Council percentile", "All funds percentile"); "Δ rating" became "Change".
- Casing and symbols: sentence case everywhere (tabs, table headers, sidebar, nav). Every em dash and
  missing value reads N/A. Percentages signed; numbers and tickers in JetBrains Mono.
- Controls: tabs and the council data toggle are text only, emerald when selected. Award and Award
  badge are the only solid buttons. Initials circles removed from table rows. Team hub turned emerald,
  Sonar kept as a filled pill, logout red. Every icon switched to Bootstrap Icons.
- Spacing: sections 64px apart with 32px clear each side of every vertical rule. Content runs x=32 to
  x=1408. Cards and the dialog flat; colours only from the design system. Light mode gold uses the
  darker system gold.

## Where it differs from the wireframe (Claude Design's words, summarised)

- The "Sample content / Show council data" control sits under the action buttons, because six KPIs plus
  the actions did not fit one row at 1440px with the required spacing.
- The design system has no Walia ibex logo, so a stand-in mark is used (do not copy the nav bar).
- Sample names, numbers and tickers are tagged as sample in code; the only visible marker is the
  "Sample content" label.
- Claude Design said its own screenshots timed out, so it had only partly checked the right-hand
  columns when it reported.

## Notes for the build (mine)

- Claude Design changed the sidebar and nav to sentence case ("Team hub", "Command center"); the real
  shell is shared and must not be edited.
- "Dialog is flat" conflicts with the rule that overlays have surface, border, shadow and radius;
  follow the branding guide (Modal from the ds library).
