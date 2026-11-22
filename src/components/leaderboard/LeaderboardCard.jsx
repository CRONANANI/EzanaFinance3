'use client';

/**
 * LeaderboardCard (Nov 22 2026): the Ezana Social leaderboard, built from the "leaderboard
 * card" reference (title and date range, a run selector, a podium for the top three, then a
 * paged ranking list with the reader's own row marked). Plain JS, page-scoped CSS (lbc-),
 * theme tokens and Bootstrap Icons only.
 *
 * title          card title
 * rangeLabel     the window the ranking covers, already formatted ("Oct 23, 2026 to Nov 22, 2026")
 * podium         [{ userId, userName, avatarUrl?, rank, value, href? }] (the top three)
 * rankings       [{ userId, rank, userName, avatarUrl?, byline?, value, change?, href? }]
 * currentUserId  the reader, whose row is marked "You"
 * runOptions     [{ id, label }] for the period selector; selectedRunId, onRunChange
 * valueLabel     the measure's name ("Score")
 * formatValue    value to text
 * tools          extra controls under the header (search, filters)
 * loading, error, emptyText
 * pageSize       rows per page (10)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EzDropdown } from '@/components/ui/ez-dropdown';
import './leaderboard-card.css';

const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || '?';

export function LbAvatar({ src, name, size = 36, className = '' }) {
  return (
    <span
      className={`lbc-avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

const MEDAL = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function Named({ href, children, className }) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** The top three on steps: second, first (tallest), third. */
export function LeaderboardPodium({ rankings = [], currentUserId, formatValue, valueLabel }) {
  const byRank = new Map(rankings.map((r) => [r.rank, r]));
  const order = [2, 1, 3].map((n) => byRank.get(n)).filter(Boolean);
  if (!order.length) return null;
  return (
    <ol className="lbc-podium" aria-label="Top three">
      {order.map((r) => {
        const medal = MEDAL[r.rank];
        const me = currentUserId && r.userId === currentUserId;
        return (
          <li key={r.userId} className={`lbc-step lbc-step--${medal}${me ? ' is-me' : ''}`}>
            <span className="lbc-step-who">
              {r.rank === 1 ? (
                <i className="bi bi-trophy-fill lbc-crown" aria-hidden="true" />
              ) : null}
              <LbAvatar src={r.avatarUrl} name={r.userName} size={r.rank === 1 ? 64 : 52} />
              <Named href={r.href} className="lbc-step-name">
                {r.userName}
              </Named>
              {me ? <span className="lbc-you">You</span> : null}
              <span className="lbc-step-value">
                {formatValue(r.value)}
                <span className="lbc-sr"> {valueLabel}</span>
              </span>
            </span>
            <span className="lbc-block" aria-hidden="true">
              <span className="lbc-block-rank">{r.rank}</span>
            </span>
            <span className="lbc-sr">Rank {r.rank}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Change({ value }) {
  if (value == null || !Number.isFinite(Number(value)) || Number(value) === 0)
    return (
      <span className="lbc-change is-flat" aria-label="No change">
        <i className="bi bi-dash" aria-hidden="true" />
      </span>
    );
  const n = Number(value);
  return (
    <span
      className={`lbc-change ${n > 0 ? 'is-up' : 'is-down'}`}
      aria-label={`${n > 0 ? 'Up' : 'Down'} ${Math.abs(n)} since yesterday`}
    >
      <i className={`bi ${n > 0 ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`} aria-hidden="true" />
      {Math.abs(n)}
    </span>
  );
}

/** The ranking list, ten to a page, with the reader's row marked. */
export function LeaderboardRankings({
  rankings = [],
  currentUserId,
  formatValue,
  valueLabel,
  pageSize = 10,
}) {
  const pages = Math.max(1, Math.ceil(rankings.length / pageSize));
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rankings.length, pageSize]);
  const at = Math.min(page, pages - 1);
  const shown = rankings.slice(at * pageSize, at * pageSize + pageSize);
  const mine = currentUserId ? rankings.find((r) => r.userId === currentUserId) : null;
  const mineOff = mine && !shown.includes(mine);

  const row = (r, pinned = false) => {
    const me = currentUserId && r.userId === currentUserId;
    const medal = MEDAL[r.rank];
    return (
      <li
        key={`${r.userId}${pinned ? '-pin' : ''}`}
        className={`lbc-row${me ? ' is-me' : ''}${pinned ? ' is-pinned' : ''}`}
      >
        <span className={`lbc-rank${medal ? ` lbc-rank--${medal}` : ''}`}>
          {r.rank === 1 ? <i className="bi bi-trophy-fill" aria-hidden="true" /> : r.rank}
          {r.rank === 1 ? <span className="lbc-sr">1</span> : null}
        </span>
        <LbAvatar src={r.avatarUrl} name={r.userName} size={36} />
        <span className="lbc-who">
          <Named href={r.href} className="lbc-name">
            {r.userName}
          </Named>
          {me ? <span className="lbc-you">You</span> : null}
          {r.byline ? <span className="lbc-byline">{r.byline}</span> : null}
        </span>
        <Change value={r.change} />
        <span className={`lbc-value${medal ? ` lbc-value--${medal}` : ''}`}>
          {formatValue(r.value)}
        </span>
      </li>
    );
  };

  return (
    <div className="lbc-rankings">
      <div className="lbc-list-head" aria-hidden="true">
        <span>Rank</span>
        <span>Member</span>
        <span>Change</span>
        <span>{valueLabel}</span>
      </div>
      <ol className="lbc-list">
        {shown.map((r) => row(r))}
        {mineOff ? row(mine, true) : null}
      </ol>
      {pages > 1 ? (
        <nav className="lbc-pager" aria-label="Leaderboard pages">
          <span className="lbc-pager-count">
            {at * pageSize + 1} to {Math.min(rankings.length, (at + 1) * pageSize)} of{' '}
            {rankings.length}
          </span>
          <span className="lbc-pager-btns">
            <button
              type="button"
              className="lbc-pager-btn"
              onClick={() => setPage(at - 1)}
              disabled={at === 0}
              aria-label="Previous page"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <span className="lbc-pager-page" aria-current="page">
              Page {at + 1} of {pages}
            </span>
            <button
              type="button"
              className="lbc-pager-btn"
              onClick={() => setPage(at + 1)}
              disabled={at >= pages - 1}
              aria-label="Next page"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </span>
        </nav>
      ) : null}
    </div>
  );
}

export function LeaderboardCard({
  title = 'Leaderboard',
  rangeLabel = '',
  podium = [],
  rankings = [],
  currentUserId = null,
  runOptions = null,
  selectedRunId,
  onRunChange,
  valueLabel = 'Score',
  formatValue = (v) => Number(v || 0).toLocaleString(),
  tools = null,
  loading = false,
  error = null,
  onRetry = null,
  emptyText = 'No rankings yet for this period.',
  pageSize = 10,
  className = '',
}) {
  const options = useMemo(
    () => (runOptions || []).map((o) => ({ value: o.id, label: o.label })),
    [runOptions],
  );
  return (
    <section className={`lbc ${className}`.trim()} aria-labelledby="lbc-title">
      <header className="lbc-head">
        <div className="lbc-head-text">
          <h1 className="lbc-title" id="lbc-title">
            <i className="bi bi-trophy" aria-hidden="true" />
            {title}
          </h1>
          {rangeLabel ? <p className="lbc-range">{rangeLabel}</p> : null}
        </div>
        {options.length ? (
          <EzDropdown
            label="Leaderboard period"
            options={options}
            value={selectedRunId ?? options[0]?.value}
            onChange={(v) => onRunChange?.(v)}
            align="end"
            size="sm"
          />
        ) : null}
      </header>
      {tools ? <div className="lbc-tools">{tools}</div> : null}

      {loading ? (
        <div className="lbc-skel" aria-busy="true">
          <div className="lbc-skel-podium" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="lbc-skel-row" />
          ))}
        </div>
      ) : error ? (
        <div className="lbc-empty" role="alert">
          <span>Couldn&apos;t load the leaderboard.</span>
          {onRetry ? (
            <button type="button" className="lbc-link" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : rankings.length === 0 ? (
        <p className="lbc-empty">{emptyText}</p>
      ) : (
        <>
          <LeaderboardPodium
            rankings={podium}
            currentUserId={currentUserId}
            formatValue={formatValue}
            valueLabel={valueLabel}
          />
          <LeaderboardRankings
            rankings={rankings}
            currentUserId={currentUserId}
            formatValue={formatValue}
            valueLabel={valueLabel}
            pageSize={pageSize}
          />
        </>
      )}
    </section>
  );
}

export default LeaderboardCard;
