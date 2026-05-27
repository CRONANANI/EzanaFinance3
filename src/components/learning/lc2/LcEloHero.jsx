'use client';

import { NumberText } from './NumberText';
import { LcEloSparkline } from './LcEloSparkline';
import { LcEloLadder } from './LcEloLadder';

const TIER_LEVEL_TO_LABEL = {
  basic: 'Bronze',
  intermediate: 'Silver',
  advanced: 'Gold',
  expert: 'Platinum',
};

export function LcEloHero({
  trackLabel,
  elo,
  weekDelta,
  currentTierLevel,
  rank,
  rankScope,
  eloHistory,
  stats,
}) {
  const tierLabel = TIER_LEVEL_TO_LABEL[currentTierLevel] || 'Bronze';
  const tierClass = `lc-tier-chip lc-tier-chip--${tierLabel.toLowerCase()}`;
  const prior = elo - weekDelta;
  const deltaPct = prior > 0 ? ((weekDelta / prior) * 100).toFixed(1) : '0.0';

  return (
    <div className="lc-card lc-hero">
      <div className="lc-card-head lc-hero-head">
        <div>
          <span className="lc-card-title">Learning ELO</span>
          <span className="lc-card-title-sub">· {trackLabel}</span>
        </div>
        <span className="lc-live-pill">
          <span className="lc-live-dot" />
          Live
        </span>
      </div>

      <div className="lc-hero-body">
        <div>
          <div className="lc-hero-number">{elo.toLocaleString()}</div>
          {weekDelta !== 0 && (
            <div className="lc-delta-pill">
              <span className="lc-delta-pill-arrow" />
              <NumberText size={12} weight={500} color="var(--lc-accent)">
                {weekDelta > 0 ? '+' : ''}
                {weekDelta} this week · {weekDelta > 0 ? '+' : ''}
                {deltaPct}%
              </NumberText>
            </div>
          )}
          <div className="lc-hero-tier-row">
            <span className={tierClass}>{tierLabel} tier</span>
            <span>
              {rank} {rankScope}
            </span>
          </div>
        </div>
        <div>
          <LcEloSparkline data={eloHistory} />
        </div>
      </div>

      <LcEloLadder rating={elo} />

      <div className="lc-stats-grid">
        <StatCell
          label="Courses"
          value={
            <>
              <NumberText size={24} weight={500}>
                {stats.coursesDone}
              </NumberText>
              <NumberText size={16} weight={500} color="var(--lc-ink-3)">
                /{stats.coursesTotal}
              </NumberText>
            </>
          }
          sub="Perfect passes"
        />
        <StatCell
          label="Hours · week"
          value={
            stats.hoursThisWeek != null ? (
              <NumberText size={24} weight={500}>
                {stats.hoursThisWeek}
              </NumberText>
            ) : (
              <NumberText size={24} weight={500} color="var(--lc-ink-3)">
                —
              </NumberText>
            )
          }
          sub={stats.hoursThisWeek != null ? 'This week' : 'No sessions yet'}
        />
        <StatCell
          label="Quizzes passed"
          value={
            <>
              <NumberText size={24} weight={500}>
                {stats.quizzesPassed}
              </NumberText>
              <NumberText size={16} weight={500} color="var(--lc-ink-3)">
                /{stats.quizzesTotal}
              </NumberText>
            </>
          }
          sub={
            stats.quizzesTotal > 0
              ? `${Math.round((stats.quizzesPassed / stats.quizzesTotal) * 100)}% accuracy`
              : 'No quizzes yet'
          }
        />
        <StatCell
          label="Next badge"
          value={
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--lc-bronze)',
              }}
            >
              {stats.nextBadge}
            </span>
          }
          sub={`${stats.nextBadgeTrack} · ${stats.coursesToNext} left`}
        />
      </div>
    </div>
  );
}

function StatCell({ label, value, sub }) {
  return (
    <div className="lc-stat-cell">
      <div className="lc-stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>{value}</div>
      <div className="lc-stat-sub">{sub}</div>
    </div>
  );
}
