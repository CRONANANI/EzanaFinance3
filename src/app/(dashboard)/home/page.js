'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { TickerPerformanceChart } from '@/components/home/TickerPerformanceChart';
import { AddPortfolioModal } from '@/components/home/AddPortfolioModal';
import { EloSeasonCard } from '@/components/home/EloSeasonCard';
import { PortfolioSeriesMenu } from '@/components/home/PortfolioSeriesMenu';
import { DateSelector } from '@/components/ui/DateSelector';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useUpcomingEvents, formatEventDay } from '@/hooks/useUpcomingEvents';
import { useUserRelevanceSet } from '@/hooks/useUserRelevanceSet';
import { NewsCenter } from '@/components/home/NewsCenter';
import { WIRE_NAME } from '@/lib/home/news-center';
import './broadsheet.css';

// Canvas card, browser-only: its own chunk, so it stays out of /home's first load.
const ActivityDensityCard = dynamic(
  () => import('@/components/home/ActivityDensityCard').then((m) => m.ActivityDensityCard),
  { ssr: false, loading: () => <div className="adc-skel" aria-hidden="true" /> },
);

const INDEX_COLORS = {
  'S&P 500': '#94928a',
  NASDAQ: '#0e7c4f',
  'Russell 2K': '#7c3aed',
  'Dow Jones': '#d97706',
  VIX: '#ec4899',
  WTI: '#f97316',
  '10Y': '#06b6d4',
};
function indexColor(sym) {
  return INDEX_COLORS[sym] || '#6b7280';
}

const INDEX_API_KEYS = {
  'S&P 500': 'spx',
  NASDAQ: 'ixic',
  'Russell 2K': 'rut',
  'Dow Jones': 'dji',
  VIX: 'vix',
  WTI: 'wti',
  '10Y': 'tnx',
};

function indexHistoryPeriod(tf) {
  return tf === '5D' ? '7D' : tf;
}

