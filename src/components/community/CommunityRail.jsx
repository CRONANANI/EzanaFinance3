'use client';

/**
 * Community v3 right rail (Nov 23 2026), about 272px wide at 1440:
 *   OverviewCard      Members, Research Builds, Discussions (real counts)
 *   TrendingCard      the five topics with the most posts in the last 7 days
 *                     (a topic's post count against the 7 days before)
 *   EventsCard        the next scheduled community sessions, with a real
 *                     RSVP (capacity and start time checked on the server)
 *   ContributorsCard  30-day activity ranking with its formula shown
 * Every card loads and fails on its own and shows nothing it cannot back.
 */
import { useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { Avatar } from './primitives';
import { useCommunityResource, sendJson } from './useCommunityResource';
import { compactNumber, groupNumber } from '@/lib/community/redesign';
import { sessionDateParts, sessionWhen, SESSION_TYPES } from '@/lib/community/v3';

export function profileHrefFor(p) {
  if (p?.username) return `/profile/${encodeURIComponent(p.username)}`;
  return `/community/profile/${p?.user_id || p?.id}`;
}

function RailCard({ id, icon, title, meta, children, footer }) {
  return (
    <section className={`${s.card} ${s.cv3RailCard}`} id={id} aria-labelledby={`${id}-title`}>
      <div className={s.cardHead}>
        <h2 className={s.cardTitle} id={`${id}-title`}>
          <i className={`bi ${icon}`} aria-hidden="true" />
          {title}
        </h2>
        {meta ? <span className={s.cardMeta}>{meta}</span> : null}
      </div>
      {children}
      {footer}
    </section>
  );
}

function RailSkeleton({ rows = 3 }) {
  return (
    <div className={s.skelRows} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={s.skel} style={{ height: 12, marginTop: 12 }} />
      ))}
    </div>
  );
}

