/**
 * SocialLedgerSection: the "Social investing" landing section.
 *
 * Layout is the docs/design/sled-handoff v2 composition: a centred header,
 * the record zone (rating | chart) and the sheets zone (ledger | standings),
 * with both sheets one height BY STRUCTURE.
 *
 * Motion, rebuilt (Sept 2026):
 *
 *  - The ledger is a conveyor. Rows are chronological, oldest on top, the way
 *    a ledger is actually written. Every cycle the whole track glides up by
 *    exactly one row on the compositor (translate3d, no layout), the top row
 *    fades as it leaves and the next event slides in at the bottom and types
 *    itself. There is no max-height reflow any more, which is what made the
 *    old write-in look like a jolt.
 *  - The event pool is circular and its deltas sum to zero, so the loop never
 *    has a seam: after the last event the chain is back at the first event's
 *    starting rating and the next lap continues from there.
 *  - The ledger fills its sheet. The viewport is stretched to the standings
 *    sheet's height by the grid, measured, and divided into a whole number of
 *    equal rows, so the two sheets always end on one baseline with no half
 *    row at the bottom.
 *  - The chart never reloads. It is a memoised component keyed on the cohort
 *    only: the master clock does not touch its data or its key, so it draws
 *    once on mount and again only when the visitor switches cohort.
 *  - React re-renders only when a visible value changes (a typed character, a
 *    rating tick, the head row advancing). The per-frame glide is written to
 *    the track's style directly from the rAF loop.
 *
 * Fixture only, never live, and labelled so in the section foot. The rating
 * chain stays inside Maya K. (1458) and Daniel R. (1512), so "You" holds
 * rank 02 on every frame and the standings never claim a rank change the
 * numbers cannot support.
 */

'use client';

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Customized,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import './social-ledger.css';

/* ────────────────────────── fixture ────────────────────────── */

const DOT = '·';
const WEEKS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08'];
const YOU_SERIES = [1408, 1416, 1410, 1428, 1440, 1452, 1484, 1498];

const COHORTS = {
  friends: {
    label: 'Friends',
    caption: 'vs. 5 friends',
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

/* The circular event pool, oldest first. Every row is rated, so every column
   has a value on every row. The deltas sum to zero (asserted below), which is
   what lets the conveyor loop without a seam. */
const LEDGER_START = 1466;
const LEDGER_EVENTS = [
  { d: 6, event: "Passed 'Options Greeks I' in the Learning Center", when: 'Mon' },
  { d: 5, event: '7-day login streak', when: 'Mon' },
  { d: -5, event: 'Daily P&L below circle median', when: 'Tue' },
  { d: 4, event: "Beat Priya S. in a 'Season 4 Sprint' heat", when: 'Tue' },
  { d: 8, event: 'Research post upvoted, consensus signal', when: 'Wed' },
  { d: -10, event: 'Research thesis challenged and closed out', when: 'Wed' },
  { d: 24, event: "Won 'Q3 Momentum Sprint'", when: 'Thu' },
  { d: -6, event: 'Closed a sprint position below entry', when: 'Thu' },
  { d: 3, event: 'Trade idea copied by 3 circle members', when: 'Fri' },
  { d: -9, event: 'Drawdown passed your risk limit', when: 'Fri' },
  { d: 2, event: 'Maya K. joined your circle on your referral', when: 'Sat' },
  { d: -12, event: "Lost 'Weekend Macro Duel' to Daniel R.", when: 'Sat' },
  { d: -4, event: 'Missed the Sunday portfolio review', when: 'Sun' },
  { d: -6, event: 'Weekly P&L below median', when: 'Sun' },
];

const LEDGER = (() => {
  let r = LEDGER_START;
  return LEDGER_EVENTS.map((e) => {
    const row = { ...e, from: r, to: r + e.d };
    r += e.d;
    return row;
  });
})();
const N = LEDGER.length;
/* The event the composed (reduced-motion / first paint) frame lands on. */
const PEAK = LEDGER.findIndex((e) => e.to === 1498);

if (process.env.NODE_ENV !== 'production') {
  const net = LEDGER_EVENTS.reduce((s, e) => s + e.d, 0);
  if (net !== 0) console.warn(`[sled] ledger pool nets ${net}, the loop will seam`);
}

const mod = (n) => ((n % N) + N) % N;
const eventAt = (seq) => LEDGER[mod(seq)];
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
/** Net of the `count` events ending at `endSeq` (inclusive). */
const netOf = (endSeq, count) => {
  let s = 0;
  for (let k = 0; k < count; k += 1) s += eventAt(endSeq - k).d;
  return s;
};

const LEADER = 1512;
const STANDINGS = [
  { rank: '01', name: 'Daniel R.', rating: LEADER, week: '+6', tier: 'Apprentice' },
  { rank: '02', name: 'You', rating: 1498, week: '+24', tier: 'Apprentice', you: true },
  { rank: '03', name: 'Maya K.', rating: 1458, week: '+4', tier: 'Apprentice' },
  { rank: '04', name: 'Priya S.', rating: 1441, week: '-5', tier: 'Apprentice' },
  { rank: '05', name: 'Jordan T.', rating: 1418, week: '+3', tier: 'Apprentice' },
  { rank: '06', name: 'Sam O.', rating: 1396, week: '-2', tier: 'Apprentice' },
];

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
    markerPct: ((i + within) / TIERS.length) * 100,
    toNext: Math.max(0, next - rating),
    nextName: i + 1 < TIERS.length ? TIERS[i + 1].name : null,
  };
}

