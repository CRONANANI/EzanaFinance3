'use client';

/**
 * The right-hand stack for a sector screen (Nov 4): "Which defense stocks are
 * members of Congress trading?" Three cards, in the order the ping asked:
 *
 *   Congress trading   12 months of disclosed trades: buys and sales by
 *                      month, the most traded stocks, the most active members
 *   Best performers    the sector's stocks by year-to-date move
 *   Contracts          the companies with the largest federal (for defense,
 *                      Department of Defense) obligations by fiscal year
 *
 * Same .snr-news shells as the other stacks, so the card entrance and the
 * orbital's "last card landed" signal hold. The landing band (full=false)
 * keeps one card; the /sonar page shows all three and the news rail below.
 * Every row opens the account gate, like every other dossier link.
 */
import './sonar-sector.css';

const usd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${Math.round(n / 1e3)}K`;
};
const pct = (v) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : 'n/a');
const tone = (v) => (typeof v === 'number' ? (v >= 0 ? 'is-up' : 'is-down') : '');
const shortDate = (d) => {
  if (!d) return '';
  const x = new Date(`${String(d).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(x.getTime())
    ? ''
    : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};
const monthLabel = (m) => {
  const x = new Date(`${m}-01T00:00:00Z`);
  return x.toLocaleDateString('en-US', { month: 'narrow', timeZone: 'UTC' });
};

