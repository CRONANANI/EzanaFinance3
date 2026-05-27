'use client';

import { Caps } from './Caps';
import { TRACKS } from '@/lib/learning-curriculum';

const TIER_ROWS = [
  { key: 'expert', label: 'PLAT', fillClass: 'lc-tt-tier-fill--platinum', color: 'var(--lc-plat)' },
  { key: 'advanced', label: 'GOLD', fillClass: 'lc-tt-tier-fill--gold', color: 'var(--lc-gold)' },
  {
    key: 'intermediate',
    label: 'SILVER',
    fillClass: 'lc-tt-tier-fill--silver',
    color: 'var(--lc-silver)',
  },
  {
    key: 'basic',
    label: 'BRONZE',
    fillClass: 'lc-tt-tier-fill--bronze',
    color: 'var(--lc-bronze)',
  },
];

const LEGEND_ITEMS = [
  { label: 'Platinum', color: 'var(--lc-plat)' },
  { label: 'Gold', color: 'var(--lc-gold)' },
  { label: 'Silver', color: 'var(--lc-silver)' },
  { label: 'Bronze', color: 'var(--lc-bronze)' },
];

function tierPct(track, tierKey) {
  const lv = track.summary?.levels?.[tierKey];
  if (!lv?.total) return 0;
  return Math.round((lv.completed / lv.total) * 100);
}

export function LcTrackTowers({ tracks, mainTrack, onSelectTrack, onSetMainTrack }) {
  return (
    <section>
      <header className="lc-section-head">
        <div>
          <Caps>Your tracks</Caps>
          <h2 className="lc-section-title">Track towers</h2>
        </div>
        <div className="lc-tier-legend">
          {LEGEND_ITEMS.map((l) => (
            <span key={l.label} className="lc-tier-legend-item">
              <span className="lc-tier-legend-swatch" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </header>

      <div className="lc-card lc-tt-table">
        <div className="lc-tt-grid lc-tt-head">
          <div>Track</div>
          <div>Status</div>
          <div className="lc-tt-align-right">Courses</div>
          <div>Tier coverage</div>
          <div className="lc-tt-align-right">Plat</div>
          <div className="lc-tt-align-right">Gold</div>
          <div className="lc-tt-align-right">Silver</div>
          <div className="lc-tt-align-right">Bronze</div>
          <div className="lc-tt-align-right">Total</div>
        </div>

        {tracks.map((track) => {
          const isMain = track.id === mainTrack;
          const totalPct = track.summary?.pct || 0;
          const isActive = totalPct > 0;
          const coursesDone = track.summary?.completed || 0;
          const coursesTotal = track.summary?.total || 0;
          const tierName = TRACKS.find((t) => t.id === track.id)?.shortLabel || track.name;

          return (
            <div
              key={track.id}
              className={`lc-tt-grid lc-tt-row ${isMain ? 'lc-tt-row--main' : ''}`}
              onClick={() => onSelectTrack?.(track.id)}
              onDoubleClick={() => onSetMainTrack?.(track.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectTrack?.(track.id);
              }}
            >
              <div>
                {isMain && <div className="lc-tt-main-pill">MAIN TRACK</div>}
                <div className="lc-tt-track-name">{tierName}</div>
              </div>

              <div>
                <span
                  className={`lc-tt-status ${isActive ? 'lc-tt-status--active' : 'lc-tt-status--idle'}`}
                >
                  <span className="lc-tt-status-dot" />
                  {isActive ? 'Active' : 'Not started'}
                </span>
              </div>

              <div className="lc-tt-courses lc-tt-align-right">
                {coursesDone}/{coursesTotal}
              </div>

              <div>
                {TIER_ROWS.map((tier) => {
                  const pct = tierPct(track, tier.key);
                  return (
                    <div key={tier.key} className="lc-tt-tier-row">
                      <span className="lc-tt-tier-label" style={{ color: tier.color }}>
                        {tier.label}
                      </span>
                      <div className="lc-tt-tier-bar">
                        <div
                          className={`lc-tt-tier-fill ${tier.fillClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {TIER_ROWS.map((tier) => {
                const pct = tierPct(track, tier.key);
                return (
                  <div
                    key={tier.key}
                    className={`lc-tt-pct lc-tt-align-right ${pct === 0 ? 'lc-tt-pct--zero' : ''}`}
                  >
                    {pct}%
                  </div>
                );
              })}

              <div
                className={`lc-tt-total lc-tt-align-right ${isActive ? 'lc-tt-total--active' : 'lc-tt-total--zero'}`}
              >
                {totalPct}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
