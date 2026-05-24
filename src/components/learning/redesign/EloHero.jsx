'use client';

import { useEffect, useState } from 'react';
import { TierChip } from './atoms';

function HeroStat({ label, value, sub }) {
  return (
    <div className="lc-hero-stat">
      <div className="lc-hero-stat-label">{label}</div>
      <div className="lc-hero-stat-value">{value}</div>
      {sub && <div className="lc-hero-stat-sub">{sub}</div>}
    </div>
  );
}

function useAnimatedNumber(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(target) || 0;
    let frame;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function EloHero({
  user,
  elo,
  streak,
  friendsOnLadder = [],
  stats,
  nextBadgeCoursesLeft = 2,
}) {
  const animatedElo = useAnimatedNumber(elo?.total || 0);
  const positionPct = Math.min(100, Math.max(0, elo?.position_pct ?? 0));
  const delta = elo?.weekly_delta || 0;

  return (
    <section className="lc-elo-hero">
      <div className="lc-elo-hero-glow" aria-hidden />
      <div className="lc-elo-hero-top">
        <div>
          <div className="lc-eyebrow">Your learning ELO · {user?.main_track_label || 'Stocks'}</div>
          <div className="lc-elo-big">
            <span className="lc-mono">{animatedElo.toLocaleString()}</span>
            {delta !== 0 && (
              <span className="lc-elo-delta-pill">
                {delta >= 0 ? '+' : ''}
                {delta} this week
              </span>
            )}
          </div>
          <div className="lc-elo-meta">
            <TierChip tier={elo?.tier || 'Bronze'} />
            <span className="lc-text-sm lc-fg-muted">
              Top {elo?.percentile ?? 25}% · #{elo?.rank_in_network ?? 1} in your network
            </span>
          </div>
        </div>
        <div className="lc-streak-badge">
          <span className="lc-streak-flame" aria-hidden>
            🔥
          </span>
          <span className="lc-streak-num lc-mono">{streak?.current_streak ?? 0}</span>
          <span className="lc-streak-label">Day streak</span>
        </div>
      </div>

      <div className="lc-elo-ladder-wrap">
        <div className="lc-elo-ladder-labels">
          <span>Bronze</span>
          <span>Silver</span>
          <span>Gold</span>
        </div>
        <div className="lc-elo-ladder">
          <div className="lc-tier-zone lc-tier-zone--bronze" style={{ left: 0, width: '19.8%' }} />
          <div
            className="lc-tier-zone lc-tier-zone--silver"
            style={{ left: '19.8%', width: '39.7%' }}
          />
          <div
            className="lc-tier-zone lc-tier-zone--gold"
            style={{ left: '59.5%', width: '40.5%' }}
          />
          <div
            className="lc-tier-boundary"
            style={{ left: '19.8%', background: 'var(--tier-bronze)' }}
          />
          <div
            className="lc-tier-boundary"
            style={{ left: '59.5%', background: 'var(--tier-silver)' }}
          />
          <div className="lc-elo-fill" style={{ width: `${positionPct}%` }} />
          <div className="lc-elo-marker" style={{ left: `${positionPct}%` }}>
            <div className="lc-elo-marker-label">YOU · {elo?.total ?? 0}</div>
          </div>
          {friendsOnLadder.map((f) => (
            <div
              key={f.user_id}
              className="lc-elo-friend"
              style={{ left: `${Math.min(100, f.position_pct ?? 0)}%` }}
              title={`${f.name} · ${f.elo} ELO`}
            >
              {f.initials}
            </div>
          ))}
        </div>
        <div className="lc-elo-ladder-caption">
          <i className="bi bi-people" />
          Friends on the ladder · 0 → 2,520 ELO
        </div>
      </div>

      <div className="lc-hero-stats">
        <HeroStat
          label="Courses done"
          value={`${stats?.courses_done ?? 0}/${stats?.courses_total ?? 120}`}
          sub="Perfect quiz passes"
        />
        <HeroStat
          label="Hours this week"
          value={stats?.hours_this_week ?? '—'}
          sub="Learning time"
        />
        <HeroStat
          label="Quizzes passed"
          value={`${stats?.quizzes_passed_perfect ?? 0}/${stats?.quizzes_passed_total ?? 0}`}
          sub="Perfect scores"
        />
        <HeroStat
          label="Next badge"
          value={stats?.next_badge ?? 'Bronze · Stocks'}
          sub={`${nextBadgeCoursesLeft} courses left`}
        />
      </div>
    </section>
  );
}
