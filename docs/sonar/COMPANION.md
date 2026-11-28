# Sonar Companion

Nov 28, 2026. A persistent, context-aware way into Ezana Sonar from any authenticated page, in the personal and the organization workspace. It is another interface to the existing Sonar, not a second engine. Tests: `npm run test:sonar-companion` (16 tests, mocks and fixtures only, no model calls).

## 1. Integration audit

| Question | Finding | Decision |
| --- | --- | --- |
| Lowest shared authenticated layout | `app/(dashboard)/layout.js`, which covers personal pages and `org-team-hub` / `org-trading` | Mount once there (`SonarCompanionProvider` around the shell, `enabled` when authenticated, so auth resolving never remounts the page) |
| Research execution | `useResearchStream` posts to `/api/sonar/research` (SSE); plan, quota, routing and refunds live on the server | The Companion calls the same hook; never deep research |
| Run persistence | Standard and deep runs are stored (`sonar_research_runs`), readable by id at `/api/sonar/history?id=`; quick pings are not stored | Entries keep run ids only; a stored run reopens by id |
| Stream reconnection | No resume endpoint; the stream lives in the client | The provider stays mounted across navigation, so a run continues while browsing or minimized; after a hard refresh a running entry is shown as interrupted and never restarted |
| Run id on the client | Sent in the `X-Research-Run` header and the `done`/`error` events, but dropped by the reducer | Additive: `useResearchStream` reads the header; `reduceEvent` keeps `runId` |
| Full research page for a run | `/sonar/history/[id]` (`PastRunClient`, the shared report shell) | The full-screen handoff navigates there by id; no second renderer |
| Organization scope | `OrgContext.memberships[].current` on the client; `getCurrentOrgMember` on the server | Scope `org:<id>` for UI separation; the server decides access |
| Council research | `/api/org/sonar/intelligence` (deterministic, no model) | Organization suggestions run there |
| Floating controls | Mobile tab bar (fixed, z 9999); design-system modals at 1000+ | Launcher above the tab bar and safe area; z 990 on desktop |

Risks avoided: a second research engine, a second report renderer, a second history table, background polling, and private payloads in browser storage.

## 2. Architecture

- `lib/sonar/companion/prefs.js`: non-sensitive preferences, clamped width (400 to 680), dock fit test, keyboard resize steps.
- `page-context.js`: typed page descriptors from the route, merged with what a page registers (`useSonarPageContext`); a page cannot move itself into an organization. Removable context; personal context travels as words, organization records only by id.
- `suggestions.js`: deterministic suggestions per page; council ones only for active members; nothing shown that cannot run.
- `session.js`: per-scope conversations, persistable ids only, restore plan, membership revocation, cross-tab lock.
- `view.js`: one normalized view for every mode; modes change counts, never values; full-screen address by run id.
- `actions.js`: action registry with permission, target, inputs, confirmation and endpoint; governance not present.
- Components: `SonarCompanionProvider`, `SonarCompanionContext`, `SonarCompanionLauncher`, `SonarCompanionWindow` (lazy), `SonarCompanionRenderer`, `SonarCompanionPreferences`, `sonar-companion.css`.
- `PitchSonarPanel` registers the open pitch, so pitch suggestions run against it.

## 3. Modes

- Compact: 400 by up to 580, bottom corner on the chosen side; Desk Summary preview, three findings, two metrics, three sources, expand.
- Sidebar: 480 default, 400 to 680 by drag or keyboard; overlay by default, docked when chosen and the page keeps 960px; adds the library components (`SonarAdaptiveVisual`), limitations and actions.
- Full: the existing Sonar page for the run; returning reopens the previous mode.
- Phones: a bottom sheet; the launcher sits above the tab bar.

## 4. Known limitations

- No screenshots or browser runs were made here (no app credentials). Check 1440, 1920, 1024, 768 and 390 on a preview deploy.
- Quick pings are not stored server side, so the Companion runs standard research for questions; the plan and quota apply as on /sonar.
- A run interrupted by a hard refresh cannot be resumed (no resume endpoint); it is shown as interrupted with a link to history.
- "Send finding" needs a report and finding picker; the Companion links to the council pages for it rather than showing a half-working button.
- Focus is not trapped in the compact or overlay sidebar (they are non-modal); Escape minimizes and returns focus to the launcher.

## 5. Rollout

1. Ship with `startMinimized` on (default); watch research volume per user for unexpected growth.
2. Enable council suggestions for one pilot organization, then all.
3. Add a resume endpoint to the research route so a refreshed tab can rejoin a running stream.
