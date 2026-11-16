# Build report: council Quant Lab (/for-the-quants)

Branch `redesign/council-quant-lab`, commit a0e8c11 (not pushed). No SQL needed (no sql.md).

## Built

- Council tab beside My research on the Overview, council members only (`useOrg().isOrgUser` and org loading finished). Choice remembered per viewer. Sample label and switch for master admin and demo accounts.
- Council strip: fund value, gain on cost (not time weighted), benchmark, positions, sector teams.
- Fund risk at today's weights: lab risk engine (`portfolioRisk` + new `replaySeries`) on the council book with a year of closes vs SPY. Labelled as historical simulation; unpriced holdings left out and named; N/A where not computable. Sample: sample holdings, real closes.
- Sector concentration against the stored lowest active sector cap (hard or soft), over and near flagged with icon and words.
- Pitch evidence and model checklist: open pitches, desk required models uploaded and reviewed (Pitch Pipeline rules), Open pitch.
- IPS pre-check: real `POST /api/org/ips/check` (no logging) on the pitch's ticker, sector and size; Compliance `ideaRows` drives Blocked, Warning, Within limit, Not tested, Recorded only. Sample: AVGO reads Within limit for sector (Technology 21.6% + 3%), Financials pitches read Blocked.
- Model assignments: assignments of type Model the Assignments page shows the viewer (assignments cannot reference strategies today).
- Council research handoff: "not available yet"; strategies stay private.
- New routes: `/api/org/quant-lab`, `/sample`, `/risk`. Model `src/lib/org-quant-lab-model.js`, sample `src/lib/org-quant-lab-sample.js`, test `npm run test:council-quant-lab`.

## Fixes for everyone

- Three placeholder panels folded into one Planned line; quick actions flat.
- Row menu: removed the disabled Paper deploy item; Escape and outside click close it. No Duplicate or Rename (do not exist).
- Strategy leaderboard placeholder rows now only for master admin and demo accounts (labelled Sample content); others see an honest one-line empty state.
- `n/a` became `N/A` across Quant Lab (lab-format NA).

## Left out

- Sharing strategies or attaching runs to pitches (needs a database change).
- Market cap input for the min market cap rule (reads Not tested); cash in fund risk.
- Personal Overview restyle beyond the above (shared `qlx-` styles, period selector track, select box, chip tags are used by every workspace and were left alone).

## Untested

- Real routes against production data (harness mocks fetch; risk chart drawn from synthetic closes in the harness only). RLS on `org_desk_config` and `org_pitch_model` read from migrations, not checked live.
- Speed of `/api/org/quant-lab/risk` (13 price lookups) on cold cache.

## Shared files touched

`src/lib/quants/risk.js` (added `replaySeries`), `src/components/quants/lab/lab-format.js` (NA), `QuantLabShell.jsx` (comment), community-strategies page, package.json. No nav, OrgContext or Team Hub shell files.
