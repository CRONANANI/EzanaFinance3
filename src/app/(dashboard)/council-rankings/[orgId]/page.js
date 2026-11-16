import { notFound } from 'next/navigation';
import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { isSampleCouncilId, sampleCouncilDetail } from '@/lib/org-council-rankings-sample';
import { CouncilDetail } from '@/components/org/council-rankings/CouncilDetail';
import '@/components/org/command-center/command-center.css';
import '@/styles/home-canvas.css';
import '../council-rankings.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Council | Council Rankings | Ezana' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One council's page. Every figure is read for THIS council only (its rating,
 * its reported ratios, its own rating changes); a council without a rating
 * gets the not found page.
 *
 * Sample councils (ids starting "sample-council-") exist only for master
 * admin and demo accounts who are council members, checked here on the
 * verified session; anyone else gets not found.
 */
export default async function CouncilDetailPage({ params }) {
  const { orgId } = await params;
  const supabase = getUserClient();

  if (isSampleCouncilId(orgId)) {
    const [member, auth] = await Promise.all([
      getCurrentOrgMember(supabase).catch(() => null),
      supabase.auth.getUser().catch(() => null),
    ]);
    if (!member || !isCommunityDemoViewer(auth?.data?.user || null)) notFound();
    const council = sampleCouncilDetail(orgId);
    if (!council) notFound();
    return <CouncilDetail council={council} mine={council.orgId.endsWith('-self')} sample />;
  }

  if (!UUID.test(String(orgId || ''))) notFound();
  const admin = getAdminClient();
  const [{ data: elo, error: eloErr }, member] = await Promise.all([
    admin
      .from('council_elo')
      .select('org_id, current_rating, peak_rating, tier, competition_rating, fund_rating')
      .eq('org_id', orgId)
      .maybeSingle(),
    getCurrentOrgMember(supabase).catch(() => null),
  ]);
  if (eloErr) throw new Error('Council rating unavailable');
  if (!elo) notFound();

  const [{ data: org }, { data: metrics }, { data: txns, error: txnErr }] = await Promise.all([
    admin.from('organizations').select('name, university_name').eq('id', orgId).maybeSingle(),
    admin
      .from('council_fund_metrics')
      .select(
        'roi_pct, sharpe, max_drawdown_pct, volatility_pct, benchmark_alpha_pct, period_label, self_reported',
      )
      .eq('org_id', orgId)
      .maybeSingle(),
    admin
      .from('council_elo_transactions')
      .select('delta, component, rating_after, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(40),
  ]);
  if (txnErr) throw new Error('Council rating unavailable');

  const council = {
    orgId,
    name: org?.university_name || org?.name || 'Council',
    tier: elo.tier,
    rating: elo.current_rating,
    peak: elo.peak_rating,
    comp: elo.competition_rating,
    fund: elo.fund_rating,
    metrics: metrics || null,
    txns: txns || [],
  };
  return <CouncilDetail council={council} mine={member?.org_id === orgId} />;
}
