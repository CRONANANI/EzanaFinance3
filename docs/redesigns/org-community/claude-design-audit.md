# Claude Design audit: org Community

Project: https://claude.ai/design/p/47f83361-62b0-47d0-80ff-bd1d52f7b1e8 (file Community.dc.html,
2 pages). Frames: 1a dark (clickable), 1b light, 2a to 2d the four dialogs, 3a to 3c loading,
empty and error states per section. Copied from Claude Design's chat summary (16 November 2026).

## Changes the brand audit made (Claude Design's list)

1. Removed the Ezana wordmark beside the logo.
2. Lined all content up from x=32 to x=1408.
3. Removed the underline under the Feed tab. Selected items are emerald text only.
4. Turned the Show council data switch into a text On/Off toggle.
5. Removed the box around the Sample content label.
6. Took the borders off the Attach a pitch selector and the post text field, and made the
   checkboxes text toggles.
7. Changed the 9+ and 6/19 nav badges to plain mono text.
8. Removed the filled circles behind initials.
9. Switched every icon to Bootstrap Icons, including arrows that were typed as text.
10. Removed the em dashes from all four post titles; they use colons now.
11. Set every number, date, time and ticker in JetBrains Mono, with KPI values at 18px.
12. Set 64px between side-by-side sections, so each vertical rule has 32px of clear space on
    both sides.
13. Row hover now only changes the title colour.
14. Made the dialogs the only elements with a surface, border, shadow and radius.
15. Each group has one emerald button, and Cancel is plain text.
16. Removed the state examples strip and put those states into their own sections.
17. Missing values show N/A, and returns are signed.
18. Colours come only from design system tokens.

## Things Claude Design flagged to fix or decide

- Missing token: no primary button text token in the design system. It used the page
  background colour as a stand-in and suggests adding a primary foreground token. In the repo
  the guide's token is --btn-primary-fg: use that (white text), not the stand-in.
- Logo: the design system only has a pegasus mark, so the canvas shows a pegasus at x=32. The
  real navigation bar (ibex) is shared and must not be rebuilt; ignore Claude Design's bar.
- Gold award: drawn in gold as asked; the design system reserves gold for the Partner app.
  The description allows gold as text or icon colour for a gold award.
- Icons: the design system names Lucide; Bootstrap Icons used as asked.
- Invented copy: the New post dialog hid part of the wireframe, so it wrote two of the four
  "This week in the council" items (3 events coming up, 7 members active) to match the KPIs,
  and finished the cut-off NVDA and HCA post text, including a "Votes: 4 of 9" line.

## Reviewer notes (mine, for the build)

- The audit turned the Show council data switch into a text On/Off toggle and the New post
  checkboxes into text toggles. Fine under the guide.
- Post titles, ticker lines, "Attach a pitch", Pin and Remove are still drawn. Per the
  description, council posts are text, type and team tag only today; titles, pinning and
  removal need the database change in sql.md and must read "not available yet" until it is
  applied. The description wins over the design.
- Other councils are drawn with percentage returns; Council Rankings carries an overall
  rating and tier, not a return. Show the rating.
