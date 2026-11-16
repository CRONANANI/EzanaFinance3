# Claude Design audit: org Meetings

Project: https://claude.ai/design/p/fc5003e5-f78f-490d-b883-44c86d1476e6 (file "Ezana Meetings.dc.html")

Claude Design's summary (copied from its chat, lightly condensed):

The page appears five times: 1a dark and 1b light, both with the New meeting dialog open,
plus loading (1c), empty (1d) and error (1e) states. The project has no separate "Ezana
Branding and UI Guide", so it audited against the design system's main guide plus the rules
in the brief.

## Changes the audit made

- Logo: the design system only has the pegasus mark, so the Walia ibex is a 40x40 image slot at x=32. Drop the real logo into it.
- Selection styles: the Meetings item in the sidebar is now emerald text with no fill.
- Tabs: Upcoming, Past and Term view lost their underline bar.
- Upcoming meetings strip: lost its underline bar and the vertical rules between meetings; it is now a 5-column grid.
- Categories: the radio circles are gone.
- Show council data: the switch track is now an On / Off text choice.
- Your reply: Yes, Maybe and No were drawn green, amber and red. They now use emerald for the selected choice and muted grey for the others.
- Buttons: Settings, Cancel, the manager controls and Retry are plain text. New meeting and Create meeting are the only filled emerald buttons.
- Dialog fields: the boxes are gone. Invited members are names with a remove icon, no chip boxes.
- Badges: the bell and assignment counts (8+, 4/19) are plain coloured numbers with no badge shape.
- Dialog: it has a page fill and a large shadow so it stays readable, but no border or radius. Per the guide, a dark overlay dims the page behind it.
- Spacing: side-by-side sections are 64px apart and each vertical rule has about 31px clear on both sides. The | separators in meta rows became 24px gaps, because rules with 24px clearance did not fit the centre column's width.
- Icons: all are Bootstrap Icons. The arrow in "View all completed meetings" is now an arrow icon.
- Type: text is Plus Jakarta Sans. Every number, date, time, percentage and ID is JetBrains Mono.
- Sentence case: applied to nav items ("Team hub", "Learning center"), sidebar items, roles ("Portfolio manager", "Faculty advisor"), "Portfolio managers" and "Investment committee vote". "EXECUTIVE" under Noah became "Executive".
- Punctuation: em dashes and spaced dashes became colons, e.g. "HC-001: Biosimilars..." and "INDU: U.S. reshoring". "N/A, this was not..." became "N/A. This was not an IC session." Date ranges keep their en dashes.
- Missing values: the dash placeholders in the agenda Pitch column became N/A.
- Signed values: only change values are signed (tone scores were already +0.62 etc.). Quorum and reply rates stay unsigned.
- Colours: only design-system colour tokens are used. Light mode uses the design system's own light values.

## Things it filled in or simplified

- Agenda recap: the dialog covered its topics and owners in the wireframe, so it filled them in from the meeting summary, using only the wireframe's names.
- Extra terms: Spring 2025 and Spring 2026 were added so the term navigator has somewhere to go.
- Upcoming meetings strip: clicking another meeting only highlights it; the detail always shows Council meeting.

## Notes for stage 3 (stage 2 agent, not Claude Design)

- Several audit choices contradict the repo and its guide and should lose to the guide: the
  sidebar and nav bar are shared and must not be touched (badge and sentence-case changes to
  the nav and sidebar are stand-in artifacts); the dialog should use the ds Modal (overlays
  may have surface, border, radius per section 8 rule 14); "Team hub" / "Learning center"
  nav renames are not to be copied.
- The design still carries data from section 5 of the description (AI summary, tone by role,
  "Analysis ready" KPI, recording vendor and duration, agenda outcomes, attended ticks,
  meeting end times, invites in the dialog, blind status on this page's vote). The
  description wins: see chatgpt-notes.md.
