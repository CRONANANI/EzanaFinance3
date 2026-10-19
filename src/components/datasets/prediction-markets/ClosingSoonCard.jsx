'use client';

/**
 * Card 7, Closing Soon: seven ET days from today, three markets per day by
 * volume, each pill's fill set by how decided the market is. The callout pins
 * the three markets resolving this week that sit closest to 50%.
 */
import { useMemo } from 'react';
import {
  CATEGORY_LABEL,
  closingByDay,
  dayKey,
  decidedOpacity,
  mostUncertain,
} from '@/lib/prediction-markets/page-model';
import { Card, CardHead, SkelRows, Skeleton, StateBox, VenueDot, cx } from './parts';
import { date, dayLabel, int, pct } from './format';

function ClosingSkeleton() {
  return (
    <div aria-busy="true">
      <span className="pmk-sr">Loading markets closing soon</span>
      <Skeleton height={72} radius={8} />
      <div className="pmk-days" style={{ marginTop: 16 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="pmk-day">
            <SkelRows n={3} height={44} gap={6} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClosingSoonCard({ className, state, rows, filters, onLoad, onShowDay, onRetry }) {
  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => closingByDay(rows, now), [rows, now]);
  const uncertain = useMemo(() => mostUncertain(rows, 3, now), [rows, now]);
  const total = days.reduce((s, d) => s + d.count, 0);
  const nearest = useMemo(() => {
    const t = now.getTime() + 7 * 86400000;
    return (rows || [])
      .filter((r) => r.closes && new Date(r.closes).getTime() > t)
      .sort((a, b) => new Date(a.closes) - new Date(b.closes))[0];
  }, [rows, now]);

  const where = [
    filters.category && filters.category !== 'all' ? CATEGORY_LABEL[filters.category] : null,
    filters.venue === 'polymarket'
      ? 'on Polymarket'
      : filters.venue === 'kalshi'
        ? 'on Kalshi'
        : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card className={cx('pmk-card--closing', className)} label="Closing soon">
      <CardHead
        title="Closing soon"
        sub={
          <>
            Resolving in the next 7 days · <span className="pmk-num">{int(total)}</span> markets
          </>
        }
        right={
          <span className="pmk-decided-key pmk-legal">
            Near 50%
            <span className="pmk-decided-ramp" aria-hidden="true">
              {[0.06, 0.2, 0.36, 0.56].map((o) => (
                <span key={o} style={{ opacity: o }} />
              ))}
            </span>
            Decided
          </span>
        }
      />
      <div className="pmk-card-body">
        {state === 'loading' ? (
          <ClosingSkeleton />
        ) : state === 'error' ? (
          <StateBox kind="error" onRetry={onRetry} minHeight={390} />
        ) : !total ? (
          <StateBox title="Nothing resolves this week" minHeight={390}>
            {`No ${where ? `${where} ` : ''}market closes in the next 7 days.`}
            {nearest ? ` The nearest closes on ${date(nearest.closes)}.` : ''}
          </StateBox>
        ) : (
          <>
            {uncertain.length ? (
              <div className="pmk-callout">
                <p className="pmk-callout-title">
                  <i className="bi bi-signpost-split" aria-hidden="true" />
                  This week&apos;s most uncertain
                  <span className="pmk-num pmk-faint">closest to 50%</span>
                </p>
                <div className="pmk-callout-rows">
                  {uncertain.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="pmk-callout-row"
                      onClick={() => onLoad(r.id)}
                    >
                      <VenueDot venue={r.venue} />
                      <span className="pmk-ellipsis">{r.question}</span>
                      <span className="pmk-num pmk-strong">{pct(r.p)}</span>
                      <span className="pmk-num pmk-faint">
                        {dayLabel(dayKey(r.closes)).split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="pmk-days-scroll">
              <div className="pmk-days">
                {days.map((d, i) => (
                  <div key={d.date} className={cx('pmk-day', i === 0 && 'is-today')}>
                    <p className="pmk-day-head">
                      <span className="pmk-num">{i === 0 ? 'TODAY' : dayLabel(d.date)}</span>
                      <span className="pmk-num pmk-faint">{int(d.count)}</span>
                    </p>
                    <div className="pmk-day-pills">
                      {d.top3.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="pmk-cpill"
                          onClick={() => onLoad(r.id)}
                          aria-label={`${r.question}, ${pct(r.p)}. Load in the price chart.`}
                        >
                          <span
                            className="pmk-cpill-fill"
                            style={{ opacity: decidedOpacity(r.p) }}
                          />
                          <span className="pmk-cpill-q pmk-clamp2">{r.question}</span>
                          <span className="pmk-cpill-p">
                            <VenueDot venue={r.venue} />
                            <span className="pmk-num">{pct(r.p)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {d.count > 3 ? (
                      <button
                        type="button"
                        className="pmk-link pmk-day-more"
                        onClick={() => onShowDay(d.date)}
                      >
                        +{int(d.count - 3)} more
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
