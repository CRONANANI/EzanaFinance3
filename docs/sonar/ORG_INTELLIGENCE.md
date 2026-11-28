# Sonar for organizations: council intelligence

Nov 28, 2026. Council research on a fund's own records, inside the standard Sonar answer shell. No model calls: every answer here is deterministic, computed from council records with the formulas the Fund Analytics and Compliance pages already use. Tests: `npm run test:org-sonar-intelligence` (28 tests on invented fixture councils).

## 1. Audit: what already existed and is reused

| Area | Where | Reused for |
| --- | --- | --- |
| Active org resolution (multi-org, `ez_org` cookie, server-side) | `getCurrentOrgMember` in `org-trading-server.js` | the only source of the active org |
| Versioned reports, draft to approved to superseded, five visibilities, RLS mirror | `org-sonar/reports.js`, `org_sonar_reports`, `org_sonar_report_versions` | research memory, coverage, briefing, finding sharing |
| Canonical position book (at cost when unpriced) | `org-position-book.js` | every fund figure |
| IPS engine (`holdingsSummary`, `evaluateHoldings`, `evaluateProposal`) | `org-compliance-model.js` | policy observations and scenarios |
| Fund fit mandate checks | `org-sonar/fund-fit.js` | unchanged (still runs in deep research) |
| Permission tiers and overrides | `org-permissions-config.js`, `org-permissions-server.js` | action authorization by permission key |
| Pitch state machine | `org-pitch-state-machine.js` | untouched; Sonar never moves stages |
| Hindsight | `org-hindsight.js`, `org_pitch_hindsight` | unchanged; `knowableAt` adds a look-ahead guard |
| Direct messages | `org_direct_messages` | delivery of a shared finding |
| Audit log | `org-audit.js` | finding sent, governance refused |

Tables verified in migrations: `org_positions`, `org_ips_rules`, `org_pitches`, `org_meetings`, `org_assignments`, `org_sector_coverage`, `org_research_notes` (visibility org/team/private, RLS), `org_position_flags`, `org_direct_messages`, `org_audit_log`.

## 2. Workflow matrix

| Workflow | Sonar reads | Sonar summarizes | Sonar proposes | Sonar never |
| --- | --- | --- | --- | --- |
| Pitch idea, screening, deep dive | pitch, linked report version | thesis checklist, bull/base/bear | thesis sections, diligence questions | edits the pitch |
| Cross-desk review, committee pitch | pitch, policy, reports | committee questions with motives | review request (existing route) | approves, rejects |
| Committee vote, approval | none | none | none | votes, approves |
| Portfolio monitoring, position review | book, flags, IPS | concentration, exposure, rule comparisons | research updates | trades, adds positions |
| Coverage | book, reports, notes, coverage, assignments | coverage map and gaps | assignments (proposal only) | assigns tasks |
| Meetings | meeting, pitches, reports, flags, IPS | briefing from records | none | invents agenda or decisions |
| Exit and hindsight | report versions, monitors | version comparison | monitors | grades analysts |

## 3. What was built

- `lib/org-sonar/intelligence/intent.js`: council intent parser. Council context only on an explicit council reference or a chosen council capability; "our portfolio" means the council fund; scenario and unsupported-measure detection.
- `intelligence/context.js`: selective context plan, removable optional context, authorization-scoped cache key, `chooseOrg` (browser org id only picks between own memberships).
- `intelligence/portfolio.js`: concentration, sector exposure, pricing coverage, hypothetical scenarios (labelled, never written), advisory policy observations ("Potential policy concern", "Recorded rule comparison"), limitations for TWR, attribution, alpha, volatility, Sharpe, factors.
- `intelligence/coverage.js`: coverage map; owners only from pitch or sector coverage records; age from the last substantive update.
- `intelligence/red-team.js`: nine-criterion thesis checklist (no score), committee questions linked to the assumption, risk, finding, rule or missing evidence that motivated each, decision preparation.
- `intelligence/briefing.js`: meeting briefing from records, version comparison (original never rewritten), thesis monitor validation and evaluation with reporting lag, look-ahead guard.
- `intelligence/actions.js`: read-only / proposed / confirmed / governance classes; governance always refused; model output can only propose; permission keys, not role names.
- `intelligence/run.js`: one capability to a standard answer (Desk Summary, visuals for the component registry, evidence, limitations, proposals).
- `intelligence-server.js` (OrgSonarContextProvider): caller-client reads only (RLS applies), verified org id on every query, size limits, no writes.
- `POST /api/org/sonar/intelligence`, `POST /api/org/sonar/actions` (send a finding; governance refused and audited).
- `lib/sonar/composer/org-capabilities.js`: seven council capabilities in Composer attachment shape, kept out of the retail registry.
- Registry: twelve council cards (`org: true`) reusing the exposure breakdown and research table, plus `SonarOrgChecklistCard` and `SonarVersionComparison`.
- Org Sonar page: new "Council intelligence" tab in the standard answer shell, with removable context indicators.

## 4. Not implemented or partial

- Thesis monitors are validated and evaluated, not stored or scheduled: persistence needs a new table and review. No background agent was created.
- Pitch fields `assumptions`, `valuation_method`, `bull_case`, `bear_case`, `monitoring` are read when present; where the pitch table lacks them the checklist reports them missing.
- Research memory compares approved report versions; Research Library notes are not versioned, so they are dated but not compared.
- Link-to-pitch and request-review keep their existing routes (`/api/org/sonar-reports/[id]`); assignment creation stays in Assignments. Sonar only proposes.
- The main research route does not yet hand council questions to this layer automatically; the Council intelligence tab and the API do.
- Analyst development insights reuse Sonar Analytics (`org-sonar/analytics.js`); nothing new was added there.
- No UI screenshots were taken here (no app credentials); fixture tests cover the logic.

## 5. Security review

- Org isolation: the org comes from the session membership; every read adds `eq('org_id', member.org_id)` and runs under RLS; the service role is used only for the audit insert.
- Private drafts and restricted research: visibility comes from RLS on reports, versions and notes; `canReadReport` is checked again before sharing, for the sender and every recipient.
- Citations: evidence references are council record ids the viewer could read; a shared finding refuses recipients who cannot open the source report.
- Cache: keys carry org, member, role, desk, capability and context.
- Writes: only `send_finding`, confirmed by the member, permission key `send_to_team`, audited. Governance actions are refused and audited.
- Untrusted content: report and note text is data; nothing in it can authorize an action.

## 6. Rollout

1. Ship the tab to executives and portfolio managers of one pilot council; watch the audit log.
2. Open to analysts; add the stored monitors table after review.
3. Route council-scoped questions from Sonar Research to this layer.
