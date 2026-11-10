'use client';

/**
 * Watchlist Market Monitor building blocks (Nov 2026): asset avatar,
 * sparkline, asset-class tabs, the quote strip, "Also in this watchlist",
 * Watchlist insights, Recent alerts and Recommended courses. Presentational:
 * the page passes in the active list's items with live quotes.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ASSET_CLASSES, displayTicker } from '@/lib/watchlist/asset-classes';
import { fmtSignedPct, fmtTime, fmtUSD, signOf } from '@/lib/watchlist/watchlist-view';

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
/* Quote strip                                                         */
/* ------------------------------------------------------------------ */

function usePrevious(v) {
  const r = useRef(v);
  useEffect(() => {
    r.current = v;
  }, [v]);
  return r.current;
}

function QuoteCard({ item, selected, spark, onSelect, politician }) {
  const prev = usePrevious(item.price);
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (prev != null && item.price != null && prev !== item.price) {
      setFlash(item.price > prev ? 'up' : 'down');
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [item.price, prev]);

  const isPol = item.type === 'politician';
  const last = politician?.trades?.[0];
  return (
    <button
      type="button"
      className={`wlm-qcard${selected ? ' is-on' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(item)}
    >
      <span className="wlm-qcard__id">
        <AssetAvatar item={item} />
        <span className="wlm-qcard__names">
          <span className="wlm-qcard__name">{item.name || item.ticker}</span>
          <span className="wlm-num wlm-muted wlm-xs">
            {isPol
              ? [
                  politician?.party,
                  politician?.chamber === 'senate'
                    ? 'Senate'
                    : politician?.chamber === 'house'
                      ? 'House'
                      : null,
                  politician?.state,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Member of Congress'
              : displayTicker(item.ticker)}
          </span>
        </span>
        {item.starredAt ? (
          <i className="bi bi-star-fill wlm-qcard__star" role="img" aria-label="Starred" />
        ) : null}
      </span>
      {isPol ? (
        <span className="wlm-qcard__trade">
          {last ? (
            <>
              <span
                className={`wlm-xs wlm-strong wlm-tone is-${last.side === 'buy' ? 'up' : last.side === 'sell' ? 'down' : 'flat'}`}
              >
                {last.side === 'buy' ? 'Bought' : last.side === 'sell' ? 'Sold' : 'Traded'}{' '}
                {last.ticker || last.asset}
              </span>
              <span className="wlm-xs wlm-muted">{last.date}</span>
            </>
          ) : (
            <span className="wlm-xs wlm-muted">No disclosed trades</span>
          )}
        </span>
      ) : (
        <span className="wlm-qcard__px">
          <span className="wlm-qcard__nums">
            <span className={`wlm-num wlm-qcard__price${flash ? ` is-flash-${flash}` : ''}`}>
              {fmtUSD(item.price)}
            </span>
            <Change value={item.changePct} className="wlm-xs" />
          </span>
          <Sparkline points={spark} />
        </span>
      )}
    </button>
  );
}

export function QuoteStrip({ items, selectedKey, sparks, politicians, onSelect }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  const many = items.length > 6;
  return (
    <section className="wlm-strip-wrap" aria-label="Watchlist quotes">
      {many ? (
        <button
          type="button"
          className="wlm-strip-arrow is-left"
          aria-label="Scroll quotes left"
          onClick={() => scroll(-1)}
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
      ) : null}
      <div ref={ref} className="wlm-strip">
        {items.map((it) => (
          <QuoteCard
            key={`${it.type}:${it.ticker}`}
            item={it}
            selected={`${it.type}:${it.ticker}` === selectedKey}
            spark={sparks?.[it.ticker]}
            politician={politicians?.[it.ticker]}
            onSelect={onSelect}
          />
        ))}
      </div>
      {many ? (
        <button
          type="button"
          className="wlm-strip-arrow is-right"
          aria-label="Scroll quotes right"
          onClick={() => scroll(1)}
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

export function EmptyClass({ cls, onAdd }) {
  return (
    <div className="wlm-empty-class">
      <div>
        <p className="wlm-strong">No {cls.label.toLowerCase()} in your watchlist yet</p>
        <p className="wlm-muted wlm-sm">Add one to track it here alongside your stocks.</p>
      </div>
      <button type="button" className="wlm-btn wlm-btn--accent" onClick={onAdd}>
        <i className="bi bi-plus-lg" aria-hidden="true" /> Add {cls.singular}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Also in this watchlist                                              */
/* ------------------------------------------------------------------ */

const TYPE_LABEL = {
  stock: 'Stock',
  bond_etf: 'Bond ETF',
  crypto: 'Crypto',
  commodity: 'Commodity',
  politician: 'Politician',
};

export function AlsoInWatchlist({ items, sparks, onSelect }) {
  if (!items.length) return null;
  return (
    <div className="wlm-also">
      <h3 className="wlm-h3">Also in this watchlist</h3>
      <div className="wlm-table-scroll">
        <table className="wlm-table wlm-table--also">
          <thead>
            <tr>
              <th scope="col" className="is-left">
                Name
              </th>
              <th scope="col">Value</th>
              <th scope="col">Change</th>
              <th scope="col" className="is-left">
                Type
              </th>
              <th scope="col">
                <span className="wlm-sr">1 month trend</span>
                <span aria-hidden="true">Trend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={`${it.type}:${it.ticker}`}>
                <th scope="row" className="is-left">
                  <button type="button" className="wlm-rowbtn" onClick={() => onSelect(it)}>
                    <AssetAvatar item={it} />
                    <span className="wlm-strong wlm-ellipsis">{it.name || it.ticker}</span>
                    <span className="wlm-num wlm-muted wlm-xs">{displayTicker(it.ticker)}</span>
                  </button>
                </th>
                <td className="wlm-num wlm-strong">{fmtUSD(it.price)}</td>
                <td>
                  <Change value={it.changePct} />
                </td>
                <td className="is-left wlm-soft">{TYPE_LABEL[it.type] || 'Asset'}</td>
                <td>
                  <Sparkline points={sparks?.[it.ticker]} width={96} height={24} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

export function InsightsCard({ insights, classId }) {
  const hasPrices = insights.priced > 0;
  return (
    <section className="wlm-card" aria-labelledby="wlm-ins-h">
      <header className="wlm-card__head">
        <i className="bi bi-bar-chart wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-ins-h" className="wlm-card__title">
          Watchlist insights
        </h2>
      </header>
      {classId === 'politicians' ? (
        <p className="wlm-empty">Insights cover priced assets. Pick another tab to see them.</p>
      ) : !hasPrices ? (
        <p className="wlm-empty">Insights appear once the items in this tab have live prices.</p>
      ) : (
        <dl className="wlm-stats">
          <div className="wlm-stat">
            <dt>Breadth</dt>
            <dd className="wlm-num wlm-stat__value">{Math.round(insights.breadthPct)}%</dd>
            <dd className="wlm-xs wlm-muted">
              {insights.up} up / {insights.down} down
            </dd>
          </div>
          <div className="wlm-stat">
            <dt>Biggest mover</dt>
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
          {insights.sector ? (
            <div className="wlm-stat">
              <dt>Sector concentration</dt>
              <dd className="wlm-num wlm-stat__value">{Math.round(insights.sector.pct)}%</dd>
              <dd className="wlm-xs wlm-muted">
                {insights.sector.name}, {insights.sector.count} of {insights.sector.total}
              </dd>
            </div>
          ) : (
            <div className="wlm-stat">
              <dt>Tracked</dt>
              <dd className="wlm-num wlm-stat__value">{insights.total}</dd>
              <dd className="wlm-xs wlm-muted">{insights.priced} with live prices</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recent alerts                                                       */
/* ------------------------------------------------------------------ */

export function RecentAlertsCard({ alerts }) {
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
      ) : alerts.items.length === 0 ? (
        <p className="wlm-empty">
          No alerts yet. Turn on big-move alerts for a list, or create a smart watchlist.
        </p>
      ) : (
        <ul className="wlm-alerts">
          {alerts.items.map((a) => {
            const down = /\bdown\b|-\d/i.test(a.title || '');
            return (
              <li key={a.id} className="wlm-alerts__row">
                <span className={`wlm-alerts__icon is-${down ? 'down' : 'up'}`} aria-hidden="true">
                  <i className={`bi ${down ? 'bi-arrow-down' : 'bi-arrow-up'}`} />
                </span>
                <span className="wlm-alerts__text">
                  <span className="wlm-strong">{a.title}</span>
                  {a.content ? (
                    <span className="wlm-xs wlm-muted wlm-clamp">{a.content}</span>
                  ) : null}
                </span>
                <span className="wlm-xs wlm-muted wlm-num">{fmtTime(a.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recommended courses                                                 */
/* ------------------------------------------------------------------ */

export function CoursesCard({ courses, bookmarked, onToggle }) {
  if (!courses?.length) return null;
  return (
    <section className="wlm-card wlm-courses" aria-labelledby="wlm-crs-h">
      <header className="wlm-card__head wlm-courses__head">
        <span className="wlm-courses__icon" aria-hidden="true">
          <i className="bi bi-mortarboard" />
        </span>
        <div className="wlm-courses__titles">
          <h2 id="wlm-crs-h" className="wlm-card__title">
            Recommended courses
          </h2>
          <span className="wlm-sm wlm-muted">
            Build market knowledge and invest with confidence
          </span>
        </div>
        <Link href="/learning-center?track=stocks" className="wlm-link">
          View all courses <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      </header>
      <div className="wlm-courses__grid">
        {courses.map((c) => {
          const saved = bookmarked.has(c.id);
          return (
            <article key={c.id} className="wlm-course">
              <div className="wlm-course__top">
                <span className="wlm-course__chip">Course</span>
                <span className="wlm-xs wlm-muted">
                  <i className="bi bi-clock" aria-hidden="true" /> {c.duration_minutes} min
                </span>
              </div>
              <h3 className="wlm-course__title">{c.title}</h3>
              <p className="wlm-sm wlm-muted wlm-course__desc">{c.description}</p>
              <div className="wlm-course__actions">
                <Link href={`/learning-center/course/${c.id}`} className="wlm-btn wlm-btn--sm">
                  Open course <i className="bi bi-arrow-right" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  className="wlm-icon-btn"
                  aria-pressed={saved}
                  aria-label={saved ? `Remove bookmark: ${c.title}` : `Bookmark: ${c.title}`}
                  onClick={() => onToggle(c.id, !saved)}
                >
                  <i
                    className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
