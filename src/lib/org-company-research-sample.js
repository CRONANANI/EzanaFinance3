/**
 * Sample content for the council sections of US Equities (/company-research).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/company-research/sample, so the page can be presented from a
 * council with little activity. Real councils never receive it, and the page
 * labels it "Sample content" while it shows. Nothing here is read from or
 * written to the database, and the council sections have no actions to save.
 *
 * It is the same sample council every rebuilt Team Hub page shows, assembled
 * from those bundles rather than typed in again:
 *   - the twelve positions, four sector teams, sector coverage and fund
 *     benchmark from the Trading Desk and Command Center samples,
 *   - the documents and coverage handoffs from the Research Library sample,
 *   - the pitches from the Pitch Pipeline sample (so Open pitch lands on the
 *     same sample pitch there),
 *   - the stored policy rules from the Compliance sample.
 * Every name is invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { buildResearchLibrarySample } from './org-research-library-sample.js';
import { buildPitchPipelineSample } from './org-pitch-pipeline-sample.js';
import { buildComplianceSample } from './org-compliance-sample.js';

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildCompanyResearchSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const desk = buildTradingDeskSample({ userId, memberId, role, displayName, title, subRole, now });
  const library = buildResearchLibrarySample({ userId, memberId, role, displayName, subRole, now });
  const pipeline = buildPitchPipelineSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  }).raw;
  const compliance = buildComplianceSample({ role, displayName, userId, now });

  /* One directory: the library's (it includes the two alumni who wrote older
     work), plus anyone only the desk names. */
  const members = [...library.members];
  const seen = new Set(members.map((m) => m.id));
  for (const m of desk.roster.members) {
    if (!seen.has(m.id)) {
      members.push({ ...m, is_demo: true });
      seen.add(m.id);
    }
  }

  const perf = desk.summary.performance;
  const notes = library.notes.map((n) => ({
    id: n.id,
    ticker: n.ticker,
    title: n.title,
    doc_type: n.doc_type,
    status: n.status,
    version: n.version,
    author_id: n.author_id,
    created_at: n.created_at,
    published_at: n.published_at || null,
    is_demo: true,
  }));

  return {
    is_demo: true,
    now,
    viewer: { role, memberId: desk.viewer.memberId },
    positions: desk.book.positions,
    teams: desk.roster.teams,
    members,
    coverage: desk.book.coverage,
    hops: library.hops,
    rules: compliance.rules,
    benchmark: {
      symbol: perf.benchmark_symbol,
      source: perf.benchmark_source,
      pct: perf.benchmark_return_pct,
    },
    /* Every document (the page filters by ticker, as the live route does). */
    notes,
    noteIndex: notes.map((n) => ({ ticker: n.ticker, created_at: n.created_at })),
    pitches: pipeline.pitches.map((p) => ({
      id: p.id,
      ticker: p.ticker,
      analyst_member_id: p.analyst_member_id,
      pitch_type: p.pitch_type,
      time_horizon: p.time_horizon,
      stage: p.stage,
      status: p.status,
      decision: p.decision,
      decision_at: p.decision_at,
      expected_return_pct: p.expected_return_pct,
      stage_entered_at: p.stage_entered_at,
      created_at: p.created_at,
      is_demo: true,
    })),
  };
}
