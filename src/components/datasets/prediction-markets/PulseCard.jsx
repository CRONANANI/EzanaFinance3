'use client';

/**
 * Card 1, Market Pulse: open markets with the venue split, volume per venue
 * (never summed), the biggest mover, and markets closing this week.
 */
import { useMemo } from 'react';
import {
  CATEGORY_LABEL,
  downsample,
  pulseStats,
  windowChange,
} from '@/lib/prediction-markets/page-model';
import { Card, CardHead, ChangePill, Skeleton, Spark, StateBox, cx } from './parts';
import { contracts, int, pct, timeEt, usd, weekday } from './format';
import { useSparklines } from './use-sparklines';

/** Day-bar height in px; matches .pmk-daybars in prediction-markets.css. */
const DAYBAR_MAX = 20;

export function filterLabel({ category, venue }, win) {
  const c = category && category !== 'all' ? CATEGORY_LABEL[category] : 'All categories';
  const v = venue === 'polymarket' ? 'Polymarket' : venue === 'kalshi' ? 'Kalshi' : 'All venues';
  return win ? `${c} · ${v} · ${win}` : `${c} · ${v}`;
}

function PulseSkeleton() {
  return (
    <div className="pmk-pulse" aria-busy="true">
      <span className="pmk-sr">Loading market pulse</span>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="pmk-tile">
          <Skeleton width="45%" height={10} />
          <div className="pmk-tile-row">
            <Skeleton width="34%" height={22} />
            <Skeleton width="60%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PulseCard({
  className,
  state,
  rows,
  win,
  filters,
  updatedAt,
  stale,
  onRetry,
  onLoad,
  onReset,
}) {
  const stats = useMemo(() => pulseStats(rows, win, new Date()), [rows, win]);
  const mover = stats.biggestMover;
  const spark = useSparklines(mover ? [mover.id] : [], win === '24h' ? '1d' : '1w');
  const moverPoints = mover ? spark.series?.[mover.id] : null;
  const maxDay = Math.max(1, ...stats.closing.map((d) => d.count));
  const totalOpen = stats.open.total;

  return (
    <Card className={cx('pmk-card--pulse', className)} label="Market pulse">
      <CardHead
        title="Market pulse"
        sub={filterLabel(filters, win)}
        right={
          <span className="pmk-meta pmk-num">
            {stale ? 'Odds delayed' : updatedAt ? `Updated ${timeEt(updatedAt)}` : null}
          </span>
        }
      />
      {state === 'loading' ? (
        <PulseSkeleton />
      ) : state === 'error' ? (
        <StateBox kind="error" onRetry={onRetry} minHeight={64} />
      ) : !totalOpen ? (
        <StateBox
          title="No open markets match"
          minHeight={64}
          actions={
            <button type="button" className="pmk-link" onClick={onReset}>
              Reset filters
            </button>
          }
        >
          {filterLabel(filters, win)}. Widen the window or switch to All venues to see the pulse.
        </StateBox>
      ) : (
        <div className="pmk-pulse">
          <div className="pmk-tile">
            <p className="pmk-eyebrow">Open markets</p>
            <div className="pmk-tile-row">
              <p className="pmk-value pmk-num">{int(totalOpen)}</p>
              <div className="pmk-tile-aside">
                <div className="pmk-split" aria-hidden="true">
                  {stats.open.polymarket ? (
                    <span className="pmk-split-poly" style={{ flex: stats.open.polymarket }} />
                  ) : null}
                  {stats.open.kalshi ? (
                    <span className="pmk-split-kalshi" style={{ flex: stats.open.kalshi }} />
                  ) : null}
                </div>
                <p className="pmk-tile-legend pmk-num">
                  <span>
                    <span className="pmk-dot pmk-dot--polymarket" aria-hidden="true" /> Poly{' '}
                    {int(stats.open.polymarket)}
                  </span>
                  <span>
                    <span className="pmk-dot pmk-dot--kalshi" aria-hidden="true" /> Kalshi{' '}
                    {int(stats.open.kalshi)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="pmk-tile">
            <div className="pmk-tile-top">
              <p className="pmk-eyebrow">Volume traded · {win}</p>
              <p
                className="pmk-tile-note pmk-faint"
                title="Units differ, so venues are not summed."
              >
                Not summed
              </p>
            </div>
            <div className="pmk-vol-halves">
              <div>
                <p className="pmk-value-md pmk-num">
                  {stats.volume.polymarket.n ? usd(stats.volume.polymarket.value) : 'n/a'}
                </p>
                <p className="pmk-tile-note">Polymarket, USD</p>
              </div>
              <div>
                <p className="pmk-value-md pmk-num">
                  {stats.volume.kalshi.n ? contracts(stats.volume.kalshi.value) : 'n/a'}
                </p>
                <p className="pmk-tile-note">Kalshi, contracts</p>
              </div>
            </div>
            <span className="pmk-sr">Units differ, so venues are not summed.</span>
          </div>

          <button
            type="button"
            className="pmk-tile pmk-tile--btn"
            disabled={!mover}
            onClick={() => mover && onLoad(mover.id)}
            aria-label={
              mover ? `Biggest mover: ${mover.question}. Load in the price chart.` : undefined
            }
          >
            <p className="pmk-eyebrow">Biggest mover · {win}</p>
            {mover ? (
              <>
                <div className="pmk-mover-line">
                  <ChangePill change={windowChange(mover, win)} size="lg" />
                  <Spark
                    points={moverPoints ? downsample(moverPoints, 8) : null}
                    width={72}
                    height={20}
                    direction={Math.sign(windowChange(mover, win) || 0)}
                  />
                  <span className="pmk-mover-p pmk-num">{pct(mover.p)}</span>
                </div>
                <p className="pmk-tile-q pmk-ellipsis">{mover.question}</p>
              </>
            ) : (
              <p className="pmk-tile-note">No market moved more than 1 point.</p>
            )}
          </button>

          <div className="pmk-tile">
            <p className="pmk-eyebrow">Closing this week</p>
            <div className="pmk-tile-row">
              <p className="pmk-value pmk-num">{int(stats.closingTotal)}</p>
              <div className="pmk-tile-aside">
                <div className="pmk-daybars" aria-hidden="true">
                  {stats.closing.map((d, i) => (
                    <span
                      key={d.date}
                      className={cx('pmk-daybar', i === 0 && 'is-today')}
                      style={{ height: `${Math.max(2, (d.count / maxDay) * DAYBAR_MAX)}px` }}
                    />
                  ))}
                </div>
                <p className="pmk-tile-note pmk-num">
                  Next 7 days
                  {stats.peak ? ` · peak ${weekday(stats.peak.date)} ${int(stats.peak.count)}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
