/**
 * SocialLedgerSection: the "Social investing" landing section.
 *
 * Layout: a centred header, then the pinned climb (SocialAscentStage: a
 * scroll-driven gauge that climbs to the Strategist line while the actions
 * that earned it pop in left and right), then the board: chart | standings,
 * the ledger full width beneath.
 *
 * Oct 26: scroll is the board's only clock. One daily timeline
 * (social-timeline.js, the 50 days ENDING on the visitor's "today") drives
 * everything on the board, so nothing can disagree:
 *
 *  - A flip calendar at the left of the chart's header row shows the date for
 *    the current day: day 0 is 49 days ago, day 49 (where the scroll stops)
 *    is today. Each step of scroll flips the day forward; the month band
 *    flips when the date crosses into the next month. It sits in the header
 *    row, not on the plot, so the pinned rating readout (which rides the
 *    line across the top of the plot) can never cover it.
 *  - The chart's pinned readout rides "You"'s line to that date, and every
 *    day after it is ghosted.
 *  - The standings re-rank live as the date advances. Ranks are derived from
 *    the timeline: "You" starts #4, touches #2 on day 30, slips back to #4 on
 *    day 32, holds #2 from day 34, and never passes #1 (Daniel R.). Rows glide
 *    to their new places (FLIP, transforms only).
 *  - The ledger writes each event in as the date reaches it: the track glides
 *    up one row and the new row types itself.
 *
 * Desktop (1024px and up, when the board fits the viewport): the board pins
 * inside a runway 22px of scroll per day tall. Elsewhere the date advances as
 * the chart travels through the viewport, with no pin. Scrolling back
 * rewinds. React renders once per day change, at most 50 times over the
 * runway; the climb above is memoised and never re-renders for it.
 *
 * Composed frame (SSR, no JS, prefers-reduced-motion): the last day, 49. The
 * visitor's date is unknown on the server, so the calendar and the axis
 * dates fill in after mount.
 *
 * Fixture only, never live, and labelled so in the section foot. Tiers on the
 * standings are derived from each rating (deriveTierState), never typed in.
 */

'use client';

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceArea,
  Customized,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import SocialAscentStage from './SocialAscentStage';
import SocialFlipCalendar from './SocialFlipCalendar';
import { LADDER_TIERS, deriveTierState } from './social-rating';
import {
  DAYS,
  EVENTS,
  LEDGER_ROWS,
  MEMBER_WEEKLY,
  WEEK_DAYS,
  eventsBy,
  lerpWeekly,
  standingsAt,
  youAt,
} from './social-timeline';
import './social-ledger.css';

/* The climb's props are module constants, so memo keeps it out of the
   board's per-day renders. */
const AscentStage = memo(SocialAscentStage);

/* ────────────────────────── fixture ────────────────────────── */

const DOT = '·';

/* Weekly anchors per cohort (days 0, 7, ... 49); daily values are linear
   between them. The friends leader IS Daniel R. on the standings. */
const COHORTS = {
  friends: {
    label: 'Friends',
    caption: 'vs. 5 friends',
    a: MEMBER_WEEKLY['Daniel R.'],
    b: [2420, 2426, 2432, 2440, 2448, 2454, 2462, 2468],
  },
  whales: {
    label: 'Whales',
    caption: 'vs. 13F whales',
    a: [2472, 2480, 2488, 2494, 2504, 2514, 2522, 2530],
    b: [2432, 2438, 2444, 2452, 2460, 2468, 2474, 2482],
  },
  politicians: {
    label: 'Politicians',
    caption: 'vs. Congress',
    a: [2442, 2450, 2458, 2466, 2476, 2486, 2496, 2504],
    b: [2404, 2410, 2418, 2426, 2434, 2442, 2448, 2454],
  },
};

const LEADER_NAME = 'Daniel R.';
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

/* The climb at the top of the section. Each step IS a timeline event, read
   by its text, so its points are never typed twice. The climb ends on the
   timeline's last day (2500, Strategist), the start is the end minus the
   steps (2448), and the gauge's right edge is the next tier's line, so it
   counts "to Strategist". The standings foot keeps its own "to first", the
   gap to the leader. */
