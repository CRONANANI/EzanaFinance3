'use client';

/**
 * The right-hand stack for a 13F flows ping (Nov 4): "What are hedge funds
 * selling right now?" Built from the flow-leaders snapshot
 * (refresh_titans_flows, src/lib/sonar/landing-flows.js). Cards, in order:
 *
 *   Most sold (or bought)  four headline counts, a diverging bar chart of
 *                          dollars sold vs bought per name, and the table
 *                          (sold, bought, sellers vs buyers, holder change)
 *   Sector flows           net dollar flow per GICS sector, diverging
 *   Who sold               the largest sellers and the largest full exits
 *   Early filings          the quarter still being filed, when enough of it
 *                          is in to say anything
 *
 * Same .snr-news shells and .snr-sec-* table classes as the sector stack, so
 * the card entrance, the orbital's "last card landed" signal and the table
 * styling hold. The landing band (full=false) keeps the first card; the
 * /sonar page and /datasets show them all. Rows open the account gate.
 */
import './sonar-flows.css';

const usd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '$0';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(a >= 1e10 ? 0 : 1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(0)}M`;
  return `${s}$${Math.round(a / 1e3)}K`;
};
const signedUsd = (v) => (Number(v) > 0 ? `+${usd(v)}` : usd(v));
const sharePct = (v) =>
  typeof v === 'number' && v > 0 ? `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%` : '0%';

/* Sold to the left of the axis, bought to the right, one row per name. */
function DivergingBars({ rows, leftKey, rightKey, leftLabel, rightLabel, labelOf }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r[leftKey] || 0, r[rightKey] || 0)));
  return (
    <div className="snr-flw-div" role="img" aria-label={`${leftLabel} and ${rightLabel} by name`}>
      {rows.map((r) => (
        <div key={labelOf(r)} className="snr-flw-div-row">
          <span className="snr-flw-div-label" title={r.issuer || labelOf(r)}>
            {labelOf(r)}
          </span>
          <span className="snr-flw-div-track is-left" aria-hidden="true">
            <span
              className="snr-flw-div-bar is-sell"
              style={{ width: `${((r[leftKey] || 0) / max) * 100}%` }}
            />
          </span>
          <span className="snr-flw-div-axis" aria-hidden="true" />
          <span className="snr-flw-div-track is-right" aria-hidden="true">
            <span
              className="snr-flw-div-bar is-buy"
              style={{ width: `${((r[rightKey] || 0) / max) * 100}%` }}
            />
          </span>
        </div>
      ))}
      <div className="snr-sec-legend">
        <span className="snr-sec-key is-sell">{leftLabel}</span>
        <span className="snr-sec-key is-buy">{rightLabel}</span>
      </div>
    </div>
  );
}

function CoverageNote({ d }) {
  const c = d.coverage;
  return (
    <p className="snr-pol-note">
      {c.filersCompared.toLocaleString('en-US')} of {c.filersTotal.toLocaleString('en-US')} 13F
      filers reported both {d.priorLabel} and {d.quarterLabel}, holding {usd(c.bookCompared)} of{' '}
      {usd(c.bookTotal)} reported ({sharePct(c.share)}). Dollar flow is the share change at the
      quarter-end price. 13F shows long US equity positions at quarter end, filed up to 45 days
      later; short positions are not reported.
    </p>
  );
}

function HeadlineCard({ d, onGate }) {
  const selling = d.side !== 'buy';
  const rows = (selling ? d.mostSold : d.mostBought).slice(0, 8);
  const title = selling ? 'Most sold by 13F filers' : 'Most bought by 13F filers';
  return (
    <div className="snr-news snr-sec-card snr-flw-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">
          {title}
          {d.sector ? ` in ${d.sector}` : ''}
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">{d.quarterLabel}</span>
      </div>
      <div className="snr-sec-stats">
        <div className="snr-stat">
          <span className="snr-stat-label">Filers compared</span>
          <span className="snr-stat-value">
            {d.coverage.filersCompared.toLocaleString('en-US')}
          </span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Sold</span>
          <span className="snr-stat-value is-down">{usd(d.totals.soldUsd)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Bought</span>
          <span className="snr-stat-value is-up">{usd(d.totals.boughtUsd)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Full exits</span>
          <span className="snr-stat-value">{d.totals.exits.toLocaleString('en-US')}</span>
        </div>
      </div>
      {rows.length ? (
        <>
          <DivergingBars
            rows={rows}
            leftKey="soldUsd"
            rightKey="boughtUsd"
            leftLabel="Sold"
            rightLabel="Bought"
            labelOf={(r) => r.label}
          />
          <div className="snr-sec-table snr-flw-table" role="table" aria-label={`${title} table`}>
            <div className="snr-sec-tr snr-sec-th" role="row">
              <span role="columnheader">Stock</span>
              <span role="columnheader">Sold</span>
              <span role="columnheader">Bought</span>
              <span role="columnheader">Sell / Buy</span>
              <span role="columnheader">Holders</span>
            </div>
            {rows.map((r) => (
              <button
                key={r.cusip || r.label}
                type="button"
                className="snr-sec-tr"
                role="row"
                onClick={onGate}
              >
                <span role="cell" className="snr-sec-tk" title={r.issuer || r.label}>
                  {r.label}
                </span>
                <span role="cell" className="is-down">
                  {usd(r.soldUsd)}
                </span>
                <span role="cell" className="is-up">
                  {usd(r.boughtUsd)}
                </span>
                <span role="cell">
                  <span className="is-down">{r.sellers}</span>
                  {' / '}
                  <span className="is-up">{r.buyers}</span>
                </span>
                <span role="cell">
                  {r.holdersPrior}
                  <i className="bi bi-arrow-right snr-flw-arrow" aria-hidden="true" />
                  {r.holdersNow}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="snr-pol-empty">
          No name had two or more filers {selling ? 'selling' : 'buying'} it
          {d.sector ? ` in ${d.sector}` : ''} this quarter.
        </p>
      )}
      <CoverageNote d={d} />
      <button type="button" className="snr-news-more" onClick={onGate}>
        Open 13F institutional holdings
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </button>
    </div>
  );
}

function SectorCard({ d, onGate }) {
  const rows = [...d.sectors].sort((a, b) => a.netUsd - b.netUsd).slice(0, 11);
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.netUsd)));
  return (
    <div className="snr-news snr-sec-card snr-flw-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Sector flows</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">Net {d.quarterLabel}</span>
      </div>
      <div className="snr-flw-net" role="table" aria-label="Net dollar flow by sector">
        {rows.map((r) => {
          const w = `${Math.max(2, (Math.abs(r.netUsd) / max) * 100)}%`;
          const down = r.netUsd < 0;
          return (
            <button
              key={r.sector}
              type="button"
              className="snr-flw-net-row"
              role="row"
              onClick={onGate}
            >
              <span role="cell" className="snr-flw-net-label">
                {r.sector}
              </span>
              <span role="cell" className="snr-flw-div-track is-left" aria-hidden="true">
                {down ? <span className="snr-flw-div-bar is-sell" style={{ width: w }} /> : null}
              </span>
              <span className="snr-flw-div-axis" aria-hidden="true" />
              <span role="cell" className="snr-flw-div-track is-right" aria-hidden="true">
                {down ? null : <span className="snr-flw-div-bar is-buy" style={{ width: w }} />}
              </span>
              <span role="cell" className={`snr-flw-net-value ${down ? 'is-down' : 'is-up'}`}>
                {signedUsd(r.netUsd)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="snr-pol-note">
        Net of dollars bought and sold by the compared filers, by GICS sector.
      </p>
    </div>
  );
}

function SellersCard({ d, onGate }) {
  return (
    <div className="snr-news snr-sec-card snr-flw-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Who sold the most</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">{d.quarterLabel}</span>
      </div>
      {d.sellers.length ? (
        <div
          className="snr-sec-table snr-flw-table--filers"
          role="table"
          aria-label="Largest sellers"
        >
          <div className="snr-sec-tr snr-sec-th" role="row">
            <span role="columnheader">Filer</span>
            <span role="columnheader">Sold</span>
            <span role="columnheader">Cut</span>
            <span role="columnheader">Exits</span>
          </div>
          {d.sellers.slice(0, 6).map((s) => (
            <button key={s.cik} type="button" className="snr-sec-tr" role="row" onClick={onGate}>
              <span role="cell" className="snr-sec-tk" title={s.filer}>
                {s.filer}
                {s.topSold.length ? (
                  <span className="snr-flw-sub">{s.topSold.join(' ')}</span>
                ) : null}
              </span>
              <span role="cell" className="is-down">
                {usd(s.soldUsd)}
              </span>
              <span role="cell">{s.cut}</span>
              <span role="cell">{s.exits}</span>
            </button>
          ))}
        </div>
      ) : null}
      {d.exits.length ? (
        <div className="snr-sec-members">
          <span className="snr-sec-sub">Largest full exits</span>
          {d.exits.slice(0, 5).map((e) => (
            <button
              key={`${e.cik}-${e.label}`}
              type="button"
              className="snr-sec-member"
              onClick={onGate}
            >
              <span className="snr-sec-member-name">{e.filer}</span>
              <span className="snr-sec-member-meta">
                {e.label} · {usd(e.valuePrior)}
                {e.pctOfPriorBook != null
                  ? ` · ${(e.pctOfPriorBook * 100).toFixed(1)}% of book`
                  : ''}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OpenQuarterCard({ d, onGate }) {
  const o = d.open;
  const rows = d.side === 'buy' ? o.mostBought : o.mostSold;
  if (!rows.length) return null;
  return (
    <div className="snr-news snr-sec-card snr-flw-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Early filings</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">{o.quarterLabel}</span>
      </div>
      <div className="snr-sec-table snr-flw-table--open" role="table" aria-label="Early filings">
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Stock</span>
          <span role="columnheader">{d.side === 'buy' ? 'Bought' : 'Sold'}</span>
          <span role="columnheader">Filers</span>
        </div>
        {rows.map((r) => (
          <button
            key={r.cusip || r.label}
            type="button"
            className="snr-sec-tr"
            role="row"
            onClick={onGate}
          >
            <span role="cell" className="snr-sec-tk">
              {r.label}
            </span>
            <span role="cell" className={d.side === 'buy' ? 'is-up' : 'is-down'}>
              {usd(d.side === 'buy' ? r.boughtUsd : r.soldUsd)}
            </span>
            <span role="cell">{d.side === 'buy' ? r.buyers : r.sellers}</span>
          </button>
        ))}
      </div>
      <p className="snr-pol-note">
        {o.coverage.filersCompared.toLocaleString('en-US')} filers are in for the quarter ending{' '}
        {o.quarterLabel}. The filing window is still open, so this is partial.
      </p>
    </div>
  );
}

export function SonarFlowsStack({
  dossier,
  onGate,
  topSlot = null,
  newsSlot = null,
  full = false,
}) {
  const d = dossier;
  const cards = [
    <HeadlineCard key="headline" d={d} onGate={onGate} />,
    d.open ? <OpenQuarterCard key="open" d={d} onGate={onGate} /> : null,
    !d.sector && d.sectors.length ? <SectorCard key="sectors" d={d} onGate={onGate} /> : null,
    d.sellers.length || d.exits.length ? <SellersCard key="sellers" d={d} onGate={onGate} /> : null,
  ].filter(Boolean);
  return (
    <div className="snr-stack snr-stack--flows">
      {topSlot}
      {full ? cards : cards.slice(0, 1)}
      {newsSlot}
    </div>
  );
}

export default SonarFlowsStack;
