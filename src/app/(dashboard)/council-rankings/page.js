import { getAdminClient } from '@/lib/supabase';
import { WEIGHTS } from '@/lib/council-elo/model';
import RankingsTable from './RankingsTable';
import './council-rankings.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'University Council Rankings — Ezana' };

export default async function CouncilRankingsPage() {
  const admin = getAdminClient();
  const { data: elo } = await admin
    .from('council_elo')
    .select('org_id, current_rating, tier, competition_rating, fund_rating')
    .order('current_rating', { ascending: false })
    .limit(200);
  const rows = elo || [];
  const orgIds = rows.map((r) => r.org_id);

  const [{ data: orgs }, { data: metrics }, { data: txns }] = await Promise.all([
    orgIds.length
      ? admin.from('organizations').select('id, name, university_name').in('id', orgIds)
      : Promise.resolve({ data: [] }),
    orgIds.length
      ? admin
          .from('council_fund_metrics')
          .select('org_id, roi_pct, sharpe, self_reported')
          .in('org_id', orgIds)
      : Promise.resolve({ data: [] }),
    orgIds.length
      ? admin
          .from('council_elo_transactions')
          .select('org_id, delta, created_at')
          .in('org_id', orgIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const orgById = new Map((orgs || []).map((o) => [o.id, o]));
  const metricById = new Map((metrics || []).map((m) => [m.org_id, m]));
  const moveById = new Map();
  for (const t of txns || []) if (!moveById.has(t.org_id)) moveById.set(t.org_id, t.delta); // latest per org

  // Assemble plain, serializable rows for the interactive client table.
  const tableRows = rows.map((r) => {
    const org = orgById.get(r.org_id);
    const m = metricById.get(r.org_id);
    return {
      orgId: r.org_id,
      name: org?.university_name || org?.name || 'Council',
      tier: r.tier,
      rating: r.current_rating,
      comp: r.competition_rating,
      fund: r.fund_rating,
      roi: m?.roi_pct ?? null,
      sharpe: m?.sharpe ?? null,
      selfReported: !!m?.self_reported,
      move: moveById.get(r.org_id) || 0,
    };
  });

  return (
    <div className="crx-page">
      <div className="crx-container">
        <header className="crx-hero">
          <p className="crx-eyebrow">Ezana</p>
          <h1 className="crx-title">University Council Rankings</h1>
          <p className="crx-sub">
            Ranked by competition results (judged) and fund performance ratios. Competition is
            weighted {Math.round(WEIGHTS.blend.competition * 100)}% and fund{' '}
            {Math.round(WEIGHTS.blend.fund * 100)}%, because judged results are externally verified
            and fund ratios are self-reported. We show ROI and Sharpe — never dollar amounts.
          </p>
        </header>

        {tableRows.length === 0 ? (
          <p className="crx-empty">
            Rankings will appear here once councils compete and report their ratios.
          </p>
        ) : (
          <RankingsTable rows={tableRows} />
        )}

        <footer className="crx-footer">
          Fund ratios are self-reported by councils and flagged as such. Competition results are
          verified by competition judges. Powered by Ezana.
        </footer>
      </div>
    </div>
  );
}