const BAR_MIN = 1390;
const BAR_SPAN = 150;
const barPct = (rating) => Math.max(0, Math.min(100, ((rating - BAR_MIN) / BAR_SPAN) * 100));

/* ────────────────────────── the clock ──────────────────────────
   One cycle per ledger event. Beats in ms. The glide is well under the
   branding guide's 0.5s ceiling for state changes plus a hold, and the
   rating, ladder and standings all land inside 1.3s of the row arriving. */
const CYCLE = 4200;
const BEAT = {
  shift: [300, 1000],
  type: [650, 1500],
  rating: [900, 1600],
  stand: [1400, 2000],
};
const DEFAULT_VISIBLE = 8;
const ROW_TARGET_PX = 44;

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const progress = (t, [a, b]) => clamp01((t - a) / (b - a));
const lerpInt = (from, to, p) => Math.round(from + (to - from) * p);

/**
 * Everything React renders for cycle `c` at time `t` into it. `c` is an
 * absolute, ever-increasing cycle count; the event entering in cycle c is
 * sequence c + visible. The head row (top of the viewport) is floor(c + shift).
 */
function frameAt(c, t, visible) {
  const shiftP = easeInOut(progress(t, BEAT.shift));
  const ratingP = easeInOut(progress(t, BEAT.rating));
  const standP = progress(t, BEAT.stand);
  const seq = c + visible;
  const ev = eventAt(seq);
  const prev = eventAt(seq - 1);
  const counted = ratingP > 0;
  const rating = lerpInt(ev.from, ev.to, ratingP);
  const standRating = lerpInt(ev.from, ev.to, standP);
  const l = ladderFor(rating);
  return {
    c,
    head: c + (shiftP >= 1 ? 1 : 0),
    typedChars: Math.round(ev.event.length * progress(t, BEAT.type)),
    typingSeq: seq,
    rating,
    lastDelta: counted ? ev.d : prev.d,
    net: counted ? netOf(seq, visible) : netOf(seq - 1, visible),
    markerPct: l.markerPct,
    toNext: l.toNext,
    tier: l.tier,
    nextName: l.nextName,
    standRating,
    standWeek: signed(standP > 0.5 ? ev.d : prev.d),
    gap: LEADER - standRating,
  };
}

/** The composed frame: the peak event landed and fully typed. */
const composedFor = (visible) => frameAt(PEAK - visible, CYCLE - 1, visible);

const sameFrame = (a, b) =>
  a.c === b.c &&
  a.head === b.head &&
  a.typedChars === b.typedChars &&
  a.rating === b.rating &&
  a.lastDelta === b.lastDelta &&
  a.net === b.net &&
  a.standRating === b.standRating &&
  a.standWeek === b.standWeek;

/* The readout is pinned, not hovered: one week, always shown. */
const PIN_WEEK = 'W05';
const PIN_INDEX = WEEKS.indexOf(PIN_WEEK);
const PIN_SERIES = [
  { key: 'you', name: 'You', color: 'var(--emerald)', r: 4 },
  { key: 'a', name: 'Leader', color: 'var(--text-faint)', r: 3 },
  { key: 'b', name: 'Median', color: 'var(--text-ghost)', r: 3 },
];
const PIN_W = 132;
const PIN_H = 88;
const PIN_GAP = 12;

/* Recharts clones Customized with the chart's props and state (xAxisMap,
   yAxisMap, offset, data), so this re-lays out on every resize and cohort
   switch with no measuring of our own. The card flips to the left of the
   rule if it would cross the plot's right edge. */