/* Buys above the axis, sales below, one column per month. */
function MonthlyBars({ monthly }) {
  const W = 240;
  const H = 72;
  const mid = H / 2;
  const max = Math.max(1, ...monthly.map((m) => Math.max(m.buys, m.sells)));
  const step = W / monthly.length;
  const bw = Math.max(4, step - 6);
  const scale = (n) => (n / max) * (mid - 6);
  return (
    <div className="snr-sec-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2={W} y1={mid} y2={mid} className="snr-sec-axis" />
        {monthly.map((m, i) => {
          const x = i * step + (step - bw) / 2;
          return (
            <g key={m.month}>
              {m.buys ? (
                <rect
                  className="snr-sec-bar is-buy"
                  x={x}
                  y={mid - scale(m.buys)}
                  width={bw}
                  height={scale(m.buys)}
                  rx="1.5"
                />
              ) : null}
              {m.sells ? (
                <rect
                  className="snr-sec-bar is-sell"
                  x={x}
                  y={mid}
                  width={bw}
                  height={scale(m.sells)}
                  rx="1.5"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="snr-sec-months" aria-hidden="true">
        {monthly.map((m) => (
          <span key={m.month}>{monthLabel(m.month)}</span>
        ))}
      </div>
      <div className="snr-sec-legend">
        <span className="snr-sec-key is-buy">Purchases</span>
        <span className="snr-sec-key is-sell">Sales</span>
      </div>
    </div>
  );
}

function CongressCard({ data, label, onGate }) {
  return (
    <div className="snr-news snr-sec-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Congress trading in {label}</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">{data.window}</span>
      </div>
      <div className="snr-sec-stats">
        <div className="snr-stat">
          <span className="snr-stat-label">Trades</span>
          <span className="snr-stat-value">{data.total}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Purchases</span>
          <span className="snr-stat-value is-up">{data.buys}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Sales</span>
          <span className="snr-stat-value is-down">{data.sells}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Members</span>
          <span className="snr-stat-value">{data.memberCount}</span>
        </div>
      </div>
      <MonthlyBars monthly={data.monthly} />
      <div className="snr-sec-table" role="table" aria-label={`Most traded ${label} stocks`}>
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Stock</span>
          <span role="columnheader">Trades</span>
          <span role="columnheader">Members</span>
          <span role="columnheader">Buy / Sell</span>
          <span role="columnheader">Last</span>
        </div>
        {data.byTicker.slice(0, 6).map((t) => (
          <button key={t.ticker} type="button" className="snr-sec-tr" role="row" onClick={onGate}>
            <span role="cell" className="snr-sec-tk" title={t.name || t.ticker}>
              {t.ticker}
            </span>
            <span role="cell">{t.trades}</span>
            <span role="cell">{t.members}</span>
            <span role="cell">
              <span className="is-up">{t.buys}</span>
              {' / '}
              <span className="is-down">{t.sells}</span>
            </span>
            <span role="cell">{shortDate(t.last)}</span>
          </button>
        ))}
      </div>
      {data.byMember?.length ? (
        <div className="snr-sec-members">
          <span className="snr-sec-sub">Most active members</span>
          {data.byMember.slice(0, 4).map((m) => (
            <button key={m.bioguideId} type="button" className="snr-sec-member" onClick={onGate}>
              <span className="snr-sec-member-name">{m.name}</span>
              <span className="snr-sec-member-meta">
                {[m.party, m.state].filter(Boolean).join('-')} · {m.trades} trades ·{' '}
                {m.tickers.slice(0, 3).join(', ')}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="snr-news-more" onClick={onGate}>
        Open the politician tracker
        <i className="bi bi-arrow-right" aria-hidden="true" />
      </button>
    </div>
  );
}

function PerformanceCard({ data, label, onGate }) {
  const rows = data.rows.slice(0, 8);
  const span = Math.max(1, ...rows.map((r) => Math.abs(r.basis === 'ytd' ? r.ytd : r.y1)));
  return (
    <div className="snr-news snr-sec-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Best performing {label} stocks</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">YTD</span>
      </div>
      <div className="snr-sec-table snr-sec-table--perf" role="table" aria-label="Best performers">
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Stock</span>
          <span role="columnheader" aria-label="Year to date" />
          <span role="columnheader">YTD</span>
          <span role="columnheader">1Y</span>
          <span role="columnheader">1M</span>
        </div>
        {rows.map((r) => {
          const v = r.basis === 'ytd' ? r.ytd : r.y1;
          return (
            <button key={r.ticker} type="button" className="snr-sec-tr" role="row" onClick={onGate}>
              <span role="cell" className="snr-sec-tk" title={r.name || r.ticker}>
                {r.ticker}
              </span>
              <span role="cell" className="snr-sec-meter" aria-hidden="true">
                <span
                  className={`snr-sec-fill ${tone(v)}`}
                  style={{ width: `${Math.max(3, (Math.abs(v) / span) * 100)}%` }}
                />
              </span>
              <span role="cell" className={tone(r.ytd)}>
                {pct(r.ytd)}
              </span>
              <span role="cell" className={tone(r.y1)}>
                {pct(r.y1)}
              </span>
              <span role="cell" className={tone(r.m1)}>
                {pct(r.m1)}
              </span>
            </button>
          );
        })}
      </div>
      <p className="snr-pol-note">
        Share price change as of {data.asOf}, across {data.count} {label.toLowerCase()} stocks.
      </p>
    </div>
  );
}

function ContractsCard({ data, label, agencyShort, onGate }) {
  const rows = data.rows.slice(0, 8);
  const key = data.rankBy;
  const top = Math.max(1, ...rows.map((r) => r[key]));
  const rankFy = key === 'latest' ? data.latestFy : data.priorFy;
  return (
    <div className="snr-news snr-sec-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">
          Most {agencyShort ? `${agencyShort} ` : 'government '}contracts
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">FY{rankFy}</span>
      </div>
      <div
        className="snr-sec-table snr-sec-table--k"
        role="table"
        aria-label="Contract obligations"
      >
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Company</span>
          <span role="columnheader" aria-label={`FY${rankFy} share`} />
          <span role="columnheader">FY{data.priorFy}</span>
          <span role="columnheader">
            FY{data.latestFy}
            {data.latestComplete ? '' : '*'}
          </span>
        </div>
        {rows.map((r) => (
          <button key={r.ticker} type="button" className="snr-sec-tr" role="row" onClick={onGate}>
            <span role="cell" className="snr-sec-tk" title={r.ticker}>
              {r.name || r.ticker}
            </span>
            <span role="cell" className="snr-sec-meter" aria-hidden="true">
              <span
                className="snr-sec-fill"
                style={{ width: `${Math.max(3, (r[key] / top) * 100)}%` }}
              />
            </span>
            <span role="cell">{usd(r.prior)}</span>
            <span role="cell">{usd(r.latest)}</span>
          </button>
        ))}
      </div>
      <p className="snr-pol-note">
        Federal contract obligations{agencyShort ? ` from the ${agencyShort}` : ''} to{' '}
        {label.toLowerCase()} companies.
        {data.latestComplete ? '' : ` *FY${data.latestFy} reflects obligations synced so far.`}
      </p>
    </div>
  );
}

export function SonarSectorStack({
  dossier,
  onGate,
  topSlot = null,
  newsSlot = null,
  full = false,
}) {
  const label = dossier.industry?.label || 'Sector';
  const cards = {
    congress: dossier.congress ? (
      <CongressCard key="congress" data={dossier.congress} label={label} onGate={onGate} />
    ) : null,
    performance: dossier.performance ? (
      <PerformanceCard key="performance" data={dossier.performance} label={label} onGate={onGate} />
    ) : null,
    contracts: dossier.contracts ? (
      <ContractsCard
        key="contracts"
        data={dossier.contracts}
        label={label}
        agencyShort={dossier.agencyShort}
        onGate={onGate}
      />
    ) : null,
  };
  const ordered = (dossier.order || ['congress', 'performance', 'contracts'])
    .map((id) => cards[id])
    .filter(Boolean);
  return (
    <div className="snr-stack snr-stack--sector">
      {topSlot}
      {full ? ordered : ordered.slice(0, 1)}
      {ordered.length ? null : (
        <div className="snr-news snr-sec-card">
          <p className="snr-pol-empty">No sector data came back for this ping.</p>
        </div>
      )}
      {newsSlot}
    </div>
  );
}

export default SonarSectorStack;
