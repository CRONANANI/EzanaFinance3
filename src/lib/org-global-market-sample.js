/**
 * Sample content for the Council view of Global Market Analysis
 * (/market-analysis).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/market-analysis/sample, so the view can be presented from a
 * council with little activity. Real councils never receive it, the page
 * labels it "Sample content" while it shows, and nothing done to it is
 * saved (an agenda item sent to a sample meeting stays on the page).
 *
 * It is the same sample council every rebuilt Team Hub page shows, assembled
 * from those bundles rather than typed in again (the book, teams, coverage
 * and policy rules come from the US Equities sample, which the page already
 * loads):
 *   - the fund snapshot series from the Command Center sample,
 *   - the documents and member directory from the Research Library sample,
 *   - the meetings from the Meetings sample,
 *   - the standing table from the Council Rankings sample.
 * Every name is invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildCommandCenterSample } from './org-command-center-sample.js';
import { buildResearchLibrarySample } from './org-research-library-sample.js';
import { buildMeetingsSample } from './org-meetings-sample.js';
import { buildCouncilRankingsSample } from './org-council-rankings-sample.js';

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildGlobalMarketSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const summary = buildCommandCenterSample({ userId, role, displayName, title, now }).summary;
  const cost = Number(summary.performance.total_cost) || 0;
  const library = buildResearchLibrarySample({
    userId,
    memberId,
    role,
    displayName,
    subRole,
    now,
  });
  const meetings = buildMeetingsSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  });
  const rankings = buildCouncilRankingsSample({ now });

  return {
    is_demo: true,
    now,
    viewer: {
      role,
      userId,
      canManage: Boolean(meetings.list.viewer.canManage),
    },
    snapshots: summary.snapshots.map((s) => ({
      date: s.date,
      value: s.value,
      cost,
      benchmarkPct: cost > 0 ? (s.benchmarkValue / cost - 1) * 100 : null,
      is_demo: true,
    })),
    benchmark: { symbol: summary.performance.benchmark_symbol, source: 'index' },
    members: library.members.map((m) => ({
      user_id: m.user_id,
      display_name: m.display_name,
      is_demo: true,
    })),
    notes: library.notes.map((n) => ({
      id: n.id,
      title: n.title,
      doc_type: n.doc_type,
      status: n.status,
      sector: n.sector || null,
      tags: n.tags || [],
      ticker: n.ticker || null,
      author_id: n.author_id,
      created_at: n.created_at,
      published_at: n.published_at || null,
      is_demo: true,
    })),
    meetings: meetings.list.meetings.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      status: m.status,
      scheduled_at: m.scheduled_at,
      agenda_items: m.agenda_items,
      is_demo: true,
    })),
    standing: { rows: rankings.rows, myOrgId: rankings.myOrgId },
  };
}
