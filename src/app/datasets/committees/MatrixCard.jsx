'use client';

/**
 * Card 8, Committee Holdings Matrix: mapped committees against the
 * most-held tickers in their sectors. A cell counts members of that
 * committee whose disclosures show an open position (inferred: bought and
 * not fully sold); hover or focus shows buyers and sellers since 180 days
 * and holder names. Counts and names only, never dollars. Phone: a ranked
 * list per committee.
 */
import { useMemo } from 'react';
import { HOLDINGS_FOOTNOTE, HOLDINGS_LABEL, heatScale } from '@/lib/congress/committees-page-model';
import { Card, SkelRows, fmtCount } from './ui';

const COLS = 7;

export default function MatrixCard({ view, chamber, sector, sub, empty, onCommittee }) {
  const data = view.data;
  const { rows, tickers, cellBy, max } = useMemo(() => {
    const committees = (data?.committees || []).filter(
      (c) =>
        (chamber === 'all' || c.chamber === chamber) &&
        (sector === 'all' || c.sectors.some((s) => s.key === sector)),
    );
    const ids = new Set(committees.map((c) => c.thomasId));
    const cells = (data?.cells || []).filter((c) => ids.has(c.committee));
    const byTicker = new Map();
    for (const c of cells) byTicker.set(c.ticker, (byTicker.get(c.ticker) || 0) + c.holders);
    const top = [...byTicker.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, COLS)
      .map(([t]) => t);
    const lookup = new Map(cells.map((c) => [`${c.committee}|${c.ticker}`, c]));
    const m = Math.max(1, ...cells.filter((c) => top.includes(c.ticker)).map((c) => c.holders));
    return { rows: committees, tickers: top, cellBy: lookup, max: m };
  }, [data, chamber, sector]);

  const isEmpty = view.status === 'ready' && (!rows.length || !tickers.length);
  return (
    <Card
      id="cmx-matrix"
      className="cmx-card--fill"
      title="Committee holdings matrix"
      sub={sub}
      right={<span className="cmx-mono cmx-faint cmx-matrix-label">{HOLDINGS_LABEL}</span>}
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      skeleton={<SkelRows n={8} h={32} />}
      footer={<p className="cmx-footnote">{HOLDINGS_FOOTNOTE}</p>}
    >
      {/* desktop and tablet: the heat grid */}
      <div className="cmx-matrix-scroll">
        <div
          className="cmx-matrix"
          role="grid"
          aria-label="Members holding each ticker, by committee"
          style={{ '--cmx-matrix-cols': tickers.length }}
        >
          <span className="cmx-matrix-corner" role="columnheader" aria-label="Committee" />
          {tickers.map((t) => (
            <span key={t} className="cmx-matrix-colhead cmx-mono" role="columnheader">
              {t}
            </span>
          ))}
          {rows.map((c) => (
            <div className="cmx-matrix-row" role="row" key={c.thomasId}>
              <button
                type="button"
                role="rowheader"
                className="cmx-matrix-rowlabel"
                onClick={() => onCommittee(c.thomasId)}
                aria-label={`Open the ${c.shortName} profile`}
              >
                <span className="cmx-ellipsis">{c.shortName}</span>
              </button>
              {tickers.map((t) => {
                const cell = cellBy.get(`${c.thomasId}|${t}`);
                const n = cell?.holders || 0;
                const heat = heatScale(n, max);
                const names = (cell?.holderNames || []).slice(0, 4);
                const extra = (cell?.holders || 0) - names.length;
                return (
                  <span key={t} role="gridcell" className="cmx-matrix-cellwrap">
                    <button
                      type="button"
                      className={`cmx-matrix-cell${heat > 0.5 ? ' is-deep' : ''}`}
                      style={{ '--cmx-cell-heat': heat }}
                      aria-label={
                        n
                          ? `${c.thomasId} and ${t}: ${n} members hold it. ${cell?.buyers || 0} bought and ${cell?.sellers || 0} sold since 180 days.${names.length ? ` Holders: ${names.join(', ')}${extra > 0 ? ` and ${extra} more` : ''}.` : ''}`
                          : `${c.thomasId} and ${t}: no member holds it.`
                      }
                    >
                      {n ? <span className="cmx-mono">{n}</span> : null}
                    </button>
                    {n ? (
                      <span className="cmx-matrix-tip" role="tooltip">
                        <span className="cmx-matrix-tip-head cmx-mono">
                          {c.thomasId} × {t} · {n} {n === 1 ? 'member holds it' : 'members hold it'}
                        </span>
                        <span className="cmx-matrix-tip-line">
                          <span className="cmx-buy-ink">{fmtCount(cell?.buyers)} bought</span> ·{' '}
                          <span className="cmx-sell-ink">{fmtCount(cell?.sellers)} sold</span> since
                          180 days
                        </span>
                        {names.length ? (
                          <span className="cmx-matrix-tip-names">
                            {names.join(', ')}
                            {extra > 0 ? ` +${extra}` : ''}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* phone: ranked list per committee */}
      <ul className="cmx-matrix-list">
        {rows.map((c) => {
          const mine = tickers
            .map((t) => cellBy.get(`${c.thomasId}|${t}`))
            .filter((cell) => cell?.holders)
            .sort((a, b) => b.holders - a.holders)
            .slice(0, 3);
          return (
            <li key={c.thomasId}>
              <button
                type="button"
                className="cmx-matrix-listrow"
                onClick={() => onCommittee(c.thomasId)}
              >
                <span className="cmx-ellipsis">{c.shortName}</span>
                <span className="cmx-mono">
                  {mine.length
                    ? mine.map((cell) => `${cell.ticker} ${cell.holders}`).join(' · ')
                    : 'No held tickers'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
