/**
 * Sonar for organizations: research coverage intelligence (Nov 28 2026).
 *
 * One row per council holding: who covers it (only where the council recorded it: the
 * sector coverage table or the analyst on the latest pitch for the ticker; never inferred),
 * the latest research the viewer may read, how old that research is, open assignments and
 * reports waiting on review. A holding is a coverage gap when it has no readable research,
 * or when its latest substantive update is older than the threshold.
 *
 * A report's age is measured from its last substantive update (the approval of the current
 * version, or the latest saved version), not from when the report was first created, and a
 * gap is described as a gap in the record, never as an analyst's neglect.
 *
 * Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 */

export const DEFAULT_STALE_DAYS = 90;
const DAY = 86_400_000;

const up = (s) => String(s || '').toUpperCase();
const t = (v) => {
  const n = v ? Date.parse(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** The last substantive update of a report or note: approval, else last version or edit. */
export function substantiveAt(r) {
  return (
    t(r.approved_at) ?? t(r.version_at) ?? t(r.published_at) ?? t(r.updated_at) ?? t(r.created_at)
  );
}

/**
 * @param {{ book, reports, notes, pitches, coverage, members, assignments, now, staleDays }} input
 *   reports      org_sonar_reports rows the viewer can read (RLS already applied)
 *   notes        org_research_notes rows the viewer can read
 *   coverage     org_sector_coverage rows { member_id, sector, is_primary }
 *   assignments  open assignments { id, ticker?, title, status, assigned_to }
 */
export function coverageMap({
  book = [],
  reports = [],
  notes = [],
  pitches = [],
  coverage = [],
  members = [],
  assignments = [],
  now = Date.now(),
  staleDays = DEFAULT_STALE_DAYS,
}) {
  const threshold = Math.max(1, Number(staleDays) || DEFAULT_STALE_DAYS);
  const nameOf = new Map(members.map((m) => [m.id, m.display_name || 'Member']));
  const research = [
    ...reports.filter((r) => r.status !== 'superseded').map((r) => ({ ...r, source: 'report' })),
    ...notes.map((n) => ({ ...n, source: 'note' })),
  ];
  const rows = book.map((p) => {
    const ticker = up(p.ticker_symbol || p.ticker);
    const items = research
      .filter((r) => up(r.ticker) === ticker)
      .map((r) => ({ ...r, at: substantiveAt(r) }))
      .filter((r) => r.at !== null)
      .sort((a, b) => b.at - a.at);
    const latest = items[0] || null;
    const pitch = pitches
      .filter((x) => up(x.ticker) === ticker)
      .sort((a, b) => (t(b.created_at) || 0) - (t(a.created_at) || 0))[0];
    const sectorCover =
      coverage.find((c) => p.sector && c.sector === p.sector && c.is_primary) ||
      coverage.find((c) => p.sector && c.sector === p.sector);
    const ownerId = pitch?.analyst_member_id || sectorCover?.member_id || null;
    const ageDays = latest ? Math.floor((now - latest.at) / DAY) : null;
    const pending = reports.filter(
      (r) => up(r.ticker) === ticker && r.status === 'under_review',
    ).length;
    const open = assignments.filter(
      (a) => up(a.ticker) === ticker && !['completed', 'done', 'closed'].includes(a.status),
    ).length;
    const status = !latest ? 'no_research' : ageDays > threshold ? 'stale' : 'current';
    return {
      ticker,
      name: p.name || null,
      sector: p.sector || null,
      owner: ownerId ? nameOf.get(ownerId) || 'Member' : null,
      ownerSource: pitch?.analyst_member_id ? 'pitch' : sectorCover ? 'sector_coverage' : null,
      latest: latest
        ? {
            id: latest.id,
            source: latest.source,
            title: latest.title || null,
            status: latest.status || null,
            at: new Date(latest.at).toISOString(),
          }
        : null,
      ageDays,
      openAssignments: open,
      pendingReview: pending,
      priced: Boolean(p.priced),
      status,
    };
  });
  const gaps = rows.filter((r) => r.status !== 'current');
  return {
    staleDays: threshold,
    rows: rows.sort((a, b) => (b.ageDays ?? Infinity) - (a.ageDays ?? Infinity)),
    gaps: gaps.length,
    noOwner: rows.filter((r) => !r.owner).length,
    note: `A holding is listed when no research the council recorded for it is newer than ${threshold} days. This reflects the research record, not an analyst's work.`,
  };
}
