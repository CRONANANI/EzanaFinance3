import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase';
import '../council-rankings.css';

export const dynamic = 'force-dynamic';

const TIER_LABEL = { emerging: 'Emerging', competitive: 'Competitive', established: 'Established', elite: 'Elite', dynasty: 'Dynasty' };
const fmtRatio = (v, suffix = '') => (v == null ? '—' : `${Number(v).toFixed(suffix === '%' ? 1 : 2)}${suffix}`);
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export default async function CouncilDetailPage({ params }) {
  const { orgId } = await params;
  const admin = getAdminClient();
  const { data: elo } = await admin
    .from('council_elo')
    .select('org_id, current_rating, peak_rating, tier, competition_rating, fund_rating, updated_at')
    .eq('org_id', orgId)
    .maybeSingle();
  if (!elo) notFound();

  const [{ data: org }, { data: metrics }, { data: txns }] = await Promise.all([
    admin.from('organizations').select('name, university_name').eq('id', orgId).maybeSingle(),
    admin.from('council_fund_metrics').select('roi_pct, sharpe, max_drawdown_pct, volatility_pct, benchmark_alpha_pct, period_label, self_reported').eq('org_id', orgId).maybeSingle(),
    admin.from('council_elo_transactions').select('delta, component, reason, rating_after, created_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(40),
  ]);
  const name = org?.university_name || org?.name || 'Council';

  return (
    <div className="crx-page">
      <div className="crx-container">
        <Link href="/council-rankings" className="crx-back">← All councils</Link>
        <header className="crx-hero crx-hero--detail">
          <div>
            <h1 className="crx-title">{name}</h1>
            <span className={`crx-tier crx-tier--${elo.tier}`}>{TIER_LABEL[elo.tier] || elo.tier}</span>
          </div>
          <div className="crx-bigrating">
            <span className="crx-bigrating-num">{elo.current_rating}</span>
            <span className="crx-bigrating-label">rating · peak {elo.peak_rating}</span>
          </div>
        </header>

        <div className="crx-split">
          <div className="crx-split-card">
            <div className="crx-split-label">Competition</div>
            <div className="crx-split-val">{elo.competition_rating}</div>
            <div className="crx-split-note">Judged results</div>
          </div>
          <div className="crx-split-card">
            <div className="crx-split-label">Fund</div>
            <div className="crx-split-val">{elo.fund_rating}</div>
            <div className="crx-split-note">{metrics?.self_reported ? 'Self-reported ratios' : 'Ratios'}</div>
          </div>
        </div>

        {metrics ? (
          <section className="crx-section">
            <h2 className="crx-h2">Fund ratios{metrics.period_label ? ` · ${metrics.period_label}` : ''}</h2>
            <div className="crx-ratios">
              <Ratio label="ROI" v={fmtRatio(metrics.roi_pct, '%')} />
              <Ratio label="Sharpe" v={fmtRatio(metrics.sharpe)} />
              <Ratio label="Max drawdown" v={fmtRatio(metrics.max_drawdown_pct, '%')} />
              <Ratio label="Volatility" v={fmtRatio(metrics.volatility_pct, '%')} />
              <Ratio label="Alpha" v={fmtRatio(metrics.benchmark_alpha_pct, '%')} />
            </div>
            <p className="crx-note">Ratios only — dollar amounts are never stored or shown.</p>
          </section>
        ) : null}

        <section className="crx-section">
          <h2 className="crx-h2">Rating history</h2>
          {(txns || []).length === 0 ? (
            <p className="crx-note">No rating changes yet.</p>
          ) : (
            <ul className="crx-history">
              {txns.map((t, i) => (
                <li key={i} className="crx-hrow">
                  <span className={`crx-hdelta ${t.delta > 0 ? 'crx-up' : t.delta < 0 ? 'crx-down' : ''}`}>
                    {t.delta > 0 ? `+${t.delta}` : t.delta}
                  </span>
                  <span className="crx-hreason">{t.reason}</span>
                  <span className="crx-hmeta">{fmtDate(t.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Ratio({ label, v }) {
  return (
    <div className="crx-ratio">
      <div className="crx-ratio-label">{label}</div>
      <div className="crx-ratio-val">{v}</div>
    </div>
  );
}
