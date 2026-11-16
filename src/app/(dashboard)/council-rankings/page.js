import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { MANAGER_ROLES } from '@/lib/council-rankings-model';
import { RankingsPage } from '@/components/org/council-rankings/RankingsPage';
import './council-rankings.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Council Rankings | Ezana' };

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * The standing table: every rated council, its parts, its reported ratios
 * and its latest rating change. These are the public leaderboard tables
 * (readable by anyone under their row level policies) plus each council's
 * display name; no dollar figure exists in them.
 */
async function loadTable() {
  const admin = getAdminClient();
  const { data: elo, error: eloErr } = await admin
    .from('council_elo')
    .select('org_id, current_rating, tier, competition_rating, fund_rating')
    .order('current_rating', { ascending: false })
    .limit(200);
  if (eloErr) throw new Error('Council rankings unavailable');
  const rows = elo || [];
  const orgIds = rows.map((r) => r.org_id);
  if (!orgIds.length) return [];

  const [
    { data: orgs, error: orgsErr },
    { data: metrics, error: metricsErr },
    { data: txns, error: txnsErr },
  ] = await Promise.all([
    admin.from('organizations').select('id, name, university_name').in('id', orgIds),
    admin
      .from('council_fund_metrics')
      .select(
        'org_id, roi_pct, sharpe, max_drawdown_pct, volatility_pct, benchmark_alpha_pct, period_label, self_reported',
      )
      .in('org_id', orgIds),
    admin
      .from('council_elo_transactions')
      .select('org_id, delta, component, created_at')
      .in('org_id', orgIds)
      .order('created_at', { ascending: false }),
  ]);
  if (orgsErr || metricsErr || txnsErr) throw new Error('Council rankings unavailable');

  const orgById = new Map((orgs || []).map((o) => [o.id, o]));
  const metricById = new Map((metrics || []).map((m) => [m.org_id, m]));
  const latest = new Map();
  const competed = new Set();
  for (const t of txns || []) {
    if (!latest.has(t.org_id)) latest.set(t.org_id, t);
    if (t.component === 'competition') competed.add(t.org_id);
  }

  return rows.map((r) => {
    const org = orgById.get(r.org_id);
    const m = metricById.get(r.org_id) || null;
    const t = latest.get(r.org_id) || null;
    return {
      orgId: r.org_id,
      name: org?.university_name || org?.name || 'Council',
      tier: r.tier,
      rating: r.current_rating,
      comp: r.competition_rating,
      fund: r.fund_rating,
      roi: m?.roi_pct ?? null,
      sharpe: m?.sharpe ?? null,
      period: m?.period_label ?? null,
      reported: Boolean(m),
      selfReported: Boolean(m?.self_reported),
      competed: competed.has(r.org_id),
      metrics: m
        ? {
            roi_pct: m.roi_pct,
            sharpe: m.sharpe,
            max_drawdown_pct: m.max_drawdown_pct,
            volatility_pct: m.volatility_pct,
            benchmark_alpha_pct: m.benchmark_alpha_pct,
            period_label: m.period_label,
            self_reported: m.self_reported,
          }
        : null,
      move: t?.delta ?? null,
      moveAt: t?.created_at ?? null,
    };
  });
}

/**
 * /council-rankings. The page is public (the leaderboard of councils); a
 * signed-in council member also sees their own council marked and
 * summarised, and executives and portfolio managers can report its fund
 * ratios. `sampleViewer` only tells the page whether to ask for sample
 * content (master admin and demo accounts); the sample route checks again.
 */
export default async function CouncilRankingsPage({ searchParams }) {
  const params = (await searchParams) || {};
  const supabase = getUserClient();
  const [table, member, auth] = await Promise.all([
    loadTable().then(
      (rows) => ({ rows, failed: false }),
      () => ({ rows: [], failed: true }),
    ),
    getCurrentOrgMember(supabase).catch(() => null),
    supabase.auth.getUser().catch(() => null),
  ]);

  return (
    <RankingsPage
      rows={table.rows}
      failed={table.failed}
      myOrgId={member?.org_id || null}
      isMember={Boolean(member)}
      canReport={Boolean(
        member && member.is_active !== false && MANAGER_ROLES.includes(member.role),
      )}
      sampleViewer={Boolean(member) && isCommunityDemoViewer(auth?.data?.user || null)}
      initialSort={one(params.sort)}
    />
  );
}
