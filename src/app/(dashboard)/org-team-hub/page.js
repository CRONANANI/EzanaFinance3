'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Presentation,
  LineChart,
  TrendingUp,
  ClipboardList,
  BookOpen,
  Video,
  Award,
  Star,
  Trophy,
  Shield,
  FileText,
  KeyRound,
  GraduationCap,
  Command,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import {
  MOCK_TEAM_PERFORMANCE,
  MOCK_FUND_PERFORMANCE,
  MOCK_FUND_SNAPSHOTS,
  MOCK_TASKS,
  getFundCalendar,
} from '@/lib/orgMockData';
import './team-hub-wire.css';

/* ── Team Hub destinations (the 14 sidebar shortcuts) ──────────────
   The `archive` slot is repurposed as "Team Permissions" (highlighted at the
   foot of the Tools group). The rest are split into two nav groups by id. */
const ACTIONS = [
  { id: 'org', label: 'Org Chart', Icon: Users, href: '/org-team-hub/org-chart' },
  { id: 'pitch', label: 'Pitch Pipeline', Icon: Presentation, href: '/org-team-hub/pitches' },
  { id: 'trading', label: 'Trading Desk', Icon: LineChart, href: '/org-trading' },
  {
    id: 'analytics',
    label: 'Fund Analytics',
    Icon: TrendingUp,
    href: '/org-team-hub/fund-analytics',
  },
  {
    id: 'assignments',
    label: 'Assignments',
    Icon: ClipboardList,
    href: '/org-team-hub/assignments',
  },
  {
    id: 'research',
    label: 'Research Library',
    Icon: BookOpen,
    href: '/org-team-hub/research-library',
  },
  { id: 'meetings', label: 'Meetings', Icon: Video, href: '/org-team-hub/meetings' },
  { id: 'recognition', label: 'Recognition', Icon: Award, href: '/org-team-hub/recognition' },
  { id: 'grades', label: 'Grades', Icon: Star, href: '/org-team-hub/grades' },
  { id: 'competitions', label: 'Competitions', Icon: Trophy, href: '/org-team-hub/competitions' },
  { id: 'cohorts', label: 'Cohorts', Icon: GraduationCap, href: '/org-team-hub/cohorts' },
  { id: 'compliance', label: 'Compliance', Icon: Shield, href: '/org-team-hub/compliance' },
  { id: 'reports', label: 'Reports', Icon: FileText, href: '/org-team-hub/reports' },
  {
    id: 'permissions',
    label: 'Team Permissions',
    Icon: KeyRound,
    href: '/org-team-hub/permissions',
  },
];
const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

// Synthetic "current page" nav item — Command Center is this page.
const NAV_CURRENT = {
  id: '__cc',
  label: 'Command Center',
  Icon: Command,
  href: '/org-team-hub',
};
const NAV_COMMAND_IDS = ['trading', 'analytics', 'assignments'];
const NAV_TOOL_IDS = [
  'org',
  'pitch',
  'research',
  'meetings',
  'recognition',
  'grades',
  'competitions',
  'cohorts',
  'compliance',
  'reports',
  'permissions',
];

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

