'use client';

/**
 * Leaderboard (right rail): the top three for the current period, then the
 * caller's own row pinned below when they rank lower. An unranked or
 * opted-out caller sees a note instead.
 */
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';
import { SectionCard, Avatar, DeltaValue } from './primitives';
import { useCommunityResource } from './useCommunityResource';

function LbRow({ r, me = false }) {
  const href = r.username
    ? `/profile/${encodeURIComponent(r.username)}`
    : `/community/profile/${r.user_id}`;
  return (
    <li>
      <Link href={href} className={`${s.row} ${s.rowLink} ${s.lbRow} ${me ? s.meRow : ''}`}>
        <span className={s.rank}>
          {r.rank === 1 ? (
            <i className={`bi bi-award-fill ${s.crown}`} role="img" aria-label="Rank 1" />
          ) : (
            r.rank
          )}
        </span>
        <Avatar src={r.avatar_url} name={r.name} size={32} />
        <span className={s.ellipsis}>
          <span className={s.strong}>{r.name}</span>
          {r.is_me ? <span className={s.youTag}>You</span> : null}
        </span>
        <DeltaValue value={r.return_pct} />
      </Link>
    </li>
  );
}

export function CommunityLeaderboard() {
  const res = useCommunityResource('/api/community/leaderboard/top');
  const top = res.data?.top || [];
  const me = res.data?.me || null;
  return (
    <SectionCard
      id="community-leaderboard"
      icon="bi-trophy"
      title="Leaderboard"
      state={res}
      action={
        <Link href="/leaderboard" className={s.viewAll}>
          View All <i className="bi bi-arrow-right" aria-hidden="true" />
        </Link>
      }
    >
      {top.length === 0 ? <p className={s.empty}>No rankings yet for this period.</p> : null}
      <ol className={s.rows}>
        {top.map((r) => (
          <LbRow key={r.user_id} r={r} me={r.is_me} />
        ))}
        {me ? <LbRow r={me} me /> : null}
      </ol>
      {res.data && !res.data.ranked ? (
        <p className={s.empty} style={{ marginTop: 10 }}>
          You are not on the leaderboard.{' '}
          <Link href="/settings?tab=profile" className={s.viewAll}>
            Privacy settings
          </Link>
        </p>
      ) : null}
    </SectionCard>
  );
}
