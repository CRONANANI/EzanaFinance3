# Build report: Pitch Pipeline (organizational)

Branch `redesign/org-pitch-pipeline`, commit `eeb15f6`, worktree `/home/claude/wt/org-pitch-pipeline` (cut from `8ffb5a2`). Not pushed. Route `/org-team-hub/pitches` (the old `/org-team-hub/pitches/[pitchId]` still redirects into the dialog).

## Blind ballot

### What leaked before

While a committee meeting with a blind ballot was open:

- The IC view's agenda cards drew the running Buy, Pass and Abstain counts. Those counts live on the pitch row (`vote_yes_count` and friends), were rewritten after every ballot, and every list payload that carried pitch rows sent them (board, list, archive, agenda).
- The pitch dialog loaded `fetchPitchDetail`, which returned every ballot with the voter's name, choice and rationale. The dialog printed them, plus the counts.
- The vote GET route masked choices but still sent each voter's name and the fact that they had voted.
- The gate list said "Vote carried: Carried" as soon as Buy led, which is the tally in one word; the advance route's 422 response returned the same gate.
- The weekly digest listed ballots (choice and ticker) from the last seven days, and the analyst scorecard's "votes cast" changed the moment a member voted.

### What is fixed in code (application only, no migration, no change to who may do what)

- `src/lib/pitch/ballot-privacy.js`: one set of pure rules (`isBlindOpen`, `sealPitchRow`, `ballotView`, `sealGates`, `sealPitchDetail`). The server routes, the server page and the sample bundle all go through it.
- `fetchPitchDetail(..., { viewerMemberId })`: for an open blind meeting it returns `votes` = the viewer's own ballot or nothing, `vote_*_count` = null, and `ballot` = `{ sealed, received, eligible, quorum_pct, quorum_needed, quorum_met, own, tally: null }`. A caller that names no viewer gets no ballot at all. Every pitch route now passes the signed-in member (a test enforces it).
- `fetchPitches` seals every row attached to a blind, unclosed meeting, so the board, `GET /api/org/pitches`, the IC meetings agenda and the archive all leave without counts. If the meetings cannot be read, attached rows are treated as sealed.
- `GET .../vote` is now a thin wrapper over the sealed detail. `GET .../gates`, `GET /board` and the advance route's 422 return "Vote carried: Pending, hidden until the meeting closes".
- `castVoteDb` no longer writes the running tally onto the pitch while the vote is blind and open. Closing the meeting (`PATCH /ic-meetings/[id]` to `closed`) writes the tally for every pitch on it.
- The participation count ("N of M ballots received") comes from `countBallotsReceived`, which uses the counting function in `sql.md` when it exists and otherwise counts the rows the member can read.
- Digest and attribution leave out ballots on sealed pitches (if sealing cannot be determined, the digest lists no ballots and votes cast reads N/A).
- After the meeting closes, everything returns in full as before.
- Interface during an open blind vote: "N of M ballots received" and the viewer's own ballot only; agenda items say the pitch type ("Long pitch, at IC vote, 3 of 5 ballots received"); row status reads "Blind ballot open"; the pitch record's Votes column excludes the open vote; the ballot form starts with nothing chosen.
- Tests (`npm run test:org-pitch-pipeline`, 30 tests) drive the real `fetchPitchDetail` and `loadPitchBoard` against an in-memory database client and assert the stripped shape: no other ballot, no voter name or id, no rationale, no counts, own ballot returned, full record after close, open ballots unchanged.

### What still needs the owner (`sql.md`, not run)