function PinnedReadout({ xAxisMap, yAxisMap, offset, data }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  const row = data?.[PIN_INDEX];
  if (!xAxis?.scale || !yAxis?.scale || !offset || !row) return null;
  const bw = typeof xAxis.scale.bandwidth === 'function' ? xAxis.scale.bandwidth() : 0;
  const x = xAxis.scale(row.wk) + bw / 2;
  if (!Number.isFinite(x)) return null;
  const right = offset.left + offset.width;
  const cardX = x + PIN_GAP + PIN_W > right ? x - PIN_GAP - PIN_W : x + PIN_GAP;

  return (
    <g className="sled-pin" aria-hidden="true">
      <line
        className="sled-pin-rule"
        x1={x}
        x2={x}
        y1={offset.top}
        y2={offset.top + offset.height}
      />
      {PIN_SERIES.map((s) => (
        <circle
          key={s.key}
          cx={x}
          cy={yAxis.scale(row[s.key])}
          r={s.r}
          style={{ fill: s.color, stroke: 'var(--bg-primary)', strokeWidth: 1.5 }}
        />
      ))}
      <foreignObject
        x={cardX}
        y={offset.top + 4}
        width={PIN_W}
        height={PIN_H}
        style={{ overflow: 'visible' }}
      >
        <div className="sled-chart-tooltip sled-chart-tooltip--pinned">
          <div className="sled-chart-tooltip-date">{row.wk}</div>
          {PIN_SERIES.map((s) => (
            <div key={s.key} className="sled-chart-tooltip-val" style={{ color: s.color }}>
              {s.name}: {row[s.key]}
            </div>
          ))}
        </div>
      </foreignObject>
    </g>
  );
}

/* ────────────────────────── chart ──────────────────────────
   Memoised on cohort alone, so the ledger clock can re-render the section as
   often as it likes without the chart redrawing. The key is the cohort: the
   400ms draw replays when the visitor picks a cohort, and never otherwise. */
