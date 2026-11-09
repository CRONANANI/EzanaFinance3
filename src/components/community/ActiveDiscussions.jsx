'use client';

/** Active Discussions (right rail): community_active_discussions, top three. */
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
      title="Active Discussions"
      state={res}
      action={
        <button type="button" className={s.viewAll} onClick={onViewAll}>
          View All <i className="bi bi-arrow-right" aria-hidden="true" />
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
                style={{
                  width: '100%',
                  border: 0,
                  background: 'transparent',
                  font: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onClick={() => onOpenPost(r.post_id)}
              >
                <span className={s.rank}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span className={`${s.ellipsis} ${s.strong}`} style={{ display: 'block' }}>
                    {r.title}
                  </span>
                  <span className={`${s.subline} ${s.num}`}>
                    {groupNumber(r.replies)} {r.replies === 1 ? 'reply' : 'replies'}
                  </span>
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
