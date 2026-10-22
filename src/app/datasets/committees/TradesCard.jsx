'use client';

/**
 * Card 7, Trades in Overseen Sectors: the window summary and the paged
 * feed. Amounts are disclosure ranges, as filed. The footnote is the shared
 * TRADE_FOOTNOTE string, pinned at the summary's foot.
 */
import { TRADE_FOOTNOTE, seatSplit } from '@/lib/congress/committees-page-model';
import {
  Card,
  CodeChip,
  Headshot,
  PartyTag,
  Segmented,
  SidePill,
  Skel,
  SkelRows,
  fmtCount,
  fmtDate,
  fmtRange,
} from './ui';

const SIDES = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buys' },
  { value: 'sell', label: 'Sells' },
];

export default function TradesCard({
  view,
  side,
  setSide,
  committee,
  setCommittee,
  committees,
  page,
  setPage,
  sub,
  empty,
  onMember,
  onCommittee,
}) {
  const data = view.data;
  const summary = data?.summary;
  const rows = data?.rows || [];
  const isEmpty = view.status === 'ready' && summary && !summary.trades;
  const splitLike = seatSplit(summary?.buys, summary?.sells);
  return (
    <Card
      id="cmx-trades"
      className="cmx-card--trades"
      title="Trades in overseen sectors"
      sub={sub}
      right={
        <>
          <Segmented label="Trade side" value={side} options={SIDES} onChange={setSide} />
          <label className="cmx-select">
            <span className="cmx-sr">Committee</span>
            <select value={committee || ''} onChange={(e) => setCommittee(e.target.value || null)}>
              <option value="">All committees</option>
              {committees.map((c) => (
                <option key={c.thomasId} value={c.thomasId}>
                  {c.shortName}
                </option>
              ))}
            </select>
          </label>
        </>
      }
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      skeleton={
        <div className="cmx-trades-grid">
          <div>
            <Skel h={120} />
          </div>
          <SkelRows n={8} h={40} />
        </div>
      }
    >
      <div className="cmx-trades-grid">
        <div className="cmx-trades-summary">
          <div className="cmx-tile">
            <p className="cmx-kicker cmx-kicker--sm">Trades in window</p>
            <p className="cmx-kpi cmx-kpi--lg cmx-mono">{fmtCount(summary?.trades)}</p>
            <span
              className="cmx-buysell"
              role="img"
              aria-label={`${summary?.buys || 0} buys, ${summary?.sells || 0} sells`}
            >
              <span className="cmx-buysell-buy" style={{ width: `${splitLike.majorityPct}%` }} />
              <span className="cmx-buysell-sell" style={{ width: `${splitLike.minorityPct}%` }} />
            </span>
            <p className="cmx-split-legend">
              <span>
                <i className="cmx-dot cmx-dot--buy" aria-hidden="true" /> Buys{' '}
                <span className="cmx-mono">{fmtCount(summary?.buys)}</span>
              </span>
              <span>
                <i className="cmx-dot cmx-dot--sell" aria-hidden="true" /> Sells{' '}
                <span className="cmx-mono">{fmtCount(summary?.sells)}</span>
              </span>
            </p>
          </div>
          <p className="cmx-quiet">
            <span className="cmx-mono">{fmtCount(summary?.members)}</span> members traded in the
            window.
          </p>
          <p className="cmx-quiet">
            <span className="cmx-mono">{fmtCount(summary?.unmapped)}</span> trades had tickers the
            sector map does not cover.
          </p>
          <p className="cmx-footnote">{TRADE_FOOTNOTE}</p>
        </div>

        <div className="cmx-feed-wrap">
          <table className="cmx-feed">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Member</th>
                <th scope="col">Side</th>
                <th scope="col">Ticker</th>
                <th scope="col" className="cmx-feed-amount">
                  Amount
                </th>
                <th scope="col">Sector</th>
                <th scope="col">Committee</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={`${t.bioguideId}-${t.transaction_date}-${t.ticker}-${i}`}>
                  <td className="cmx-mono">{fmtDate(t.transaction_date)}</td>
                  <td>
                    <button
                      type="button"
                      className="cmx-feed-member"
                      onClick={() => onMember(t.bioguideId)}
                      aria-label={`${t.member || t.bioguideId}. Open member lookup.`}
                    >
                      <Headshot name={t.member} size={22} />
                      <span className="cmx-ellipsis">{t.member || t.bioguideId}</span>
                      <PartyTag party={t.party} />
                      {t.state ? <span className="cmx-mono cmx-seatlabel">{t.state}</span> : null}
                    </button>
                  </td>
                  <td>
                    <SidePill side={t.side} />
                  </td>
                  <td>
                    <span className="cmx-ticker cmx-mono">{t.ticker}</span>
                  </td>
                  <td className="cmx-mono cmx-feed-amount">
                    {fmtRange(t.amount_min, t.amount_max)}
                  </td>
                  <td>{t.sector?.label}</td>
                  <td>
                    <button
                      type="button"
                      className="cmx-codebtn"
                      onClick={() => onCommittee(t.committee?.thomasId)}
                      aria-label={`Open the ${t.committee?.shortName} profile`}
                    >
                      <CodeChip code={t.committee?.thomasId} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data?.pages > 1 ? (
            <div className="cmx-pager">
              <span className="cmx-mono">
                Page {data.page} of {data.pages}
              </span>
              <span>
                <button
                  type="button"
                  className="cmx-btn cmx-btn--ghost"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="cmx-btn cmx-btn--ghost"
                  disabled={page >= data.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