function formatTickByRange(at, range) {
  const d = new Date(at);
  if (range === '1D') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (range === '5D' || range === '1W' || range === '1M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (range === '3M' || range === '6M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/* Schedule calendar (Band II aside) category metadata — colours/labels mirror the
   /api/market-data/upcoming-events feed so dots, chips and event accents
   stay consistent. */
const EVENT_CATEGORY_META = {
  earnings: { label: 'Earnings', color: 'var(--emerald)' },
  dividends: { label: 'Dividends', color: '#22c55e' },
  ipos: { label: 'IPOs', color: '#a855f7' },
  economic: { label: 'Economic', color: '#6366f1' },
  fed: { label: 'Economic', color: '#3b82f6' },
  'inside-the-capitol': { label: 'Capitol', color: '#f97316' },
  crypto: { label: 'Crypto', color: '#fbbf24' },
  commodity: { label: 'Commodities', color: '#84cc16' },
};

const EVENT_CATEGORY_FALLBACK_COLOR = '#94a3b8';

function eventCategoryColor(category) {
  return EVENT_CATEGORY_META[category]?.color ?? EVENT_CATEGORY_FALLBACK_COLOR;
}

/* Filter chips. Chips for categories with no events in the current window
   are hidden at render time so the row never implies a feed that isn't there. */
const SCHEDULE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'dividends', label: 'Dividends' },
  { key: 'ipos', label: 'IPOs' },
  { key: 'economic', label: 'Economic' },
  { key: 'inside-the-capitol', label: 'Capitol' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodity', label: 'Commodities' },
];

/* Default calendar legend shown before any events load / when none are in window. */
const DEFAULT_CAL_LEGEND = [
  { key: 'earnings', label: 'Earnings', color: 'var(--emerald)' },
  { key: 'dividends', label: 'Dividends', color: '#22c55e' },
  { key: 'ipos', label: 'IPOs', color: '#a855f7' },
  { key: 'economic', label: 'Economic', color: '#6366f1' },
  { key: 'inside-the-capitol', label: 'Capitol', color: '#f97316' },
];

/* Agenda under the calendar (Band II): how many events show before the
   "N more" line, and the short day label for each row. */
const AGENDA_LIMIT = 6;
function agendaDay(fullDate) {
  const [y, m, d] = String(fullDate || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const RANGE_BUTTONS = ['1D', '1W', '1M', '3M', '6M', '1Y', '3Y', '5Y', '10Y', 'ALL'];

function portfolioSeriesRange(tf) {
  if (tf === '5D') return '7D';
  return tf;
}

/* ═══ SESSION-ALIGNED CHART ═══
   The mock portfolio is valued every calendar day, index closes only exist
   on trading days, and the old merge matched them by exact date, so an
   index line started on its first session and stopped on its last. Like
   most brokerage and market-data charts, we plot one point per trading
   session (weekends and holidays dropped), carry the last known value
   forward across gaps, and rebase every line to the same anchor (the prior
   close) so they all start at 0%. */
const SESSION_CALENDAR_KEYS = ['spx', 'ixic', 'dji', 'rut'];
const NY_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function nyYmd(at) {
  return NY_DATE.format(new Date(at));
}

function isWeekdayYmd(ymd) {
  const wd = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return wd !== 0 && wd !== 6;
}

/** Last value on or before `ymd` in ascending [ymd, value] entries. */
function asOf(entries, ymd) {
  let lo = 0;
  let hi = entries.length - 1;
  let hit = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (entries[mid][0] <= ymd) {
      hit = entries[mid][1];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return hit;
}

function buildSessionAlignedChart({ portfolioPoints, indexSeries, activeKeys, extraSeries = [] }) {
  // Portfolio: last value per New York calendar day.
  const pfByDay = new Map();
  for (const p of portfolioPoints) {
    if (p?.at && Number.isFinite(p.value)) pfByDay.set(nyYmd(p.at), p.value);
  }
  const pf = [...pfByDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  // Session calendar: equity index trading days (anchor included).
  const sessionSet = new Set();
  for (const key of SESSION_CALENDAR_KEYS) {
    for (const pt of indexSeries[key] || []) {
      const ymd = pt.ymd || pt.date;
      if (ymd) sessionSet.add(ymd);
    }
  }
  let sessions = [...sessionSet].sort();
  // Clip the calendar to the portfolio window, keeping one prior session as
  // the anchor, so both share the same left edge.
  if (sessions.length && pf.length) {
    const firstPf = pf[0][0];
    let anchorIdx = -1;
    for (let i = 0; i < sessions.length && sessions[i] <= firstPf; i++) anchorIdx = i;
    if (anchorIdx > 0) sessions = sessions.slice(anchorIdx);
  }
  // No index data at all: fall back to weekdays the portfolio was valued on.
  if (!sessions.length) sessions = pf.map(([d]) => d).filter(isWeekdayYmd);
  if (!sessions.length) return [];

  const lastIdx = sessions.length - 1;
  const firstPfYmd = pf[0]?.[0];
  const pfValueAt = (ymd, i) => {
    if (!pf.length) return null;
    // Newest session carries the newest (live) value, so a weekend or
    // pre-open read ends on the same number as the headline.
    if (i === lastIdx) return pf[pf.length - 1][1];
    const v = asOf(pf, ymd);
    if (v != null) return v;
    // The anchor predates the first valuation only by the session gap.
    if (i === 0 && sessions[1] && firstPfYmd <= sessions[1]) return pf[0][1];
    return null;
  };

  const rows = sessions.map((ymd, i) => ({
    at: `${ymd}T12:00:00Z`,
    label: Date.parse(`${ymd}T12:00:00Z`),
    value: pfValueAt(ymd, i),
  }));

  const pfBase = rows.find((r) => r.value != null)?.value;
  for (const r of rows) {
    if (r.value != null && pfBase > 0) r.portfolio = ((r.value - pfBase) / pfBase) * 100;
  }

  // Extra portfolio or strategy lines (chart series menu): the same
  // carry-forward and anchor rules as every other line.
  for (const { key, points } of extraSeries) {
    const byDay = new Map();
    for (const p of points || []) {
      if (p?.at && Number.isFinite(p.value)) byDay.set(nyYmd(p.at), p.value);
    }
    const vals = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    if (!vals.length) continue;
    let base = null;
    for (const r of rows) {
      const v = asOf(vals, r.at.slice(0, 10));
      if (v == null) continue;
      if (base == null) base = v;
      if (base > 0) r[key] = ((v - base) / base) * 100;
    }
  }

  for (const key of activeKeys) {
    const closes = (indexSeries[key] || [])
      .map((pt) => [pt.ymd || pt.date, pt.close])
      .filter(([d, c]) => d && Number.isFinite(c))
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!closes.length) continue;
    let base = null;
    for (const r of rows) {
      const c = asOf(closes, r.at.slice(0, 10));
      if (c == null) continue;
      if (base == null) base = c;
      if (base) r[key] = ((c - base) / base) * 100;
    }
  }
  return rows;
}

/* ═══ HELPERS ═══ */
const fmtMoney = (n) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLongDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBriefLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'The Morning Brief';
  if (hour < 17) return 'The Afternoon Brief';
  return 'The Evening Brief';
}

/* Band header component (Bands I-V) */
function BandHeader({ number, label, meta, dark = false, centered = false }) {
  if (centered) {
    return (
      <div className={`bs-band-head bs-band-head--centered ${dark ? 'bs-band-head--dark' : ''}`}>
        <span className={`bs-band-num ${dark ? 'bs-band-num--dark' : ''}`}>{number}</span>
        <h2 className={`bs-band-label ${dark ? 'bs-band-label--dark' : ''}`}>{label}</h2>
        {meta ? (
          <span className={`bs-band-meta ${dark ? 'bs-band-meta--dark' : ''}`}>{meta}</span>
        ) : null}
      </div>
    );
  }
  return (
    <div className={`bs-band-head ${dark ? 'bs-band-head--dark' : ''}`}>
      <div className="bs-band-head-left">
        <span className={`bs-band-num ${dark ? 'bs-band-num--dark' : ''}`}>{number}</span>
        <h2 className={`bs-band-label ${dark ? 'bs-band-label--dark' : ''}`}>{label}</h2>
      </div>
      {meta ? (
        <span className={`bs-band-meta ${dark ? 'bs-band-meta--dark' : ''}`}>{meta}</span>
      ) : null}
    </div>
  );
}

/* Mini calendar: renders the current month with a coloured dot per event
   category on each day that has events (respecting the active filter). */
function MiniCalendar({
  cells,
  dayToCategories,
  today,
  monthTitle,
  legend,
  selection,
  onSelectDay,
}) {
  const inSel = (d) => selection && d >= selection.start && d <= selection.end;
  return (
    <div className="bs-cal-box">
      <div className="bs-cal-head">{monthTitle}</div>
      <div className="bs-cal-grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="bs-cal-dow">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="bs-cal-cell bs-cal-cell--empty" />;
          const cats = dayToCategories[d] || [];
          const isPast = d < today;
          const selected = inSel(d);
          const edge = selection && (d === selection.start || d === selection.end);
          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              aria-pressed={Boolean(selected)}
              aria-label={`${monthTitle.split(' ')[0]} ${d}${cats.length ? `, ${cats.length} event types` : ''}`}
              onClick={() => onSelectDay(d)}
              className={[
                'bs-cal-cell',
                d === today ? 'bs-cal-cell--today' : '',
                selected ? 'bs-cal-cell--in-range' : '',
                edge ? 'bs-cal-cell--sel' : '',
                isPast ? 'bs-cal-cell--past' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {d}
              {cats.length > 0 && (
                <span className="bs-cal-dots">
                  {cats.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="bs-cal-dot"
                      style={{
                        position: 'static',
                        transform: 'none',
                        background: eventCategoryColor(cat),
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="bs-cal-hint">Select a day, or two days for a range.</p>
      <div className="bs-cal-legend">
        {legend.map((c) => (
          <div key={c.key} className="bs-cal-leg-item">
            <span className="bs-cal-leg-dot" style={{ background: c.color }} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isOrgUser, orgData } = useOrg();

  // Being a member of an org must NOT trap the user in the org app — membership
  // ("is a member of some org") is not the same as "wants the org app right now."
  // So the regular home no longer force-redirects org members to Team Hub; it
  // instead offers a dismissible one-click bridge (banner below). Org members who
  // want the org app enter via org login, or click "Open Team Hub".
  const [teamHubBannerDismissed, setTeamHubBannerDismissed] = useState(false);
  const {
    connected: plaidConnected,
    summary: plaidSummary,
    refresh: refreshPlaidSummary,
  } = usePlaidPortfolioSummary();
  const [timeframe, setTimeframe] = useState('1W');
  const seriesRange = portfolioSeriesRange(timeframe);

  // ─── Schedule calendar (Band II aside): live, now-anchored events ─
  // Personalised feed (today → end of month) from the shared upcoming-events
  // route; replaces the old hardcoded May events + static calendar.
  const scheduleRelevance = useUserRelevanceSet();
  const { events: liveScheduleEvents, isLoading: scheduleLoading } = useUpcomingEvents({
    relevance: scheduleRelevance,
  });
  const [eventFilter, setEventFilter] = useState('all');
  const [calSel, setCalSel] = useState(null); // { start, end } day-of-month numbers
  const selectCalendarDay = useCallback((day) => {
    setCalSel((prev) => {
      if (!prev || prev.start !== prev.end) return { start: day, end: day };
      if (prev.start === day) return null;
      return { start: Math.min(prev.start, day), end: Math.max(prev.start, day) };
    });
  }, []);

  const scheduleData = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    // Monday-first grid (matches the Mo…Su day-of-week header).
    const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const todayDay = now.getDate();
    const todayMidnight = new Date(y, m, todayDay, 0, 0, 0);
    // "Upcoming week" window for the event list — today through +7 days.
    const weekEnd = new Date(y, m, todayDay + 7, 23, 59, 59);
    // A calendar selection (one day, or a range) replaces the 7-day window.
    const selStart = calSel ? new Date(y, m, calSel.start, 0, 0, 0) : null;
    const selEnd = calSel ? new Date(y, m, calSel.end, 23, 59, 59) : null;

    const parseDay = (ev) => {
      if (!ev?.fullDate) return null;
      const [ey, em, ed] = String(ev.fullDate).slice(0, 10).split('-').map(Number);
      if (!ey || !em || !ed) return null;
      return new Date(ey, em - 1, ed);
    };

    // Defensive client-side window check — never paint a stale past date.
    const inWindow = (liveScheduleEvents || []).filter((ev) => {
      const d = parseDay(ev);
      return d && d >= todayMidnight;
    });

    const matchesFilter = (ev) => eventFilter === 'all' || ev.category === eventFilter;

    // Calendar dots: every day this month that has a (filter-matching) event,
    // tagged with each distinct category so the dots are colour-coded.
    const dayToCategories = {};
    inWindow.filter(matchesFilter).forEach((ev) => {
      const d = parseDay(ev);
      if (!d || d.getMonth() !== m || d.getFullYear() !== y) return;
      const day = d.getDate();
      dayToCategories[day] ??= [];
      const cat = ev.category || ev.type;
      if (cat && !dayToCategories[day].includes(cat)) dayToCategories[day].push(cat);
    });

    // Event list: filter-matching events within the next 7 days, grouped by day.
    const groupMap = new Map();
    for (const ev of inWindow) {
      if (!matchesFilter(ev)) continue;
      const d = parseDay(ev);
      if (!d) continue;
      if (calSel) {
        if (d < selStart || d > selEnd) continue;
      } else if (d > weekEnd) {
        continue;
      }
      const key = String(ev.fullDate).slice(0, 10);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(ev);
    }
    const dayGroups = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, items]) => ({ day, label: formatEventDay(day), items }));

    const categoriesWithEvents = new Set(inWindow.map((ev) => ev.category));
    const legend = DEFAULT_CAL_LEGEND.filter((c) => categoriesWithEvents.has(c.key));

    const fmtDay = (day) =>
      new Date(y, m, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const selectionLabel = calSel
      ? calSel.start === calSel.end
        ? fmtDay(calSel.start)
        : `${fmtDay(calSel.start)} to ${fmtDay(calSel.end)}`
      : null;

    return {
      selectionLabel,
      cells,
      today: todayDay,
      monthTitle: new Date(y, m, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      dayToCategories,
      dayGroups,
      categoriesWithEvents,
      legend: legend.length ? legend : DEFAULT_CAL_LEGEND,
      totalWeek: dayGroups.reduce((n, g) => n + g.items.length, 0),
      totalWindow: inWindow.length,
    };
  }, [liveScheduleEvents, eventFilter, calSel]);

  // Agenda under the calendar: the same window as the calendar selection.
  const agendaItems = useMemo(
    () => scheduleData.dayGroups.flatMap((g) => g.items),
    [scheduleData.dayGroups],
  );

  const availableScheduleFilters = useMemo(
    () =>
      SCHEDULE_FILTERS.filter(
        (f) => f.key === 'all' || scheduleData.categoriesWithEvents.has(f.key),
      ),
    [scheduleData.categoriesWithEvents],
  );

  // If the active filter's category drops out of the window, snap back to All.
  useEffect(() => {
    if (eventFilter === 'all') return;
    if (!availableScheduleFilters.some((f) => f.key === eventFilter)) {
      setEventFilter('all');
    }
  }, [availableScheduleFilters, eventFilter]);
  const {
    points: valueSeriesDisplayPoints,
    dataForCurrentRange,
    isLoading: valueSeriesLoading,
    error: valueSeriesError,
  } = usePortfolioValueSeries(seriesRange);

  const [indices, setIndices] = useState([]);
  const [sectorData, setSectorData] = useState({ top: [], bottom: [] });
  const [sectorLoaded, setSectorLoaded] = useState(false);
  const [sectorEmpty, setSectorEmpty] = useState(false);
  const [activeIndices, setActiveIndices] = useState(new Set(['S&P 500']));
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [indexSeries, setIndexSeries] = useState({});
  const [indexSeriesLoading, setIndexSeriesLoading] = useState(false);
  const [pulseRange, setPulseRange] = useState('1D');
  const [tickerModal, setTickerModal] = useState(null);
  const [tickerModalRange, setTickerModalRange] = useState('1M');
  const [addPortfolioOpen, setAddPortfolioOpen] = useState(false);

  const mock = useMockPortfolio();
  const useMock = mock.hasMockPortfolio;

  /* Chart series menu (Nov 10 2026): lines the user can plot beside the main
     portfolio. The mock portfolio is its own line only when a brokerage is
     linked; otherwise the main line already is the mock portfolio. Saved
     strategies join `chartSources` once they are stored per user. */
  const mockIsExtra = useMock && plaidConnected;
  const [extraSeriesOn, setExtraSeriesOn] = useState(() => new Set());
  const [mockSeries, setMockSeries] = useState({ points: [], loading: false });
  const mockSeriesOn = mockIsExtra && extraSeriesOn.has('mock');
  const toggleExtraSeries = useCallback((id) => {
    setExtraSeriesOn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  useEffect(() => {
    if (!mockSeriesOn) return undefined;
    let cancelled = false;
    setMockSeries((s) => ({ ...s, loading: true }));
    fetch(`/api/portfolio/mock-value-series?range=${encodeURIComponent(seriesRange)}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setMockSeries({ points: Array.isArray(d?.points) ? d.points : [], loading: false });
      })
      .catch(() => {
        if (!cancelled) setMockSeries({ points: [], loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [mockSeriesOn, seriesRange]);
  const extraChartSeries = useMemo(
    () =>
      mockSeriesOn
        ? [
            {
              key: 'mock',
              label: 'Mock Portfolio',
              color: 'var(--chart-cat-3)',
              points: mockSeries.points,
            },
          ]
        : [],
    [mockSeriesOn, mockSeries.points],
  );
  const chartSources = useMemo(() => {
    if (!mockIsExtra) return [];
    const pts = mockSeries.points;
    const first = pts[0]?.value;
    const last = pts[pts.length - 1]?.value;
    const pct =
      mockSeriesOn && pts.length > 1 && first > 0 ? fmtPct(((last - first) / first) * 100) : null;
    return [
      {
        id: 'mock',
        group: 'portfolio',
        label: 'Mock Portfolio',
        color: 'var(--chart-cat-3)',
        pct,
        loading: mockSeriesOn && mockSeries.loading,
      },
    ];
  }, [mockIsExtra, mockSeriesOn, mockSeries]);

  const currentValue = useMock
    ? mock.totalValue
    : plaidConnected
      ? (plaidSummary?.totalValue ?? null)
      : null;

  const valueWindowFromApi = useMemo(() => {
    const d = dataForCurrentRange;
    if (!d || d.length < 1) return null;
    const liveLast = Number.isFinite(currentValue) ? currentValue : d[d.length - 1].value;
    if (d.length < 2) return { last: liveLast, changeAbs: 0, changePct: 0 };
    const first = d[0].value;
    const last = liveLast;
    return {
      last,
      changeAbs: last - first,
      changePct: first > 0 ? ((last - first) / first) * 100 : 0,
    };
  }, [dataForCurrentRange, currentValue]);

  const sparklinePoints = useMemo(() => {
    const pts = valueSeriesDisplayPoints;
    if (!pts?.length || !Number.isFinite(currentValue)) return pts;
    const i = pts.length - 1;
    const lastPt = pts[i];
    if (Math.abs((lastPt?.value ?? 0) - currentValue) < 0.01) return pts;
    return [...pts.slice(0, -1), { ...lastPt, value: currentValue }];
  }, [valueSeriesDisplayPoints, currentValue]);

  const combinedChartData = useMemo(() => {
    // Every range except 1D plots on a trading-session axis (weekends and
    // market holidays dropped), with all lines rebased to the same anchor.
    if (timeframe !== '1D') {
      return buildSessionAlignedChart({
        portfolioPoints: sparklinePoints || [],
        indexSeries,
        activeKeys: [...activeIndices].map((l) => INDEX_API_KEYS[l]).filter(Boolean),
        extraSeries: extraChartSeries,
      });
    }
    const portfolioPts = (sparklinePoints || []).map((p) => ({
      at: p.at,
      label: new Date(p.at).getTime(),
      value: p.value,
    }));
    const portfolioBase = portfolioPts[0]?.value || 0;

    let out;
    if (portfolioPts.length > 0) {
      out = portfolioPts.map((p) => ({
        ...p,
        portfolio: portfolioBase > 0 ? ((p.value - portfolioBase) / portfolioBase) * 100 : 0,
      }));
    } else {
      const dateSet = new Set();
      for (const label of activeIndices) {
        const apiKey = INDEX_API_KEYS[label];
        if (!apiKey) continue;
        const series = indexSeries[apiKey] || [];
        for (const pt of series) {
          const ymd = pt.ymd || pt.date;
          if (ymd) dateSet.add(ymd);
        }
      }
      const sortedDates = [...dateSet].sort();
      out = sortedDates.map((ymd) => ({
        at: new Date(ymd + 'T12:00:00Z').toISOString(),
        label: new Date(ymd + 'T12:00:00Z').getTime(),
      }));
    }

    for (const label of activeIndices) {
      const apiKey = INDEX_API_KEYS[label];
      if (!apiKey) continue;
      const series = indexSeries[apiKey] || [];
      if (!series.length) continue;
      const lookup = new Map(series.map((pt) => [pt.ymd || pt.date, pt.pct]));
      for (const row of out) {
        const dateKey = new Date(row.at).toISOString().slice(0, 10);
        const pct = lookup.get(dateKey);
        if (typeof pct === 'number') row[apiKey] = pct;
      }
    }
    // 1D: extra lines are matched by time, last value carried forward.
    for (const { key, points } of extraChartSeries) {
      const vals = (points || [])
        .filter((p) => p?.at && Number.isFinite(p.value))
        .map((p) => [new Date(p.at).getTime(), p.value])
        .sort((a, b) => a[0] - b[0]);
      let base = null;
      for (const row of out) {
        const v = asOf(vals, row.label);
        if (v == null) continue;
        if (base == null) base = v;
        if (base > 0) row[key] = ((v - base) / base) * 100;
      }
    }
    return out;
  }, [sparklinePoints, activeIndices, indexSeries, timeframe, extraChartSeries]);

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'there';

  const displayValue = Number.isFinite(currentValue) ? currentValue : 0;
  const changePct = valueWindowFromApi?.changePct ?? 0;
  const changeAbs = valueWindowFromApi?.changeAbs ?? 0;

  useEffect(() => {
    let cancelled = false;
    const period = indexHistoryPeriod(timeframe);
    setIndexSeriesLoading(true);
    // Daily closes plus a prior-close anchor, so every line can be rebased to
    // the same session. 1D stays on the legacy shape.
    const granularity = timeframe === '1D' ? '' : '&granularity=daily';
    fetch(`/api/market/index-history?period=${period}${granularity}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.indices) return;
        const out = {};
        for (const [k, v] of Object.entries(json.indices)) {
          out[k] = Array.isArray(v?.series) ? v.series : [];
        }
        setIndexSeries(out);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIndexSeriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  useEffect(() => {
    if (!indexSeries || Object.keys(indexSeries).length === 0) return;
    setIndices((prev) =>
      prev.map((row) => {
        const apiKey = INDEX_API_KEYS[row.sym];
        const series = indexSeries[apiKey];
        if (!series || !series.length) return row;
        const last = series[series.length - 1];
        const first = series[0];
        const lastPrice = last?.close ?? 0;
        const pct = (last?.pct ?? 0) - (first?.pct ?? 0);
        return {
          ...row,
          last: lastPrice.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          chg: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
          up: pct >= 0,
        };
      }),
    );
  }, [indexSeries]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/market/batch-quotes?symbols=SPY,QQQ,IWM,DIA,VIXY,USO,IEF');
        if (!res.ok) return;
        const data = await res.json();
        const quotes = data.quotes || {};
        const map = [
          { sym: 'S&P 500', key: 'SPY' },
          { sym: 'NASDAQ', key: 'QQQ' },
          { sym: 'Russell 2K', key: 'IWM' },
          { sym: 'Dow Jones', key: 'DIA' },
          { sym: 'VIX', key: 'VIXY' },
          { sym: 'WTI', key: 'USO' },
          { sym: '10Y', key: 'IEF' },
        ];
        if (!cancelled) {
          setIndices(
            map.map((m) => {
              const q = quotes[m.key];
              if (!q) return { sym: m.sym, last: '–', chg: '–', up: false };
              const price = q.price ?? q.regularMarketPrice ?? 0;
              const chgPct = q.changePercent ?? q.regularMarketChangePercent ?? 0;
              return {
                sym: m.sym,
                last: price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                chg: `${chgPct >= 0 ? '+' : ''}${chgPct.toFixed(2)}%`,
                up: chgPct >= 0,
              };
            }),
          );
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSectorLoaded(false);
    (async () => {
      try {
        const res = await fetch(`/api/fmp/sector-performance?range=${pulseRange}`);
        if (!res.ok) return;
        const json = await res.json();
        const rows = Array.isArray(json?.sectors)
          ? json.sectors
          : Array.isArray(json?.data)
            ? json.data
            : [];
        const degraded = Boolean(json?.degraded);
        const sectors = rows
          .map((s) => ({ name: s.name || s.sector, chg: Number(s.changePct ?? 0) }))
          .sort((a, b) => b.chg - a.chg);
        if (!cancelled) {
          const empty = degraded || sectors.length === 0;
          setSectorEmpty(empty);
          setSectorData(
            empty
              ? { top: [], bottom: [] }
              : {
                  top: sectors.filter((s) => s.chg > 0).slice(0, 5),
                  bottom: sectors
                    .filter((s) => s.chg <= 0)
                    .slice(-5)
                    .reverse(),
                },
          );
          setSectorLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setSectorEmpty(true);
          setSectorLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pulseRange]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      refreshPlaidSummary();
      window.history.replaceState({}, '', '/home');
    }
  }, [refreshPlaidSummary]);

  return (
    <div className="bs-shell">
      {/* ═══ YOUR ACTIVITY (Nov 2026) ═══
          First thing under the top nav: a year of the user's activity on
          Ezana (a login is the base colour; more activity, deeper colour).
          Replaces the ticker marquee. Loaded on its own chunk so it stays
          out of /home's first load. */}
      <section className="bs-band bs-band--light bs-band--activity">
        <div className="bs-page-inner">
          {/* Masthead (Nov 10 2026): the greeting is the page headline, on
              the logo's left edge, with the date on the logout edge. The
              activity summary below reads as its subline. */}
          <header className="bs-masthead">
            <h1 className="bs-hero-greet">
              {getGreeting()}, {firstName}.
            </h1>
            <span className="bs-masthead-date">{formatLongDate()}</span>
          </header>
          <ActivityDensityCard />
        </div>
      </section>

      {/* Opt-in bridge to the org app — shown to org members, never coercive.
          Replaces the old auto-redirect so members can use the regular app. */}
      {isOrgUser && !teamHubBannerDismissed && (
        <div className="bs-orgbridge" role="status">
          <span className="bs-orgbridge-text">
            You&apos;re a member of {orgData?.name || 'your investment council'}.
          </span>
          <Link href="/org-team-hub" className="bs-orgbridge-cta">
            Open Team Hub →
          </Link>
          <button
            type="button"
            className="bs-orgbridge-x"
            aria-label="Dismiss"
            onClick={() => setTeamHubBannerDismissed(true)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ═══ BAND 0 — HERO ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <div className="bs-hero-row">
            <div className="bs-hero-l">
              <div className="bs-hero-r-head">
                <div className="bs-section-label">
                  {isOrgUser && orgData?.name ? `${orgData.name} portfolio` : 'My Portfolio'}
                </div>
                <button
                  type="button"
                  className="bs-add-portfolio-btn"
                  onClick={() => setAddPortfolioOpen(true)}
                >
                  + Add Portfolio
                </button>
              </div>
              <div className="bs-hero-num">{fmtMoney(displayValue)}</div>
              <div className="bs-hero-delta-row">
                <span className={`bs-hero-pos ${changePct >= 0 ? '' : 'bs-hero-pos--neg'}`}>
                  {fmtPct(changePct)}
                </span>
                <span className="bs-hero-abs">
                  {changeAbs >= 0 ? '+' : ''}
                  {fmtMoney(Math.abs(changeAbs))} · today
                </span>
              </div>
              <div className="bs-hero-stats">
                {[
                  ['1W', '+8.42%'],
                  ['1M', '+12.10%'],
                  ['YTD', '+24.7%'],
                  ['Beta', '1.08'],
                ].map(([l, v]) => (
                  <div key={l} className="bs-hero-stat">
                    <div className="bs-hero-stat-label">{l}</div>
                    <div className="bs-hero-stat-val">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bs-hero-r">
              <EloSeasonCard userId={user?.id} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND I — LATELY ON EZANA ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <div className="bs-chart-block">
            <div className="bs-chart-range-row">
              <DateSelector
                ranges={RANGE_BUTTONS}
                value={timeframe}
                onChange={setTimeframe}
                size="lg"
              />
            </div>

            <div className="bs-chart-wide">
              {valueSeriesLoading || indexSeriesLoading ? (
                <div className="bs-chart-loading">Loading chart…</div>
              ) : combinedChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={combinedChartData}>
                    <defs>
                      <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--bs-green)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--bs-green)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray={CHART.gridDash}
                      stroke="var(--bs-border-subtle)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="at"
                      tick={{ fill: 'var(--bs-text-label)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--bs-border-rule)' }}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={60}
                      tickFormatter={(at) => formatTickByRange(at, timeframe)}
                    />
                    <YAxis
                      tick={{ fill: 'var(--bs-text-label)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'}
                      width={55}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="bs-chart-tooltip">
                            <div className="bs-chart-tooltip-date">
                              {formatTickByRange(p.at, timeframe)}
                            </div>
                            {payload.map((entry) => (
                              <div
                                key={entry.dataKey}
                                className="bs-chart-tooltip-val"
                                style={{ color: entry.stroke }}
                              >
                                {entry.name}:{' '}
                                {(entry.value >= 0 ? '+' : '') + entry.value.toFixed(2)}%
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    {showPortfolio && (
                      <Area
                        type="monotone"
                        dataKey="portfolio"
                        name="Portfolio"
                        stroke="var(--bs-green)"
                        strokeWidth={2}
                        fill="url(#portfolioFill)"
                        isAnimationActive
                        animationDuration={CHART.animationDuration}
                      />
                    )}
                    {extraChartSeries.map((s) => (
                      <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={2}
                        fill="transparent"
                        isAnimationActive={false}
                        connectNulls
                      />
                    ))}
                    {Array.from(activeIndices).map((label) => {
                      const apiKey = INDEX_API_KEYS[label];
                      if (!apiKey) return null;
                      return (
                        <Area
                          key={apiKey}
                          type="monotone"
                          dataKey={apiKey}
                          name={label}
                          stroke={indexColor(label)}
                          strokeWidth={1.5}
                          fill="transparent"
                          isAnimationActive={false}
                          connectNulls
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="bs-chart-loading">No data for this range</div>
              )}
            </div>

            <div className="bs-index-strip">
              {(() => {
                const hasPortfolio =
                  useMock || plaidConnected || (sparklinePoints?.length ?? 0) > 1;
                if (!hasPortfolio) {
                  return (
                    <button
                      type="button"
                      className="bs-index-chip bs-index-chip--portfolio"
                      onClick={() => setAddPortfolioOpen(true)}
                    >
                      <i className="bi bi-plus-lg" aria-hidden="true" />
                      <span>My Portfolio</span>
                      <span className="bs-index-chip-pct">Connect</span>
                    </button>
                  );
                }
                return (
                  <PortfolioSeriesMenu
                    label="My Portfolio"
                    pctLabel={fmtPct(changePct)}
                    pctUp={changePct >= 0}
                    primaryOn={showPortfolio}
                    onTogglePrimary={() => setShowPortfolio((v) => !v)}
                    sources={chartSources}
                    active={extraSeriesOn}
                    onToggleSource={toggleExtraSeries}
                    onAddPortfolio={() => setAddPortfolioOpen(true)}
                    hasMockPortfolio={useMock}
                  />
                );
              })()}
              {indices.map((idx) => {
                const isOn = activeIndices.has(idx.sym);
                return (
                  <button
                    key={idx.sym}
                    type="button"
                    className={`bs-index-chip ${isOn ? 'bs-index-chip--active' : ''}`}
                    aria-pressed={isOn}
                    onClick={() =>
                      setActiveIndices((prev) => {
                        const next = new Set(prev);
                        if (next.has(idx.sym)) next.delete(idx.sym);
                        else next.add(idx.sym);
                        return next;
                      })
                    }
                  >
                    <span
                      className="bs-index-chip-dot"
                      style={{
                        background: isOn ? indexColor(idx.sym) : 'var(--bs-border-rule)',
                      }}
                    />
                    <span>{idx.sym}</span>
                    <span
                      className="bs-index-chip-pct"
                      style={{
                        color: isOn ? 'inherit' : idx.up ? 'var(--bs-green)' : 'var(--bs-red)',
                      }}
                    >
                      {idx.chg}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND II: THE WIRE (News Center) ═══
          Echo articles, market news and community posts ranked by the
          reader's interests; the schedule calendar sits top right. */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <BandHeader number="II" label={WIRE_NAME} meta="Echo · news · community" />
          <NewsCenter
            tickers={scheduleRelevance.tickers}
            aside={
              <>
                <MiniCalendar
                  cells={scheduleData.cells}
                  dayToCategories={scheduleData.dayToCategories}
                  today={scheduleData.today}
                  monthTitle={scheduleData.monthTitle}
                  legend={[]}
                  selection={calSel}
                  onSelectDay={selectCalendarDay}
                />
                <div
                  className="bs-sched-filters"
                  role="tablist"
                  aria-label="Filter calendar by event category"
                >
                  {availableScheduleFilters.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={eventFilter === f.key}
                      className={`bs-sched-chip${eventFilter === f.key ? ' is-active' : ''}`}
                      onClick={() => setEventFilter(f.key)}
                    >
                      {f.key !== 'all' && (
                        <span
                          className="bs-sched-chip-dot"
                          style={{ background: eventCategoryColor(f.key) }}
                        />
                      )}
                      {f.label}
                    </button>
                  ))}
                </div>
                <div>
                  <div className="nwc-agenda-head">
                    <span className="nwc-agenda-title" role="status">
                      {scheduleData.selectionLabel || 'Next 7 days'}
                    </span>
                    {calSel && (
                      <button
                        type="button"
                        className="nwc-agenda-clear"
                        onClick={() => setCalSel(null)}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {scheduleLoading && scheduleData.totalWindow === 0 ? (
                    <p className="nwc-agenda-note">Loading upcoming events…</p>
                  ) : agendaItems.length === 0 ? (
                    <p className="nwc-agenda-note">
                      {calSel
                        ? calSel.start === calSel.end
                          ? `No events on ${scheduleData.selectionLabel}.`
                          : `No events between ${scheduleData.selectionLabel}.`
                        : 'No upcoming events in the next week. Releases for your region and events for the companies, politicians and assets you follow will appear here.'}
                    </p>
                  ) : (
                    <>
                      <ul className="nwc-agenda">
                        {agendaItems.slice(0, AGENDA_LIMIT).map((ev) => (
                          <li
                            key={ev.id}
                            className="nwc-agenda-item"
                            style={{
                              '--nwc-ev-color': ev.color || eventCategoryColor(ev.category),
                            }}
                            title={[ev.title, ev.subtitle, ev.time].filter(Boolean).join(' · ')}
                          >
                            <span className="nwc-agenda-dot" aria-hidden="true" />
                            <span className="nwc-agenda-when">{agendaDay(ev.fullDate)}</span>
                            <span className="nwc-agenda-what">{ev.title}</span>
                          </li>
                        ))}
                      </ul>
                      {agendaItems.length > AGENDA_LIMIT && (
                        <p className="nwc-agenda-note">
                          {agendaItems.length - AGENDA_LIMIT} more. Select a day to narrow the list.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            }
          />
        </div>
      </section>

      {/* ═══ BAND III — MARKETS PULSE (dark) ═══ */}
      <section className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <BandHeader
            number="III"
            label="Markets pulse"
            meta={`S&P 500 GICS · ${
              {
                '1D': 'today',
                '1W': 'past week',
                '1M': 'past month',
                '3M': 'past 3 months',
                '6M': 'past 6 months',
                '1Y': 'past year',
                '3Y': 'past 3 years',
                '5Y': 'past 5 years',
                '10Y': 'past 10 years',
                ALL: 'all time',
                CUSTOM: 'custom range',
              }[pulseRange] || 'recent'
            }`}
            dark
          />
          <div className="bs-chart-range-row">
            <DateSelector
              ranges={RANGE_BUTTONS}
              value={pulseRange}
              onChange={setPulseRange}
              size="lg"
            />
          </div>
          <div className="bs-pulse-row">
            {sectorLoaded && sectorEmpty ? (
              <p className="bs-pulse-empty">No sector data yet</p>
            ) : null}
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Leaders</div>
              {(sectorData.top.length
                ? sectorData.top
                : sectorLoaded
                  ? []
                  : [{ name: 'Loading…', chg: 0 }]
              ).map((s) => (
                <div key={s.name} className="bs-pulse-line">
                  <span className="bs-pulse-name">{s.name}</span>
                  <div className="bs-pulse-bar">
                    <div
                      className="bs-pulse-bar-fill bs-pulse-bar-fill--up"
                      style={{ width: `${Math.min((Math.abs(s.chg) / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="bs-pulse-pct bs-pulse-pct--up">
                    {s.chg >= 0 ? '+' : ''}
                    {s.chg.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="bs-pulse-divider" />
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Laggards</div>
              {(sectorData.bottom.length
                ? sectorData.bottom
                : sectorLoaded
                  ? []
                  : [{ name: 'Loading…', chg: 0 }]
              ).map((s) => (
                <div key={s.name} className="bs-pulse-line">
                  <span className="bs-pulse-name">{s.name}</span>
                  <div className="bs-pulse-bar">
                    <div
                      className="bs-pulse-bar-fill bs-pulse-bar-fill--down"
                      style={{ width: `${Math.min((Math.abs(s.chg) / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="bs-pulse-pct bs-pulse-pct--down">
                    {s.chg >= 0 ? '+' : ''}
                    {s.chg.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COLOPHON ═══ */}
      <div className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <div className="bs-colophon">
            <span>EZANA · {formatBriefLabel()}</span>
            <span>
              Compiled{' '}
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/New_York',
              })}{' '}
              ET · next update 22:00 ET
            </span>
          </div>
        </div>
      </div>

      <AddPortfolioModal
        open={addPortfolioOpen}
        onClose={() => setAddPortfolioOpen(false)}
        onConnected={() => {
          setAddPortfolioOpen(false);
          refreshPlaidSummary();
        }}
      />

      {tickerModal && (
        <div className="bs-ticker-modal-overlay" onClick={() => setTickerModal(null)}>
          <div className="bs-ticker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bs-ticker-modal-head">
              <span className="bs-ticker-modal-sym">{tickerModal}</span>
              <button
                type="button"
                className="bs-ticker-modal-close"
                onClick={() => setTickerModal(null)}
              >
                ×
              </button>
            </div>
            <div className="bs-ticker-modal-ranges">
              <DateSelector
                ranges={RANGE_BUTTONS}
                value={tickerModalRange}
                onChange={setTickerModalRange}
                size="lg"
              />
            </div>
            <TickerPerformanceChart symbol={tickerModal} range={tickerModalRange} />
          </div>
        </div>
      )}
    </div>
  );
}
