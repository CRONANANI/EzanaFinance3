/**
 * SocialLedgerSection: the "Social investing" landing section, rebuilt to the
 * layout system in docs/design/sled-handoff (package v2).
 *
 * What the handoff changed: the composition. A left-aligned masthead, two
 * mirrored proportional zones (5/7 record, 7/5 sheets), the rating figure as
 * the hero object with a tier ladder pinned to its column's bottom so its
 * baseline meets the chart's x axis, the event feed and the standings rebuilt
 * as two sheets in one rule system that are the same height BY STRUCTURE, and
 * one 7.2s clock that lands the same +24 in the ledger, the rating and the
 * standings inside 1.5s.
 *
 * What it deliberately did NOT change (07-EZANA-INTEGRATION.md, which wins over
 * the design files): the typography and the chart. Every text role keeps the
 * face, weight, tracking, casing and colour it shipped with; only the rating
 * figure's size and the headline/subhead clamps move, because the grid depends
 * on them. The recharts block below (data builder, cohort pills, key remount,
 * gradient, grid, ticks, domain, tooltip) is the shipped one, moved into the
 * spec's chart cell and not restyled.
 *
 * Fixture only, never live. Per the handoff's fixture correction, the standings
 * update in place: your rating ticks and the gap to first closes. No rank change
 * is claimed, because at 1474 you are already ahead of Priya (1441) and Maya
 * (1470) and the numbers cannot support one.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import './social-ledger.css';

/* ────────────────────────── fixture (04-SPEC section 11) ──────────────────────
   Illustrative, cached, never live. */

const WEEKS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08'];
const YOU_SERIES = [1408, 1416, 1410, 1428, 1440, 1452, 1484, 1498];

/* Friends' leader ends at 1512 because the circle leader is Daniel R., who is
   1512 in the standings; the brief's "near 1524" would put an unnamed fifth
   person above the whole table. */
const COHORTS = {
  friends: {
    label: 'Friends',
    caption: 'vs. 3 friends',
    a: [1452, 1460, 1466, 1472, 1484, 1494, 1504, 1512],
    b: [1418, 1424, 1430, 1438, 1446, 1452, 1460, 1466],
  },
  whales: {
    label: 'Whales',
    caption: 'vs. 13F whales',
    a: [1470, 1478, 1486, 1492, 1502, 1512, 1520, 1528],
    b: [1430, 1436, 1442, 1450, 1458, 1466, 1472, 1480],
  },
  politicians: {
    label: 'Politicians',
    caption: 'vs. Congress',
    a: [1440, 1448, 1456, 1464, 1474, 1484, 1494, 1502],
    b: [1402, 1408, 1416, 1424, 1432, 1440, 1446, 1452],
  },
};

/* The ledger, newest first. Row 0 is the one the loop writes. An unrated event
   carries a middle dot: not a dash, and not a zero, because a zero would claim
   the event was rated and scored nothing.

   Only LEDGER_SHOWN of these render. The spec's section 3 wants the desktop
   section near 1090px and names trimming ledger rows as the first remedy when
   it runs long; at eight rows the section measured 1364 at 1440. Six is the
   trim. The two dropped are the oldest, and the middle-dot treatment is still
   shown by the Priya row, so nothing about the fixture's meaning is lost. */
const DOT = '·';
const LEDGER = [
  { delta: '+24', event: "Won 'Q3 Momentum Sprint'", from: 1474, to: 1498, when: 'Mon' },
  { delta: '+12', event: 'Top 10% weekly P&L', from: 1462, to: 1474, when: 'Fri' },
  {
    delta: '+8',
    event: 'Research post upvoted, consensus signal',
    from: 1454,
    to: 1462,
    when: 'Thu',
  },
  { delta: DOT, event: "Priya S. challenged you to 'Season 4 Sprint'", when: 'Thu' },
  { delta: '+5', event: '7-day login streak', from: 1449, to: 1454, when: 'Wed' },
  {
    delta: '+6',
    event: "Passed 'Options Greeks I' in the Learning Center",
    from: 1443,
    to: 1449,
    when: 'Tue',
  },
  { delta: DOT, event: 'Maya K. joined your circle', when: 'Tue' },
  { delta: '-5', event: 'Weekly P&L below median', from: 1448, to: 1443, when: 'Mon' },
];

