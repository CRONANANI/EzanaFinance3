'use client';

/**
 * Pulse row (Market Monitor 2.0, Nov 2026): tracked assets, market breadth
 * (or disclosed trades on the Politicians tab), new smart matches and
 * watchlist alerts, all from pulseSummary() in watchlist-view.js. Each cell
 * keeps the `wl-strip-card` shell the home canvas guard expects; the canvas
 * draws the hairlines between them. A card whose data is missing is left out.
 */
import Link from 'next/link';
import { fmtTime } from '@/lib/watchlist/watchlist-view';

function Cell({ icon, label, value, sub, children }) {
  return (
    <div className="wl-strip-card wlm-pulse__cell">
      <span className="wlm-pulse__icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <span className="wlm-pulse__text">
        <span className="wlm-pulse__label">{label}</span>
        <span className="wlm-num wlm-pulse__value">{value}</span>
        {sub ? <span className="wlm-pulse__sub">{sub}</span> : null}
        {children}
      </span>
    </div>
  );
}

/**
 * pulse        pulseSummary() output
 * loading      list data still loading (skeleton cells)
 * smartOnly    the table's smart-only filter is on
 * onSmartOnly  toggles it (the New smart matches card)
 */
export function PulseRow({ pulse, loading, smartOnly, onSmartOnly }) {
  if (loading || !pulse) {
    return (
      <div className="wlm-pulse" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="wl-strip-card wlm-pulse__cell">
            <span className="wlm-skel wlm-skel--pulse" />
          </div>
        ))}
      </div>
    );
  }
  const { tracked, breadth, disclosures, smartMatches, alerts } = pulse;
  return (
    <section className="wlm-pulse" aria-label="Watchlist pulse">
      <Cell
        icon="bi-bookmark"
        label="Tracked assets"
        value={tracked.total}
        sub={`${tracked.inClass} in ${tracked.classLabel.toLowerCase()}`}
      />
      {breadth ? (
        <Cell
          icon="bi-graph-up"
          label="Market breadth"
          value={`${breadth.up} / ${breadth.priced}`}
          sub={`${Math.round(breadth.pct)}% up, ${breadth.down} down today`}
        />
      ) : disclosures ? (
        <Cell
          icon="bi-bank"
          label={`Disclosed trades (${disclosures.days}d)`}
          value={`${disclosures.count}${disclosures.capped ? '+' : ''}`}
          sub="From the latest filings loaded"
        />
      ) : null}
      <Cell icon="bi-layers" label="New smart matches" value={smartMatches.count}>
        <button
          type="button"
          className="wlm-link wlm-pulse__link"
          aria-pressed={smartOnly}
          onClick={() => onSmartOnly(!smartOnly)}
        >
          {smartOnly ? 'Show all rows' : `Last ${smartMatches.days} days, show in table`}
        </button>
      </Cell>
      <Cell icon="bi-bell" label="Watchlist alerts" value={alerts.unread}>
        <Link href="/settings?tab=notifications" className="wlm-link wlm-pulse__link">
          {alerts.latestAt
            ? `Latest ${fmtTime(alerts.latestAt)}${alerts.scoped ? '' : ', all lists'}`
            : alerts.scoped
              ? 'Unread for this list'
              : 'Unread, all lists'}
        </Link>
      </Cell>
    </section>
  );
}

export default PulseRow;
