'use client';

/**
 * Community v3 tab panels (Nov 23 2026), besides Feed:
 *   TopicsPanel   every active topic with its real post counts (all time and
 *                 30 days), follow, search; a topic opens the filtered feed.
 *   MembersPanel  the public directory (public_profiles only: name, handle,
 *                 avatar, bio, partner badge) with posts in 30 days, search
 *                 and follow. No email, holdings or org membership.
 *   EventsPanel   community sessions: upcoming or past, by type, with RSVP.
 * Research Builds is the feed limited to shared builds (see CommunityPage).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { Avatar, VerifiedBadge } from './primitives';
import { useCommunityResource, sendJson } from './useCommunityResource';
import { groupNumber } from '@/lib/community/redesign';
import { SESSION_TYPES } from '@/lib/community/v3';
import { SessionRow, profileHrefFor } from './CommunityRail';

function PanelHead({ title, sub, children }) {
  return (
    <div className={s.cv3PanelHead}>
      <div>
        <h2 className={s.cv3PanelTitle}>{title}</h2>
        {sub ? <p className={s.cv3Note}>{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SearchBox({ id, label, value, onChange }) {
  return (
    <div className={s.cv3SearchBox}>
      <i className="bi bi-search" aria-hidden="true" />
      <label className={s.srOnly} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TopicsPanel({ topics, loading, onOpenTopic, onToggleFollow }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return topics
      .filter((t) => !term || t.label.toLowerCase().includes(term))
      .slice()
      .sort(
        (a, b) => (b.recent_posts || 0) - (a.recent_posts || 0) || (b.posts || 0) - (a.posts || 0),
      );
  }, [topics, q]);
  return (
    <section>
      <PanelHead
        title="Topics"
        sub="Post counts are live. Follow a topic to weight it in Most Relevant."
      >
        <SearchBox id="cv3-topic-q" label="Search topics" value={q} onChange={setQ} />
      </PanelHead>
      {loading ? <div className={s.skel} style={{ height: 120 }} aria-hidden="true" /> : null}
      {!loading && !list.length ? <p className={s.empty}>No topics match.</p> : null}
      <ul className={s.cv3TopicGrid}>
        {list.map((t) => (
          <li key={t.slug} className={s.cv3TopicCard}>
            <button type="button" className={s.cv3TopicOpen} onClick={() => onOpenTopic(t.slug)}>
              <span className={s.cv3TopicName}>
                <i className="bi bi-hash" aria-hidden="true" />
                {t.label}
              </span>
              <span className={s.cv3Note}>
                <span className={s.num}>{groupNumber(t.recent_posts || 0)}</span> posts in 30 days ·{' '}
                <span className={s.num}>{groupNumber(t.posts || 0)}</span> total
              </span>
            </button>
            <button
              type="button"
              className={`${s.cv3MiniBtn} ${t.followed ? '' : s.cv3MiniBtnOn}`}
              aria-pressed={Boolean(t.followed)}
              aria-label={`${t.followed ? 'Unfollow' : 'Follow'} ${t.label}`}
              onClick={() => onToggleFollow(t)}
            >
              {t.followed ? 'Following' : 'Follow'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MemberCard({ m }) {
  const [following, setFollowing] = useState(m.following);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      await sendJson('/api/community/follow', {
        body: { target_user_id: m.id, action: next ? 'follow' : 'unfollow' },
      });
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className={s.cv3MemberCard}>
      <Link href={profileHrefFor(m)} className={s.cv3MemberMain}>
        <Avatar src={m.avatar_url} name={m.name} size={40} />
        <span className={s.cv3MemberText}>
          <span className={s.cv3MemberName}>
            <span className={s.ellipsis}>{m.name || m.username || 'Member'}</span>
            {m.is_partner ? <VerifiedBadge /> : null}
          </span>
          {m.username ? <span className={s.cv3Note}>@{m.username}</span> : null}
        </span>
      </Link>
      {m.bio ? <p className={s.cv3MemberBio}>{m.bio}</p> : null}
      <div className={s.cv3MemberFoot}>
        <span className={s.cv3Note}>
          {m.is_partner ? 'Partner · ' : ''}
          <span className={s.num}>{groupNumber(m.posts_30d || 0)}</span> posts in 30 days
        </span>
        {m.is_me ? (
          <span className={s.cv3Tag}>You</span>
        ) : (
          <button
            type="button"
            className={`${s.cv3MiniBtn} ${following ? '' : s.cv3MiniBtnOn}`}
            aria-pressed={following}
            disabled={busy}
            onClick={toggle}
            aria-label={`${following ? 'Unfollow' : 'Follow'} ${m.name || m.username || 'member'}`}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </li>
  );
}

export function MembersPanel() {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [pages, setPages] = useState([]);
  const [next, setNext] = useState(null);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const load = async (offset = 0) => {
    if (!offset) setStatus('loading');
    try {
      const p = new URLSearchParams({ offset: String(offset) });
      if (term) p.set('q', term);
      const res = await fetch(`/api/community/members?${p}`, { credentials: 'include' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error);
      setPages((prev) => (offset ? [...prev, ...(d.members || [])] : d.members || []));
      setNext(d.next ?? null);
      setStatus('ready');
    } catch {
      if (!offset) setStatus('error');
    }
  };
  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);
  return (
    <section>
      <PanelHead title="Members" sub="Public profile details only.">
        <SearchBox id="cv3-member-q" label="Search members" value={q} onChange={setQ} />
      </PanelHead>
      {status === 'loading' ? (
        <div className={s.skel} style={{ height: 160 }} aria-hidden="true" />
      ) : null}
      {status === 'error' ? (
        <div className={s.cardError} role="alert">
          <span>Couldn&apos;t load members.</span>
          <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={() => load(0)}>
            Retry
          </button>
        </div>
      ) : null}
      {status === 'ready' && !pages.length ? (
        <p className={s.empty}>{term ? 'No members match.' : 'No public profiles yet.'}</p>
      ) : null}
      {status === 'ready' && pages.length ? (
        <ul className={s.cv3MemberGrid}>
          {pages.map((m) => (
            <MemberCard key={m.id} m={m} />
          ))}
        </ul>
      ) : null}
      {status === 'ready' && next != null ? (
        <button
          type="button"
          className={`${s.btn} ${s.btnLink} ${s.loadMore}`}
          onClick={() => load(next)}
        >
          Load more
        </button>
      ) : null}
    </section>
  );
}

const EVENT_TYPES = [{ key: 'all', label: 'All types' }].concat(
  Object.entries(SESSION_TYPES).map(([key, label]) => ({ key, label })),
);

export function EventsPanel() {
  const [scope, setScope] = useState('upcoming');
  const [type, setType] = useState('all');
  const res = useCommunityResource(`/api/community/sessions?scope=${scope}&limit=50`);
  const rows = (res.data?.rows || []).filter((r) => type === 'all' || r.session_type === type);
  return (
    <section>
      <PanelHead title="Events" sub="Times are shown in each session's own time zone.">
        <div className={s.cv3Chips} role="group" aria-label="When">
          {['upcoming', 'past'].map((k) => (
            <button
              key={k}
              type="button"
              className={s.cv3Chip}
              aria-pressed={scope === k}
              onClick={() => setScope(k)}
            >
              {k === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
      </PanelHead>
      <div
        className={s.cv3Chips}
        role="group"
        aria-label="Session type"
        style={{ marginBottom: 16 }}
      >
        {EVENT_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            className={s.cv3Chip}
            aria-pressed={type === t.key}
            onClick={() => setType(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {res.loading ? <div className={s.skel} style={{ height: 120 }} aria-hidden="true" /> : null}
      {res.error ? (
        <div className={s.cardError} role="alert">
          <span>Couldn&apos;t load events.</span>
          <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={res.reload}>
            Retry
          </button>
        </div>
      ) : null}
      {res.data && !rows.length ? (
        <div className={s.feedEmpty}>
          {scope === 'upcoming'
            ? 'No community sessions are scheduled yet. Research sessions, workshops and discussions will be listed here with registration.'
            : 'No past sessions yet.'}
        </div>
      ) : null}
      {rows.length ? (
        <ul className={s.cv3EventList}>
          {rows.map((r) => (
            <li key={r.id}>
              <SessionRow session={r} wide />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