const ASCENT_SPECS = [
  {
    id: 'course',
    side: 'left',
    icon: 'bi-mortarboard',
    label: 'Pass a Learning Center course',
    event: "Passed 'Options Greeks I' in the Learning Center",
  },
  {
    id: 'streak',
    side: 'right',
    icon: 'bi-fire',
    label: 'Keep a 7 day login streak',
    event: '7-day login streak',
  },
  {
    id: 'heat',
    side: 'left',
    icon: 'bi-lightning-charge',
    label: 'Win a sprint heat',
    event: "Beat Priya S. in a 'Season 4 Sprint' heat",
  },
  {
    id: 'research',
    side: 'right',
    icon: 'bi-hand-thumbs-up',
    label: 'Get your research upvoted',
    event: 'Research post upvoted, consensus signal',
  },
  {
    id: 'copied',
    side: 'left',
    icon: 'bi-files',
    label: 'Have a trade idea copied',
    event: 'Trade idea copied by 3 circle members',
  },
  {
    id: 'referral',
    side: 'right',
    icon: 'bi-person-plus',
    label: 'Bring a friend into your circle',
    event: 'Maya K. joined your circle on your referral',
  },
  {
    id: 'sprint',
    side: 'right',
    icon: 'bi-trophy',
    label: 'Win a season sprint',
    event: "Won 'Q3 Momentum Sprint'",
  },
];
const ASCENT_STEPS = ASCENT_SPECS.map((s) => ({
  ...s,
  points: EVENTS.find((e) => e.event === s.event)?.d ?? null,
})).filter((s) => Number.isFinite(s.points) && s.points > 0);
const ASCENT_END = youAt(DAYS);
const ASCENT_START = ASCENT_END - ASCENT_STEPS.reduce((sum, s) => sum + s.points, 0);
const ASCENT_FLOOR = 2400;
/* The gauge's right edge is the tier line the climb is heading for (the first
   tier above the start), read from the ladder so it cannot drift. */
const ASCENT_GOAL = [...LADDER_TIERS]
  .sort((a, b) => a.min - b.min)
  .find((t) => t.min > ASCENT_START);

/* What the next league asks for, shown once the gauge promotes the visitor.
   To-dos, not results: no points are claimed for them, and each one names a
   real surface of the product (Learning Center, sprints, duels, research,
   circles, streaks). */
const NEXT_LEAGUE_TASKS = [
  {
    id: 'course2',
    side: 'left',
    icon: 'bi-mortarboard',
    label: 'Pass an advanced course',
    detail: 'Any advanced track in the Learning Center',
  },
  {
    id: 'podium',
    side: 'right',
    icon: 'bi-trophy',
    label: 'Finish top 3 in a sprint',
    detail: 'Podium any season sprint',
  },
  {
    id: 'streak30',
    side: 'left',
    icon: 'bi-fire',
    label: 'Keep a 30 day login streak',
    detail: 'Log in every day for a month',
  },
  {
    id: 'consensus',
    side: 'right',
    icon: 'bi-journal-text',
    label: 'Publish research to consensus',
    detail: 'Your circle upvotes it into a consensus signal',
  },
  {
    id: 'duels',
    side: 'left',
    icon: 'bi-lightning-charge',
    label: 'Win three duels',
    detail: 'Beat a Strategist head to head',
  },
  {
    id: 'circle10',
    side: 'right',
    icon: 'bi-people',
    label: 'Grow your circle to 10',
    detail: 'Invite friends into your circle',
  },
];

if (process.env.NODE_ENV !== 'production') {
  if (ASCENT_STEPS.length !== ASCENT_SPECS.length) {
    console.warn('[sled] an ascent step no longer matches a timeline event');
  }
  if (ASCENT_START < ASCENT_FLOOR || !ASCENT_GOAL || ASCENT_END > ASCENT_GOAL.min) {
    console.warn('[sled] the climb leaves the gauge range');
  }
}

/* Daily ratings span 2398 to 2514, inside the bar scale. */
const BAR_MIN = 2392;
const BAR_SPAN = 150;
const barPct = (rating) => Math.max(0, Math.min(100, ((rating - BAR_MIN) / BAR_SPAN) * 100));

/* ────────────────────────── the scroll clock ────────────────────────── */

