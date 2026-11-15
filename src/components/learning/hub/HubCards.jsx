'use client';

/**
 * Learning Center hub sections (Nov 2026 flat-canvas redesign).
 * Presentational: the page derives every number from
 * src/lib/learning/hub-model.js and passes it in with a status
 * ('loading' | 'ready' | 'error') per data source, so each section draws its
 * own skeleton, empty line and inline error with Retry.
 *
 * Sections are flat: a title, hairlines and whitespace. The only filled
 * button on the page is "Resume learning"; every other action is text.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Tooltip } from '@/components/ds';
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
  levelName,
  questEarned,
  tierName,
  tierRows,
  trackName,
  trackStyle,
  yTicks,
} from '@/lib/learning/hub-model';

const courseHref = (id) => `/learning-center/course/${id}`;
const NA = 'N/A';
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

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

/** A small marker in the tier's colour. Always sits beside the tier's name. */
function TierMark({ tierKey }) {
  return <span className={`lh-gem lh-gem--${tierKey}`} aria-hidden="true" />;
}

/** An info icon whose explanation lives in a tooltip, not under the title. */
function Info({ label, align }) {
  return (
    <Tooltip label={label} className={`lh-info${align ? ` lh-info--${align}` : ''}`}>
      <button type="button" className="lh-info__btn" aria-label={label}>
        <i className="bi bi-info-circle" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

function Skel({ w = '100%', h = 12 }) {
  return <span className="lh-skel" style={{ width: w, height: h }} aria-hidden="true" />;
}

function SkelRows({ rows = 3, label }) {
  return (
    <div className="lh-skel-rows" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="lh-skel-row">
          <Skel w={20} h={20} />
          <div className="lh-skel-row__txt">
            <Skel w="72%" />
            <Skel w="44%" h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Inline error: one line and Retry. The rest of the page keeps working. */
function SectionError({ children, onRetry }) {
  return (
    <p className="lh-error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>{children}</span>
      <button type="button" className="lh-text-btn lh-text-btn--accent" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function SecHead({ id, title, ruled = true, children }) {
  return (
    <header className={`lh-head${ruled ? ' lh-head--ruled' : ''}`}>
      <h2 id={id} className="lh-title">
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

const days = (n) => `${fmtInt(n)} day${n === 1 ? '' : 's'}`;

/* ------------------------------------------------------------------ */
/* Top row: KPI strip and page actions                                 */
/* ------------------------------------------------------------------ */

function Kpi({ icon, label, info, status, children }) {
  return (
    <div className="lh-kpi">
      <span className="lh-kpi__icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <dt className="lh-kpi__label">
        {label}
        {info}
      </dt>
      <dd className="lh-kpi__value">
        {status === 'loading' ? <Skel w={72} h={18} /> : status === 'error' ? NA : children}
      </dd>
    </div>
  );
}

function Delta({ change }) {
  if (!change) return null;
  const tone = change.delta > 0 ? 'up' : change.delta < 0 ? 'down' : 'flat';
  return (
    <span className={`lh-num lh-delta is-${tone}`}>
      {change.delta === 0 ? '0' : fmtSigned(change.delta)}
      {change.delta !== 0 && change.pct != null ? ` (${fmtSignedPct(change.pct)})` : ''} in 7D
      <span className="lh-sr"> (rating change over the last 7 days)</span>
    </span>
  );
}

export function KpiStrip({
  ratingStatus,
  rating,
  change,
  tier,
  streakStatus,
  streak,
  coursesStatus,
  badges,
  activeTracks,
  totalTracks,
  resume,
  savedCount,
  onSaved,
  sampleAvailable,
  sampleOn,
  onSample,
}) {
  return (
    <section className="lh-top" aria-label="Learning summary">
      <dl className="lh-kpis">
        <Kpi
          icon="bi-lightning-charge"
          label="LearningELO"
          status={ratingStatus}
          info={
            <Info
              align="start"
              label="Rating earned from passed courses and daily quest rewards, across all tracks."
            />
          }
        >
          <span className="lh-num">{fmtInt(rating)}</span>
          <Delta change={change} />
        </Kpi>
        <Kpi
          icon="bi-award"
          label="Current tier"
          status={ratingStatus}
          info={<Info label="Your rating tier. Course levels inside a track are separate." />}
        >
          {tier ? (
            <span className="lh-kpi__words">
              <TierMark tierKey={tier.key} />
              {tierName(tier)}
            </span>
          ) : (
            NA
          )}
        </Kpi>
        <Kpi icon="bi-fire" label="Current streak" status={streakStatus}>
          <span className="lh-num">{streak ? days(streak.current) : NA}</span>
        </Kpi>
        <Kpi icon="bi-patch-check" label="Badges earned" status={coursesStatus}>
          <Link href="/learning-center/badges" className="lh-num lh-kpi__link">
            {fmtInt(badges)}
            <span className="lh-sr"> badges earned, open the badges page</span>
          </Link>
        </Kpi>
        <Kpi icon="bi-layers" label="Active tracks" status={coursesStatus}>
          <span className="lh-num">{fmtRatio(activeTracks, totalTracks)}</span>
        </Kpi>
      </dl>

      <div className="lh-actions">
        {sampleAvailable ? (
          <span className="lh-sample">
            {sampleOn ? (
              <span title="Only admin and demo accounts see this. Nothing done to it is saved.">
                Sample content
              </span>
            ) : null}
            <button
              type="button"
              className="lh-text-btn"
              aria-label={sampleOn ? 'Hide sample content and show my data' : undefined}
              onClick={() => onSample(!sampleOn)}
            >
              {sampleOn ? 'Hide' : 'Show sample content'}
            </button>
          </span>
        ) : null}
        <button type="button" className="lh-text-btn" onClick={onSaved}>
          <i className="bi bi-bookmark" aria-hidden="true" />
          <span>
            Saved courses
            {savedCount != null ? (
              <>
                {' '}
                (<span className="lh-num">{fmtInt(savedCount)}</span>)
              </>
            ) : null}
          </span>
        </button>
        {coursesStatus === 'loading' ? (
          <Skel w={148} h={36} />
        ) : resume?.course ? (
          <Link href={courseHref(resume.course.id)} className="lh-primary">
            <i className="bi bi-play-fill" aria-hidden="true" />
            {resume.isNew ? 'Start learning' : 'Resume learning'}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Rating history, with network position and the rating tiers          */
/* ------------------------------------------------------------------ */

const DAY_MS = 86400000;

/**
 * X-axis ticks and their label format, chosen by the span on screen so no
 * label repeats: up to about three months shows days ("Sep 04"); longer
 * spans show the first of each month ("Sep", or "Sep 2026" past a year).
 */
function timeAxis(data) {
  if (data.length < 2) return { ticks: [], fmt: () => '' };
  const lo = data[0].t;
  const hi = data[data.length - 1].t;
  const spanDays = (hi - lo) / DAY_MS;
  const label = (opts) => (t) =>
    new Date(t).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
  if (spanDays <= 100) {
    const n = Math.min(6, Math.max(1, Math.floor(spanDays)));
    const ticks = Array.from(
      { length: n + 1 },
      (_, i) => lo + Math.round(((hi - lo) * i) / n / DAY_MS) * DAY_MS,
    );
    return { ticks: [...new Set(ticks)], fmt: label({ month: 'short', day: '2-digit' }) };
  }
  const months = [];
  const d = new Date(lo);
  let m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (d.getUTCDate() === 1 ? 0 : 1), 1);
  while (m <= hi) {
    months.push(m);
    const x = new Date(m);
    m = Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1);
  }
  const step = Math.ceil(months.length / 7);
  return {
    ticks: months.filter((_, i) => i % step === 0),
    fmt: label(spanDays > 366 ? { month: 'short', year: 'numeric' } : { month: 'short' }),
  };
}

function HistoryTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="lh-tip">
      <div className="lh-num lh-tip__date">
        {new Date(`${p.date}T00:00:00Z`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })}
      </div>
      <div className="lh-num lh-tip__v">{fmtInt(p.rating)}</div>
      {p.delta ? (
        <div className={`lh-num lh-delta is-${p.delta > 0 ? 'up' : 'down'}`}>
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

function TierLegend({ tier }) {
  return (
    <div className="lh-tiers">
      <h3 className="lh-subtitle">
        Rating tiers
        <Info label="Tiers follow your overall LearningELO. They are not course levels." />
      </h3>
      <ol className="lh-tiers__list">
        {tierRows().map((t) => {
          const on = tier && t.key === tier.key;
          return (
            <li
              key={t.key}
              className={`lh-tiers__row${on ? ' is-on' : ''}`}
              aria-current={on ? 'true' : undefined}
            >
              <TierMark tierKey={t.key} />
              <span className="lh-tiers__name">
                {tierName(t)}
                {on ? <span className="lh-tiers__you"> (you)</span> : null}
              </span>
              <span className="lh-num lh-tiers__range">{t.range}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RatingHistory({ status, points, range, onRange, tier, next, network, onRetry }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }, []);
  const ticks = useMemo(() => yTicks(points), [points]);
  /* A true time axis: days are spaced by date, not by how many had activity. */
  const data = useMemo(
    () => points.map((p) => ({ ...p, t: Date.parse(`${p.date}T00:00:00Z`) })),
    [points],
  );
  const last = data[data.length - 1];
  const axis = useMemo(() => timeAxis(data), [data]);

  return (
    <section className="lh-sec lh-history" aria-labelledby="lh-hist-h">
      <SecHead id="lh-hist-h" title="Rating history" ruled={false}>
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
      </SecHead>

      <div className="lh-history__body">
        <div className="lh-history__plot">
          {status === 'loading' ? (
            <span className="lh-skel lh-skel--chart" aria-busy="true" aria-label="Loading chart" />
          ) : status === 'error' ? (
            <SectionError onRetry={onRetry}>Your rating history could not load.</SectionError>
          ) : points.length < 2 ? (
            <p className="lh-empty">
              Pass a course quiz to start your rating history.{' '}
              <a href="#lh-path" className="lh-link">
                Go to your active path
              </a>
            </p>
          ) : (
            <div
              className="lh-chart"
              role="img"
              aria-label={`LearningELO over ${range}, now ${fmtInt(last.rating)}`}
            >
              <ResponsiveContainer width="100%" height={248}>
                <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
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
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tick={CHART.tick}
                    axisLine={CHART.xAxisLine}
                    tickLine={false}
                    ticks={axis.ticks}
                    interval="preserveStartEnd"
                    minTickGap={24}
                    tickFormatter={axis.fmt}
                  />
                  <YAxis
                    tick={CHART.tick}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    ticks={ticks}
                    domain={[ticks[0], ticks[4]]}
                    tickFormatter={fmtInt}
                  />
                  <ChartTooltip
                    content={<HistoryTip />}
                    cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="rating"
                    stroke={CHART.primaryStroke}
                    strokeWidth={CHART.primaryStrokeWidth}
                    fill="url(#lhEloFill)"
                    isAnimationActive={!reduced}
                    animationDuration={CHART.animationDuration}
                  />
                  <ReferenceDot
                    x={last.t}
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
        </div>

        <div className="lh-history__side">
          {status === 'loading' ? (
            <div className="lh-skel-stack" aria-hidden="true">
              <Skel w="80%" />
              <Skel w="60%" />
            </div>
          ) : status === 'ready' ? (
            <div className="lh-standing">
              <p>
                {network?.topPct != null ? (
                  <>
                    Top <span className="lh-num lh-strong">{network.topPct}%</span> in your network
                  </>
                ) : (
                  'Follow other learners to see where you rank.'
                )}
              </p>
              <p>
                {next ? (
                  <>
                    <span className="lh-num lh-strong">{fmtInt(next.needed)}</span> to the{' '}
                    {tierName(next.tier)}
                  </>
                ) : (
                  'Top tier reached.'
                )}
              </p>
            </div>
          ) : null}
          <TierLegend tier={status === 'ready' ? tier : null} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Daily quest                                                         */
/* ------------------------------------------------------------------ */

export function DailyQuest({
  status,
  coursesStatus,
  featured,
  featuredTrack,
  featuredResume,
  tasks,
  resetsAt,
  onRetry,
  onBeginnerPath,
}) {
  const now = useNow();
  const done = tasks.length > 0 && tasks.every((t) => t.done);
  return (
    <section className="lh-sec lh-quest" aria-labelledby="lh-quest-h">
      <SecHead id="lh-quest-h" title="Daily quest">
        {status === 'ready' && resetsAt ? (
          <span className="lh-meta">
            Resets in <span className="lh-num lh-strong">{fmtCountdown(resetsAt, now)}</span>
          </span>
        ) : null}
      </SecHead>

      {coursesStatus === 'loading' ? (
        <SkelRows rows={1} label="Loading the featured lesson" />
      ) : coursesStatus === 'error' ? null : featured ? (
        <Link href={courseHref(featured.id)} className="lh-lesson">
          <i className="bi bi-play-fill lh-lesson__icon" aria-hidden="true" />
          <span className="lh-lesson__txt">
            <span className="lh-row-title">{featured.title}</span>
            <span className="lh-row-meta">
              {trackName(featuredTrack)} · {levelName(featured.level)} ·{' '}
              <span className="lh-num">{featured.duration_minutes} min</span>
            </span>
          </span>
          <span className="lh-go">{featuredResume ? 'Resume' : 'Start'}</span>
        </Link>
      ) : (
        <p className="lh-empty">Every course in this track is complete.</p>
      )}

      {status === 'loading' ? (
        <SkelRows rows={3} label="Loading quest tasks" />
      ) : status === 'error' ? (
        <SectionError onRetry={onRetry}>Quest tasks could not load.</SectionError>
      ) : done ? (
        <p className="lh-quest__done" role="status">
          <i className="bi bi-patch-check-fill" aria-hidden="true" />
          <span>
            <span className="lh-row-title">Quest complete.</span> You earned{' '}
            <span className="lh-num lh-reward">+{questEarned(tasks)} ELO</span> today. Next quest in{' '}
            <span className="lh-num">{fmtCountdown(resetsAt, now)}</span>.
          </span>
        </p>
      ) : tasks.length === 0 ? (
        <p className="lh-empty">No quest tasks today. A new quest starts at midnight UTC.</p>
      ) : (
        <ul
          className="lh-tasks"
          aria-label="Quest tasks. They are ticked for you when you finish them."
        >
          {tasks.map((t) => (
            <li key={t.id} className={`lh-task${t.done ? ' is-done' : ''}`}>
              <i
                className={`bi ${t.done ? 'bi-check-square-fill' : 'bi-square'} lh-task__box`}
                aria-hidden="true"
              />
              <span className="lh-task__label">
                {t.label}
                {t.target > 1 && !t.done ? (
                  <span className="lh-num lh-muted"> ({fmtRatio(t.progress, t.target)})</span>
                ) : null}
                <span className="lh-sr">{t.done ? ', done' : ', not done yet'}</span>
              </span>
              <span className="lh-num lh-reward">+{t.reward_elo} ELO</span>
            </li>
          ))}
        </ul>
      )}

      {onBeginnerPath ? (
        <button type="button" className="lh-text-btn lh-text-btn--accent" onClick={onBeginnerPath}>
          <i className="bi bi-mortarboard" aria-hidden="true" />
          <span>New to investing? Start with the Bronze level of {trackName('stocks')}</span>
        </button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Your tracks                                                         */
/* ------------------------------------------------------------------ */

export function TracksCard({ status, tracks, selected, onSelect, onRetry }) {
  return (
    <section className="lh-sec lh-tracks" aria-labelledby="lh-tracks-h">
      <SecHead id="lh-tracks-h" title="Your tracks">
        <span className="lh-meta">
          <span className="lh-num">{tracks.length}</span> tracks
        </span>
      </SecHead>
      {status === 'error' ? (
        <SectionError onRetry={onRetry}>Your track progress could not load.</SectionError>
      ) : null}
      <ul className="lh-tracks__list">
        {tracks.map((t) => {
          const on = t.id === selected;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`lh-track${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => onSelect(t.id)}
              >
                <i className={`bi ${trackStyle(t.id).icon} lh-track__icon`} aria-hidden="true" />
                <span className="lh-track__body">
                  <span className="lh-track__name">{trackName(t.id)}</span>
                  <span className="lh-track__line">
                    {status === 'ready' ? (
                      <>
                        <Bar value={t.done} max={t.total} label={`${trackName(t.id)} progress`} />
                        <span className="lh-num lh-track__count">{fmtRatio(t.done, t.total)}</span>
                      </>
                    ) : status === 'loading' ? (
                      <Skel h={6} />
                    ) : (
                      <span className="lh-num lh-track__count">
                        {NA} / {fmtInt(t.total)}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Active path, with the course filter                                 */
/* ------------------------------------------------------------------ */

function StatusMark({ state }) {
  const icon =
    state === 'completed'
      ? 'bi-check-circle-fill'
      : state === 'next'
        ? 'bi-play-circle'
        : 'bi-circle';
  return <i className={`bi ${icon} lh-mark is-${state}`} aria-hidden="true" />;
}

function CourseRow({ r, showTrack, onBookmark }) {
  return (
    <li className={`lh-course is-${r.state}`}>
      <Link href={courseHref(r.id)} className="lh-course__link">
        <StatusMark state={r.state} />
        <span className="lh-num lh-course__code">{r.code}</span>
        <span className="lh-course__txt">
          <span className="lh-row-title">{r.title}</span>
          <span className="lh-row-meta">
            {showTrack ? `${trackName(r.track)} · ${levelName(r.level)}. ` : ''}
            {r.description}
          </span>
        </span>
        <span className="lh-num lh-course__mins">{r.minutes} min</span>
        <span className="lh-num lh-course__elo">{r.reward != null ? `+${r.reward} ELO` : NA}</span>
        <span className="lh-course__status">
          {r.state === 'completed' ? (
            <>
              <i className="bi bi-check2" aria-hidden="true" /> Completed
            </>
          ) : r.state === 'next' ? (
            <span className="lh-go">{r.resume ? 'Resume' : 'Start'}</span>
          ) : r.inProgress ? (
            'In progress'
          ) : (
            'Not started'
          )}
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
  );
}

export function ActivePath({
  status,
  trackId,
  level,
  current,
  counts,
  rows,
  browsing,
  query,
  onQuery,
  savedOnly,
  onSavedOnly,
  savedCount,
  trackDone,
  trackTotal,
  onLevel,
  onBookmark,
  onRetry,
}) {
  const notStarted = trackDone === 0 && !rows.some((r) => r.inProgress);
  const sub =
    status !== 'ready'
      ? ''
      : notStarted
        ? `You have not started ${trackName(trackId)} yet. Start with the ${levelName(LEVELS[0].key)}.`
        : trackDone >= trackTotal
          ? 'Every course in this track is complete.'
          : `You are working in the ${levelName(current)}. Every course is open.`;

  return (
    <section
      id="lh-path"
      className="lh-sec lh-path"
      aria-labelledby="lh-path-h"
      data-task-target="learning-module-card"
      tabIndex={-1}
    >
      <header className="lh-path__head">
        <div className="lh-path__titles">
          <h2 id="lh-path-h" className="lh-title">
            Active path · {trackName(trackId)}
          </h2>
          {sub ? <p className="lh-row-meta">{sub}</p> : null}
        </div>
        {status === 'ready' ? (
          <div className="lh-path__total">
            <span className="lh-num">{fmtRatio(trackDone, trackTotal)} complete</span>
            <Bar value={trackDone} max={trackTotal} label={`${trackName(trackId)} completion`} />
          </div>
        ) : null}
      </header>

      <div className="lh-levels" role="group" aria-label="Course level">
        {LEVELS.map((l) => {
          const on = !browsing && l.key === level;
          const c = counts[l.key];
          return (
            <button
              key={l.key}
              type="button"
              className={`lh-level${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => onLevel(l.key)}
            >
              {levelName(l.key)}
              {status === 'ready' ? (
                <span className="lh-num lh-level__count"> ({fmtRatio(c.done, c.total)})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="lh-filter">
        <label className="lh-filter__field">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="lh-sr">Filter all courses by title or description</span>
          <input
            type="search"
            className="lh-filter__input"
            placeholder="Filter courses by title or description"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className={`lh-text-btn lh-toggle${savedOnly ? ' is-on' : ''}`}
          aria-pressed={savedOnly}
          onClick={() => onSavedOnly(!savedOnly)}
        >
          <i
            className={`bi ${savedOnly ? 'bi-bookmark-fill' : 'bi-bookmark'}`}
            aria-hidden="true"
          />
          <span>
            Saved
            {savedCount != null ? (
              <>
                {' '}
                (<span className="lh-num">{fmtInt(savedCount)}</span>)
              </>
            ) : null}
          </span>
        </button>
      </div>

      {status === 'loading' ? (
        <SkelRows rows={6} label="Loading courses" />
      ) : status === 'error' ? (
        <SectionError onRetry={onRetry}>Your courses could not load.</SectionError>
      ) : (
        <>
          {browsing ? (
            <p className="lh-filter__note" role="status">
              <span className="lh-num">{fmtInt(rows.length)}</span> {savedOnly ? 'saved ' : ''}
              {rows.length === 1 ? 'course' : 'courses'} across all tracks
            </p>
          ) : null}
          {rows.length === 0 ? (
            <p className="lh-empty">
              {savedOnly && !query.trim()
                ? 'No saved courses yet. Save a course with its bookmark.'
                : 'No courses match this filter.'}{' '}
              <button
                type="button"
                className="lh-text-btn lh-text-btn--accent"
                onClick={() => {
                  onQuery('');
                  onSavedOnly(false);
                }}
              >
                Show the active path
              </button>
            </p>
          ) : (
            <ul className="lh-courses">
              {rows.map((r) => (
                <CourseRow key={r.id} r={r} showTrack={browsing} onBookmark={onBookmark} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Your progress (the selected track) and the week                     */
/* ------------------------------------------------------------------ */

export function ProgressCard({
  status,
  trackId,
  stats,
  trackRating,
  ratingStatus,
  streakStatus,
  streak,
  onRetryCourses,
  onRetryStreak,
}) {
  const week = Array.isArray(streak?.week) && streak.week.length === 7 ? streak.week : null;
  return (
    <section className="lh-sec lh-progress" aria-labelledby="lh-prog-h">
      <SecHead id="lh-prog-h" title="Your progress">
        <span className="lh-meta">{trackName(trackId)}</span>
      </SecHead>

      {status === 'error' ? (
        <SectionError onRetry={onRetryCourses}>Your progress could not load.</SectionError>
      ) : (
        <>
          <dl className="lh-grid2">
            <div className="lh-cell">
              <dt>
                <i className="bi bi-patch-question" aria-hidden="true" /> Quizzes passed
              </dt>
              <dd className="lh-num">
                {status === 'loading' ? (
                  <Skel w={64} h={18} />
                ) : (
                  fmtRatio(stats.quizzesPassed, stats.total)
                )}
              </dd>
            </div>
            <div className="lh-cell">
              <dt>
                <i className="bi bi-bullseye" aria-hidden="true" /> Quiz accuracy
              </dt>
              <dd className="lh-num">
                {status === 'loading' ? (
                  <Skel w={48} h={18} />
                ) : stats.accuracy != null ? (
                  `${stats.accuracy}%`
                ) : (
                  NA
                )}
              </dd>
            </div>
            <div className="lh-cell">
              <dt>
                <i className="bi bi-clock" aria-hidden="true" /> Estimated hours
                <Info label="This month, from the listed length of the courses you passed. Not measured time." />
              </dt>
              <dd className="lh-num">
                {status === 'loading' ? <Skel w={48} h={18} /> : fmtHours(stats.minutesThisMonth)}
              </dd>
            </div>
            <div className="lh-cell">
              <dt>
                <i className="bi bi-lightning-charge" aria-hidden="true" /> Track rating
              </dt>
              <dd className="lh-num">
                {ratingStatus === 'loading' ? (
                  <Skel w={48} h={18} />
                ) : ratingStatus === 'error' ? (
                  NA
                ) : trackRating > 0 ? (
                  fmtSigned(trackRating)
                ) : (
                  '0'
                )}
              </dd>
            </div>
          </dl>
          <p className="lh-progress__foot">
            <span>
              {status === 'loading' ? (
                <Skel w={150} />
              ) : stats.nextBadge.left > 0 ? (
                <>
                  <span className="lh-num">{stats.nextBadge.left}</span>{' '}
                  {stats.nextBadge.left === 1 ? 'course' : 'courses'} to the{' '}
                  {levelLabel(stats.nextBadge.level)} level badge
                </>
              ) : (
                'Track complete'
              )}
            </span>
            <Link href="/learning-center/badges" className="lh-link">
              View badges <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </p>
        </>
      )}

      <div className="lh-week">
        <div className="lh-week__head">
          <h3 className="lh-subtitle">Active days this week</h3>
          {streakStatus === 'ready' && streak ? (
            <span className="lh-meta">
              Best streak <span className="lh-num lh-strong">{days(streak.best)}</span>
            </span>
          ) : null}
        </div>
        {streakStatus === 'loading' ? (
          <Skel h={34} />
        ) : streakStatus === 'error' ? (
          <SectionError onRetry={onRetryStreak}>Your streak could not load.</SectionError>
        ) : week ? (
          <ol className="lh-week__days">
            {week.map((on, i) => (
              <li key={WEEKDAYS[i]} className={`lh-day${on ? ' is-on' : ''}`}>
                <span aria-hidden="true">{WEEKDAYS[i]}</span>
                <i
                  className={`bi ${on ? 'bi-check-circle-fill' : 'bi-circle'}`}
                  aria-hidden="true"
                />
                <span className="lh-sr">
                  {WEEKDAY_NAMES[i]}: {on ? 'active' : 'no activity'}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="lh-empty">{NA}</p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recommended for you                                                 */
/* ------------------------------------------------------------------ */

export function RecommendedCard({ status, courses, onRetry }) {
  return (
    <section className="lh-sec lh-reco" aria-labelledby="lh-reco-h">
      <SecHead id="lh-reco-h" title="Recommended for you">
        <Info
          align="end"
          label="The next courses in curriculum order: one in this track, then other tracks."
        />
      </SecHead>
      {status === 'loading' ? (
        <SkelRows rows={3} label="Loading recommended courses" />
      ) : status === 'error' ? (
        <SectionError onRetry={onRetry}>Recommended courses could not load.</SectionError>
      ) : courses.length === 0 ? (
        <p className="lh-empty">
          You have completed every course.{' '}
          <Link href="/learning-center/badges" className="lh-link">
            View badges
          </Link>
        </p>
      ) : (
        <ul className="lh-reco__list">
          {courses.map((c) => (
            <li key={c.id}>
              <Link href={courseHref(c.id)} className="lh-reco__item">
                <span className="lh-reco__txt">
                  <span className="lh-row-title">{c.title}</span>
                  <span className="lh-row-meta">
                    {trackName(c.track)} · {levelName(c.level)} ·{' '}
                    <span className="lh-num">{c.duration_minutes} min</span>
                  </span>
                </span>
                <i className="bi bi-play-fill lh-go" aria-hidden="true" />
                <span className="lh-sr">Open course</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Saved courses dialog body                                           */
/* ------------------------------------------------------------------ */

export function SavedList({ status, courses, onRemove, onBrowse, onRetry }) {
  if (status === 'loading') return <SkelRows rows={3} label="Loading saved courses" />;
  if (status === 'error')
    return <SectionError onRetry={onRetry}>Your saved courses could not load.</SectionError>;
  if (!courses.length)
    return (
      <p className="lh-empty">
        No saved courses yet. Save a course with its bookmark and it will show up here.{' '}
        <button type="button" className="lh-text-btn lh-text-btn--accent" onClick={onBrowse}>
          Go to your active path
        </button>
      </p>
    );
  return (
    <ul className="lh-saved">
      {courses.map((c) => (
        <li key={c.id} className="lh-saved__row">
          <Link href={courseHref(c.id)} className="lh-saved__link">
            <span className="lh-row-title">{c.title}</span>
            <span className="lh-row-meta">
              {trackName(c.track)} · {levelName(c.level)} ·{' '}
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
