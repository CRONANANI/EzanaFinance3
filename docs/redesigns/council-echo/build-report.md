# Build report: council Ezana Echo (Stage 3)

Branch `redesign/council-echo`, commit 92c8bc4 (not pushed). Worktree `/home/claude/wt/council-echo`.

## Built

- Same route, `/ezana-echo`. Council parts render only when the viewer is signed in, `useOrg().isOrgUser` is true and org loading has finished. The band is loaded on demand with `next/dynamic`; the data hook the page always carries fetches nothing before that and imports no council model.
- **For our council** band, between the Article of the Month and Latest Stories:
  - Header: title, one subline, Sample content label and switch (master admin and demo only), Open in Team Hub, Collapse/Expand (remembered per viewer in localStorage, wrapped in try/catch; collapsed shows a one-line mono summary).
  - Strip: holdings, sector teams, open pitches, Echo stories on our names. Values 18px mono.
  - Echo on our names: stories whose editor-tagged tickers match a holding or open pitch, newest first, with Held or Open pitch, and "Show all N in Latest Stories" (turns on the Our names tab).
  - Pitch prep reading: open pitches (not decided, held or dropped) with the newest Echo story on the name and the story count; the ticker opens the pitch.
  - My saved articles: the viewer's own list, newest save first. Saves that are no longer published are counted, not shown.
  - Council reads: the council's published Research Library documents, exemplars first, then pinned, then newest.
  - Sector coverage: sector team, who covers it, holdings, Echo stories on those holdings, newest story. No In focus column.
  - Every card: skeleton in final layout, one-line empty state with one action, inline error with Retry.
- **Our names** tab in Latest Stories, kept in the address as `?ours=1`. Ignored for anyone who is not a council member. The grid waits for the council's tickers instead of flashing every story.
- **Masthead:** Team Hub link for council members. Login now shows only to signed-out readers (it showed to everyone). This is the only change non-council readers see.
- Sample: `GET /api/org/ezana-echo/sample` (gated by `isCommunityDemoViewer`) builds from the Research Library and Pitch Pipeline samples; the fund comes from the US Equities sample. Echo stories are always the real ones. The sample saved list shows three real stories with no save date. Nothing writes.

## Data

- `useCouncilResearch` reused for book, teams, coverage, members.
- New `GET /api/org/ezana-echo`: user client, own council, RLS. Published documents only (no drafts), pitches without ballots or tallies, member directory.
- `GET /api/echo/saved-articles` now also returns `saved` with `saved_at`, newest first, and a 500 when the read fails. `savedIds` is unchanged for the article page's save button.
- `toStory` now keeps each story's tagged tickers. No SQL needed.

## Left out

- Required reading: an assignment cannot reference an Echo article today, and there is no council-curated reading list.
- Any aggregate of members' Echo reads or saves: reads are totals only and saves are private. "Council reads" is therefore the council's own published research, as the description's default says.
- Fund value and performance cells, the analysts and portfolio managers row, Team notes and Council alerts (no data on this page).
- Archiving on council rows. Archive stays on story cards, admins only. There was no "About Ezana Echo" footer link to drop.
- The design's pill-free restyle of the public front page (tabs, region menu, hero button, Evening Brief). The brief keeps the existing page for everyone, so Echo's own sanctioned styles are unchanged. The real masthead mark, regions and time ranges are kept.

## Untested

- Real Supabase reads and RLS on `org_research_notes`, `org_pitches` and `echo_saved_articles` with a real session. The sample route was not tested on a real session either. The harness at `/home/claude/harness-council-echo` mocks fetch with a hub built from the article modules.
- The real dashboard shell, Newsreader and logo images in the harness, and `npm run build`.

## Checks

All pass:

- lint:branding, lint:ds, lint:css
- test:page-canvas, test:em-dash
- test:echo-home: the round-trip test was updated for the new `ours` key, and an Our names test was added.
- test:council-echo (new, 10 tests)
- test:council-us-equities, test:council-alternative-markets
- test:security, test:rls
- eslint (0 errors), prettier
- lint:arch: no new violations

Harness widths: 390, 1024, 1280, 1440 (dark and light), 1568 and 1920. Harness states: live, empty, error, slow, collapsed, Our names, admin, retail, org loading and signed out. `scrollWidth` equals the viewport at every width. Nothing in the band overflows; the masthead's section row scrolls by design at 390. Retail, org loading and signed out made zero council calls.

## Shared files touched

- `src/lib/echo/home-feed.js`, `src/components/echo/home/EchoHome.jsx`, `src/app/(dashboard)/ezana-echo/EchoHomeClient.jsx` (the masthead is part of this page)
- `src/app/api/echo/saved-articles/route.js`
- `scripts/check-echo-home.mjs`
- `package.json` (one script)

No protected files were touched: no app navigation, OrgContext, Team Hub shell or any layout.js. No articles were created and no upserts were made.