const RatingChart = memo(function RatingChart({ cohort }) {
  const active = COHORTS[cohort];
  const data = useMemo(
    () => WEEKS.map((wk, i) => ({ wk, you: YOU_SERIES[i], a: active.a[i], b: active.b[i] })),
    [active],
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart key={cohort} data={data}>
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
        <Customized component={PinnedReadout} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

/* ────────────────────────── section ────────────────────────── */

export function SocialLedgerSection() {
  const [cohort, setCohort] = useState('friends');
  const [geom, setGeom] = useState({ visible: DEFAULT_VISIBLE, rowH: null });
  const [frame, setFrame] = useState(() => composedFor(DEFAULT_VISIBLE));

  const sectionRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const frameRef = useRef(frame);
  const geomRef = useRef(geom);
  /* Continuous position in rows (cycle + glide progress), written by the rAF
     loop and read by the layout effect so the transform is always relative
     to the head row React actually rendered. */
  const posRef = useRef(frame.head);
  const renderedHeadRef = useRef(frame.head);

  const applyTransform = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const rowH = geomRef.current.rowH || ROW_TARGET_PX;
    const shift = clamp01(posRef.current - renderedHeadRef.current);
    track.style.transform = `translate3d(0, ${(-shift * rowH).toFixed(2)}px, 0)`;
    track.style.setProperty('--sled-shift', shift.toFixed(3));
  }, []);

  const setFrameIfChanged = useCallback((next) => {
    if (sameFrame(frameRef.current, next)) return;
    frameRef.current = next;
    setFrame(next);
  }, []);

  /* After every render, re-anchor the glide to the head row now in the DOM.
     This is what makes the head advance invisible: the frame that drops the
     top row also drops the one-row offset. */
  useLayoutEffect(() => {
    renderedHeadRef.current = frame.head;
    applyTransform();
  }, [frame.head, geom.rowH, applyTransform]);

  /* The ledger fills whatever height the grid gives its viewport (the
     standings sheet sets it on desktop), in a whole number of equal rows. */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (!h) return;
      const visible = Math.max(4, Math.min(14, Math.round(h / ROW_TARGET_PX)));
      const rowH = h / visible;
      const prev = geomRef.current;
      if (prev.visible === visible && Math.abs((prev.rowH || 0) - rowH) < 0.5) return;
      const next = { visible, rowH };
      geomRef.current = next;
      vp.style.setProperty('--sled-lrow', `${rowH.toFixed(2)}px`);
      setGeom(next);
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, []);

  /* The clock. Runs only in view, pauses rather than unmounting, and resolves
     to the composed frame under reduced motion. */
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof window === 'undefined') return undefined;
    const visible = geom.visible;
    const composed = composedFor(visible);
    posRef.current = composed.head;
    setFrameIfChanged(composed);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    /* Start one cycle after the composed frame, so the first thing that moves
       is the next event arriving, never a jump backwards. */
    const startCycle = composed.c + 1;
    let raf = 0;
    let running = false;
    let elapsed = 0;
    let last = 0;

    const step = (now) => {
      if (last) elapsed += Math.min(64, now - last);
      last = now;
      const n = Math.floor(elapsed / CYCLE);
      const t = elapsed - n * CYCLE;
      const c = startCycle + n;
      posRef.current = c + easeInOut(progress(t, BEAT.shift));
      setFrameIfChanged(frameAt(c, t, visible));
      applyTransform();
      raf = window.requestAnimationFrame(step);
    };
    const run = () => {
      if (running) return;
      running = true;
      last = 0;
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
  }, [geom.visible, setFrameIfChanged, applyTransform]);

  const active = COHORTS[cohort];
  const visible = geom.visible;

  /* visible + 1 rows: the extra one waits below the viewport for its turn. */
  const rows = [];
  for (let k = 0; k <= visible; k += 1) {
    const seq = frame.head + k;
    rows.push({ seq, ev: eventAt(seq), leaving: k === 0, entering: k === visible });
  }

  return (
    <section className="sled-section sled" aria-labelledby="sled-heading" ref={sectionRef}>
      <div className="sled-inner">
        <div className="sled-head">
          <p className="section-eyebrow lf-mono">Social investing</p>
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
                <span
                  className={`sled-rating-delta${frame.lastDelta < 0 ? ' sled-rating-delta--neg' : ''}`}
                >
                  {signed(frame.lastDelta)} latest
                </span>
                <span className="sled-rating-tier">{frame.tier}</span>
              </div>
            </div>

            <div className="sled-ladder">
              <div className="sled-ladder-caption">
                <span>Tier</span>
                <span className="sled-ladder-next">
                  {frame.toNext} to {frame.nextName || 'cap'}
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
            <div className="sled-chart-wide">
              <RatingChart cohort={cohort} />
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
            {/* The conveyor. The viewport clips; the track glides. aria-live
                is off on purpose: a looping fixture announcing itself every
                four seconds would be noise, and the rows are all in the DOM. */}
            <div className="sled-viewport" ref={viewportRef}>
              <div className="sled-track" ref={trackRef}>
                {rows.map(({ seq, ev, leaving, entering }) => {
                  const typing = seq === frame.typingSeq && frame.typedChars < ev.event.length;
                  const text =
                    seq === frame.typingSeq ? ev.event.slice(0, frame.typedChars) : ev.event;
                  return (
                    <div
                      key={seq}
                      className={[
                        'sled-tr',
                        'sled-tr--ledger',
                        'sled-tr--roll',
                        leaving && 'sled-tr--leaving',
                        entering && 'sled-tr--entering',
                        seq === frame.typingSeq && 'sled-tr--latest',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden={entering ? 'true' : undefined}
                    >
                      <span className={`sled-delta${ev.d < 0 ? ' sled-delta--neg' : ''}`}>
                        {signed(ev.d)}
                      </span>
                      <span className="sled-row-body">
                        {text}
                        {typing ? <span className="sled-caret" aria-hidden="true" /> : null}
                      </span>
                      <span className="sled-num sled-hide-sm">
                        {ev.from} {DOT} {ev.to}
                      </span>
                      <span className="sled-time sled-ta-r">{ev.when}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="sled-footrow">
              <span>
                Net {signed(frame.net)} {DOT} last {visible}
              </span>
              <span className="sled-ta-r">Full ledger</span>
            </div>
          </div>

          <div className="sled-sheet sled-standsheet">
            <div className="sled-sheet-head">
              <span>Season 4 standings</span>
              <span className="sled-stamp">
                <i className="sled-live-dot" aria-hidden="true" />
                Season 4 {DOT} Live
              </span>
            </div>
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
                return (
                  <div
                    key={p.rank}
                    className={`sled-tr sled-tr--stand${p.you ? ' sled-tr--you' : ''}`}
                  >
                    <span className="sled-tile-rank">{p.rank}</span>
                    <span className="sled-tile-name">{p.name}</span>
                    <span
                      className={`sled-tile-delta${neg ? ' sled-tile-delta--down' : ' sled-tile-delta--up'}`}
                    >
                      {week}
                    </span>
                    <span className="sled-tile-elo sled-ta-r">{rating}</span>
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
              <span>6 members</span>
              <span className="sled-ta-r">{frame.gap} to first</span>
            </div>
          </div>
        </div>

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
