'use client';

/** The four stat tiles (community_page_stats via /api/community/stats). */
import { useState } from 'react';
import s from '@/app/(dashboard)/community/community.module.css';
import { StatTile } from './primitives';
import { useCommunityResource } from './useCommunityResource';
import { groupNumber } from '@/lib/community/redesign';

const RANK_TIP =
  'Based on your portfolio return for the current leaderboard period. Hidden if you opted out of the leaderboard.';

function RankInfo() {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className={s.info}
      aria-label={RANK_TIP}
      aria-expanded={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      <i className="bi bi-info-circle" aria-hidden="true" />
      {open ? (
        <span className={s.tip} role="tooltip">
          {RANK_TIP}
        </span>
      ) : null}
    </button>
  );
}

export function CommunityStats() {
  const { data, error, loading, reload } = useCommunityResource('/api/community/stats');
  if (loading) {
    return (
      <div className={s.stats} aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={s.skel}
            style={{ height: 70, borderRadius: 'var(--radius-lg)' }}
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${s.card} ${s.cardError}`} role="alert">
        <span>Couldn&apos;t load this section.</span>
        <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={reload}>
          <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className={s.stats}>
      <StatTile icon="bi-people" value={groupNumber(data?.total_members)} label="Total Members" />
      <StatTile
        icon="bi-activity"
        value={groupNumber(data?.active_this_month)}
        label="Active This Month"
      />
      <StatTile icon="bi-chat" value={groupNumber(data?.discussions)} label="Discussions" />
      <StatTile
        icon="bi-trophy"
        value={data?.my_rank ? `#${groupNumber(data.my_rank)}` : 'Unranked'}
        label="Your Rank"
        extra={<RankInfo />}
      />
    </div>
  );
}
