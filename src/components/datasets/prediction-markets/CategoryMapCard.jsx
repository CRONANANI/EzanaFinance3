'use client';

/**
 * Card 6, Category Map: a squarified treemap of the market by category. Area
 * is window volume in the venue's unit (for Both, a Kalshi contract counts as
 * $1 for area only); colour is the average window move. A tile sets the page
 * category filter. Below 640px it becomes a stacked bar and a list.
 */
import { useMemo, useState } from 'react';
import { categoryTiles, squarify, tileOpacity } from '@/lib/prediction-markets/page-model';
import { Card, CardHead, Seg, Skeleton, StateBox, cx } from './parts';
import { contracts, int, ptsRaw, usd } from './format';
import { useSize } from './use-size';

const VENUE_OPTS = [
  { value: 'polymarket', label: 'Polymarket' },
  { value: 'kalshi', label: 'Kalshi' },
  { value: 'both', label: 'Both' },
];
const NOTE = {
  polymarket: 'Polymarket volume in USD',
  kalshi: 'Kalshi volume in contracts',
  both: 'Kalshi counted at $1 per contract',
};
/* Minimum treemap height. The map grows to fill the card when Top Traders
   beside it sets a taller row, so there is no empty band under the tiles. */
const MAP_H = 360;

function volText(v, venue) {
  return venue === 'kalshi' ? contracts(v) : usd(v);
}

function tileAria(t, venue) {
  const dir = t.avgMove > 0 ? 'up' : t.avgMove < 0 ? 'down' : 'flat';
  return `${t.label}, ${volText(t.value, venue)}, ${int(t.count)} markets, average move ${dir} ${Math.abs(t.avgMove).toFixed(1)} points`;
}

function MapSkeleton() {
  return (
    <div className="pmk-map-skel" aria-busy="true" style={{ height: MAP_H }}>
      <span className="pmk-sr">Loading the category map</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height="100%" radius={8} className={`pmk-map-skel-${i}`} />
      ))}
    </div>
  );
}

export function CategoryMapCard({ className, state, rows, win, category, onPick, onRetry }) {
  const [venue, setVenue] = useState('polymarket');
  const [boxRef, box] = useSize();
  const tiles = useMemo(() => categoryTiles(rows, venue, win), [rows, venue, win]);
  const w = box.w;
  const h = Math.max(MAP_H, box.h || 0);

  const rects = useMemo(
    () =>
      w > 0
        ? squarify(
            tiles.map((t) => ({ ...t })),
            w,
            h,
          )
        : [],
    [tiles, w, h],
  );

  const tileClass = (t) => cx('pmk-tile-fill', t.avgMove >= 0 ? 'is-firming' : 'is-fading');

  return (
    <Card className={cx('pmk-card--map', className)} label="Category map">
      <CardHead
        title="Category map"
        sub={`Area: volume · Colour: avg move · ${win}`}
        right={<Seg label="Venue" value={venue} options={VENUE_OPTS} onChange={setVenue} />}
      />
      <div className="pmk-card-body">
        {state === 'loading' ? (
          <MapSkeleton />
        ) : state === 'error' ? (
          <StateBox kind="error" onRetry={onRetry} minHeight={MAP_H} />
        ) : !tiles.length ? (
          <StateBox title="No volume traded in this window" minHeight={MAP_H}>
            {venue === 'kalshi'
              ? 'Kalshi'
              : venue === 'polymarket'
                ? 'Polymarket'
                : 'Neither venue'}{' '}
            reported trades in the {win === '24h' ? 'last 24 hours' : `last ${win}`} for mapped
            categories. Try a wider window or Both venues.
          </StateBox>
        ) : (
          <>
            <div className="pmk-map" ref={boxRef}>
              {rects.map((r) => {
                const t = tiles.find((x) => x.key === r.key);
                const big = r.w > 96 && r.h > 72;
                const on = category === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className={cx('pmk-maptile', big ? 'is-big' : 'is-small', on && 'is-on')}
                    aria-pressed={on}
                    aria-label={tileAria(t, venue)}
                    style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
                    onClick={() => onPick(r.key)}
                  >
                    <span className="pmk-maptile-box">
                      <span className={tileClass(t)} style={{ opacity: tileOpacity(t.avgMove) }} />
                      <span className="pmk-maptile-name">{t.label}</span>
                      {big ? (
                        <>
                          <span className="pmk-maptile-vol pmk-num">{volText(t.value, venue)}</span>
                          <span className="pmk-maptile-foot">
                            <span className="pmk-num pmk-mute">{int(t.count)} mkts</span>
                            <span
                              className={cx(
                                'pmk-num pmk-maptile-move',
                                t.avgMove >= 0 ? 'is-up' : 'is-down',
                              )}
                            >
                              {ptsRaw(t.avgMove)}
                            </span>
                          </span>
                        </>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pmk-map-mobile">
              <div className="pmk-map-stack" aria-hidden="true">
                {tiles.map((t) => (
                  <span key={t.key} style={{ flex: t.value }} className="pmk-map-seg">
                    <span
                      className={tileClass(t)}
                      style={{ opacity: tileOpacity(t.avgMove) + 0.15 }}
                    />
                  </span>
                ))}
              </div>
              <ul className="pmk-map-list">
                {tiles.map((t) => (
                  <li key={t.key}>
                    <button
                      type="button"
                      className={cx('pmk-map-row', category === t.key && 'is-on')}
                      aria-pressed={category === t.key}
                      aria-label={tileAria(t, venue)}
                      onClick={() => onPick(t.key)}
                    >
                      <span className="pmk-map-swatch">
                        <span
                          className={tileClass(t)}
                          style={{ opacity: tileOpacity(t.avgMove) + 0.15 }}
                        />
                      </span>
                      <span className="pmk-map-name">{t.label}</span>
                      <span className="pmk-num">{volText(t.value, venue)}</span>
                      <span className="pmk-num pmk-mute">{int(t.count)}</span>
                      <span className={cx('pmk-num', t.avgMove >= 0 ? 'is-up' : 'is-down')}>
                        {ptsRaw(t.avgMove)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
      <footer className="pmk-foot">
        <span className="pmk-map-legend pmk-legal">
          Fading
          <span className="pmk-ramp" aria-hidden="true">
            {[0.55, 0.3, 0.12].map((o) => (
              <span key={`f${o}`} className="pmk-ramp-cell is-fading" style={{ opacity: o }} />
            ))}
            {[0.12, 0.3, 0.55].map((o) => (
              <span key={`u${o}`} className="pmk-ramp-cell is-firming" style={{ opacity: o }} />
            ))}
          </span>
          Firming <span className="pmk-num">±3 pts</span>
        </span>
        <span className="pmk-legal">Select a tile to filter the page · {NOTE[venue]}</span>
      </footer>
    </Card>
  );
}
