/**
 * Stakeholder reports: the server side shared by the reports routes. Every
 * read and write runs as the signed-in member (getUserClient); RLS on
 * org_reports stays the gate underneath the role and export-setting checks.
 */
import { getOrgPositionBook } from '@/lib/org-position-book';
import {
  attributionByAnalyst,
  attributionBySector,
  attributionByPitch,
} from '@/lib/org-attribution';
import { getBenchmarkSymbol } from '@/lib/org-benchmark';
import { getGovernance } from '@/lib/org-governance';
import { fetchBatchedHistoricalPrices } from '@/lib/fmp-historical-batched';
import {
  assembleReport,
  canExportReports,
  cleanPeriod,
  comparedWindow,
  reportAccess,
  summarizeReport,
} from '@/lib/org-reports-model';

/** The member's access to reports, read from role and the advisor setting. */
export async function reportViewer(supabase, member) {
  const governance = await getGovernance(supabase, member.org_id);
  const access = reportAccess(member, governance);
  return {
    access,
    canExport: access === 'ok',
    exportScope: governance.who_can_export_reports || 'exec_pm_advisor',
  };
}

export { canExportReports };

/**
 * Work out a report as it would be saved now. Nothing is written.
 * @returns {Promise<{ payload: object, title: string, cohortId: string|null }>}
 */
export async function computeReport(supabase, member, body = {}) {
  const orgId = member.org_id;
  const periodLabel = cleanPeriod(body?.period_label);
  const includeRoster = body?.include_roster !== false;
  const includeAnalystNames = body?.include_analyst_names !== false;
  const generatedAt = new Date().toISOString();
  const endDay = generatedAt.slice(0, 10);

  const [positions, byAnalyst, bySector, byPitch, symbol, orgRes, rosterRes, cohortRes] =
    await Promise.all([
      getOrgPositionBook(supabase, orgId),
      includeAnalystNames ? attributionByAnalyst(supabase, orgId) : Promise.resolve([]),
      attributionBySector(supabase, orgId),
      attributionByPitch(supabase, orgId),
      getBenchmarkSymbol(supabase, orgId),
      supabase.from('organizations').select('university_name, name').eq('id', orgId).maybeSingle(),
      includeRoster
        ? supabase
            .from('org_members')
            .select('display_name, role, sub_role, title')
            .eq('org_id', orgId)
            .eq('is_active', true)
        : Promise.resolve({ data: [] }),
      supabase
        .from('org_cohorts')
        .select('id, name')
        .eq('org_id', orgId)
        .eq('is_current', true)
        .maybeSingle(),
    ]);

  /* Same-window comparison: one price history read for the holdings and
     the benchmark, from the first day a holding was recorded. */
  let comparison = null;
  const priced = (positions || []).filter((p) => p.priced && p.added_at);
  const first = priced
    .map((p) => String(p.added_at).slice(0, 10))
    .sort()
    .find(Boolean);
  if (first) {
    try {
      const tickers = [
        ...new Set(priced.map((p) => String(p.ticker_symbol || p.ticker).toUpperCase())),
      ];
      const history = await fetchBatchedHistoricalPrices(
        [...new Set([...tickers, symbol])],
        first,
        endDay,
      );
      comparison = comparedWindow({ positions: priced, history, symbol, endDay });
      if (comparison) comparison.total = (positions || []).length;
      if (comparison) comparison.left_out = comparison.total - comparison.matched;
    } catch {
      comparison = null;
    }
  }

  const universityName =
    orgRes?.data?.university_name || orgRes?.data?.name || 'Student investment fund';
  const payload = assembleReport({
    universityName,
    periodLabel,
    generatedAt,
    generatedByName: member.display_name || null,
    cohort: cohortRes?.data?.name || null,
    positions,
    bySector,
    byAnalyst,
    pitches: byPitch,
    roster: (rosterRes?.data || []).map((m) => ({
      name: m.display_name,
      role: m.role,
      title: m.title || null,
      sub_role: m.sub_role || null,
    })),
    benchmarkSymbol: symbol,
    comparison,
    includeRoster,
    includeAnalystNames,
  });
  return {
    payload,
    title: `${universityName} fund report, ${periodLabel}`,
    cohortId: cohortRes?.data?.id || null,
  };
}

/**
 * The saved reports, newest first (up to 100), each summarised, plus the
 * newest in full for the page's printable preview. Authors of reports saved
 * before the author's name was stored are resolved from the roster.
 */
export async function listReports(supabase, orgId) {
  const { data, error } = await supabase
    .from('org_reports')
    .select('id, title, period_label, created_at, generated_by, payload')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { error };
  const rows = data || [];
  const missing = [
    ...new Set(
      rows.filter((r) => !r.payload?.generatedByName && r.generated_by).map((r) => r.generated_by),
    ),
  ];
  const names = new Map();
  if (missing.length) {
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name')
      .eq('org_id', orgId)
      .in('user_id', missing);
    for (const m of members || []) if (m.display_name) names.set(m.user_id, m.display_name);
  }
  const latest = rows[0]
    ? {
        id: rows[0].id,
        title: rows[0].title,
        period_label: rows[0].period_label,
        created_at: rows[0].created_at,
        payload: rows[0].payload,
        authorName: summarizeReport(rows[0], names).author,
      }
    : null;
  return { reports: rows.map((r) => summarizeReport(r, names)), latest };
}
