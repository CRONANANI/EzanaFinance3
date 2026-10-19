'use client';

/**
 * Card 3, Movers: the eight biggest movers (or most traded) in the window.
 * Every row loads the Price Chart; the loaded row is marked aria-current.
 */
import {
  CATEGORY_LABEL,
  isHot,
  windowChange,
  windowVolume,
} from '@/lib/prediction-markets/page-model';
import { Card, CardHead, ChangePill, Seg, SkelRows, Spark, StateBox, VenueChip, cx } from './parts';
import { pct, venueVolume } from './format';
import { useSparklines } from './use-sparklines';

const SORT = [
  { value: 'moves', label: 'Biggest moves' },
  { value: 'traded', label: 'Most traded' },
];

function quietCopy(filters, win) {
  const where =
    filters.category && filters.category !== 'all' ? `in ${CATEGORY_LABEL[filters.category]} ` : '';
  const span =
    win === '24h' ? 'the last 24 hours' : win === '7d' ? 'the last 7 days' : 'the last 30 days';
  const tip = filters.category && filters.category !== 'all' ? 'All categories' : 'All venues';
  return `No market ${where}moved more than 1 point in ${span}. Try a wider window or ${tip}.`;
}

export function MoversCard({
  className,
  state,
  movers,
  by,
  onBy,
  win,
  filters,
  loadedId,
  onLoad,
  onRetry,
}) {
  const spark = useSparklines(
    movers.map((m) => m.id),
    win === '24h' ? '1d' : '1w',
  );
  const sub = `${filters.category && filters.category !== 'all' ? CATEGORY_LABEL[filters.category] : 'All categories'} · ${win} · top 8`;

  return (
    <Card className={cx('pmk-card--movers', className)} label="Movers">
      <CardHead
        title="Movers"
        sub={sub}
        right={<Seg label="Sort movers" value={by} options={SORT} onChange={onBy} />}
      />
      <div className="pmk-card-body">
        {state === 'loading' ? (
          <SkelRows n={8} height={54} label="Loading movers" />
        ) : state === 'error' ? (
          <StateBox kind="error" onRetry={onRetry} minHeight={496} />
        ) : !movers.length ? (
          <StateBox title="A quiet window" minHeight={496}>
            {quietCopy(filters, win)}
          </StateBox>
        ) : (
          <ol className="pmk-movers">
            {movers.map((m, i) => {
              const change = windowChange(m, win);
              const on = m.id === loadedId;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    className={cx('pmk-mover', on && 'is-on')}
                    aria-current={on ? 'true' : undefined}
                    onClick={() => onLoad(m.id)}
                  >
                    <span className="pmk-mover-rank pmk-num">{i + 1}</span>
                    <span className="pmk-mover-main">
                      <span className="pmk-mover-q pmk-clamp2">{m.question}</span>
                      <span className="pmk-mover-meta">
                        <VenueChip venue={m.venue} small />
                        <span className="pmk-faint pmk-num">
                          {venueVolume(windowVolume(m, win), m.venue)}
                        </span>
                        {isHot(m) ? (
                          <span className="pmk-hot">
                            <i className="bi bi-fire" aria-hidden="true" />
                            Hot
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <Spark
                      points={spark.series[m.id]}
                      width={64}
                      height={24}
                      direction={Math.sign(change || 0)}
                    />
                    <span className="pmk-mover-right">
                      <span className="pmk-mover-p pmk-num">{pct(m.p)}</span>
                      <ChangePill change={change} size="sm" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <footer className="pmk-foot">
        <span className="pmk-legal">
          <i className="bi bi-fire pmk-hot-icon" aria-hidden="true" /> Hot: volume above 3x its own
          30-day norm
        </span>
        <span className="pmk-legal">Select a row to chart it</span>
      </footer>
    </Card>
  );
}