const PX_PER_DAY = 22;
const PIN_TOP = 88; /* the 64px landing nav plus 24px air */
const PIN_MIN_WIDTH = 1024;
const DEFAULT_VISIBLE = 4;
const ROW_TARGET_PX = 36;
const GLIDE_MS = 700;
const NBSP = '\u00a0';
const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

const addDays = (base, n) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
const fmtTick = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const fmtCard = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/* ────────────────────────── chart ────────────────────────── */

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
   switch with no measuring of our own. The rule, the dots and the card sit
   on the current day; the card flips to the left of the rule if it would
   cross the plot's right edge. */
function PinnedReadout({ xAxisMap, yAxisMap, offset, data, day, label }) {
  const xAxis = xAxisMap && Object.values(xAxisMap)[0];
  const yAxis = yAxisMap && Object.values(yAxisMap)[0];
  const row = data?.[day];
  if (!xAxis?.scale || !yAxis?.scale || !offset || !row) return null;
  const x = xAxis.scale(row.day);
  if (!Number.isFinite(x)) return null;
  const right = offset.left + offset.width;
  const cardX = x + PIN_GAP + PIN_W > right ? x - PIN_GAP - PIN_W : x + PIN_GAP;
  const youY = yAxis.scale(row.you);

  return (
    <g className="sled-pin" aria-hidden="true">
      <line
        className="sled-pin-rule"
        x1={x}
        x2={x}
        y1={offset.top}
        y2={offset.top + offset.height}
      />
      <circle className="sled-pin-halo" cx={x} cy={youY} r={10} />
      {PIN_SERIES.map((s) => (
        <circle
          key={s.key}
          className={`sled-pin-dot sled-pin-dot--${s.key}`}
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
          <div className="sled-chart-tooltip-date">{label || NBSP}</div>
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
const DAY_TICKS = WEEK_DAYS;
/* One y range for every cohort, so switching cohort redraws only the
   comparison lines: "You"'s line and dot never move. Rounded out to a
   45-point step so the axis reads in even ticks. */
const Y_STEP = 45;
const Y_DOMAIN = (() => {
  const all = Object.values(COHORTS).flatMap((c) => [...c.a, ...c.b]);
  for (let d = 0; d <= DAYS; d += 1) all.push(youAt(d));
  const lo = Math.floor((Math.min(...all) - 8) / 10) * 10;
  const hi = lo + Math.ceil((Math.max(...all) + 8 - lo) / Y_STEP) * Y_STEP;
  return [lo, hi];
})();
const Y_TICKS = Array.from(
  { length: (Y_DOMAIN[1] - Y_DOMAIN[0]) / Y_STEP + 1 },
  (_, i) => Y_DOMAIN[0] + i * Y_STEP,
);

/* Memoised: it renders on a cohort switch and on a day change, never for
   anything else. The data is memoised on the cohort and the AreaChart is
   keyed on it, so the 400ms draw replays only when the visitor picks a
   cohort; a day change moves the readout and the ghosting only. */
const RatingChart = memo(function RatingChart({ cohort, day, start }) {
  const active = COHORTS[cohort];
  const data = useMemo(
    () =>
      Array.from({ length: DAYS + 1 }, (_, d) => ({
        day: d,
        you: youAt(d),
        a: lerpWeekly(active.a, d),
        b: lerpWeekly(active.b, d),
      })),
    [active],
  );
  const tickFormatter = (d) => (start ? fmtTick.format(addDays(start, d)) : '');
  const label = start ? fmtCard.format(addDays(start, day)) : '';
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
          type="number"
          dataKey="day"
          domain={[0, DAYS]}
          ticks={DAY_TICKS}
          tickFormatter={tickFormatter}
          tick={CHART.tick}
          axisLine={{ stroke: 'var(--border-primary)' }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={10}
        />
        <YAxis
          tick={CHART.tick}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={Y_DOMAIN}
          ticks={Y_TICKS}
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
        {/* The future, ghosted: everything after the current day. */}
        {day < DAYS ? (
          <ReferenceArea
            x1={day}
            x2={DAYS}
            className="sled-future"
            fill="color-mix(in srgb, var(--bg-primary) 55%, transparent)"
            fillOpacity={1}
            stroke="none"
            ifOverflow="hidden"
          />
        ) : null}
        <Customized component={<PinnedReadout day={day} label={label} />} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

/* ────────────────────────── standings ──────────────────────────
   Rows glide to their new places when the order changes (FLIP): the layout
   effect reads where each row was and where it is now, sets the inverse
   translate, and lets it transition back to zero. Transforms only. */
function useFlip(listRef, orderKey, enabled) {
  const tops = useRef(new Map());
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = [...list.querySelectorAll('[data-flip]')];
    const next = new Map(rows.map((el) => [el.dataset.flip, el.offsetTop]));
    if (enabled) {
      rows.forEach((el) => {
        const was = tops.current.get(el.dataset.flip);
        const now = next.get(el.dataset.flip);
        if (was == null || was === now) return;
        el.style.transition = 'none';
        el.style.transform = `translateY(${was - now}px)`;
        /* Commit the inverse before releasing it. */
        el.getBoundingClientRect();
        el.style.transition = '';
        el.style.transform = '';
      });
    }
    tops.current = next;
  }, [listRef, orderKey, enabled]);
}

/* ────────────────────────── section ────────────────────────── */

export function SocialLedgerSection() {
  const [cohort, setCohort] = useState('friends');
  const [geom, setGeom] = useState({ visible: DEFAULT_VISIBLE, rowH: null });
  /* The composed frame is the last day; the clock takes over after mount. */
  const [day, setDay] = useState(DAYS);
  const [today, setToday] = useState(null);
  const [live, setLive] = useState(false);
  const [pinned, setPinned] = useState(false);
  /* The ledger's motion: which event count is showing, whether the track is
     mid-glide, and which row (by count) is typing itself. */
  const [ledger, setLedger] = useState({ k: eventsBy(DAYS), glide: false, typing: 0 });
  const [rank, setRank] = useState({ at: null, pulse: 0, note: '' });

  const runwayRef = useRef(null);
  const boardRef = useRef(null);
  const chartRef = useRef(null);
  const viewportRef = useRef(null);
  const standRef = useRef(null);
  const geomRef = useRef(geom);
  const prevOrderRef = useRef([]);

  /* The visitor's local "today", at midnight. Client only, so the server
     and the first client render agree. */
  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  /* The ledger fills whatever height its viewport has, in a whole number of
     equal rows. */
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

  /* The scroll clock. Under reduced motion it never starts: the board keeps
     the composed last day and the runway stays collapsed. */
  useEffect(() => {
    const runway = runwayRef.current;
    const board = boardRef.current;
    if (!runway || !board || typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const wide = window.matchMedia(`(min-width: ${PIN_MIN_WIDTH}px)`);
    let raf = 0;
    let listening = false;
    let pin = false;

    /* Pin only where the whole board fits under the nav; the runway is the
       board plus 22px of scroll per day. */
    const layout = () => {
      const boardH = board.offsetHeight;
      const fits = boardH <= (window.innerHeight || 0) - PIN_TOP - 16;
      pin = wide.matches && fits;
      runway.style.height = pin ? `${boardH + DAYS * PX_PER_DAY}px` : '';
      setPinned(pin);
    };

    const measure = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      let p;
      if (pin) {
        const r = runway.getBoundingClientRect();
        const run = r.height - board.offsetHeight;
        p = run > 0 ? clamp01((PIN_TOP - r.top) / run) : 1;
      } else {
        const c = (chartRef.current || board).getBoundingClientRect();
        p = clamp01((vh * 0.85 - c.top) / (vh * 0.85 - vh * 0.15));
      }
      setDay(Math.round(p * DAYS));
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    const onResize = () => {
      layout();
      onScroll();
    };
    const listen = (on) => {
      if (on === listening) return;
      listening = on;
      if (on) window.addEventListener('scroll', onScroll, { passive: true });
      else window.removeEventListener('scroll', onScroll);
    };

    layout();
    measure();
    setLive(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        listen(entry.isIntersecting);
        /* One last read on the way in or out, so a fast scroll past the
           board still lands it on day 0 or day 49. */
        onScroll();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(runway);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(board);
    window.addEventListener('resize', onResize);
    wide.addEventListener?.('change', onResize);
    return () => {
      io.disconnect();
      ro?.disconnect();
      listen(false);
      window.removeEventListener('resize', onResize);
      wide.removeEventListener?.('change', onResize);
      if (raf) window.cancelAnimationFrame(raf);
      runway.style.height = '';
    };
  }, []);

  /* The ledger follows the date. One event forward: glide up a row and type
     the new one. Several at once: jump to the final window and type only the
     newest. Backwards: re-render the earlier window, no animation. Adjusted
     during render (not in an effect), so a day change is one commit. */
  const k = eventsBy(day);
  if (ledger.k !== k) {
    if (!live || k < ledger.k) setLedger({ k, glide: false, typing: 0 });
    else {
      /* A second event landing mid-glide jumps instead of queueing. */
      const glide = k === ledger.k + 1 && k > geom.visible && !ledger.glide;
      setLedger({ k, glide, typing: k });
    }
  }
  useEffect(() => {
    if (!ledger.glide) return undefined;
    const id = window.setTimeout(() => setLedger((l) => ({ ...l, glide: false })), GLIDE_MS);
    return () => window.clearTimeout(id);
  }, [ledger]);

  /* Standings at the current day. Ties keep the previous order. */
  const standings = useMemo(() => standingsAt(day, prevOrderRef.current), [day]);
  const orderKey = standings.map((r) => r.name).join('|');
  useEffect(() => {
    prevOrderRef.current = standings.map((r) => r.name);
  }, [standings]);
  useFlip(standRef, orderKey, live);

  /* When "You" changes rank: a pulse on the rank cell and one polite
     announcement per change. Also adjusted during render: same commit. */
  const youRank = standings.find((r) => r.you).rank;
  if (rank.at !== youRank) {
    const moved = live && rank.at != null;
    setRank({
      at: youRank,
      pulse: moved ? rank.pulse + 1 : rank.pulse,
      note: moved ? `You moved to #${Number(youRank)}` : rank.note,
    });
  }

  /* The timeline ends on today: day 0 is DAYS days earlier, so the scroll
     starts in the past and the calendar stops on the visitor's own date. */
  const start = useMemo(() => (today ? addDays(today, -DAYS) : null), [today]);
  const date = useMemo(() => (start ? addDays(start, day) : null), [start, day]);
  const whenOf = (d) => (start ? fmtTick.format(addDays(start, d)) : '');

  const active = COHORTS[cohort];
  const visible = geom.visible;
  const leader = standings.find((r) => r.name === LEADER_NAME);
  const you = standings.find((r) => r.you);

  /* The ledger window: the last `visible` events landed by now, oldest on
     top. While gliding, the outgoing head row rides along above it. */
  const shownK = ledger.k;
  const winFrom = Math.max(0, shownK - visible - (ledger.glide ? 1 : 0));
  const ledgerRows = LEDGER_ROWS.slice(winFrom, shownK);
  const netRows = LEDGER_ROWS.slice(Math.max(0, shownK - visible), shownK);
  const net = netRows.reduce((s, r) => s + r.d, 0);

  return (
    <section className="sled-section sled" aria-labelledby="sled-heading">
      <div className="sled-inner">
        <div className="sled-head">
          <p className="section-eyebrow lf-mono">Social investing</p>
          <h2 id="sled-heading" className="sled-heading">
            Every move is on the record
          </h2>
          <p className="sled-sub">
            Add a friend and your ratings start writing themselves: wins, streaks and research, each
            one a line in the ledger.
          </p>
        </div>

        {/* ── the climb: pinned gauge, steps pop in left and right ── */}
        <AscentStage
          steps={ASCENT_STEPS}
          start={ASCENT_START}
          floor={ASCENT_FLOOR}
          ceiling={ASCENT_GOAL.min}
          ceilingLabel={`${ASCENT_GOAL.min} ${DOT} ${ASCENT_GOAL.name}`}
          nextTasks={NEXT_LEAGUE_TASKS}
        />

        {/* ── the board: chart | standings, ledger beneath, pinned in its
            runway on desktop while the date advances ── */}
        <div ref={runwayRef} className={`sled-board-runway${pinned ? ' is-pinned' : ''}`}>
          <div ref={boardRef} className="sled-board">
            <div className="sled-chartcol">
              <div className="sled-chart-head">
                <SocialFlipCalendar date={date} still={!live} />
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
              <div className="sled-chart-wide" ref={chartRef}>
                <RatingChart cohort={cohort} day={day} start={start} />
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
              <div className="sled-rows" ref={standRef}>
                {standings.map((p) => {
                  const neg = p.week < 0;
                  return (
                    <div
                      key={p.name}
                      data-flip={p.name}
                      className={`sled-tr sled-tr--stand sled-tr--flip${p.you ? ' sled-tr--you' : ''}`}
                    >
                      <span
                        key={p.you ? `r${rank.pulse}` : 'r'}
                        className={`sled-tile-rank${p.you && rank.pulse ? ' is-pulse' : ''}`}
                      >
                        {p.rank}
                      </span>
                      <span className="sled-tile-name">{p.name}</span>
                      <span
                        className={`sled-tile-delta${neg ? ' sled-tile-delta--down' : ' sled-tile-delta--up'}`}
                      >
                        {signed(p.week)}
                      </span>
                      <span className="sled-tile-elo sled-ta-r">{p.rating}</span>
                      <span className="sled-bar" aria-hidden="true">
                        <span className="sled-bar-tier">
                          {deriveTierState(p.rating).current.name}
                        </span>
                        <span className="sled-bar-track">
                          <span
                            className="sled-bar-fill"
                            style={{ width: `${barPct(p.rating)}%` }}
                          />
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="sled-sr" aria-live="polite">
                {rank.note}
              </p>
              <div className="sled-footrow">
                <span>6 members</span>
                <span className="sled-ta-r">{leader.rating - you.rating} to first</span>
              </div>
            </div>

            <div className="sled-sheet sled-ledgersheet">
              <div className="sled-sheet-head">The ledger</div>
              <div className="sled-tr sled-thead sled-tr--ledger">
                <span>Event</span>
                <span>Rating</span>
                <span className="sled-ta-r">When</span>
              </div>
              {/* The viewport clips; the track glides one row when an event
                  lands. aria-live is off on purpose: the date is the
                  visitor's own scroll, and the rows are all in the DOM. */}
              <div className="sled-viewport" ref={viewportRef}>
                <div className={`sled-track${ledger.glide ? ' is-gliding' : ''}`}>
                  {ledgerRows.length ? (
                    ledgerRows.map((ev, i) => {
                      const n = winFrom + i + 1;
                      const leaving = ledger.glide && i === 0;
                      const latest = n === shownK && live;
                      const typing = latest && ledger.typing === n;
                      return (
                        <div
                          key={ev.id}
                          className={[
                            'sled-tr',
                            'sled-tr--ledger',
                            'sled-tr--roll',
                            leaving && 'sled-tr--leaving',
                            latest && 'sled-tr--latest',
                            typing && 'sled-tr--typing',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className="sled-row-body">
                            <span className="sled-type">
                              <span className="sled-type-text">{ev.event}</span>
                              {typing ? <span className="sled-caret" aria-hidden="true" /> : null}
                            </span>
                          </span>
                          {/* The rating carries its own direction, a green arrow
                              up or a red arrow down between the two figures. */}
                          <span
                            className={`sled-num sled-rate${ev.d < 0 ? ' sled-rate--down' : ' sled-rate--up'}`}
                          >
                            <span>{ev.from}</span>
                            <i
                              className={`bi ${ev.d < 0 ? 'bi-arrow-down-right' : 'bi-arrow-up-right'} sled-rate-arrow`}
                              aria-hidden="true"
                            />
                            <span className="sled-sr">{ev.d < 0 ? 'fell to' : 'rose to'}</span>
                            <span className="sled-rate-to">{ev.to}</span>
                          </span>
                          <span className="sled-time sled-ta-r">{whenOf(ev.day)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="sled-tr sled-tr--ledger sled-tr--roll sled-tr--quiet">
                      <span className="sled-row-body">Season 4 starts</span>
                      <span className="sled-num sled-rate">{youAt(0)}</span>
                      <span className="sled-time sled-ta-r">{whenOf(0)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="sled-footrow">
                <span>
                  Net {signed(net)} {DOT} last {netRows.length}
                </span>
                <span className="sled-ta-r">Full ledger</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sled-foot">
          <p className="sled-foot-note">
            Ratings and standings shown here are illustrative sample data, not a live leaderboard
            and not investment advice.
          </p>
        </div>
      </div>
    </section>
  );
}

export default SocialLedgerSection;
