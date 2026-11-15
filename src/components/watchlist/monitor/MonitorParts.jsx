'use client';

/**
 * Watchlist Market Monitor building blocks (Nov 2026; Market Monitor 2.0):
 * asset avatar, sparkline, the text-only asset-class tabs, Watchlist
 * signals, Recent alerts and the Learn row. Presentational: the page passes
 * in the active list's items with live quotes.
 */
import { useRef } from 'react';
import Link from 'next/link';
import { ASSET_CLASSES, displayTicker } from '@/lib/watchlist/asset-classes';
import { BIG_MOVE_PCT, fmtSignedPct, fmtTime, signOf } from '@/lib/watchlist/watchlist-view';

/* ------------------------------------------------------------------ */

export function AssetAvatar({ item, size = 30 }) {
  const label = item?.type === 'politician' ? item.name : displayTicker(item?.ticker || '');
  return (
    <span className={`wlm-avatar wlm-avatar--${size >= 48 ? 'lg' : 'sm'}`} aria-hidden="true">
      {(label || '?').charAt(0).toUpperCase()}
    </span>
  );
}

/** A small line from closes; colour follows its own direction. */
export function Sparkline({ points, width = 56, height = 22 }) {
  if (!points || points.length < 2)
    return (
      <span className="wlm-spark wlm-spark--empty" style={{ width, height }} aria-hidden="true" />
    );
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${((i / (points.length - 1)) * 100).toFixed(1)} ${(28 - ((v - min) / span) * 26).toFixed(1)}`,
    )
    .join(' ');
  const dir = points[points.length - 1] >= points[0] ? 'up' : 'down';
  return (
    <svg
      className={`wlm-spark is-${dir}`}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ width, height }}
      aria-hidden="true"
    >
      <path d={d} fill="none" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Change({ value, className = '' }) {
  return (
    <span className={`wlm-num wlm-tone is-${signOf(value)} ${className}`.trim()}>
      {fmtSignedPct(value)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function ClassTabs({ value, counts, onChange }) {
  const ref = useRef(null);
  const onKeyDown = (e) => {
    const tabs = [...(ref.current?.querySelectorAll('[role="tab"]') || [])];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (next) {
      e.preventDefault();
      next.focus();
      next.click();
    }
  };
  return (
    <div
      ref={ref}
      className="wlm-tabs"
      role="tablist"
      aria-label="Asset class"
      onKeyDown={onKeyDown}
    >
      {ASSET_CLASSES.map((c) => {
        const on = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={`wlm-tab${on ? ' is-on' : ''}`}
            onClick={() => onChange(c.id)}
          >
            {c.label}
            {counts?.[c.id] ? <span className="wlm-tab__count wlm-num">{counts[c.id]}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

/**
 * Watchlist signals: best and worst performer, big moves and sector
 * concentration from computeInsights and bigMoves. Breadth lives in the
 * pulse row and is not repeated here.
 */
export function SignalsCard({ insights, moves, classId }) {
  const hasPrices = insights.priced > 0;
  return (
    <section className="wlm-card" aria-labelledby="wlm-ins-h">
      <header className="wlm-card__head">
        <i className="bi bi-bar-chart wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-ins-h" className="wlm-card__title">
          Watchlist signals
        </h2>
      </header>
      {classId === 'politicians' ? (
        <p className="wlm-empty">Signals cover priced assets. Pick another tab to see them.</p>
      ) : !hasPrices ? (
        <p className="wlm-empty">Signals appear once the items in this tab have live prices.</p>
      ) : (
        <>
          <dl className="wlm-stats">
            <div className="wlm-stat">
              <dt>Best performer</dt>
              <dd className="wlm-num wlm-stat__value wlm-stat__ticker">
                <i className="bi bi-caret-up-fill wlm-tone is-up" aria-hidden="true" />
                {displayTicker(insights.best?.ticker || '')}
              </dd>
              <dd>
                <Change value={insights.best?.changePct} className="wlm-sm" />
              </dd>
            </div>
            <div className="wlm-stat">
              <dt>Worst performer</dt>
              <dd className="wlm-num wlm-stat__value wlm-stat__ticker">
                {insights.worst ? (
                  <>
                    <i className="bi bi-caret-down-fill wlm-tone is-down" aria-hidden="true" />
                    {displayTicker(insights.worst.ticker)}
                  </>
                ) : (
                  'N/A'
                )}
              </dd>
              <dd>
                {insights.worst ? (
                  <Change value={insights.worst.changePct} className="wlm-sm" />
                ) : null}
              </dd>
            </div>
            <div className="wlm-stat">
              <dt>Big moves (±{BIG_MOVE_PCT}%)</dt>
              <dd className="wlm-num wlm-stat__value">{moves.length}</dd>
              <dd className="wlm-xs wlm-muted wlm-num">
                {moves.length
                  ? moves
                      .slice(0, 4)
                      .map((m) => displayTicker(m.ticker))
                      .join(', ')
                  : 'None today'}
              </dd>
            </div>
            {insights.sector ? (
              <div className="wlm-stat">
                <dt>Sector concentration</dt>
                <dd className="wlm-num wlm-stat__value">{Math.round(insights.sector.pct)}%</dd>
                <dd className="wlm-xs wlm-muted">
                  {insights.sector.name}, {insights.sector.count} of {insights.sector.total}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="wlm-caption">Tracked names, not holdings.</p>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recent alerts                                                       */
/* ------------------------------------------------------------------ */

/**
 * Recent alerts: the latest 'watchlist' notifications with an Unread marker.
 * A row whose notification names a ticker in the active list selects it.
 *   inList(ticker) -> true when the ticker is in the active list
 */
export function RecentAlertsCard({ alerts, inList, onPick }) {
  return (
    <section className="wlm-card" aria-labelledby="wlm-al-h">
      <header className="wlm-card__head">
        <i className="bi bi-bell wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-al-h" className="wlm-card__title">
          Recent alerts
        </h2>
        <Link href="/settings?tab=notifications" className="wlm-link">
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </header>
      {alerts.status === 'loading' ? (
        <div className="wlm-skel-stack" aria-hidden="true">
          <span className="wlm-skel wlm-skel--row" />
          <span className="wlm-skel wlm-skel--row" />
        </div>
      ) : alerts.status === 'error' ? (
        <p className="wlm-empty">
          Alerts could not load.{' '}
          <button type="button" className="wlm-link" onClick={alerts.reload}>
            Retry
          </button>
        </p>
      ) : alerts.items.length === 0 ? (
        <p className="wlm-empty">
          No alerts yet. Turn on big-move alerts for a list, or create a smart watchlist.
        </p>
      ) : (
        <ul className="wlm-alerts">
          {alerts.items.map((a) => {
            const down = /\bdown\b|-\d/i.test(a.title || '');
            const target = (a.tickers || []).find((t) => inList?.(t)) || null;
            const inner = (
              <>
                <span className={`wlm-alerts__icon is-${down ? 'down' : 'up'}`} aria-hidden="true">
                  <i className={`bi ${down ? 'bi-arrow-down' : 'bi-arrow-up'}`} />
                </span>
                <span className="wlm-alerts__text">
                  <span className="wlm-strong">
                    {a.read === false ? (
                      <span className="wlm-unread">
                        <span className="wlm-unread__dot" aria-hidden="true" />
                        <span className="wlm-sr">Unread: </span>
                      </span>
                    ) : null}
                    {a.title}
                  </span>
                  {a.content ? (
                    <span className="wlm-xs wlm-muted wlm-clamp">{a.content}</span>
                  ) : null}
                </span>
                <span className="wlm-xs wlm-muted wlm-num">{fmtTime(a.created_at)}</span>
              </>
            );
            return (
              <li key={a.id} className="wlm-alerts__row">
                {target ? (
                  <button
                    type="button"
                    className="wlm-alerts__btn"
                    onClick={() => onPick(target)}
                    aria-label={`${a.title}. Show ${target}`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="wlm-alerts__btn is-static">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Learn row                                                           */
/* ------------------------------------------------------------------ */

/** One course from the Learning Center with its bookmark toggle. */
export function LearnRow({ course, bookmarked, onToggle }) {
  if (!course) return null;
  const saved = bookmarked.has(course.id);
  return (
    <section className="wlm-card wlm-learn" aria-labelledby="wlm-learn-h">
      <header className="wlm-card__head">
        <i className="bi bi-mortarboard wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-learn-h" className="wlm-card__title">
          Learn
        </h2>
        <Link href="/learning-center?track=stocks" className="wlm-link">
          Learning Center <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </header>
      <div className="wlm-learn__row">
        <Link href={`/learning-center/course/${course.id}`} className="wlm-learn__link">
          <span className="wlm-strong wlm-clamp">{course.title}</span>
          <span className="wlm-xs wlm-muted">
            <i className="bi bi-clock" aria-hidden="true" /> {course.duration_minutes} min course
          </span>
        </Link>
        <button
          type="button"
          className="wlm-icon-btn"
          aria-pressed={saved}
          aria-label={saved ? `Remove bookmark: ${course.title}` : `Bookmark: ${course.title}`}
          onClick={() => onToggle(course.id, !saved)}
        >
          <i className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
