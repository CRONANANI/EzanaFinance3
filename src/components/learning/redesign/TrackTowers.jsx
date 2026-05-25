'use client';

const TRACK_COLORS = {
  stocks: 'var(--emerald)',
  crypto: '#f59e0b',
  betting: '#6366f1',
  commodities: '#ec4899',
  risk: 'var(--emerald)',
};

const TIER_ROWS = [
  { key: 'overall', label: 'DIAMOND', color: 'var(--tier-diamond)' },
  { key: 'expert', label: 'PLATINUM', color: 'var(--tier-platinum)' },
  { key: 'advanced', label: 'GOLD', color: 'var(--tier-gold)' },
  { key: 'intermediate', label: 'SILVER', color: 'var(--tier-silver)' },
  { key: 'basic', label: 'BRONZE', color: 'var(--tier-bronze)' },
];

function tierPct(track, tierKey) {
  const summary = track.summary || {};
  if (tierKey === 'overall') return summary.pct || 0;
  const lv = summary.levels?.[tierKey];
  if (!lv?.total) return 0;
  return Math.round((lv.completed / lv.total) * 100);
}

function Tower({ track, isMain, onClick, onSetAsMain }) {
  const color = TRACK_COLORS[track.id] || 'var(--emerald)';

  return (
    <button
      type="button"
      className={`lc-tower ${isMain ? 'lc-tower--main' : ''}`}
      style={{ '--track-color': color, '--track-soft': `${color}22` }}
      onClick={onClick}
    >
      {isMain && <div className="lc-tower-main-tag">MAIN TRACK</div>}
      {!isMain && (
        <span
          className="lc-tower-set-main"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onSetAsMain?.(track.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onSetAsMain?.(track.id);
            }
          }}
        >
          Set as main
        </span>
      )}
      <div className="lc-tower-header">
        <div>
          <div className="lc-tower-name">{track.shortLabel || track.label}</div>
          <div className="lc-tower-meta">
            {track.summary?.completed ?? 0}/{track.summary?.total ?? track.totalCourses ?? 0}{' '}
            courses
          </div>
        </div>
      </div>
      <div className="lc-tower-tiers">
        {TIER_ROWS.map((tier) => {
          const pct = tierPct(track, tier.key);
          return (
            <div key={tier.key} className="lc-tower-tier">
              <div
                className="lc-tower-tier-fill"
                style={{ width: `${pct}%`, background: tier.color }}
              />
              <div className="lc-tower-tier-row">
                <span>
                  <span className="lc-tower-tier-dot" style={{ background: tier.color }} />
                  {tier.label}
                </span>
                <span className="lc-mono">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="lc-tower-footer">
        <span className="lc-tower-footer-pct lc-mono">{track.summary?.pct ?? 0}%</span>
        <span className="lc-text-xs lc-fg-muted">
          {(track.summary?.pct ?? 0) === 0 ? 'Not started' : 'Track progress'}
        </span>
      </div>
    </button>
  );
}

export function TrackTowers({ tracks = [], mainTrack = 'stocks', onSelectTrack, onSetMainTrack }) {
  return (
    <section className="lc-track-towers">
      <div className="lc-section-header">
        <div>
          <div className="lc-eyebrow">Your tracks</div>
          <h2 className="lc-section-title">Track towers</h2>
        </div>
      </div>
      <div className="lc-towers-grid">
        {tracks.map((track) => (
          <Tower
            key={track.id}
            track={track}
            isMain={track.id === mainTrack}
            onClick={() => onSelectTrack?.(track.id)}
            onSetAsMain={onSetMainTrack}
          />
        ))}
      </div>
    </section>
  );
}
