'use client';

/**
 * Related catalysts (Market Monitor 2.0, Nov 2026): events for the selected
 * item from sources the app already has (earnings calendar, congressional
 * trades, government contract awards, the economic calendar), through
 * /api/watchlist/catalysts. Real records only: zero items or an error show
 * one line of empty-state copy, never placeholder rows.
 */
import Link from 'next/link';
import { displayTicker } from '@/lib/watchlist/asset-classes';

const KIND_ICON = {
  earnings: 'bi-calendar3',
  congress_trade: 'bi-bank',
  contract_award: 'bi-file-earmark-text',
  economic_release: 'bi-calendar3',
};

const fmtDay = (ymd) => {
  const d = new Date(`${String(ymd).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime())
    ? ymd
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** "NVDA earnings, Nov 19, 2026 (est.)": the line a catalyst adds to the note. */
export const catalystLine = (c) => `${c.title}, ${fmtDay(c.date)}${c.estimated ? ' (est.)' : ''}`;

/**
 * item       the selected row, or null
 * catalysts  useWatchlistCatalysts() result
 * onAddToNote(catalyst) opens the note with the catalyst appended
 */
export function CatalystPanel({ item, catalysts, onAddToNote }) {
  const label = item ? (item.type === 'politician' ? item.name : displayTicker(item.ticker)) : '';
  return (
    <section className="wlm-card wlm-cat" aria-labelledby="wlm-cat-h">
      <header className="wlm-card__head">
        <i className="bi bi-calendar3 wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-cat-h" className="wlm-card__title">
          Related catalysts
        </h2>
      </header>
      {!item ? (
        <p className="wlm-empty">Pick a row to see its upcoming and recent events.</p>
      ) : catalysts.status === 'loading' ? (
        <div className="wlm-skel-stack" aria-hidden="true">
          <span className="wlm-skel wlm-skel--row" />
          <span className="wlm-skel wlm-skel--row" />
        </div>
      ) : catalysts.status === 'error' || catalysts.items.length === 0 ? (
        <p className="wlm-empty">No related events on record for {label}.</p>
      ) : (
        <ul className="wlm-cat__list">
          {catalysts.items.map((c) => (
            <li key={`${c.kind}-${c.date}-${c.title}`} className="wlm-cat__row">
              <span className="wlm-cat__icon" aria-hidden="true">
                <i className={`bi ${KIND_ICON[c.kind] || 'bi-calendar3'}`} />
              </span>
              <span className="wlm-cat__text">
                <span className="wlm-strong wlm-sm">{c.title}</span>
                <span className="wlm-xs wlm-muted">
                  <span className="wlm-num">{fmtDay(c.date)}</span>
                  {c.estimated ? ' (est.)' : ''}
                  {c.source ? `, ${c.source}` : ''}
                </span>
                {c.detail ? <span className="wlm-xs wlm-soft wlm-clamp">{c.detail}</span> : null}
                <span className="wlm-cat__actions">
                  {c.href ? (
                    <Link href={c.href} className="wlm-link">
                      Open <i className="bi bi-arrow-right" aria-hidden="true" />
                    </Link>
                  ) : null}
                  <button type="button" className="wlm-link" onClick={() => onAddToNote(c)}>
                    Add to monitoring note
                  </button>
                  <Link
                    href={`/sonar?q=${encodeURIComponent(
                      `What could ${c.title} (${fmtDay(c.date)}) mean for ${label}?`,
                    )}`}
                    className="wlm-link"
                  >
                    Research with Sonar
                  </Link>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default CatalystPanel;
