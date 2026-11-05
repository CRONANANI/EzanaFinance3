/**
 * Sonar for organizations: Sonar Analytics (Nov 2026).
 *
 * Per-member research metrics from what the fund already records, never
 * from anything a member typed about themselves:
 *
 *   Activity     deep and standard research runs, reports saved
 *   Review       reports submitted and approved, approval rate, days from
 *                submission to approval
 *   Quality      the share of claims that passed validation and the share
 *                cited, averaged over the member's reports; sources per report
 *   Challenge    challenges the member ran; challenges against the member's
 *                reports and how often the conclusion held
 *   Discussion   comments given and received, and how many were resolved
 *   Pitches      reports attached to pitches, and how many of those pitches
 *                reached approval or the portfolio
 *   Coverage     tickers and sectors researched
 *
 * Plus the fund's coverage: approved reports by sector and ticker, with the
 * last approval date, so a portfolio manager sees what is covered and what
 * is stale. These are coaching signals for the desk, not grades.
 *
 * Pure and client-safe. Unit-tested in scripts/check-org-sonar.mjs.
 */

export const WINDOWS = [30, 90, 365];
export const PITCH_ADVANCED = ['approved', 'in_portfolio', 'exited'];

const avg = (xs) => {
  const v = xs.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const ratio = (a, b) => (b ? a / b : null);
const DAY = 86_400_000;

/**
 * @param {{ members: Array, reports: Array, comments: Array, runs: Array,
 *   pitches: Array, tickerSectors?: Record<string,string>, days?: number|null,
 *   now?: Date }} input
 *   members   org_members rows { user_id, display_name, role, team_id }
 *   reports   org_sonar_reports rows (summary included)
 *   comments  org_sonar_report_comments rows { report_id, author_id, resolved, created_at }
 *   runs      sonar_research_runs rows { user_id, depth, status, created_at }
 *   pitches   org_pitches rows { id, stage, sector, ticker }
 * @returns {{ window, totals, members: Array, coverage: Array }}
 */
export function computeAnalytics({
  members = [],
  reports = [],
  comments = [],
  runs = [],
  pitches = [],
  tickerSectors = {},
  days = 90,
  now = new Date(),
}) {
  const since = days ? now.getTime() - days * DAY : -Infinity;
  const inWindow = (iso) => iso && new Date(iso).getTime() >= since;
  const R = reports.filter((r) => inWindow(r.created_at));
  const C = comments.filter((c) => inWindow(c.created_at));
  const U = runs.filter(
    (r) => inWindow(r.created_at) && (r.status === 'complete' || r.status === 'partial'),
  );
  const byId = new Map(reports.map((r) => [r.id, r]));
  const pitchById = new Map(pitches.map((p) => [p.id, p]));
  const sectorOf = (r) =>
    r.sector ||
    (r.pitch_id && pitchById.get(r.pitch_id)?.sector) ||
    (r.ticker && tickerSectors[r.ticker]) ||
    null;

  const people = new Map(members.map((m) => [m.user_id, m]));
  for (const r of R)
    if (!people.has(r.author_id)) people.set(r.author_id, { user_id: r.author_id });

  const rows = [...people.values()].map((m) => {
    const id = m.user_id;
    const mine = R.filter((r) => r.author_id === id);
    const research = mine.filter((r) => r.kind !== 'challenge');
    const submitted = research.filter(
      (r) => r.submitted_at || ['under_review', 'approved', 'superseded'].includes(r.status),
    );
    const approved = research.filter((r) => r.approved_version != null);
    const reviewDays = approved
      .filter((r) => r.submitted_at && r.approved_at)
      .map((r) => (new Date(r.approved_at) - new Date(r.submitted_at)) / DAY)
      .filter((d) => d >= 0);
    const challenges = R.filter((r) => r.kind === 'challenge' && r.challenge_of);
    const faced = challenges.filter((c) => byId.get(c.challenge_of)?.author_id === id);
    const tested = faced.filter((c) =>
      ['holds', 'weakened', 'refuted'].includes(c.summary?.challengeVerdict),
    );
    const held = tested.filter((c) => c.summary?.challengeVerdict === 'holds');
    const received = C.filter((c) => byId.get(c.report_id)?.author_id === id && c.author_id !== id);
    const onPitches = research.filter((r) => r.pitch_id);
    const advanced = new Set(
      onPitches
        .filter((r) => PITCH_ADVANCED.includes(pitchById.get(r.pitch_id)?.stage))
        .map((r) => r.pitch_id),
    );
    const myRuns = U.filter((r) => r.user_id === id);
    const stances = { invest: 0, watch: 0, pass: 0 };
    for (const r of research)
      if (r.kind === 'fund_fit' && r.summary?.stance in stances) stances[r.summary.stance] += 1;
    return {
      userId: id,
      name: m.display_name || 'Former member',
      role: m.role || null,
      teamId: m.team_id || null,
      active: Boolean(m.role) && m.is_active !== false,
      deepRuns: myRuns.filter((r) => r.depth === 'deep').length,
      standardRuns: myRuns.filter((r) => r.depth === 'standard').length,
      reports: research.length,
      submitted: submitted.length,
      approved: approved.length,
      approvalRate: ratio(approved.length, submitted.length),
      reviewDays: avg(reviewDays),
      claimSupport: avg(research.map((r) => r.summary?.stats?.claimSupportRate)),
      citationCoverage: avg(research.map((r) => r.summary?.stats?.citationCoverage)),
      sourcesPerReport: avg(research.map((r) => r.summary?.stats?.sources)),
      challengesRun: mine.filter((r) => r.kind === 'challenge').length,
      challengesFaced: faced.length,
      heldRate: ratio(held.length, tested.length),
      commentsGiven: C.filter((c) => c.author_id === id).length,
      commentsReceived: received.length,
      commentsResolved: ratio(received.filter((c) => c.resolved).length, received.length),
      onPitches: onPitches.length,
      pitchesAdvanced: advanced.size,
      fundFit: stances,
      tickers: [...new Set(research.map((r) => r.ticker).filter(Boolean))].sort(),
      sectors: [...new Set(research.map(sectorOf).filter(Boolean))].sort(),
    };
  });
  rows.sort(
    (a, b) =>
      b.approved - a.approved ||
      b.reports - a.reports ||
      String(a.name).localeCompare(String(b.name)),
  );

  /* The fund's coverage: approved research by sector and ticker. */
  const cov = new Map();
  for (const r of reports.filter((x) => x.approved_version != null && x.kind !== 'challenge')) {
    const sector = sectorOf(r) || 'Unclassified';
    const key = `${sector}|${r.ticker || ''}`;
    const cur = cov.get(key) || {
      sector,
      ticker: r.ticker || null,
      approved: 0,
      lastApproved: null,
      authors: new Set(),
    };
    cur.approved += 1;
    if (!cur.lastApproved || String(r.approved_at) > cur.lastApproved)
      cur.lastApproved = r.approved_at || null;
    cur.authors.add(r.author_id);
    cov.set(key, cur);
  }
  const coverage = [...cov.values()]
    .map((c) => ({
      ...c,
      authors: c.authors.size,
      staleDays: c.lastApproved
        ? Math.floor((now.getTime() - new Date(c.lastApproved).getTime()) / DAY)
        : null,
    }))
    .sort(
      (a, b) =>
        a.sector.localeCompare(b.sector) || String(a.ticker || '').localeCompare(b.ticker || ''),
    );

  const research = R.filter((r) => r.kind !== 'challenge');
  return {
    window: { days: days || null, since: days ? new Date(since).toISOString() : null },
    totals: {
      deepRuns: U.filter((r) => r.depth === 'deep').length,
      standardRuns: U.filter((r) => r.depth === 'standard').length,
      reports: research.length,
      approved: research.filter((r) => r.approved_version != null).length,
      underReview: research.filter((r) => r.status === 'under_review').length,
      challenges: R.filter((r) => r.kind === 'challenge').length,
      comments: C.length,
      claimSupport: avg(research.map((r) => r.summary?.stats?.claimSupportRate)),
      tickers: new Set(research.map((r) => r.ticker).filter(Boolean)).size,
    },
    members: rows,
    coverage,
  };
}

/** Only the viewer's own row, for a member who does not manage others. */
export function ownView(analytics, userId) {
  return {
    ...analytics,
    members: analytics.members.filter((m) => m.userId === userId),
  };
}
