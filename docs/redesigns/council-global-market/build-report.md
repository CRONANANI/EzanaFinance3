# Build report: council Global Market Analysis (Stage 3)

Branch `redesign/council-global-market`, commit 8ec898c (not pushed). Worktree `/home/claude/wt/council-global-market`.

## Built

- A third view, COUNCIL, beside The map and The chain on /market-analysis. The button renders only when `useOrg().isOrgUser` is true and org loading has finished. The view is loaded on demand, so the retail bundle does not carry it. The map, the chain, the panels, the tour, Escape and Send to Team are unchanged.
- The view is a scrolling canvas page inside the nav envelope:
  - an index strip from the page's own delayed quotes, labelled "Delayed quotes" (no LIVE label);
  - the Sample content switch and a KPI strip: fund value, gain on cost, benchmark (latest snapshot, SPY in the sample), positions, and next meeting (from Meetings);
  - a main column, ordered by role: this week's events matched to sector teams; fund against benchmark (1M, 3M, YTD, 1Y and ALL, rebased, with a dotted benchmark line); sleeve weights beside sector fund moves; council macro research; the agenda builder (managers only); council versus council; the policy and exposure check;
  - a side column: coverage and owners, and the debrief queue (only when the member has saved items).
- Event analysis dialog (ds Modal): the event's own text, its source, and the matched teams with their owners. It is labelled "sector match, not an impact estimate". Actions: Add to Debrief, and Send to team (with the grant, using the page's existing modal).
- Send to meetings dialog (ds Modal): appends the drafted items to a chosen upcoming meeting through the existing route (`PATCH /api/org/meetings/:id`, `set_agenda`, read first, then append). Only managers can use that route, so analysts get no Add to agenda and no agenda builder.
- New note links to `/org-team-hub/research-library?new=note`. The library now opens its existing editor when it sees that parameter.
- Data:
  - The US Equities council loader (`useCouncilResearch`, `/api/org/company-research`) is reused for the book, teams, coverage, rules and benchmark.
  - New `GET /api/org/market-analysis` (user client, own council, RLS) returns the snapshot series, documents, upcoming meetings, and the standing (public rating and tier only).
  - New `/sample` route serves master admin and demo accounts only. It is built from the shared sample bundles (Command Center, Research Library, Meetings, Council Rankings, plus the US Equities sample). Nothing is saved while the sample shows.
- Every card has a loading state (skeleton), an empty state (one line, one action) and an error state (inline, with Retry).
- Phones in portrait: for council members only, the rotate prompt offers "Open the council view". The council view reads in portrait.

## Fixes made during the visual check

- Phone layout: the KPIs now sit in a 2-column grid, the tier no longer wraps under the rank, and the sample switch has no rule beside it.
- Empty-state text no longer pushes its icon onto a separate line.
- The light mode subtree uses `force-light-theme`. The page body is forced dark on this route, so without it the text was unreadable.

## Left out

- The "Related market watch" and "Market context" copy.
- Returns, Sharpe and alpha for other councils (only rating and tier are shown).
- Any country, currency or asset-class figures for holdings.
- Event-to-ticker links.
- The Filter and Settings panels are still dead. They are untouched, because the terminal restyle is out of scope.

## Untested

- Real Supabase reads, the meetings PATCH against production, and debrief writes. These were exercised only against mocked fetch in the harness at `/home/claude/harness-council-global-market`.
- The real navigation bar.
- `npm run build`.

## Shared files touched

- `src/app/(dashboard)/market-analysis/page.js`: council toggle, a chain error flag with retry, Open chain, and the rotate-prompt button.
- `src/app/theme-variables.css`: light status tokens added to `.force-light-theme`.
- `src/lib/org-research-library-model.js` and `ResearchLibraryPage.jsx`: the `?new=note` parameter.
- `package.json`: the `test:council-global-market` script.
- Protected files (top navigation, OrgContext, Team Hub shell and layouts) were not touched.

No SQL needed.
