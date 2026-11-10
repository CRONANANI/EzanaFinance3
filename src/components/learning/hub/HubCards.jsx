'use client';

/**
 * Learning Center hub cards (Nov 2026 redesign). Presentational: the page
 * derives every number from src/lib/learning/hub-model.js and passes it in.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import {
  LEVELS,
  RANGES,
  fmtCountdown,
  fmtHours,
  fmtInt,
  fmtRatio,
  fmtSigned,
  fmtSignedPct,
  levelLabel,
  questEarned,
  tierRows,
  trackName,
  trackStyle,
  yTicks,
} from '@/lib/learning/hub-model';

const courseHref = (id) => `/learning-center/course/${id}`;

/* ------------------------------------------------------------------ */
/* Atoms                                                               */
/* ------------------------------------------------------------------ */

export function Bar({ value, max, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <span
      className="lh-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span className="lh-bar__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function TierChip({ tier, size = 'md' }) {
  return (
    <span className={`lh-tier lh-tier--${tier.key} lh-tier--${size}`}>
      <span className="lh-tier__gem" aria-hidden="true" />
      {tier.label}
    </span>
  );
}

function CardHead({ id, title, children }) {
  return (
    <header className="lh-card__head">
      <h2 id={id} className="lh-card__title">
        {title}
      </h2>
      {children}
    </header>
  );
}

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Row 1: hero + LearningELO                                           */
/* ------------------------------------------------------------------ */

export function WelcomeHero({ firstName, totalCourses, trackCount, resume, savedCount, onSaved }) {
  return (
    <section className="lh-card lh-hero" aria-labelledby="lh-hero-h">
      <p className="lh-eyebrow lh-eyebrow--accent">Learning Center</p>
      <h1 id="lh-hero-h" className="lh-hero__title">
        {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
      </h1>
      <p className="lh-hero__sub">
        <span className="lh-num">{fmtInt(totalCourses)}</span> courses across{' '}
        <span className="lh-num">{trackCount}</span> tracks. Keep building your investing expertise.
      </p>
      <div className="lh-hero__actions">
        {resume?.course ? (
          <Link href={courseHref(resume.course.id)} className="lh-btn lh-btn--primary">
            <i className="bi bi-play-fill" aria-hidden="true" />
            {resume.isNew ? 'Start learning' : 'Resume learning'}
          </Link>
        ) : null}
        <button type="button" className="lh-btn" onClick={onSaved}>
          <i className="bi bi-bookmark" aria-hidden="true" /> Saved courses (
          <span className="lh-num">{savedCount}</span>)
        </button>
      </div>
    </section>
  );
}

export function EloCard({ rating, change, tier, next, network, trackId, stats, trackRating }) {
  const up = change.delta >= 0;
  return (
    <section className="lh-card lh-elo" aria-labelledby="lh-elo-h">
      <div className="lh-elo__top">
        <div>
          <h2 id="lh-elo-h" className="lh-eyebrow">
            LearningELO · All tracks
          </h2>
          <div className="lh-elo__figure">
            <span className="lh-num lh-elo__rating">{fmtInt(rating)}</span>
            <span
              className={`lh-chip lh-num is-${change.delta === 0 ? 'flat' : up ? 'up' : 'down'}`}
              title={`Change since ${change.since}`}
            >
              <i className={`bi ${up ? 'bi-arrow-up' : 'bi-arrow-down'}`} aria-hidden="true" />
              {fmtSigned(change.delta)}
              {change.pct != null ? ` (${fmtSignedPct(change.pct)})` : ''}
              <span className="lh-sr"> over the last 7 days</span>
            </span>
          </div>
          <p className="lh-elo__meta">
            {network?.topPct != null ? (
              <>
                Top <span className="lh-num">{network.topPct}%</span> in your network
              </>
            ) : (
              'Follow other learners to see where you rank.'
            )}
            {next ? (
              <>
                {' · '}
                <span className="lh-num">{fmtInt(next.needed)}</span> to {next.tier.label}
              </>
            ) : null}
          </p>
        </div>
        <TierChip tier={tier} size="lg" />
      </div>

      <p className="lh-elo__track">
        <i className={`bi ${trackStyle(trackId).icon}`} aria-hidden="true" /> {trackName(trackId)}
        <span className="lh-muted">
          {' '}
          · <span className="lh-num">{fmtSigned(trackRating)}</span> rating from this track
        </span>
      </p>
      <dl className="lh-stats">
        <div className="lh-stat">
          <dt>Courses</dt>
          <dd className="lh-num lh-stat__v">{fmtRatio(stats.done, stats.total)}</dd>
          <dd>
            <Bar value={stats.done} max={stats.total} label="Courses completed in this track" />
          </dd>
        </div>
        <div className="lh-stat">
          <dt>Quizzes</dt>
          <dd className="lh-num lh-stat__v">{fmtRatio(stats.quizzesPassed, stats.total)}</dd>
          <dd className="lh-stat__sub">
            {stats.accuracy != null ? (
              <>
                <span className="lh-num">{stats.accuracy}%</span> accuracy
              </>
            ) : (
              'No quizzes yet'
            )}
          </dd>
        </div>
        <div className="lh-stat">
          <dt>Hours</dt>
          <dd className="lh-num lh-stat__v">{fmtHours(stats.minutesThisMonth)}</dd>
          <dd className="lh-stat__sub">This month</dd>
        </div>
        <div className="lh-stat">
          <dt>Next badge</dt>
          <dd className="lh-stat__v">
            {stats.nextBadge.left > 0 ? (
              <>
                <span className="lh-num">{stats.nextBadge.left}</span> course
                {stats.nextBadge.left === 1 ? '' : 's'} left
              </>
            ) : (
              'Track complete'
            )}
          </dd>
          <dd>
            <Bar
              value={stats.nextBadge.done}
              max={stats.nextBadge.total}
              label={`Progress to the ${levelLabel(stats.nextBadge.level)} badge`}
            />
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Row 2: rating history, tiers, daily quest                           */
/* ------------------------------------------------------------------ */

const fmtDay = (iso, range) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (range === '1M' || range === '3M')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (range === 'ALL')
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  return d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
};

function HistoryTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="lh-tip">
      <div className="lh-tip__date">
        {new Date(`${p.date}T00:00:00Z`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })}
      </div>
      <div className="lh-num lh-tip__v">{fmtInt(p.rating)}</div>
      {p.delta ? (
        <div className={`lh-num lh-tone is-${p.delta > 0 ? 'up' : 'down'}`}>
          {fmtSigned(p.delta)} that day
        </div>
      ) : null}
      {(p.reasons || []).map((r) => (
        <div key={r} className="lh-tip__why">
          {r}
        </div>
      ))}
    </div>
  );
}

export function RatingHistory({ status, points, range, onRange }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }, []);
  const ticks = useMemo(() => yTicks(points), [points]);
  const last = points[points.length - 1];

  return (
    <section className="lh-card lh-history" aria-labelledby="lh-hist-h">
      <CardHead id="lh-hist-h" title="Rating history">
        <div className="lh-seg" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`lh-seg__btn${r === range ? ' is-on' : ''}`}
              aria-pressed={r === range}
              onClick={() => onRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHead>
      {status === 'loading' ? (
        <span className="lh-skel lh-skel--chart" aria-hidden="true" />
      ) : points.length < 2 ? (
        <p className="lh-empty">Complete a quiz to start your rating history.</p>
      ) : (
        <div
          className="lh-chart"
          role="img"
          aria-label={`LearningELO over ${range}, now ${fmtInt(last.rating)}`}
        >
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lhEloFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART.primaryStroke}
                    stopOpacity={CHART.gradientFromOpacity}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART.primaryStroke}
                    stopOpacity={CHART.gradientToOpacity}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray={CHART.gridDash}
                stroke={CHART.gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={CHART.tick}
                axisLine={CHART.xAxisLine}
                tickLine={false}
                minTickGap={28}
                tickFormatter={(d) => fmtDay(d, range)}
              />
              <YAxis
                tick={CHART.tick}
                axisLine={false}
                tickLine={false}
                width={44}
                ticks={ticks}
                domain={[ticks[0], ticks[4]]}
                tickFormatter={fmtInt}
              />
              <Tooltip
                content={<HistoryTip />}
                cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="rating"
                stroke={CHART.primaryStroke}
                strokeWidth={CHART.primaryStrokeWidth}
                fill="url(#lhEloFill)"
                isAnimationActive={!reduced}
                animationDuration={CHART.animationDuration}
              />
              <ReferenceDot
                x={last.date}
                y={last.rating}
                r={4}
                fill={CHART.primaryStroke}
                stroke="var(--bg-primary)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function TiersCard({ tier, next }) {
  return (
    <section className="lh-card lh-tiers" aria-labelledby="lh-tiers-h">
      <CardHead id="lh-tiers-h" title="Tiers" />
      <ol className="lh-tiers__list">
        {tierRows().map((t) => {
          const on = t.key === tier.key;
          return (
            <li
              key={t.key}
              className={`lh-tiers__row lh-tier--${t.key}${on ? ' is-on' : ''}`}
              aria-current={on ? 'true' : undefined}
            >
              <span className="lh-tier__gem" aria-hidden="true" />
              <span className="lh-tiers__name">{t.label}</span>
              {on ? <span className="lh-you">You</span> : null}
              <span className="lh-num lh-tiers__range">{t.range}</span>
            </li>
          );
        })}
      </ol>
      {next ? (
        <p className="lh-foot">
          <span className="lh-num">{fmtInt(next.needed)}</span> rating to {next.tier.label}
        </p>
      ) : (
        <p className="lh-foot">Top tier reached.</p>
      )}
    </section>
  );
}

export function DailyQuest({ status, featured, featuredTrack, tasks, resetsAt }) {
  const now = useNow();
  const done = tasks.length > 0 && tasks.every((t) => t.done);
  return (
    <section className="lh-card lh-quest" aria-labelledby="lh-quest-h">
      <CardHead id="lh-quest-h" title="Daily quest">
        {resetsAt ? (
          <span className="lh-meta">
            Resets in <span className="lh-num">{fmtCountdown(resetsAt, now)}</span>
          </span>
        ) : null}
      </CardHead>

      {featured ? (
        <div className="lh-quest__lesson">
          <span className="lh-quest__play" aria-hidden="true">
            <i className="bi bi-play-fill" />
          </span>
          <div className="lh-quest__lesson-txt">
            <span className="lh-strong">{featured.title}</span>
            <span className="lh-xs lh-muted">
              {trackName(featuredTrack)} · {levelLabel(featured.level)} ·{' '}
              <span className="lh-num">{featured.duration_minutes} min</span>
            </span>
          </div>
          <Link href={courseHref(featured.id)} className="lh-btn lh-btn--primary lh-btn--sm">
            Start
          </Link>
        </div>
      ) : (
        <p className="lh-empty">Every course in this track is complete.</p>
      )}

      {status === 'loading' ? (
        <span className="lh-skel lh-skel--rows" aria-hidden="true" />
      ) : done ? (
        <div className="lh-quest__done" role="status">
          <i className="bi bi-patch-check-fill" aria-hidden="true" />
          <div>
            <p className="lh-strong">Quest complete</p>
            <p className="lh-xs lh-muted">
              You earned <span className="lh-num lh-accent">+{questEarned(tasks)} ELO</span> today.
              Next quest in <span className="lh-num">{fmtCountdown(resetsAt, now)}</span>.
            </p>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <p className="lh-empty">Quest tasks could not load. They refresh when you come back.</p>
      ) : (
        <ul className="lh-quest__tasks">
          {tasks.map((t) => (
            <li key={t.id}>
              <label className={`lh-task${t.done ? ' is-done' : ''}`}>
                <input
                  type="checkbox"
                  checked={!!t.done}
                  readOnly
                  aria-readonly="true"
                  aria-describedby="lh-quest-auto"
                  onClick={(e) => e.preventDefault()}
                />
                <span className="lh-task__label">
                  {t.label}
                  {t.target > 1 && !t.done ? (
                    <span className="lh-num lh-muted"> ({fmtRatio(t.progress, t.target)})</span>
                  ) : null}
                </span>
                <span className="lh-num lh-accent lh-task__reward">+{t.reward_elo} ELO</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p id="lh-quest-auto" className="lh-xs lh-muted lh-quest__note">
        Tasks tick themselves when you finish them.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Row 3: tracks, active path, progress, recommended                   */
/* ------------------------------------------------------------------ */

export function TracksCard({ tracks, selected, onSelect }) {
  return (
    <section className="lh-card lh-tracks" aria-labelledby="lh-tracks-h">
      <CardHead id="lh-tracks-h" title="Your tracks">
        <span className="lh-meta">
          <span className="lh-num">{tracks.length}</span> tracks
        </span>
      </CardHead>
      <ul className="lh-tracks__list">
        {tracks.map((t) => {
          const on = t.id === selected;
          const st = trackStyle(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`lh-track${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => onSelect(t.id)}
              >
                <span
                  className="lh-track__icon"
                  style={{ '--lh-accent': st.accent }}
                  aria-hidden="true"
                >
                  <i className={`bi ${st.icon}`} />
                </span>
                <span className="lh-track__body">
                  <span className="lh-track__name">{trackName(t.id)}</span>
                  <span className="lh-track__line">
                    <Bar value={t.done} max={t.total} label={`${trackName(t.id)} progress`} />
                    <span className="lh-num lh-xs lh-muted">{fmtRatio(t.done, t.total)}</span>
                  </span>
                </span>
                <i className="bi bi-chevron-right lh-muted" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusMark({ state }) {
  if (state === 'completed') {
    return (
      <span className="lh-mark is-done" aria-hidden="true">
        <i className="bi bi-check-lg" />
      </span>
    );
  }
  if (state === 'next') {
    return (
      <span className="lh-mark is-next" aria-hidden="true">
        <i className="bi bi-play-fill" />
      </span>
    );
  }
  return <span className="lh-mark" aria-hidden="true" />;
}

export function ActivePath({
  trackId,
  level,
  current,
  counts,
  rows,
  trackDone,
  trackTotal,
  onLevel,
  onBookmark,
  onStartTrack,
}) {
  const notStarted = trackDone === 0 && !rows.some((r) => r.resume);
  const sub = notStarted
    ? 'Start with the Bronze tier.'
    : level === current
      ? `Continue your learning journey in the ${levelLabel(current)} tier.`
      : 'Pick up where you left off.';
  const curIdx = LEVELS.findIndex((l) => l.key === current);

  return (
    <section
      id="lh-path"
      className="lh-card lh-path"
      aria-labelledby="lh-path-h"
      data-task-target="learning-module-card"
    >
      <header className="lh-path__head">
        <div>
          <h2 id="lh-path-h" className="lh-card__title">
            Active path <span className="lh-muted">· {trackName(trackId)}</span>
          </h2>
          <p className="lh-xs lh-muted">{sub}</p>
        </div>
        <div className="lh-path__total">
          <span className="lh-xs">
            <span className="lh-num">{fmtRatio(trackDone, trackTotal)}</span> complete
          </span>
          <Bar value={trackDone} max={trackTotal} label={`${trackName(trackId)} completion`} />
        </div>
      </header>

      <div className="lh-levels" role="group" aria-label="Level">
        {LEVELS.map((l, i) => {
          const on = l.key === level;
          const c = counts[l.key];
          const ahead = i > curIdx;
          return (
            <button
              key={l.key}
              type="button"
              className={`lh-level${on ? ' is-on' : ''}${ahead ? ' is-ahead' : ''}`}
              aria-pressed={on}
              title={ahead ? `Recommended after ${LEVELS[i - 1].label}` : undefined}
              onClick={() => onLevel(l.key)}
            >
              {l.label} <span className="lh-num">({fmtRatio(c.done, c.total)})</span>
            </button>
          );
        })}
      </div>

      {notStarted && level === LEVELS[0].key ? (
        <div className="lh-path__start">
          <p className="lh-sm">You have not started {trackName(trackId)} yet.</p>
          <button
            type="button"
            className="lh-btn lh-btn--primary lh-btn--sm"
            onClick={onStartTrack}
          >
            <i className="bi bi-play-fill" aria-hidden="true" /> Start track
          </button>
        </div>
      ) : null}

      <ul className="lh-courses">
        {rows.map((r) => (
          <li key={r.id} className={`lh-course is-${r.state}`}>
            <Link href={courseHref(r.id)} className="lh-course__link">
              <StatusMark state={r.state} />
              <span className="lh-num lh-course__code">{r.code}</span>
              <span className="lh-course__title">{r.title}</span>
              <span className="lh-num lh-xs lh-muted lh-course__mins">{r.minutes} min</span>
              <span className="lh-course__status">
                {r.state === 'completed' ? (
                  <span className="lh-chip is-up">Completed</span>
                ) : r.state === 'next' ? (
                  <span className="lh-btn lh-btn--primary lh-btn--sm">
                    {r.resume ? 'Resume' : 'Start'}
                  </span>
                ) : (
                  <span className="lh-xs lh-muted">Not started</span>
                )}
              </span>
              <span className="lh-sr">
                {r.state === 'completed'
                  ? ', completed'
                  : r.state === 'next'
                    ? ', up next'
                    : ', not started'}
              </span>
            </Link>
            <button
              type="button"
              className="lh-icon-btn"
              aria-pressed={r.bookmarked}
              aria-label={r.bookmarked ? `Remove ${r.title} from saved` : `Save ${r.title}`}
              onClick={() => onBookmark(r.id, !r.bookmarked)}
            >
              <i
                className={`bi ${r.bookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'}`}
                aria-hidden="true"
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ProgressCard({ streak, activeTracks, totalTracks, badges }) {
  return (
    <section className="lh-card lh-progress" aria-labelledby="lh-prog-h">
      <CardHead id="lh-prog-h" title="Your progress" />
      <dl className="lh-grid2">
        <div className="lh-cell">
          <dt>
            <i className="bi bi-fire lh-accent" aria-hidden="true" /> Current streak
          </dt>
          <dd className="lh-num lh-cell__v">
            {streak.current} day{streak.current === 1 ? '' : 's'}
          </dd>
        </div>
        <div className="lh-cell">
          <dt>
            <i className="bi bi-trophy lh-gold" aria-hidden="true" /> Best streak
          </dt>
          <dd className="lh-num lh-cell__v">
            {streak.best} day{streak.best === 1 ? '' : 's'}
          </dd>
        </div>
        <div className="lh-cell">
          <dt>Active tracks</dt>
          <dd className="lh-num lh-cell__v">{fmtRatio(activeTracks, totalTracks)}</dd>
        </div>
        <div className="lh-cell">
          <dt>Badges earned</dt>
          <dd className="lh-cell__v">
            <Link href="/learning-center/badges" className="lh-num lh-link-strong">
              {badges}
              <span className="lh-sr"> badges, open the trophy cabinet</span>
            </Link>
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function RecommendedCard({ courses }) {
  return (
    <section className="lh-card lh-reco" aria-labelledby="lh-reco-h">
      <CardHead id="lh-reco-h" title="Recommended for you">
        <a href="#lh-path" className="lh-link">
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </a>
      </CardHead>
      {courses.length === 0 ? (
        <p className="lh-empty">You have completed every course. Impressive.</p>
      ) : (
        <ul className="lh-reco__list">
          {courses.map((c) => {
            const st = trackStyle(c.track);
            return (
              <li key={c.id} className="lh-reco__item">
                <span
                  className="lh-reco__cover"
                  style={{ '--lh-accent': st.accent }}
                  aria-hidden="true"
                >
                  <i className={`bi ${st.icon}`} />
                </span>
                <span className="lh-reco__txt">
                  <span className="lh-strong lh-clamp">{c.title}</span>
                  <span className="lh-xs lh-muted">
                    {trackName(c.track)} · {levelLabel(c.level)} ·{' '}
                    <span className="lh-num">{c.duration_minutes} min</span>
                  </span>
                </span>
                <Link
                  href={courseHref(c.id)}
                  className="lh-icon-btn lh-icon-btn--solid"
                  aria-label={`Open ${c.title}`}
                >
                  <i className="bi bi-play-fill" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Saved courses dialog body                                           */
/* ------------------------------------------------------------------ */

export function SavedList({ courses, onRemove }) {
  if (!courses.length)
    return <p className="lh-empty">Save a course with its bookmark and it will show up here.</p>;
  return (
    <ul className="lh-saved">
      {courses.map((c) => (
        <li key={c.id} className="lh-saved__row">
          <Link href={courseHref(c.id)} className="lh-saved__link">
            <span className="lh-strong">{c.title}</span>
            <span className="lh-xs lh-muted">
              {trackName(c.track)} · {levelLabel(c.level)} ·{' '}
              <span className="lh-num">{c.duration_minutes} min</span>
            </span>
          </Link>
          <button
            type="button"
            className="lh-icon-btn"
            aria-label={`Remove ${c.title} from saved`}
            onClick={() => onRemove(c.id)}
          >
            <i className="bi bi-bookmark-x" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