function RailError({ onRetry }) {
  return (
    <div className={s.cardError} role="alert">
      <span>Couldn&apos;t load this.</span>
      <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function OverviewCard() {
  const res = useCommunityResource('/api/community/overview');
  const d = res.data;
  const cells = [
    { key: 'members', label: 'Members' },
    { key: 'builds', label: 'Research Builds' },
    { key: 'discussions', label: 'Discussions' },
  ];
  return (
    <RailCard id="community-overview" icon="bi-people" title="Community Overview">
      {res.loading ? <RailSkeleton rows={1} /> : null}
      {res.error ? <RailError onRetry={res.reload} /> : null}
      {d ? (
        <dl className={s.cv3Overview}>
          {cells.map((c) => (
            <div key={c.key} className={s.cv3OverviewCell}>
              <dt>{c.label}</dt>
              <dd className={s.num} title={groupNumber(d[c.key] ?? 0)}>
                {compactNumber(d[c.key] ?? 0)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </RailCard>
  );
}

export function TrendingCard({ onTopic }) {
  const res = useCommunityResource('/api/community/insights?view=trending-topics');
  const rows = (res.data?.rows || []).slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => Number(r.posts) || 0));
  return (
    <RailCard
      id="community-trending"
      icon="bi-graph-up-arrow"
      title="Trending"
      meta="Posts, 7 days"
    >
      {res.loading ? <RailSkeleton rows={5} /> : null}
      {res.error ? <RailError onRetry={res.reload} /> : null}
      {res.data && !rows.length ? <p className={s.empty}>No topic activity this week.</p> : null}
      {rows.length ? (
        <ol className={s.rows}>
          {rows.map((r, i) => (
            <li key={r.slug}>
              <button
                type="button"
                className={`${s.row} ${s.rowLink} ${s.cv3TrendRow}`}
                title={`${r.label}: ${groupNumber(r.posts)} posts in the last 7 days`}
                onClick={() => onTopic?.(r.slug)}
              >
                <span className={`${s.num} ${s.cv3Rank}`}>{i + 1}</span>
                <span className={`${s.ellipsis} ${s.cv3TrendLabel}`}>{r.label}</span>
                <span className={s.cv3Bar} aria-hidden="true">
                  <span style={{ width: `${Math.round(((Number(r.posts) || 0) / max) * 100)}%` }} />
                </span>
                <span className={`${s.num} ${s.cv3TrendCount}`}>{groupNumber(r.posts)}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </RailCard>
  );
}

/** One session row; also used by the Events tab. */
export function SessionRow({ session, onChanged, wide = false }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mine, setMine] = useState(session.my_rsvp);
  const [count, setCount] = useState(session.rsvp_count);
  const { month, day } = sessionDateParts(session.starts_at, session.timezone);
  const started = Date.parse(session.starts_at) <= Date.now();
  const full = session.capacity != null && count >= session.capacity && !mine;
  const cancelled = session.status === 'cancelled';

  const toggle = async () => {
    setBusy(true);
    setErr('');
    try {
      const d = await sendJson('/api/community/sessions', {
        body: { session_id: session.id, going: !mine },
      });
      setMine(Boolean(d.going));
      setCount(d.rsvp_count);
      onChanged?.();
    } catch (e) {
      setErr(e.message || 'That did not save.');
    } finally {
      setBusy(false);
    }
  };

  let action = null;
  if (cancelled) action = <span className={s.cv3Tag}>Cancelled</span>;
  else if (started) action = <span className={s.cv3Tag}>Started</span>;
  else if (full) action = <span className={s.cv3Tag}>Full</span>;
  else
    action = (
      <button
        type="button"
        className={`${s.cv3MiniBtn} ${mine ? '' : s.cv3MiniBtnOn}`}
        onClick={toggle}
        disabled={busy}
        aria-label={`${mine ? 'Cancel registration for' : 'Register for'} ${session.title}`}
      >
        {busy ? '…' : mine ? 'Going' : 'Register'}
      </button>
    );

  return (
    <div className={`${s.cv3Session} ${wide ? s.cv3SessionWide : ''}`}>
      <div className={s.cv3DateBlock} aria-hidden="true">
        <span>{month}</span>
        <strong className={s.num}>{day}</strong>
      </div>
      <div className={s.cv3SessionBody}>
        <p className={s.cv3SessionTitle} title={session.title}>
          {session.title}
        </p>
        <p className={s.cv3SessionMeta}>
          <time dateTime={session.starts_at}>
            {sessionWhen(session.starts_at, session.timezone)}
          </time>
        </p>
        <p className={s.cv3SessionMeta}>
          {SESSION_TYPES[session.session_type] || 'Session'}
          {session.capacity != null
            ? ` · ${count} of ${session.capacity} places`
            : count
              ? ` · ${count} going`
              : ''}
        </p>
        {wide && session.description ? (
          <p className={s.cv3SessionDesc}>{session.description}</p>
        ) : null}
        {mine && session.join_url ? (
          <a
            className={s.viewAll}
            href={session.join_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join link <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          </a>
        ) : null}
        {err ? (
          <p className={s.formError} role="alert">
            {err}
          </p>
        ) : null}
      </div>
      <div className={s.cv3SessionAction}>{action}</div>
    </div>
  );
}

export function EventsCard({ onViewAll }) {
  const res = useCommunityResource('/api/community/sessions?scope=upcoming&limit=3');
  const rows = res.data?.rows || [];
  return (
    <RailCard
      id="community-events"
      icon="bi-calendar3"
      title="Upcoming Events"
      footer={
        rows.length ? (
          <div className={s.cv3RailFoot}>
            <button type="button" className={s.viewAll} onClick={onViewAll}>
              All events <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
        ) : null
      }
    >
      {res.loading ? <RailSkeleton rows={2} /> : null}
      {res.error ? <RailError onRetry={res.reload} /> : null}
      {res.data && !rows.length ? (
        <p className={s.empty}>No sessions scheduled yet. New ones will show here.</p>
      ) : null}
      {rows.length ? (
        <ul className={s.rows}>
          {rows.map((r) => (
            <li key={r.id}>
              <SessionRow session={r} />
            </li>
          ))}
        </ul>
      ) : null}
    </RailCard>
  );
}

export function ContributorsCard() {
  const res = useCommunityResource('/api/community/contributors?days=30&limit=5', {
    refetchOnFocus: false,
  });
  const rows = res.data?.rows || [];
  return (
    <RailCard
      id="community-contributors"
      icon="bi-award"
      title="Top Contributors"
      meta="30 days"
      footer={
        <p className={s.cv3Method}>
          Activity score: 3 per post (up to 5 a day), 1 per reply (up to 10 a day), 1 per other
          member who engaged. Self-engagement is excluded.
        </p>
      }
    >
      {res.loading ? <RailSkeleton rows={5} /> : null}
      {res.error ? <RailError onRetry={res.reload} /> : null}
      {res.data && !rows.length ? (
        <p className={s.empty}>
          {res.data.unavailable ? 'Rankings are not live yet.' : 'No activity in the last 30 days.'}
        </p>
      ) : null}
      {rows.length ? (
        <ol className={s.rows}>
          {rows.map((r) => (
            <li key={r.user_id}>
              <Link
                href={profileHrefFor(r)}
                className={`${s.row} ${s.rowLink} ${s.cv3ContribRow}`}
                title={`${r.posts} posts, ${r.replies} replies, ${r.engaged} members engaged`}
              >
                <span className={`${s.num} ${s.cv3Rank}`}>{r.rank}</span>
                <Avatar src={r.avatar_url} name={r.name} size={24} />
                <span className={s.ellipsis}>{r.name || r.username || 'Member'}</span>
                <span className={`${s.num} ${s.cv3TrendCount}`}>{groupNumber(r.score)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </RailCard>
  );
}
