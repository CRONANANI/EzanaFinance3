'use client';

/**
 * Open markets: the existing table (Event, Venue, Probability, Volume,
 * Closes), restyled and filtered by the page filters. Kalshi volume is in
 * contracts, never added to Polymarket dollars.
 */
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABEL, tableRows } from '@/lib/prediction-markets/page-model';
import { Card, CardHead, SkelRows, StateBox, VenueChip, cx } from './parts';
import { date, dayLabel, int, pct, venueVolume } from './format';

const PAGE = 7;
const MORE = 25;

export function OpenMarketsCard({
  state,
  rows,
  total,
  category,
  closesOn,
  onClearDay,
  onClearCategory,
  onLoad,
  onRetry,
}) {
  const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => tableRows(rows, { closesOn }), [rows, closesOn]);
  useEffect(() => setShown(closesOn ? MORE : PAGE), [rows, closesOn]);
  const visible = list.slice(0, shown);

  return (
    <Card className="pmk-card--table" label="Open markets">
      <CardHead
        title="Open markets"
        sub={
          <>
            Source: Polymarket, Kalshi · <span className="pmk-num">{int(total)}</span> open
          </>
        }
        right={
          <div className="pmk-head-controls">
            {category && category !== 'all' ? (
              <span className="pmk-chip is-on pmk-chip--static">
                Category: {CATEGORY_LABEL[category]}
                <button
                  type="button"
                  className="pmk-chip-x"
                  aria-label="Clear category"
                  onClick={onClearCategory}
                >
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              </span>
            ) : null}
            {closesOn ? (
              <span className="pmk-chip is-on pmk-chip--static">
                Closes {dayLabel(closesOn)}
                <button
                  type="button"
                  className="pmk-chip-x"
                  aria-label="Clear closing day"
                  onClick={onClearDay}
                >
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              </span>
            ) : null}
            <span className="pmk-meta">Sorted by volume</span>
          </div>
        }
      />
      {state === 'loading' ? (
        <SkelRows n={7} height={44} label="Loading open markets" />
      ) : state === 'error' ? (
        <StateBox kind="error" onRetry={onRetry} minHeight={320} />
      ) : !list.length ? (
        <StateBox title="No open markets match these filters" minHeight={320}>
          Clear the category or search to see every open market.
        </StateBox>
      ) : (
        <>
          <div className="pmk-table-wrap">
            <table className="pmk-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Venue</th>
                  <th scope="col" className="num">
                    Probability
                  </th>
                  <th scope="col" className="num">
                    Volume
                  </th>
                  <th scope="col">Closes</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button type="button" className="pmk-table-q" onClick={() => onLoad(r.id)}>
                        {r.question}
                      </button>
                    </td>
                    <td>
                      <VenueChip venue={r.venue} small />
                    </td>
                    <td className="num pmk-strong">{pct(r.p)}</td>
                    <td className="num">{venueVolume(r.vol, r.venue)}</td>
                    <td className="pmk-num pmk-mute">{r.closes ? date(r.closes) : 'Open-ended'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="pmk-foot">
            <span className="pmk-legal pmk-num">
              Showing {int(visible.length)} of {int(list.length)}
            </span>
            {visible.length < list.length ? (
              <button
                type="button"
                className={cx('pmk-link')}
                onClick={() => setShown((n) => n + MORE)}
              >
                {shown === PAGE ? 'View all open markets' : 'Show more'}
              </button>
            ) : null}
          </footer>
        </>
      )}
    </Card>
  );
}
