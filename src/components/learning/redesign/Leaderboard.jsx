'use client';

import { useState } from 'react';
import { Pill } from './atoms';

function Podium({ rankings }) {
  const top3 = rankings.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = [56, 76, 42];
  const medals = ['#cbd1d6', '#f3c969', '#cd7f32'];

  return (
    <div className="lc-podium">
      {order.map((r, i) => {
        const rank = r.rank;
        const h = heights[i];
        return (
          <div key={r.user_id} className="lc-podium-slot" style={{ height: h + 40 }}>
            <div
              className="lc-podium-avatar"
              style={{
                borderColor: medals[i],
                boxShadow: r.is_me ? '0 0 0 3px var(--emerald-soft)' : undefined,
              }}
            >
              {r.initials}
              <span className="lc-podium-rank">{rank}</span>
            </div>
            <div className="lc-podium-bar" style={{ height: h, background: medals[i] + '55' }}>
              <span className="lc-podium-name">{r.name}</span>
              <span className="lc-podium-elo lc-mono">{r.elo}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Leaderboard({ data, onPeriodChange }) {
  const [period, setPeriod] = useState(data?.period || 'weekly');
  const rankings = data?.rankings || [];
  const me = rankings.find((r) => r.is_me);
  const nextUp = rankings.find((r) => !r.is_me && r.rank < (me?.rank || 999));
  const gap = nextUp && me ? Math.max(0, nextUp.elo - me.elo + 1) : null;

  const handlePeriod = (p) => {
    setPeriod(p);
    onPeriodChange?.(p);
  };

  return (
    <section className="lc-leaderboard">
      <div className="lc-section-header">
        <div>
          <div className="lc-eyebrow">Friends learning</div>
          <h2 className="lc-section-title">Leaderboard</h2>
        </div>
        <div className="lc-ap-tier-tabs">
          {['weekly', 'all-time', 'track'].map((p) => (
            <button
              key={p}
              type="button"
              className={`lc-tier-tab ${period === p ? 'lc-tier-tab--active' : ''}`}
              onClick={() => handlePeriod(p)}
            >
              {p === 'weekly' ? 'Weekly' : p === 'all-time' ? 'All-time' : 'Track'}
            </button>
          ))}
        </div>
      </div>

      {rankings.length >= 3 && <Podium rankings={rankings} />}

      <div className="lc-leaderboard-list">
        {rankings.slice(3).map((r) => (
          <div
            key={r.user_id}
            className={`lc-leaderboard-row ${r.is_me ? 'lc-leaderboard-row--me' : ''}`}
          >
            <span className="lc-mono lc-fg-muted" style={{ width: 24 }}>
              {r.rank}
            </span>
            <span className="lc-leaderboard-avatar">{r.initials}</span>
            <span style={{ flex: 1, fontWeight: r.is_me ? 700 : 600 }}>
              {r.name}
              {r.is_me && (
                <Pill tone="you" className="lc-leaderboard-you-pill">
                  YOU
                </Pill>
              )}
            </span>
            <span className="lc-mono lc-emerald">{r.elo} ELO</span>
          </div>
        ))}
      </div>

      <div className="lc-leaderboard-footer">
        {nextUp && gap != null && (
          <span className="lc-text-sm lc-fg-muted">
            Pass {nextUp.name} by earning <strong>{gap} ELO</strong>
          </span>
        )}
        <button
          type="button"
          className="lc-text-sm lc-emerald"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          See all friends →
        </button>
      </div>
    </section>
  );
}