const LEDGER_SHOWN = 6;

const STANDINGS = [
  { rank: '01', name: 'Daniel R.', rating: 1512, week: DOT, tier: 'Apprentice' },
  {
    rank: '02',
    name: 'You',
    handle: '@axum',
    rating: 1498,
    week: '+24',
    tier: 'Apprentice',
    you: true,
  },
  { rank: '03', name: 'Maya K.', rating: 1470, week: 'NEW', tier: 'Apprentice' },
  { rank: '04', name: 'Priya S.', rating: 1441, week: '-5', tier: 'Apprentice' },
];

/* Tier ladder. Six tiers get EQUAL segments rather than a linear 0 to 10,000
   scale: linear would put an Apprentice at 15% and crush four tiers into the
   right half. Equal segments are honest as long as they are labelled as tiers. */
const TIERS = [
  { name: 'Novice', floor: 0 },
  { name: 'Apprentice', floor: 1000 },
  { name: 'Strategist', floor: 2500 },
  { name: 'Tactician', floor: 5000 },
  { name: 'Master', floor: 7000 },
  { name: 'Grandmaster', floor: 8500 },
];
const TIER_CAP = 10000;

function ladderFor(rating) {
  let i = 0;
  for (let k = TIERS.length - 1; k >= 0; k -= 1) {
    if (rating >= TIERS[k].floor) {
      i = k;
      break;
    }
  }
  const floor = TIERS[i].floor;
  const next = i + 1 < TIERS.length ? TIERS[i + 1].floor : TIER_CAP;
  const within = next > floor ? (rating - floor) / (next - floor) : 0;
  return {
    tier: TIERS[i].name,
    /* marker x = (i + (rating - tierFloor) / (nextFloor - tierFloor)) / 6 */
    markerPct: ((i + within) / TIERS.length) * 100,
    toNext: Math.max(0, next - rating),
    nextName: i + 1 < TIERS.length ? TIERS[i + 1].name : null,
  };
}

/* Rating bars in the standings share the chart's domain, so the bar and the
   line are the same statement. */
const BAR_MIN = 1390;
const BAR_SPAN = 150;
const barPct = (rating) => Math.max(0, Math.min(100, ((rating - BAR_MIN) / BAR_SPAN) * 100));

/* ────────────────────────── the 7.2s clock (02-TIMELINE.json) ─────────────────
   One clock drives every beat, which is the whole point of the choreography:
   one event, three consequences, all inside 1.5s. Beats in ms. */
const CYCLE = 7200;
const BEAT = {
  rowWrite: [600, 1400],
  rowType: [800, 1700],
  rating: [1200, 2100],
  ladder: [1400, 2000],
  chart: [1800, 2600],
  standings: [2600, 3300],
};
const PRE = { rating: 1474, weekDelta: 14, standRating: 1474, gap: 38, week: DOT };
const POST = { rating: 1498, weekDelta: 38, standRating: 1498, gap: 14, week: '+24' };

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const progress = (t, [a, b]) => clamp01((t - a) / (b - a));
const lerpInt = (from, to, p) => Math.round(from + (to - from) * p);

/* The composed frame: what reduced motion and an out-of-view section resolve to.
   Nothing at zero height or opacity, nothing mid-transition. */
const COMPOSED = {
  rowIn: true,
  typed: 1,
  rating: POST.rating,
  weekDelta: POST.weekDelta,
  toNext: ladderFor(POST.rating).toNext,
  markerPct: ladderFor(POST.rating).markerPct,
  chartExtended: true,
  standRating: POST.standRating,
  standWeek: POST.week,
  gap: POST.gap,
};

