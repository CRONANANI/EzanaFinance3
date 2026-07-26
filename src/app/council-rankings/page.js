import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase';
import './council-rankings.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'University Council Rankings — Ezana' };

const TIER_LABEL = { emerging: 'Emerging', competitive: 'Competitive', established: 'Established', elite: 'Elite', dynasty: 'Dynasty' };

const fmtRatio = (v, suffix = '') => (v == null ? '—' : `${Number(v).toFixed(suffix === '%' ? 1 : 2)}${suffix}`);

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
    orgIds.length ? admin.from('organizations').select('id, name, university_name').in('id', orgIds) : Promise.resolve({ data: [] }),
    orgIds.length ? admin.from('council_fund_metrics').select('org_id, roi_pct, sharpe, self_reported').in('org_id', orgIds) : Promise.resolve({ data: [] }),
    orgIds.length ? admin.from('council_elo_transactions').select('org_id, delta, created_at').in('org_id', orgIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const orgById = new Map((orgs || []).map((o) => [o.id, o]));
  const metricById = new Map((metrics || []).map((m) => [m.org_id, m]));
  const moveById = new Map();
  for (const t of txns || []) if (!moveById.has(t.org_id)) moveById.set(t.org_id, t.delta); // latest per org

  return (
    <div className="crx-page">
      <div className="crx-container">
        <header className="crx-hero">
          <p className="crx-eyebrow">Ezana</p>
          <h1 className="crx-title">University Council Rankings</h1>
          <p className="crx-sub">
            Ranked by competition results (judged) and fund performance ratios. We show ROI and Sharpe —
            never dollar amounts.
          </p>
        </header>

        {rows.length === 0 ? (
          <p className="crx-empty">Rankings will appear here once councils compete and report their ratios.</p>
        ) : (
          <div className="crx-table-wrap">
            <table className="crx-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Council</th>
                  <th>Tier</th>
                  <th className="crx-num">Rating</th>
                  <th className="crx-num">Comp</th>
                  <th className="crx-num">Fund</th>
                  <th className="crx-num">ROI</th>
                  <th className="crx-num">Sharpe</th>
                  <th className="crx-num">Move</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const org = orgById.get(r.org_id);
                  const m = metricById.get(r.org_id);
                  const move = moveById.get(r.org_id) || 0;
                  return (
                    <tr key={r.org_id}>
                      <td className="crx-rank">{i + 1}</td>
                      <td>
                        <Link href={`/council-rankings/${r.org_id}`} className="crx-council">
                          {org?.university_name || org?.name || 'Council'}
                        </Link>
                        {m?.self_reported ? <span className="crx-flag" title="Fund ratios are self-reported">self-reported</span> : null}
                      </td>
                      <td><span className={`crx-tier crx-tier--${r.tier}`}>{TIER_LABEL[r.tier] || r.tier}</span></td>
                      <td className="crx-num crx-strong">{r.current_rating}</td>
                      <td className="crx-num">{r.competition_rating}</td>
                      <td className="crx-num">{r.fund_rating}</td>
                      <td className="crx-num">{fmtRatio(m?.roi_pct, '%')}</td>
                      <td className="crx-num">{fmtRatio(m?.sharpe)}</td>
                      <td className={`crx-num ${move > 0 ? 'crx-up' : move < 0 ? 'crx-down' : ''}`}>
                        {move > 0 ? `+${move}` : move || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <footer className="crx-footer">
          Fund ratios are self-reported by councils and flagged as such. Competition results are verified
          by competition judges. Powered by Ezana.
        </footer>
      </div>
    </div>
  );
}