The row policy `org members read votes` on `org_pitch_votes` lets any active council member read every ballot directly from the database with their own session (for example from the browser console). That cannot be fixed without a policy change. `sql.md` in this folder holds the change (own ballots always; others' only when no blind vote is open on the pitch), a participation-count function, a check-first query, verification and undo. It also explains one leftover: counts already written on a pitch row before this ships stay there until that meeting closes, with an optional one-line clean-up.

On thresholds (raised by the coordinator from the Meetings description): checked in code. The stored threshold and quorum ARE applied, but at the next step rather than at close: the IC Vote gates (`quorum_met` from `quorum_pct`, `vote_passed` from `threshold`, simple or two thirds of Buy plus Pass) are recomputed by the advance route, and IC Vote cannot be overridden. Closing a meeting decides nothing by itself and nothing advances automatically. The manual decision route (`POST .../decision`, executives) does not check the vote; the page offers it only once the vote is closed. The page shows threshold and quorum as information and does not invent an outcome rule.

## What was built

Code in `src/components/org/pitches/` (classes `opp-`, plus the Command Center's shared `tcc-` atoms). Pure rules in `src/lib/pitch/rules.js` and `board-rows.js`; page model in `src/lib/org-pitch-pipeline-model.js`; sample in `src/lib/org-pitch-pipeline-sample.js` with the shared pitch list `src/lib/org-sample-pitches.js`.

1. KPI strip: Active pitches, In portfolio, Aging over 30 days (warning colour above zero), Archived. Same line: Sample content and its Show council data switch (behaves exactly as on Assignments), Pitch archive, Team Hub, Submit new pitch (the one filled button).
2. Stage strip: All active, the eight working stages and, past a hairline, Rejected and Exited, each with a mono count. It filters both tables; `?stage=` is kept in the address.
3. Awaiting you: each pitch with the viewer's own next step (cast your ballot, sign off, cross-desk review, review a model, log the desk meeting, assign a meeting, advance, complete the thesis, list the deck, record the position, thesis review due), opening the dialog on the tab where it is done.
4. The pitch table: pitch, analyst and desk, stage, gates passed, who moves it on, days in stage, upside (neutral colour; target in the cell title), status as icon and words. Borderless search and an "Aging only" text toggle.
5. Side column: IC agenda (next open meeting, session, ballot, threshold, quorum, eligible voters, agenda items with pitch type and participation, unassigned scheduled pitches, later meetings, Schedule meeting for managers), Aging by desk, Thesis reviews, Approved and ready for the Trading Desk (links to the Trading Desk), Pitch record (pitches, mean alpha, votes cast).
6. Pitch dialog (ds `Modal`): header line; gates of the current stage only, from the same function the advance route runs, with Advance (enabled only when every blocking gate passes, offered only to the roles and tiers `canAdvanceStage` allows), Override with a reason (only where `canOverrideStage` allows, never at IC vote), Reject (manager who can move the pitch), Mark exited (held pitch); tabs Thesis (view and edit), Supporting data, Deliverables (titles, required models with links and Mark reviewed, desk meeting record and log form), Discussion, Review (Screening sign-offs, cross-desk decisions), Voting (meeting, assign, open session, close the vote with a confirmation, results after close), Decision (outcome, Trading Desk hand-off, record outcome after close, hindsight and refresh, 90-day falsification review, falsification condition); ballot column only at IC vote with the session in session; stage history and override notes in the footer.
7. Submit new pitch (ds `Modal`): Identity, Thesis, Deep dive data, Review. Prior pitches on the ticker must be acknowledged; the policy check runs on submit; the onboarding block is reported in words.
8. Schedule meeting (ds `Modal`): date and time, Open or Blind, Simple majority or Two thirds, quorum.
9. States: route `loading.js` and in-page skeletons in the final layout, one-line empty states with one action, inline errors with Retry per section, "Current prices are unavailable right now" (vendor name removed; supporting-data error no longer names the vendor).

Sample content: `GET /api/org/pitches/sample` (new; same gate as the other Team Hub pages). Same sample council and the same 15 pitches Fund Analytics shows (the list now lives in one shared file), plus nine still in the pipeline at every stage; a blind meeting in session with COST on it and three ballots in, an open meeting next week, a closed one in the past. Every row carries `is_demo`. Board rows and pitch details are built by the same row and sealing functions the server uses, and each action is applied on the page with the routes' rules; scripted checks confirm nothing is sent.

## Defaults taken (owner may reverse)

Listed in the commit: stage strip instead of kanban; current-stage gates only; one vote form only while the session is in session (the route also accepts ballots while the meeting is scheduled); no preselected choice and replaceable ballot; manual outcome only after close; Trading Desk link without prefill (it has none); neutral estimates; sign-off not offered to authors (the route does not block it); Supporting data is a one-line note in sample content; nine extra sample pitches add to Fund Analytics' Submitted count only.

## Left out, and why

- Withdraw: named in the permissions map, no implementation.
- Challenges, threads, replies, mentions, files behind deliverables, rubric or grades, a faculty advisor view: no data or route.
- Conviction and catalyst filters: almost no pitch has the data; both fields are now editable, so they can come back.
- The wireframe's "Last action" column (no per-pitch last action without loading every history) and the "State examples" strip (annotation).
- Changing who may sign off, a rule that the decision route respect the vote, a link between a pitch and a position: server or data-model decisions.
- Removed: the old workspace, composer, detail, gate panel, stage actions, meeting control, panels, supporting data component, `lib/pitch/stage-views.js` (only the old detail used it), `pitch-workspace.css`, `pitch-modal.css`.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas`, `test:em-dash`, `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `test:security`, `test:rls`, `test:org-pitch-pipeline` (new, 30 tests), `test:org-a`, `test:org-b` (includes the pitch stage vocabulary guard), `test:org-command-center`, `test:org-trading-desk`, `test:org-fund-analytics`, `test:org-assignments`, eslint on changed folders (0 errors), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings as on main. No existing test was edited.

Preview (`/home/claude/harness-org-pitch-pipeline/`, real global CSS and shell, stubbed link, router and org context, mocked fetch): no page errors in 21 states; `scrollWidth` equals the viewport at 390, 1024, 1440 and 1920; both tables fit without sideways scroll at 1440. 22 scripted checks pass (`interact.mjs`): no preselected choice; blind dialog shows participation only, own ballot after voting, no tally and no other voter's name; sample ballot sends nothing, council-data ballot sends exactly one POST to the vote route; stage filter and open pitch in the address; Esc closes; analyst gets no Reject, Advance or Schedule meeting; analyst's thesis edit makes the Screening thesis gate pass; Reject posts `reject: true` to the advance route; Retry heals.

Screenshots here: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-dialog-deep-dive.png` (AVGO), `preview-dialog-deep-dive-gs.png`, `preview-dialog-blind-vote.png`, `preview-dialog-blind-vote-voting-tab.png`, `preview-dialog-blind-vote-own-ballot.png`, `preview-dialog-blind-vote-analyst.png`, `preview-dialog-after-close.png`, `preview-submit.png`, `preview-submit-review.png`, `preview-role-analyst.png`, `preview-role-portfolio-manager.png`, `preview-empty.png`, `preview-error.png`, `preview-loading.png`, `preview-dialog-light.png`, `preview-dialog-phone.png`.

## Untested

- `npm run build` and the real Next.js runtime. Nothing ran against the database: the changed loaders and routes, the sealing queries, the batched gate context (`buildGateContexts`, which replaces ten queries per pitch with one per table), the new sample route, the server page.
- The batched gate context reads `org_positions` with `.in('ticker', ...)` and `org_desk_meeting` across pitches; equivalent to the old per-pitch queries but not run live.
- The counting function path (`org_pitch_ballot_counts`) until `sql.md` is applied; until then counts come from readable rows, which is correct under today's policy.
- Production row policies may differ from the repo's migrations; `sql.md` starts with a read-only check.
- Real symbol search, price lookup, policy check, supporting data and hindsight refresh (mocked in the preview); touch devices; screen readers; partner (gold) scope.

## Shared files touched

- `package.json`: one script line.
- `src/lib/org-fund-analytics-sample.js`: reads the shared pitch list instead of its own copy (Fund Analytics tests pass unchanged).
- `src/lib/org-attribution.js` and `src/app/api/org/digest/route.js`: sealed vote counts and ballot lists.
- `src/lib/pitch/gates.js`: exports `thesisCompleteness` and `MIN_LENGTHS`; import path gained `.js`.
- No shell file and no other agent's file: `git diff --stat main...HEAD` lists none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css, the four layouts, FundPerformance.jsx, fund-analytics/Performance.jsx, anything under org-chart or api/org/chart. The separate Meetings page and its IC counts were left alone.
