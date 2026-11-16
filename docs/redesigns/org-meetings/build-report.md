# Build report: Meetings (organizational)

Branch `redesign/org-meetings`, commit `9b1e7dd`, worktree `/home/claude/wt/org-meetings`. Not pushed. Route `/org-team-hub/meetings`.

## What was built

Code in `src/components/org/meetings/` (classes `omt-`, plus the Command Center's shared `tcc-` atoms). Rules in `src/lib/org-meetings-model.js` (pure; used by the list loader, the detail and vote routes, the page, the sample bundle and the tests). Sample in `src/lib/org-meetings-sample.js`. List loader `src/app/api/org/meetings/_loader.js` (used by the route and the server page).

1. KPI strip: Next meeting (opens it), Upcoming this term, Awaiting your reply, Quorum at risk (upcoming IC meetings short of voting-member confirmations), Completed this term. On the right: "Sample content" with "Show council data", Recorders (managers; status only, no vendor names, never credentials), New meeting (only with the create events grant).
2. Rail: Upcoming, Past, Term as text tabs; the five categories with counts; term navigator (Spring Jan to Apr, Summer May to Aug, Fall Sep to Dec).
3. Main: a text strip of meetings, 5 at a time with paging (upcoming soonest first, past latest first, "Not closed" in warning for past-dated open meetings), or in Term view the term grouped by category. Then the open meeting: header with Copy link, date, location, category, status, quorum %; Edit details and Mark completed (confirm dialog, cannot be undone) for managers; Your reply; agenda table (add, reorder, remove, saved at once, total minutes); attendees and replies (invite from roster; Present or Absent once the date has passed or the meeting is completed); quorum tracker by role; pre-read pack linking to the pitch in the Pitch Pipeline; committee vote. Completed meetings keep the agenda and show the final count, recording link (managers paste one), documents discussed, and stored notes (read only).
4. Side column: next meeting brief (facts only), waiting on your reply, committee sessions from the Pitch Pipeline (date, status, ballot type, threshold, attached tickers linking to the pipeline; no ballot data), recently completed with "All completed meetings".
5. Dialogs (ds `Modal`, Esc closes): New meeting (Title required, Category, Scheduled time, Location, Quorum % for IC), Edit details (adds Linked pitch), Mark completed confirmation, Recorders.
6. Open meeting, tab, category and term are kept in the address (`?m=<id>&tab=past&cat=ic&term=2026-spring`). A link to a completed meeting opens on Past; an unknown id says so.
7. Loading skeletons in the final layout (route `loading.js` and in page), one-line empty states with one action, inline errors with Retry for the list, the meeting and the side sections.

Sample content: `GET /api/org/meetings/sample` (same gate as the other org pages: `isCommunityDemoViewer` plus membership). 12 meetings in 2026 relative to today for the shared sample council (people and teams from the Trading Desk bundle via the Pitch Pipeline bundle). The first three are the Command Center's meetings with the same ids, titles and days. Committee sessions and pitches are the Pitch Pipeline's. Every action is applied on the page by the model with the server's rules; scripted checks confirm nothing is sent. The bundle holds no other member's choice for an open vote (only the received count).

## Fixes

- Blind ballots on this page: until a meeting is completed, the detail and vote routes return only ballots received, eligible voters, quorum and the viewer's own vote (`meetingBallotView`). No running count, names or choices. Final count after completion. The received count uses `org_meeting_ballot_counts` when it exists and otherwise counts readable rows (same fallback as `gate-context.js`). The database still lets members read every ballot directly; `sql.md` narrows the read policy and splits the `FOR ALL` write policy (which also granted SELECT to managers). Not run.
- Quorum counts only executives and portfolio managers who replied yes or were marked present. The server now refuses a vote after completion or before quorum (409), as well as for non-IC meetings and non-voters (403).
- Fund Analytics "Since last meeting": `sinceLastMeeting` now picks the most recent meeting with `scheduled_at <= now`, ordered by `scheduled_at`, and uses that date; never a future or undated meeting. Exported and tested with a fake client.
- New meeting showed to every manager on first paint (server page had no grant check): the shared loader computes `canCreateEvents` and `canRecordDocuments`.
- Failed saves now say so; errors have Retry; missing times and owners read N/A.

## Defaults taken

Upcoming = not completed (past-dated open ones stay, marked Not closed). Recording is a link only; the source picker (vendor names) is gone and links are saved as a generic link. AI analysis, tone bars, transcription queue and sentiment trend removed (nothing writes them). Attendees are invited from the meeting, not the dialog. Sample times are written for Eastern evening time.

## Left out (no data or section 5)

AI summary and tone, "analysis ready" figure, recording vendor and duration, agenda outcomes, end times, invites in the dialog, PDFs in the pre-read pack, agenda item to pitch links, the "States" annotation strip, Claude Design's nav bar and sidebar edits. The Command Center, home cards and calendar rows still link to the page without a meeting id (other pages, not edited).

## Untested

`npm run build` and the real Next runtime; nothing ran against the database (the loader's new reads of `org_meeting_attendees`, `org_ic_meetings`, `org_pitches` with `updated_at`, the sample route, the vote enforcement, the RPC call). The ballot count after `sql.md` runs. Real clipboard on Copy link. The real navigation bar; touch devices; screen readers.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas`, `test:em-dash`, `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `test:security`, `test:rls`, `test:org-meetings` (new, 11 tests), `test:org-fund-analytics`, `test:org-command-center`, `test:org-pitch-pipeline`, `test:org-a`, `test:org-b`, depcruise on changed folders, eslint (0 errors, 0 warnings) and prettier on changed files. No existing test edited.

Preview (`/home/claude/harness-org-meetings/`): no page errors in 24 states; right edge equals the logout line and `scrollWidth` equals the viewport at 390, 1024, 1280, 1440, 1568 and 1920. 28 scripted checks (`interact.mjs`). Screenshots here as `preview-*.png`.

## Shared files touched

`package.json` (one script), `src/lib/org-fund-analytics.js` (the fix), the meetings API routes. Removed `src/components/org/social2/MeetingMode.jsx` and `meetings2.css` (only this page used them). No shell file edited: none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css or any layout.js. GET `/api/org/meetings` keeps its `meetings[]` shape (fields added, `sentimentTrend` dropped; no other reader found).
