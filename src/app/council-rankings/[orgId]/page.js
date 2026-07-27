import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase';
import { WEIGHTS } from '@/lib/council-elo/model';
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

  // Weighted contribution of each engine to the overall rating (blend weights).
  const compContribRaw = WEIGHTS.blend.competition * (elo.competition_rating ?? WEIGHTS.elo.base);
  const fundContribRaw = WEIGHTS.blend.fund * (elo.fund_rating ?? WEIGHTS.fund.ratingBase);
  const contribTotal = compContribRaw + fundContribRaw || 1;
  const compPct = (compContribRaw / contribTotal) * 100;
  const fundPct = (fundContribRaw / contribTotal) * 100;
  const compWeightPct = Math.round(WEIGHTS.blend.competition * 100);
  const fundWeightPct = Math.round(WEIGHTS.blend.fund * 100);

  const allTxns = txns || [];
  const compTxns = allTxns.filter((t) => t.component === 'competition');

  return (
    <div className="crx-page">
      <div className="crx-container">
        <Link href="/council-rankings" className="crx-back">← All councils</Link>
        <header className="crx-hero crx-hero--detail">
          <div>
            <p className="crx-eyebrow">Ezana · Council Rankings</p>
            <h1 className="crx-title">{name}</h1>
            <span className={`crx-tier crx-tier--${elo.tier}`}>{TIER_LABEL[elo.tier] || elo.tier}</span>
          </div>
          <div className="crx-bigrating">
            <span className="crx-bigrating-num">{elo.current_rating}</span>
            <span className="crx-bigrating-label">rating · peak {elo.peak_rating}</span>
          </div>
        </header>

        {/* How this council earns its rating — the weighted two-engine split. */}
        <section className="crx-section">
          <h2 className="crx-h2">How this council earns its rating</h2>
          <p className="crx-note crx-note--top">
            The overall rating blends two engines: <strong>Competition</strong> (judged results,
            weighted {compWeightPct}%) and <strong>Fund</strong> (self-reported ratios, weighted{' '}
            {fundWeightPct}%). Competition is weighted higher because it is externally verified.
          </p>
          <div
            className="crx-contrib"
            role="img"
            aria-label={`Competition contributes ${Math.round(compPct)} percent and fund ${Math.round(
              fundPct,
            )} percent of the overall rating`}
          >
            <span className="crx-contrib-comp" style={{ width: `${compPct}%` }}>
              <span className="crx-contrib-inner">Comp {Math.round(compPct)}%</span>
            </span>
            <span className="crx-contrib-fund" style={{ width: `${fundPct}%` }}>
              <span className="crx-contrib-inner">Fund {Math.round(fundPct)}%</span>
            </span>
          </div>
          <div className="crx-split">
            <div className="crx-split-card">
              <div className="crx-split-label">Competition · {compWeightPct}%</div>
              <div className="crx-split-val">{elo.competition_rating}</div>
              <div className="crx-split-note">
                Pairwise ELO across every competition — judge-verified. Beating a strong field moves you
                more.
              </div>
            </div>
            <div className="crx-split-card">
              <div className="crx-split-label">Fund · {fundWeightPct}%</div>
              <div className="crx-split-val">{elo.fund_rating}</div>
              <div className="crx-split-note">
                {metrics?.self_reported ? 'Self-reported ' : ''}risk-adjusted ratios, normalized across
                councils. Sharpe weighted most.
              </div>
            </div>
          </div>
        </section>

        {/* Competition contribution — the placements that awarded points. */}
        <section className="crx-section">
          <h2 className="crx-h2">Competition contribution</h2>
          {compTxns.length === 0 ? (
            <p className="crx-note">
              No competition results yet. This council&apos;s competition rating sits at the{' '}
              {WEIGHTS.elo.base} baseline until it places in a judged event.
            </p>
          ) : (
            <ul className="crx-history">
              {compTxns.map((t, i) => (
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

        {/* Fund contribution — the driving ratios, Sharpe emphasized. */}
        <section className="crx-section">
          <h2 className="crx-h2">
            Fund contribution{metrics?.period_label ? ` · ${metrics.period_label}` : ''}
            {metrics?.self_reported ? (
              <span className="crx-flag crx-flag--inline" title="Fund ratios are self-reported">
                self-reported
              </span>
            ) : null}
          </h2>
          {metrics ? (
            <>
              <div className="crx-ratios">
                <Ratio label="Sharpe" v={fmtRatio(metrics.sharpe)} tag="weighted most" emphasize />
                <Ratio label="ROI" v={fmtRatio(metrics.roi_pct, '%')} />
                <Ratio label="Alpha" v={fmtRatio(metrics.benchmark_alpha_pct, '%')} />
                <Ratio label="Max drawdown" v={fmtRatio(metrics.max_drawdown_pct, '%')} />
                <Ratio label="Volatility" v={fmtRatio(metrics.volatility_pct, '%')} />
              </div>
              <p className="crx-note">
                Sharpe (risk-adjusted return) is weighted above raw ROI on purpose — the score rewards
                good management, not the biggest swing. Ratios only; dollar amounts are never stored or
                shown.
              </p>
            </>
          ) : (
            <p className="crx-note">
              No fund ratios reported yet — the fund rating sits at the {WEIGHTS.fund.ratingBase} baseline
              until this council reports its ratios.
            </p>
          )}
        </section>

        {/* Full audit trail: where every point change came from. */}
        <section className="crx-section">
          <h2 className="crx-h2">Rating history</h2>
          {allTxns.length === 0 ? (
            <p className="crx-note">No rating changes yet.</p>
          ) : (
            <ul className="crx-history">
              {allTxns.map((t, i) => (
                <li key={i} className="crx-hrow">
                  <span className={`crx-hdelta ${t.delta > 0 ? 'crx-up' : t.delta < 0 ? 'crx-down' : ''}`}>
                    {t.delta > 0 ? `+${t.delta}` : t.delta}
                  </span>
                  <span className={`crx-hcomp crx-hcomp--${t.component}`}>{t.component}</span>
                  <span className="crx-hreason">{t.reason}</span>
                  <span className="crx-hmeta">{fmtDate(t.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="crx-footer">
          Fund ratios are self-reported by councils and flagged as such. Competition results are verified
          by competition judges. Powered by Ezana.
        </footer>
      </div>
    </div>
  );
}

function Ratio({ label, v, tag, emphasize }) {
  return (
    <div className={`crx-ratio ${emphasize ? 'crx-ratio--emphasize' : ''}`}>
      <div className="crx-ratio-label">
        {label}
        {tag ? <span className="crx-ratio-tag">{tag}</span> : null}
      </div>
      <div className="crx-ratio-val">{v}</div>
    </div>
  );
}
