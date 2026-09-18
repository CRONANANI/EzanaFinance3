'use client';

const TIER_LEVEL_TO_LABEL = {
  basic: 'Bronze',
  intermediate: 'Silver',
  advanced: 'Gold',
  expert: 'Platinum',
};

/**
 * Hero right column, built to the home page's hero-right pattern: an
 * uppercase label row with the tier pill, the rating as the one big mono
 * number, a green/red delta row, then a bordered stat strip.
 */
export function LcEloHero({
  trackLabel,
  elo,
  weekDelta,
  currentTierLevel,
  rank,
  rankScope,
  stats,
}) {
  const tierLabel = TIER_LEVEL_TO_LABEL[currentTierLevel] || 'Bronze';
  const prior = elo - weekDelta;
  const deltaPct = prior > 0 ? ((weekDelta / prior) * 100).toFixed(1) : '0.0';
  const up = weekDelta >= 0;
  const sign = up ? '+' : '';

  const cells = [
    {
      label: 'Courses',
      value: `${stats.coursesDone}/${stats.coursesTotal}`,
      sub: 'Perfect passes',
    },
    {
      label: 'Quizzes',
      value: `${stats.quizzesPassed}/${stats.quizzesTotal}`,
      sub:
        stats.quizzesTotal > 0
          ? `${Math.round((stats.quizzesPassed / stats.quizzesTotal) * 100)}% accuracy`
          : 'No quizzes yet',
    },
    {
      label: 'Hours',
      value: stats.hoursThisWeek != null ? String(stats.hoursThisWeek) : '0',
      sub: stats.hoursThisWeek != null ? 'This week' : 'No sessions yet',
    },
    {
      label: 'Next badge',
      value: String(stats.coursesToNext),
      sub: `${stats.nextBadge} left in ${stats.nextBadgeTrack}`,
    },
  ];

  return (
    <div className="lc3-hero-r">
      <div className="lc3-hero-r-head">
        <span className="lc3-label">Learning ELO · {trackLabel}</span>
        <span className="lc3-tier-pill lc3-tier-pill--current">{tierLabel}</span>
      </div>

      <div className="lc3-hero-num">{elo.toLocaleString()}</div>

      <div className={`lc3-hero-delta ${up ? 'lc3-green' : 'lc3-red'}`}>
        <span>
          {sign}
          {weekDelta} this week
        </span>
        <span>
          {sign}
          {deltaPct}%
        </span>
        <span className="lc3-dim">
          {rank} {rankScope}
        </span>
      </div>

      <div className="lc3-hero-stats">
        {cells.map((c) => (
          <div className="lc3-stat" key={c.label}>
            <div className="lc3-label">{c.label}</div>
            <div className="lc3-stat-v">{c.value}</div>
            <div className="lc3-stat-sub">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