function frameAt(t) {
  const write = progress(t, BEAT.rowWrite);
  const ratingP = easeInOut(progress(t, BEAT.rating));
  const ladderP = easeInOut(progress(t, BEAT.ladder));
  const standP = progress(t, BEAT.standings);
  const rating = lerpInt(PRE.rating, POST.rating, ratingP);
  const ladderRating = lerpInt(PRE.rating, POST.rating, ladderP);
  const l = ladderFor(ladderRating);
  return {
    rowIn: write > 0,
    typed: progress(t, BEAT.rowType),
    rating,
    weekDelta: lerpInt(PRE.weekDelta, POST.weekDelta, ratingP),
    toNext: l.toNext,
    markerPct: l.markerPct,
    chartExtended: progress(t, BEAT.chart) > 0,
    standRating: lerpInt(PRE.standRating, POST.standRating, standP),
    standWeek: standP > 0.5 ? POST.week : PRE.week,
    gap: lerpInt(PRE.gap, POST.gap, standP),
  };
}

const sameFrame = (a, b) =>
  a.rowIn === b.rowIn &&
  Math.round(a.typed * 60) === Math.round(b.typed * 60) &&
  a.rating === b.rating &&
  a.weekDelta === b.weekDelta &&
  a.toNext === b.toNext &&
  Math.round(a.markerPct * 10) === Math.round(b.markerPct * 10) &&
  a.chartExtended === b.chartExtended &&
  a.standRating === b.standRating &&
  a.standWeek === b.standWeek &&
  a.gap === b.gap;

