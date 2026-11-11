'use client';

/**
 * People to Follow (right rail). Follow is optimistic through the existing
 * /api/community/follow route and rolls back on failure; the page refreshes
 * the Following count (and the feed when it shows Following). Hidden when
 * there is nobody to suggest.
 */
import { useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { SectionCard, Avatar, VerifiedBadge } from './primitives';
import { useCommunityResource, sendJson } from './useCommunityResource';
import { compactNumber } from '@/lib/community/redesign';

function Person({ p, onFollowed }) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const href = p.is_demo
    ? '/community'
    : p.username
      ? `/profile/${encodeURIComponent(p.username)}`
      : `/community/profile/${p.user_id}`;
  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    /* Sample people (admin and demo accounts only): the follow stays local. */
    if (p.is_demo) return;
    setBusy(true);
    setErr('');
    try {
      await sendJson('/api/community/follow', {
        body: { target_user_id: p.user_id, action: next ? 'follow' : 'unfollow' },
      });
      onFollowed?.();
    } catch (e) {
      setFollowing(!next);
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li>
      <div className={`${s.row} ${s.peopleRow}`}>
        <Avatar src={p.avatar_url} name={p.name} size={40} />
        <span style={{ minWidth: 0 }}>
          <Link
            href={href}
            className={`${s.ellipsis} ${s.strong}`}
            style={{ display: 'flex', gap: 4, color: 'inherit', textDecoration: 'none' }}
          >
            <span className={s.ellipsis}>{p.name}</span>
            {p.is_partner ? <VerifiedBadge /> : null}
          </Link>
          <span className={s.subline}>
            {p.type} · <span className={s.num}>{compactNumber(p.followers)}</span> followers
          </span>
          {err ? <span className={s.formError}>{err}</span> : null}
        </span>
        <button
          type="button"
          className={`${s.btn} ${s.btnOutline}`}
          aria-pressed={following}
          aria-label={`${following ? 'Unfollow' : 'Follow'} ${p.name}`}
          onClick={toggle}
          disabled={busy}
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
    </li>
  );
}

export function PeopleToFollow({ onFollowed }) {
  const res = useCommunityResource('/api/community/people', { refetchOnFocus: false });
  const rows = res.data?.rows || [];
  if (!res.loading && !res.error && rows.length === 0) return null;
  return (
    <SectionCard
      id="people-to-follow"
      icon="bi-people"
      title="People to Follow"
      state={res}
      skeletonRows={2}
      rowHeight={52}
    >
      <ul className={s.rows}>
        {rows.map((p) => (
          <Person key={p.user_id} p={p} onFollowed={onFollowed} />
        ))}
      </ul>
    </SectionCard>
  );
}
