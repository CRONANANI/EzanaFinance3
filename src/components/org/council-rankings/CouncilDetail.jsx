import Link from 'next/link';
import {
  COMP_WEIGHT,
  FUND_WEIGHT,
  NA,
  changeReason,
  fmtDate,
  fmtDrawdown,
  fmtInt,
  fmtPct,
  fmtPctSigned,
  fmtRatio,
  partLabel,
  toneOf,
} from '@/lib/council-rankings-model';
import { SelfReported, Signed, Tier } from './CouncilParts';

/**
 * One council's page (/council-rankings/[orgId]): how its rating is earned,
 * the competition part, the fund part with its reported ratios, and its
 * rating history. Always that council's own figures, passed in whole by the
 * server page. Rating changes carry the part that moved more and a generic
 * reason: the stored record never names an event or placement.
 *
 * No hooks: rendered on the server inside TeamHubShell.
 */
function Ratio({ label, value, tone }) {
  return (
    <div className="crx-ratio">
      <dt>{label}</dt>
      <dd className={`tcc-mono${value === NA ? ' tcc-na' : ''}${tone ? ` tcc-${tone}` : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function ChangeRows({ rows, showPart }) {
  return (
    <table className={`crx-table crx-history${showPart ? '' : ' crx-history--short'}`}>
      <thead>
        <tr>
          <th scope="col" className="crx-num crx-h-delta">
            Points
          </th>
          {showPart && (
            <th scope="col" className="crx-h-part">
              Part
            </th>
          )}
          <th scope="col">Reason</th>
          {showPart && (
            <th scope="col" className="crx-num crx-h-after">
              Rating after
            </th>
          )}
          <th scope="col" className="crx-num crx-h-date">
            Date
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={`${t.created_at}-${i}`}>
            <td className="crx-num crx-h-delta">
              <Signed value={t.delta} />
            </td>
            {showPart && <td className="crx-h-part">{partLabel(t.component)}</td>}
            <td className="crx-h-reason">{changeReason(t.component)}</td>
            {showPart && <td className="crx-num crx-h-after tcc-mono">{fmtInt(t.rating_after)}</td>}
            <td className="crx-num crx-h-date tcc-mono">{fmtDate(t.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CouncilDetail({ council, mine = false, sample = false }) {
  const c = council;
  const m = c.metrics;
  const txns = c.txns || [];
  const compTxns = txns.filter((t) => t.component === 'competition');
  const competed = compTxns.length > 0 || c.comp !== 1000;

  return (
    <div className="dashboard-page-inset ez-canvas tcc-page crx-page crx-detail">
      <div className="crx-container">
        <div className="crx-actions">
          <Link href="/council-rankings" className="tcc-link crx-back">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            All councils
          </Link>
          {sample && <span className="tcc-sample">Sample content</span>}
        </div>

        <header className="crx-dhead">
          <div className="crx-dhead__name">
            <h1 className="crx-dtitle">{c.name}</h1>
            {mine && <span className="crx-mine">Your council</span>}
          </div>
          <dl className="crx-dstats">
            <div>
              <dt>Overall rating</dt>
              <dd className="tcc-mono">{fmtInt(c.rating)}</dd>
            </div>
            <div>
              <dt>Peak rating</dt>
              <dd className="tcc-mono">{fmtInt(c.peak)}</dd>
            </div>
            <div>
              <dt>Tier</dt>
              <dd>
                <Tier tier={c.tier} />
              </dd>
            </div>
          </dl>
        </header>
        <p className="crx-method">
          The rating is {COMP_WEIGHT}% competition (judged results, verified) and {FUND_WEIGHT}%
          fund (ratios the council reports, self-reported). Both parts start at 1000. Ratios only,
          never dollar amounts.
        </p>

        <section className="tcc-row crx-dsplit" aria-label="How the rating is earned">
          <div className="tcc-section">
            <h2 className="crx-subtitle">Competition ({COMP_WEIGHT}%)</h2>
            <p className="crx-big tcc-mono">{fmtInt(c.comp)}</p>
            <p className="crx-why">
              {competed
                ? 'From judged competition results. Placing above a higher rated council gains more.'
                : 'No placement in a judged event with at least two councils yet, so it reads 1000.'}
            </p>
          </div>
          <span className="tcc-vrule" aria-hidden="true" />
          <div className="tcc-section">
            <h2 className="crx-subtitle">Fund ({FUND_WEIGHT}%)</h2>
            <p className="crx-big tcc-mono">{fmtInt(c.fund)}</p>
            <p className="crx-why">
              {m
                ? 'From reported fund ratios, placed relative to every reporting council, so it can move when others report.'
                : 'No fund ratios reported yet, so it reads 1000.'}{' '}
              {m?.self_reported && <SelfReported />}
            </p>
          </div>
        </section>

        <div className="tcc-row crx-drow">
          <section className="tcc-section" aria-labelledby="crx-comp-title">
            <h2 className="crx-subtitle" id="crx-comp-title">
              Competition contribution
            </h2>
            {compTxns.length === 0 ? (
              <p className="tcc-state">
                No rating change from the competition part yet. It reads 1000 until the council
                places in a judged event.
              </p>
            ) : (
              <ChangeRows rows={compTxns.slice(0, 10)} />
            )}
          </section>
          <span className="tcc-vrule" aria-hidden="true" />
          <section className="tcc-section" aria-labelledby="crx-fund-title">
            <h2 className="crx-subtitle crx-subtitle--row" id="crx-fund-title">
              <span>Fund contribution</span>
              {m?.self_reported && <SelfReported period={m.period_label} />}
              {m && !m.self_reported && m.period_label ? (
                <span className="crx-self__period">{m.period_label}</span>
              ) : null}
            </h2>
            {m ? (
              <>
                <dl className="crx-ratios">
                  <Ratio label="Sharpe" value={fmtRatio(m.sharpe)} />
                  <Ratio label="ROI" value={fmtPctSigned(m.roi_pct)} tone={toneOf(m.roi_pct)} />
                  <Ratio
                    label="Alpha"
                    value={fmtPctSigned(m.benchmark_alpha_pct)}
                    tone={toneOf(m.benchmark_alpha_pct)}
                  />
                  <Ratio label="Max drawdown" value={fmtDrawdown(m.max_drawdown_pct)} />
                  <Ratio label="Volatility" value={fmtPct(m.volatility_pct)} />
                </dl>
                <p className="crx-method crx-method--foot">
                  Sharpe counts most, then alpha, then return, less max drawdown. Councils may
                  report different periods.
                </p>
              </>
            ) : (
              <p className="tcc-state">No fund ratios reported yet. The fund part reads 1000.</p>
            )}
          </section>
        </div>

        <section className="crx-dhistory" aria-labelledby="crx-history-title">
          <h2 className="crx-subtitle" id="crx-history-title">
            Rating history
          </h2>
          {txns.length === 0 ? (
            <p className="tcc-state">No rating changes yet.</p>
          ) : (
            <ChangeRows rows={txns.slice(0, 40)} showPart />
          )}
          {txns.length > 0 && (
            <p className="crx-method crx-method--foot">
              Each change is tagged with the part that moved more. The latest{' '}
              <span className="tcc-mono">{Math.min(40, txns.length)}</span> changes are shown.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