export function SocialLedgerSection() {
  const [cohort, setCohort] = useState('friends');
  const [frame, setFrame] = useState(COMPOSED);
  const sectionRef = useRef(null);
  const frameRef = useRef(COMPOSED);

  const setFrameIfChanged = useCallback((next) => {
    if (sameFrame(frameRef.current, next)) return;
    frameRef.current = next;
    setFrame(next);
  }, []);

  /* Ticks only in viewport, and the loop pauses rather than unmounting, so the
     section is never torn down and rebuilt on a scroll past. */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setFrameIfChanged(COMPOSED);
      return undefined;
    }

    let raf = 0;
    let start = 0;
    let running = false;

    const step = (now) => {
      if (!start) start = now;
      setFrameIfChanged(frameAt((now - start) % CYCLE));
      raf = window.requestAnimationFrame(step);
    };
    const run = () => {
      if (running) return;
      running = true;
      start = 0;
      raf = window.requestAnimationFrame(step);
    };
    const pause = () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) run();
        else pause();
      },
      { threshold: 0.15 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      pause();
    };
  }, [setFrameIfChanged]);

  const active = COHORTS[cohort];

  /* The chart's beat is the existing recharts draw, not a custom path
     animation: the data gains its eighth point on the master clock and the key
     remount replays the 400ms draw, so the rating tick and the chart extension
     fire together and the causal read holds. */
  const points = frame.chartExtended ? 8 : 7;
  const chartData = useMemo(
    () =>
      WEEKS.slice(0, points).map((wk, i) => ({
        wk,
        you: YOU_SERIES[i],
        a: active.a[i],
        b: active.b[i],
      })),
    [active, points],
  );

  const typedEvent = useMemo(() => {
    const full = LEDGER[0].event;
    const n = Math.round(full.length * frame.typed);
    return full.slice(0, n);
  }, [frame.typed]);

  const ladder = ladderFor(frame.rating);

  return (
    <section className="sled-section sled" aria-labelledby="sled-heading" ref={sectionRef}>
      <div className="sled-inner">
        {/* ── masthead ── */}
        <div className="sled-masthead">
          <div className="sled-mast-row">
            <p className="sled-eyebrow">Social investing</p>
            <span className="sled-stamp">
              <i className="sled-live-dot" aria-hidden="true" />
              Season 4 {DOT} Live
            </span>
          </div>
          <h2 id="sled-heading" className="sled-heading">
            Every move is on the record.
          </h2>
          <p className="sled-sub">
            Add a friend and your ratings start writing themselves: wins, streaks and research, each
            one a line in the ledger.
          </p>
        </div>

        {/* ── zone B, the record: 5fr rating | 7fr chart ── */}
        <div className="sled-record">
          <div className="sled-ratingcol">
            <div className="sled-rating">
              <div className="sled-rating-figure" aria-label={`Rating ${frame.rating}`}>
                {frame.rating}
              </div>
              <div className="sled-rating-meta">
                <span className="sled-rating-delta">+{frame.weekDelta} this week</span>
                <span className="sled-rating-tier">{ladder.tier}</span>
              </div>
            </div>

            {/* The ladder is pinned to the bottom of the column, so its baseline
                meets the chart's x-axis labels. That shared baseline is what
                stops the two columns drifting. */}
            <div className="sled-ladder">
              <div className="sled-ladder-caption">
                <span>Tier</span>
                <span className="sled-ladder-next">
                  {frame.toNext} to {ladder.nextName || 'cap'}
                </span>
              </div>
              <div className="sled-ladder-track">
                <span className="sled-ladder-rule" aria-hidden="true" />
                {TIERS.map((t, i) => (
                  <span
                    key={t.name}
                    className="sled-ladder-tick"
                    style={{ left: `${(i / TIERS.length) * 100}%` }}
                    aria-hidden="true"
                  />
                ))}
                <span className="sled-ladder-tick" style={{ left: '100%' }} aria-hidden="true" />
                <span
                  className="sled-ladder-marker"
                  style={{ left: `${frame.markerPct}%` }}
                  aria-hidden="true"
                />
              </div>
              {/* Labels are centred in their segments, not placed at the ticks:
                  they name bands rather than points, and tick-anchored labels
                  collide at Master and Grandmaster under about 620px. */}
              <div className="sled-ladder-labels" aria-hidden="true">
                {TIERS.map((t) => (
                  <span key={t.name} className="sled-ladder-label">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="sled-chartcol">
            <div className="sled-chart-head">
              <span className="sled-chart-label">Your rating {DOT} @axum</span>
              <div className="sled-chart-controls">
                {Object.entries(COHORTS).map(([key, c]) => (
                  <button
                    key={key}
                    type="button"
                    className={`sled-pill${cohort === key ? ' is-active' : ''}`}
                    aria-pressed={cohort === key}
                    onClick={() => setCohort(key)}
                  >
                    {c.label}
                  </button>
                ))}
                <span className="sled-chart-vs">{active.caption}</span>
              </div>
            </div>

            {/* key remounts the chart so the 400ms draw restarts on a cohort
                switch and on the clock's extension beat. */}
            <div className="sled-chart-wide">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={`${cohort}-${points}`} data={chartData}>
                  <defs>
                    <linearGradient id="sledFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray={CHART.gridDash}
                    stroke={CHART.gridStroke}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="wk"
                    tick={CHART.tick}
                    axisLine={{ stroke: 'var(--border-primary)' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={CHART.tick}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    domain={['dataMin - 16', 'dataMax + 16']}
                  />
                  <Tooltip
                    content={({ active: isActive, payload }) => {
                      if (!isActive || !payload?.length) return null;
                      return (
                        <div className="sled-chart-tooltip">
                          <div className="sled-chart-tooltip-date">{payload[0].payload.wk}</div>
                          {payload.map((entry) => (
                            <div
                              key={entry.dataKey}
                              className="sled-chart-tooltip-val"
                              style={{ color: entry.stroke }}
                            >
                              {entry.name}: {entry.value}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="you"
                    name="You"
                    stroke="var(--emerald)"
                    strokeWidth={2}
                    fill="url(#sledFill)"
                    isAnimationActive
                    animationDuration={CHART.animationDuration}
                  />
                  <Area
                    type="monotone"
                    dataKey="a"
                    name="Leader"
                    stroke="var(--text-faint)"
                    strokeWidth={1.5}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="b"
                    name="Median"
                    stroke="var(--text-ghost)"
                    strokeWidth={1.5}
                    fill="transparent"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── zone C, the sheets: 7fr ledger | 5fr standings ── */}
        <div className="sled-sheets">
          <div className="sled-sheet sled-ledgersheet">
            <div className="sled-sheet-head">The ledger</div>
            <div className="sled-tr sled-thead sled-tr--ledger">
              <span>Delta</span>
              <span>Event</span>
              <span className="sled-hide-sm">Rating</span>
              <span className="sled-ta-r">When</span>
            </div>
            <div className="sled-rows">
              {LEDGER.slice(0, LEDGER_SHOWN).map((row, i) => {
                const isNew = i === 0;
                const rated = row.delta !== DOT;
                const neg = row.delta.startsWith('-');
                return (
                  <div
                    key={row.event}
                    className={[
                      'sled-tr',
                      'sled-tr--ledger',
                      isNew && 'sled-tr--new',
                      isNew && frame.rowIn && 'is-in',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span
                      className={`sled-delta${rated ? '' : ' sled-delta--none'}${neg ? ' sled-delta--neg' : ''}`}
                    >
                      {row.delta}
                    </span>
                    <span className="sled-row-body">
                      {isNew ? typedEvent : row.event}
                      {isNew && frame.typed < 1 ? (
                        <span className="sled-caret" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="sled-num sled-hide-sm">
                      {row.from ? `${row.from} ${DOT} ${row.to}` : DOT}
                    </span>
                    <span className="sled-time sled-ta-r">{row.when}</span>
                  </div>
                );
              })}
            </div>
            <div className="sled-footrow">
              <span>Net this week +{frame.weekDelta}</span>
              <span className="sled-ta-r">Full ledger</span>
            </div>
          </div>

          <div className="sled-sheet sled-standsheet">
            <div className="sled-sheet-head">Season 4 standings</div>
            <div className="sled-tr sled-thead sled-tr--stand">
              <span>#</span>
              <span>Member</span>
              <span>Week</span>
              <span className="sled-ta-r">Rating</span>
            </div>
            <div className="sled-rows">
              {STANDINGS.map((p) => {
                const rating = p.you ? frame.standRating : p.rating;
                const week = p.you ? frame.standWeek : p.week;
                const neg = week.startsWith('-');
                const rated = week !== DOT && week !== 'NEW';
                return (
                  <div
                    key={p.rank}
                    className={`sled-tr sled-tr--stand${p.you ? ' sled-tr--you' : ''}`}
                  >
                    <span className="sled-tile-rank">{p.rank}</span>
                    <span className="sled-tile-name">
                      {p.name}
                      {p.handle ? <span className="sled-tile-handle"> {p.handle}</span> : null}
                    </span>
                    <span
                      className={`sled-tile-delta${rated && !neg ? ' sled-tile-delta--up' : ''}${neg ? ' sled-tile-delta--down' : ''}${!rated ? ' sled-tile-delta--flat' : ''}`}
                    >
                      {week}
                    </span>
                    <span className="sled-tile-elo sled-ta-r">{rating}</span>
                    {/* Derived from the rating alone, on the chart's domain, so
                        it invents nothing and gives the standings a reason to be
                        taller than a list. */}
                    <span className="sled-bar" aria-hidden="true">
                      <span className="sled-bar-tier">{p.tier}</span>
                      <span className="sled-bar-track">
                        <span className="sled-bar-fill" style={{ width: `${barPct(rating)}%` }} />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="sled-footrow">
              <span>4 members</span>
              <span className="sled-ta-r">{frame.gap} to first</span>
            </div>
          </div>
        </div>

        {/* ── section foot ── */}
        <div className="sled-foot">
          <p className="sled-foot-note">
            Ratings and standings shown here are illustrative sample data, not a live leaderboard
            and not investment advice.
          </p>
          <span className="sled-foot-cta">Start your ledger</span>
        </div>
      </div>
    </section>
  );
}

export default SocialLedgerSection;