/* ── Formatting helpers ───────────────────────────────────────── */
function fmtMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return `$${Math.round(Number(n)).toLocaleString('en-US')}`;
}
function fmtSignedPct(n, digits = 1) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}%`;
}
function initials(name) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
function monthLabel(dateStr, withDay = false) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const m = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  return withDay ? `${m} ${d.getUTCDate()}` : m;
}
function dueLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
}
// Compact mono date for the calendar strip: "APR 12".
function calChip(iso) {
  const d = new Date(iso);
  return d
    .toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}
// Turn a title like "VP of Operations" into the mono eyebrow "VP · OPERATIONS".
function roleEyebrow(title) {
  if (!title) return 'MEMBER';
  return title.toUpperCase().replace(/\s+OF\s+/g, ' · ');
}

/* ── Skeleton block ───────────────────────────────────────────── */
function Skel({ w = 80, h = 14, style }) {
  return (
    <span
      className="thw-skel"
      style={{ display: 'inline-block', width: w, height: h, ...style }}
      aria-hidden="true"
    />
  );
}

/* ── Live data: summary + digest + tasks in parallel ──────────── */
async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function useTeamHubData(enabled) {
  const [summary, setSummary] = useState(null);
  const [digest, setDigest] = useState(null);
  const [tasksData, setTasksData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reloadTasks = useCallback(async () => {
    const t = await fetchJson('/api/org/tasks').catch(() => null);
    if (t) setTasksData(t);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    (async () => {
      const [s, d, t] = await Promise.allSettled([
        fetchJson('/api/org/team-hub/summary'),
        fetchJson('/api/org/digest'),
        fetchJson('/api/org/tasks'),
      ]);
      if (!alive) return;
      setSummary(s.status === 'fulfilled' ? s.value : null);
      setDigest(d.status === 'fulfilled' ? d.value : null);
      setTasksData(t.status === 'fulfilled' ? t.value : null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { summary, digest, tasksData, loading, reloadTasks, setTasksData };
}

/* ── Fund-value chart (live snapshots, timeframe-switchable) ─────
   Timeframes: 1M / 3M / YTD / 1Y. sliceSnapshots re-scopes the series;
   1Y falls through to the 365-day window. */
const RANGES = ['1M', '3M', 'YTD', '1Y'];
const RANGE_DAYS = { '1M': 31, '3M': 92, '1Y': 365 };

function buildChart(cur, prev) {
  const W = 800;
  const H = 180;
  const padTop = 18;
  const padBot = 22;
  const all = prev ? [...cur, ...prev] : cur;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const xAt = (i, n) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const yAt = (v) => padTop + (1 - (v - min) / span) * (H - padTop - padBot);
  const toPath = (arr) =>
    arr
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, arr.length).toFixed(1)} ${yAt(v).toFixed(1)}`)
      .join(' ');
  const line = toPath(cur);
  return {
    line,
    area: `${line} L${W} ${H} L0 ${H} Z`,
    prevLine: prev ? toPath(prev) : null,
    lastX: xAt(cur.length - 1, cur.length),
    lastY: yAt(cur[cur.length - 1]),
    // Per-point viewBox coords for the hover crosshair / dot / tooltip.
    points: cur.map((v, i) => ({ x: xAt(i, cur.length), y: yAt(v) })),
    W,
    H,
  };
}

function fmtTipDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function sliceSnapshots(snapshots, range) {
  if (range === 'YTD') return snapshots;
  const cutoff = Date.now() - (RANGE_DAYS[range] || 365) * 86400000;
  const pts = snapshots.filter((s) => Date.parse(s.date) >= cutoff);
  return pts.length >= 2 ? pts : snapshots;
}

