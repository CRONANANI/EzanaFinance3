'use client';

/**
 * The KPI strip (community_page_stats via /api/community/stats). Nov 15 2026:
 * a compact flat strip, only as wide as its content: a small grey label over
 * a mono value, no boxes and no dividers.
 */
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
          <div key={i} className={s.skel} style={{ width: 96, height: 44 }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className={s.cardError} role="alert">
        <span>Couldn&apos;t load the community figures.</span>
        <button type="button" className={`${s.btn} ${s.btnLink}`} onClick={reload}>
          Retry
        </button>
      </div>
    );
  }
  return (
    <div className={s.stats} role="group" aria-label="Community figures">
      <StatTile value={groupNumber(data?.total_members)} label="Total members" />
      <StatTile value={groupNumber(data?.active_this_month)} label="Active this month" />
      <StatTile value={groupNumber(data?.discussions)} label="Discussions" />
      <StatTile
        value={data?.my_rank ? `#${groupNumber(data.my_rank)}` : 'Unranked'}
        label="Your rank"
        extra={<RankInfo />}
      />
    </div>
  );
}
