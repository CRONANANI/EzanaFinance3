'use client';

/** Active discussions (right rail): community_active_discussions, top five. */
import s from '@/app/(dashboard)/community/community.module.css';
import { SectionCard, TrendBadge } from './primitives';
import { useCommunityResource } from './useCommunityResource';
import { groupNumber } from '@/lib/community/redesign';

export function ActiveDiscussions({ onOpenPost, onViewAll }) {
  const res = useCommunityResource('/api/community/discussions');
  const rows = res.data?.rows || [];
  return (
    <SectionCard
      id="active-discussions"
      icon="bi-chat"
      title="Active discussions"
      state={res}
      skeletonRows={5}
      rowHeight={28}
      action={
        <button type="button" className={s.viewAll} onClick={onViewAll}>
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      }
    >
      {rows.length === 0 ? (
        <p className={s.empty}>No active discussions right now.</p>
      ) : (
        <ol className={s.rows}>
          {rows.map((r, i) => (
            <li key={r.post_id}>
              <button
                type="button"
                className={`${s.row} ${s.rowLink} ${s.discRow}`}
                onClick={() => onOpenPost(r.post_id)}
              >
                <span className={s.rank}>{i + 1}</span>
                <span className={`${s.ellipsis} ${s.strong}`} title={r.title}>
                  {r.title}
                </span>
                <span className={s.muted}>
                  <span className={s.num}>{groupNumber(r.replies)}</span>{' '}
                  {r.replies === 1 ? 'reply' : 'replies'}
                </span>
                <TrendBadge kind={r.badge} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