function FundChart({ snapshots, loading, showLabel = true }) {
  const [range, setRange] = useState('YTD');
  const [hover, setHover] = useState(null);
  const chartRef = useRef(null);

  const live = Array.isArray(snapshots) && snapshots.length >= 3 ? snapshots : null;
  const view = useMemo(() => {
    if (!live) return null;
    const pts = sliceSnapshots(live, range);
    const withDay = range === '1M';
    const cur = pts.map((p) => p.value);
    const bench = pts.map((p) => p.benchmarkValue);
    const prev = bench.every((b) => b != null && Number.isFinite(b)) ? bench : null;
    return {
      labels: pts.map((p) => monthLabel(p.date, withDay)),
      dates: pts.map((p) => p.date),
      cur,
      prev,
    };
  }, [live, range]);

  const months = useMemo(() => {
    if (!live || live.length < 2) return null;
    const ms = Date.parse(live[live.length - 1].date) - Date.parse(live[0].date);
    return Math.max(1, Math.round(ms / (30.44 * 86400000)));
  }, [live]);

  const geom = useMemo(() => (view ? buildChart(view.cur, view.prev) : null), [view]);

  // Reset the hover read-out whenever the range or underlying data changes.
  useEffect(() => {
    setHover(null);
  }, [range, live]);

  const updateHover = useCallback(
    (clientX) => {
      const el = chartRef.current;
      if (clientX == null || !el || !view || view.cur.length === 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      const fx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      setHover(Math.round(fx * (view.cur.length - 1)));
    },
    [view],
  );

  const hp = hover != null && geom && geom.points[hover] ? geom.points[hover] : null;
  const leftPct = hp ? (hp.x / geom.W) * 100 : 0;
  const topPct = hp ? (hp.y / geom.H) * 100 : 0;

  return (
    <div className="thw-chart-card">
      <div className={`thw-chart-head${showLabel ? '' : ' thw-chart-head--bare'}`}>
        {showLabel && (
          <span className="thw-chart-label">
            Fund value{months ? ` · trailing ${months} months` : ''}
          </span>
        )}
        <div className="thw-ranges" role="group" aria-label="Chart timeframe">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`thw-range${range === r ? ' active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div
        className="thw-chart"
        ref={chartRef}
        onMouseMove={(e) => updateHover(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => updateHover(e.touches[0]?.clientX)}
        onTouchMove={(e) => updateHover(e.touches[0]?.clientX)}
        onTouchEnd={() => setHover(null)}
      >
        {geom ? (
          <>
            <svg viewBox="0 0 800 180" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="thw-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.28)" />
                  <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                </linearGradient>
              </defs>
              <line
                x1="0"
                y1="45"
                x2="800"
                y2="45"
                stroke="rgba(16,185,129,0.06)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="90"
                x2="800"
                y2="90"
                stroke="rgba(16,185,129,0.06)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="135"
                x2="800"
                y2="135"
                stroke="rgba(16,185,129,0.06)"
                strokeWidth="1"
              />
              {geom.prevLine && (
                <path
                  d={geom.prevLine}
                  stroke="var(--chart-axis)"
                  strokeWidth="1.2"
                  strokeDasharray="3 5"
                  fill="none"
                  opacity="0.55"
                />
              )}
              <path d={geom.area} fill="url(#thw-fill)" />
              <path d={geom.line} stroke="var(--emerald)" strokeWidth="2" fill="none" />
              <circle cx={geom.lastX} cy={geom.lastY} r="3.5" fill="var(--emerald)" />
            </svg>
            {hp && (
              <>
                <div className="thw-chart-cross" style={{ left: `${leftPct}%` }} />
                <div className="thw-chart-dot" style={{ left: `${leftPct}%`, top: `${topPct}%` }} />
                <div
                  className="thw-chart-tip"
                  style={{ left: `${Math.min(91, Math.max(9, leftPct))}%` }}
                >
                  <span className="thw-chart-tip-val">{fmtMoney(view.cur[hover])}</span>
                  <span className="thw-chart-tip-date">{fmtTipDate(view.dates[hover])}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: '14px 4px' }}>
            {loading ? (
              <Skel w="100%" h={120} style={{ borderRadius: 10 }} />
            ) : (
              <p className="thw-empty">
                No fund snapshots yet — the chart fills in as daily snapshots are recorded from Fund
                Analytics.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="thw-axis">
        {(view?.labels || []).map((l, i) => (
          <span key={`${l}-${i}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Left sidebar — VP identity + Command / Tools nav ─────────── */
function SidebarNav({ identityName, identityTitle, onGo }) {
  const renderItem = (item) => {
    const Icon = item.Icon;
    const cls = [
      'thw-nav-item',
      item.id === NAV_CURRENT.id ? 'active' : '',
      item.id === 'permissions' ? 'highlight' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <button
        key={item.id}
        type="button"
        className={cls}
        aria-current={item.id === NAV_CURRENT.id ? 'page' : undefined}
        onClick={() => onGo(item.href)}
      >
        <Icon size={15} strokeWidth={1.8} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="thw-sidebar" aria-label="Team Hub navigation">
      <div className="thw-vp">
        <div className="thw-vp-avatar">{initials(identityName) || 'VP'}</div>
        <div className="thw-vp-meta">
          <div className="thw-vp-eyebrow">{roleEyebrow(identityTitle)}</div>
          <div className="thw-vp-name">{identityName}</div>
        </div>
      </div>

      <nav className="thw-nav-group" aria-label="Command">
        <div className="thw-nav-label">Command</div>
        {renderItem(NAV_CURRENT)}
        {NAV_COMMAND_IDS.map((id) => renderItem(ACTION_BY_ID[id]))}
      </nav>

      <nav className="thw-nav-group" aria-label="Tools">
        <div className="thw-nav-label">Tools</div>
        {NAV_TOOL_IDS.map((id) => renderItem(ACTION_BY_ID[id]))}
      </nav>
    </aside>
  );
}

/* ── Paged "This week in the fund" calendar strip ─────────────── */
const CAL_PER_PAGE = 5;
const CAL_GAP = 12; // px — must match .thw-cal-track gap

function CalendarStrip({ items, loading, onOpen, onOpenAll }) {
  const [page, setPage] = useState(0);
  const rows = items || [];
  const pages = Math.max(1, Math.ceil(rows.length / CAL_PER_PAGE));
  const lastPage = pages - 1;

  // Keep the page index inside bounds if the data length changes.
  useEffect(() => {
    setPage((p) => Math.min(Math.max(0, p), lastPage));
  }, [lastPage]);
  const clamped = Math.min(Math.max(0, page), lastPage);

  return (
    <section className="thw-cal" aria-label="This week in the fund">
      <div className="thw-cal-head">
        <div className="thw-cal-nav">
          <button
            type="button"
            className="thw-cal-arrow"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clamped === 0}
            aria-label="Previous week"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="thw-cal-arrow"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={clamped >= lastPage}
            aria-label="Next week"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          <span className="thw-cal-title">This week in the fund</span>
        </div>
        <button type="button" className="thw-link" onClick={onOpenAll}>
          Fund calendar <ArrowRight size={13} strokeWidth={2} />
        </button>
      </div>

      <div className="thw-cal-viewport">
        {loading ? (
          <div className="thw-cal-track" aria-hidden="true">
            {Array.from({ length: CAL_PER_PAGE }).map((_, i) => (
              <div key={i} className="thw-cal-card">
                <Skel w={52} h={11} />
                <div style={{ marginTop: 8 }}>
                  <Skel w="90%" h={12} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Skel w={40} h={10} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="thw-cal-track"
            style={{
              transform: `translateX(calc(-1 * ${clamped} * (100% + ${CAL_GAP}px)))`,
            }}
          >
            {rows.map((it) => (
              <button key={it.id} type="button" className="thw-cal-card" onClick={() => onOpen(it)}>
                <span className="thw-cal-date">{calChip(it.date)}</span>
                <span className="thw-cal-card-title">{it.title}</span>
                <span className="thw-cal-tag">{it.team}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Command Center hero — fund value + chart + my assignments ── */
function CommandHero({ fund, snapshots, tasksData, loading, onOpenTrading }) {
  // My open, due-dated assignments — live when present, else the mock universe.
  const liveAssign = (tasksData?.tasks || []).filter(
    (t) => t.mine && t.status !== 'completed' && t.due_date,
  );
  const assignSrc = liveAssign.length
    ? liveAssign
    : MOCK_TASKS.filter((t) => t.status !== 'completed' && t.due_date);
  const assignments = assignSrc.slice(0, 5).map((t) => ({
    id: t.id,
    title: t.title,
    due: dueLabel(t.due_date),
    urgent: t.priority === 'urgent',
  }));

  const returnPos = (fund?.return_pct ?? 0) >= 0;
  const alphaPos = (fund?.alpha_pct ?? 0) >= 0;

  return (
    <section className="thw-card thw-hero" aria-label="Command Center">
      <div className="thw-hero-left">
        <button
          type="button"
          className="thw-fund"
          onClick={onOpenTrading}
          aria-label="Open Trading Desk"
        >
          <span className="thw-fund-label">Fund value</span>
          <span className="thw-fund-value">
            {loading ? <Skel w={190} h={40} /> : fmtMoney(fund?.total_value)}
          </span>
          <span className="thw-fund-pills">
            <span className={`thw-pill ${returnPos ? 'pos' : 'neg'}`}>
              {fmtSignedPct(fund?.return_pct)} return
            </span>
            <span className={`thw-pill ${alphaPos ? 'pos' : 'neg'}`}>
              {fmtSignedPct(fund?.alpha_pct)} alpha
            </span>
            <span className="thw-pill mut">
              S&amp;P 500 {fmtSignedPct(fund?.benchmark_return_pct)}
            </span>
          </span>
        </button>
        <FundChart snapshots={snapshots} loading={loading} showLabel={false} />
      </div>

      <div className="thw-hero-right">
        <div className="thw-col-label">
          <ClipboardList size={12} strokeWidth={1.8} /> My assignments · due
        </div>
        <div className="thw-assign-list">
          {assignments.length === 0 ? (
            <span className="thw-empty" style={{ padding: 0 }}>
              Nothing due — you&apos;re clear.
            </span>
          ) : (
            assignments.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`thw-assign${a.urgent ? ' urgent' : ''}`}
                onClick={onOpenTrading}
                title={a.title}
              >
                <span className="thw-assign-title">{a.title}</span>
                <span className="thw-assign-due">{a.due}</span>
              </button>
            ))
          )}
        </div>
        <button type="button" className="thw-link thw-hero-cta" onClick={onOpenTrading}>
          Open Trading Desk <ArrowRight size={13} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}

/* ── Sector Desk — ROI leaderboard ────────────────────────────── */
function SectorDesk({ sectors, loading, onOpen }) {
  const fallback = useMemo(
    () =>
      [...MOCK_TEAM_PERFORMANCE]
        .sort((a, b) => b.ytd_return - a.ytd_return)
        .map((t) => ({
          teamId: t.team_id,
          name: t.team_name,
          roiPct: t.ytd_return,
          value: t.value,
          tickers: t.top_holdings.slice(0, 3),
        })),
    [],
  );

  const live = Array.isArray(sectors) && sectors.some((s) => s.value > 0) ? sectors : null;
  const rows = live || (loading ? [] : fallback);
  const topRoi = Math.max(0.0001, ...rows.map((r) => Math.abs(r.roiPct ?? 0)));

  return (
    <section className="thw-card thw-sectors" aria-label="Sector desk">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <TrendingUp size={15} strokeWidth={1.8} /> Sector desk
        </span>
        <span className="thw-section-meta">RANKED BY ROI</span>
      </div>
      <div className="thw-sector-rows">
        {loading && !live
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="thw-sector-row" aria-hidden="true">
                <Skel w={20} h={12} />
                <Skel w={130} h={13} />
                <Skel w="100%" h={8} style={{ borderRadius: 999 }} />
                <Skel w={54} h={13} />
              </div>
            ))
          : rows.map((s, i) => {
              const roi = s.roiPct ?? 0;
              const neg = roi < 0;
              const width = Math.max(4, Math.min(100, (Math.abs(roi) / topRoi) * 100));
              return (
                <button
                  key={s.teamId || s.name}
                  type="button"
                  className="thw-sector-row"
                  onClick={onOpen}
                >
                  <span className="thw-sector-rank">{i + 1}</span>
                  <span className="thw-sector-name">{s.name}</span>
                  <span className="thw-sector-bar">
                    <span
                      className={`thw-sector-fill${neg ? ' neg' : ''}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className={`thw-sector-roi${neg ? ' neg' : ''}`}>
                    {s.roiPct == null ? '—' : fmtSignedPct(roi)}
                  </span>
                  <span className="thw-sector-tkrs">
                    {(s.tickers || []).slice(0, 3).map((t) => (
                      <span key={t} className="thw-tkr">
                        {t}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
      </div>
    </section>
  );
}

/* ── Task management (live org_tasks with status progression) ─── */
const TASK_STATUS = {
  completed: { label: 'Completed', tone: 'positive' },
  in_progress: { label: 'In progress', tone: 'info' },
  review: { label: 'Review', tone: 'warning' },
  pending: { label: 'Pending', tone: 'warning' },
};
const STATUS_CYCLE = ['pending', 'in_progress', 'completed'];

function TaskManagement({ tasksData, loading, onStatusChange }) {
  const tasks = tasksData?.tasks || [];
  const openCount = tasksData?.openCount ?? 0;
  const canManage = Boolean(tasksData?.viewer?.canManage);

  const cycle = async (task) => {
    const idx = STATUS_CYCLE.indexOf(task.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] || 'in_progress';
    onStatusChange(task.id, next);
  };

  return (
    <section className="thw-card thw-tasks" aria-label="Tasks">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <ClipboardList size={15} strokeWidth={1.8} /> Task management
        </span>
        <span className="thw-section-meta">
          {loading ? <Skel w={44} h={10} /> : `${openCount} OPEN`}
        </span>
      </div>
      <div className="thw-card-body">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="thw-task" aria-hidden="true">
              <div className="thw-task-body" style={{ flex: 1 }}>
                <Skel w="76%" h={13} />
                <div style={{ marginTop: 5 }}>
                  <Skel w={110} h={10} />
                </div>
              </div>
              <Skel w={72} h={20} style={{ borderRadius: 999 }} />
            </div>
          ))}
        {!loading && tasks.length === 0 && (
          <p className="thw-empty">No tasks yet — managers can assign work from the task board.</p>
        )}
        {!loading &&
          tasks.slice(0, 7).map((t) => {
            const st = TASK_STATUS[t.status] || TASK_STATUS.pending;
            const done = t.status === 'completed';
            const meta = [t.priority, t.description].filter(Boolean).join(' · ');
            const interactive = t.mine || canManage;
            return (
              <div key={t.id} className={`thw-task${done ? ' done' : ''}`}>
                <div className="thw-task-body">
                  <div className="thw-task-title">{t.title}</div>
                  {meta && (
                    <div className="thw-task-meta" style={{ textTransform: 'capitalize' }}>
                      {meta}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`thw-badge thw-badge-${st.tone} thw-badge-btn`}
                  onClick={interactive ? () => cycle(t) : undefined}
                  disabled={!interactive}
                  title={interactive ? 'Click to advance status' : `Assigned to ${t.assignee_name}`}
                >
                  {st.label}
                </button>
              </div>
            );
          })}
      </div>
    </section>
  );
}

/* ── Deadlines (live: due-dated open tasks, overdue first) ────── */
const PRIORITY_TONE = { urgent: 'negative', high: 'info', medium: 'warning', low: 'positive' };

function Deadlines({ tasksData, loading, onOpenBoard }) {
  const rows = useMemo(() => {
    const tasks = (tasksData?.tasks || []).filter((t) => t.due_date && t.status !== 'completed');
    const overdue = tasks.filter((t) => t.overdue);
    const upcoming = tasks
      .filter((t) => !t.overdue)
      .sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date));
    return [...overdue, ...upcoming].slice(0, 4).map((t) => ({
      id: t.id,
      title: t.title,
      meta: t.overdue
        ? `Overdue · ${t.description || t.priority}`
        : `Due ${dueLabel(t.due_date)} · ${t.description || t.priority}`,
      tag: t.priority === 'urgent' || t.overdue ? 'Urgent' : t.priority,
      tone: t.overdue ? 'negative' : PRIORITY_TONE[t.priority] || 'info',
    }));
  }, [tasksData]);

  const overdueCount = tasksData?.overdueCount ?? 0;

  return (
    <section className="thw-card thw-deadlines" aria-label="Deadlines">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Clock size={15} strokeWidth={1.8} /> Deadlines
        </span>
        {loading ? (
          <Skel w={70} h={20} style={{ borderRadius: 999 }} />
        ) : overdueCount > 0 ? (
          <span className="thw-badge thw-badge-negative">{overdueCount} overdue</span>
        ) : (
          <span className="thw-section-meta">ON TRACK</span>
        )}
      </div>
      <div className="thw-card-body thw-deadlines-body">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }} aria-hidden="true">
              <Skel w="100%" h={52} style={{ borderRadius: 8 }} />
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <p className="thw-empty">No upcoming deadlines — nothing due.</p>
        )}
        {!loading &&
          rows.map((d) => (
            <div key={d.id} className="thw-deadline">
              <div className="thw-deadline-body">
                <div className="thw-deadline-title">{d.title}</div>
                <div className="thw-deadline-meta">
                  <Clock size={11} strokeWidth={1.8} />{' '}
                  <span style={{ textTransform: 'capitalize' }}>{d.meta}</span>
                </div>
              </div>
              <span
                className={`thw-badge thw-badge-${d.tone}`}
                style={{ textTransform: 'capitalize' }}
              >
                {d.tag}
              </span>
            </div>
          ))}
      </div>
      <div className="thw-card-foot">
        <button type="button" className="thw-link" onClick={onOpenBoard}>
          Open task board <ArrowRight size={12} strokeWidth={1.8} />
        </button>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function OrgTeamHubPage() {
  const router = useRouter();
  const { isOrgUser, orgRole, isLoading } = useOrg();
  const { summary, tasksData, loading, setTasksData } = useTeamHubData(
    Boolean(isOrgUser && !isLoading),
  );

  // Header search stub — no command palette exists; ⌘K just focuses the input.
  const searchRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Client-side failsafe: even if the org context misbehaves, never leave the
  // user on an infinite "Loading…" spinner. After 10s, offer a Retry path.
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoadTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, []);

  // Optimistic task-status updates backed by PATCH /api/org/tasks.
  const handleStatusChange = useCallback(
    async (taskId, nextStatus) => {
      let prevStatus = null;
      setTasksData((d) => {
        if (!d) return d;
        const tasks = d.tasks.map((t) => {
          if (t.id !== taskId) return t;
          prevStatus = t.status;
          return {
            ...t,
            status: nextStatus,
            overdue: nextStatus === 'completed' ? false : t.overdue,
          };
        });
        return {
          ...d,
          tasks,
          openCount: tasks.filter((t) => t.status !== 'completed').length,
          overdueCount: tasks.filter((t) => t.overdue && t.status !== 'completed').length,
        };
      });
      try {
        const res = await fetch('/api/org/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: taskId, status: nextStatus }),
        });
        if (!res.ok) throw new Error('PATCH failed');
      } catch {
        // Revert on failure.
        setTasksData((d) => {
          if (!d || prevStatus == null) return d;
          const tasks = d.tasks.map((t) => (t.id === taskId ? { ...t, status: prevStatus } : t));
          return {
            ...d,
            tasks,
            openCount: tasks.filter((t) => t.status !== 'completed').length,
          };
        });
      }
    },
    [setTasksData],
  );

  if (isLoading && !loadTimedOut) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading Team Hub…</div>;
  }
  if (isLoading && loadTimedOut) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        Team Hub is taking longer than expected to load.{' '}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginLeft: '0.5rem',
            padding: '0.375rem 0.875rem',
            border: '1px solid var(--emerald-border, rgba(16,185,129,0.4))',
            borderRadius: 8,
            background: 'var(--emerald-bg, rgba(16,185,129,0.1))',
            color: 'var(--emerald, #10b981)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        This page is for organizational members only.
      </div>
    );
  }

  const perf = summary?.performance || null;

  // Identity block — real viewer where available, else a sensible VP fallback.
  const identityName =
    summary?.viewer?.displayName || summary?.organization?.you?.name || 'Noah Raymond-Leigh';
  const identityTitle =
    summary?.viewer?.title ||
    summary?.organization?.you?.title ||
    ROLE_LABEL[orgRole] ||
    'VP of Operations';

  // Fund numbers + chart series + calendar: live summary when present, else the
  // mock Ezana Test University Fund so the demo is always populated.
  const fund = perf && perf.total_value ? perf : MOCK_FUND_PERFORMANCE;
  const fundSnapshots =
    Array.isArray(summary?.snapshots) && summary.snapshots.length >= 3
      ? summary.snapshots
      : MOCK_FUND_SNAPSHOTS;
  const calendarItems = getFundCalendar();

  return (
    <div className="thw-root">
      {/* The shared OrgHubNav rail is now provided by org-team-hub/layout.js. */}
      <main className="thw-main">
        <header className="thw-header">
          <div className="thw-header-lede">
            <div className="thw-eyebrow">Team Hub · Fall 2026</div>
            <h1 className="thw-h1">Command Center</h1>
          </div>
          <div className="thw-search" onClick={() => searchRef.current?.focus()}>
            <Search size={15} strokeWidth={1.8} />
            <input
              ref={searchRef}
              type="text"
              className="thw-search-input"
              placeholder="Jump to anything…"
              aria-label="Jump to anything"
            />
            <span className="thw-kbd">⌘K</span>
          </div>
        </header>

        <CalendarStrip
          items={calendarItems}
          loading={loading}
          onOpen={() => router.push('/org-team-hub/meetings')}
          onOpenAll={() => router.push('/org-team-hub/meetings')}
        />

        <CommandHero
          fund={fund}
          snapshots={fundSnapshots}
          tasksData={tasksData}
          loading={loading}
          onOpenTrading={() => router.push('/org-trading')}
        />

        <SectorDesk
          sectors={summary?.sectors}
          loading={loading}
          onOpen={() => router.push('/org-team-hub/fund-analytics')}
        />

        <div className="thw-bottom">
          <TaskManagement
            tasksData={tasksData}
            loading={loading}
            onStatusChange={handleStatusChange}
          />
          <Deadlines
            tasksData={tasksData}
            loading={loading}
            onOpenBoard={() => router.push('/org-team-hub/assignments')}
          />
        </div>
      </main>
    </div>
  );
}
