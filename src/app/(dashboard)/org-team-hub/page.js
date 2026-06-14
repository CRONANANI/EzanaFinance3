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
  Archive,
  GraduationCap,
  Search,
  Pin,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { MOCK_TEAM_PERFORMANCE } from '@/lib/orgMockData';
import './team-hub-wire.css';

/* ── Team Hub destinations (the 14 pinnable shortcuts) ─────────── */
const ACTIONS = [
  { id: 'org', label: 'Org Chart', Icon: Users, href: '/org-team-hub/org-chart' },
  { id: 'pitch', label: 'Pitch Pipeline', Icon: Presentation, href: '/org-team-hub/pitches' },
  { id: 'trading', label: 'Trading Desk', Icon: LineChart, href: '/org-trading' },
  { id: 'analytics', label: 'Fund Analytics', Icon: TrendingUp, href: '/org-team-hub/fund-analytics' },
  { id: 'assignments', label: 'Assignments', Icon: ClipboardList, href: '/org-team-hub/assignments' },
  { id: 'research', label: 'Research Library', Icon: BookOpen, href: '/org-team-hub/research-library' },
  { id: 'meetings', label: 'Meetings', Icon: Video, href: '/org-team-hub/meetings' },
  { id: 'recognition', label: 'Recognition', Icon: Award, href: '/org-team-hub/recognition' },
  { id: 'grades', label: 'Grades', Icon: Star, href: '/org-team-hub/grades' },
  { id: 'competitions', label: 'Competitions', Icon: Trophy, href: '/org-team-hub/competitions' },
  { id: 'cohorts', label: 'Cohorts', Icon: GraduationCap, href: '/org-team-hub/cohorts' },
  { id: 'compliance', label: 'Compliance', Icon: Shield, href: '/org-team-hub/compliance' },
  { id: 'reports', label: 'Reports', Icon: FileText, href: '/org-team-hub/reports' },
  { id: 'archive', label: 'Archive', Icon: Archive, href: '/org-team-hub/pitch-archive' },
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
function fmtCompactMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
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

/* ── Ticker tape (live wire from the weekly digest) ───────────── */
function buildTickerItems(digest) {
  if (!digest) return [];
  const out = [];
  for (const p of digest.newPitches || []) {
    out.push({ lbl: 'NEW PITCH', tone: 'in', t: p.ticker, detail: p.company_name });
  }
  for (const p of digest.positions || []) {
    out.push({
      lbl: 'POSITION',
      tone: 'em',
      t: p.ticker_symbol,
      pos: `+${Math.round(Number(p.shares) || 0)} SH`,
    });
  }
  for (const m of digest.movers || []) {
    const up = (m.alpha_pct ?? 0) >= 0;
    out.push({
      lbl: 'MOVER',
      tone: up ? 'em' : 'rd',
      t: m.ticker,
      [up ? 'pos' : 'neg']: `${up ? '+' : '−'}${Math.abs(m.alpha_pct).toFixed(1)}% ALPHA`,
    });
  }
  for (const r of digest.recognitions || []) {
    out.push({ lbl: 'RECOGNITION', tone: 'am', detail: `${r.title} — `, b: r.recipient_name });
  }
  for (const n of digest.notes || []) {
    out.push({ lbl: 'RESEARCH', tone: 'in', t: n.ticker || undefined, detail: n.title });
  }
  return out;
}

function Ticker({ digest, loading }) {
  const items = useMemo(() => buildTickerItems(digest), [digest]);
  // Hidden until live data arrives; with no weekly activity the wire stays off.
  if (loading || items.length === 0) return null;

  const renderItem = (it, key) => (
    <span key={key} className="thw-tick">
      <span className={`thw-lbl ${it.tone}`}>{it.lbl}</span>
      {it.t && <b>{it.t}</b>}
      {it.detail && <span>{it.detail}</span>}
      {it.b && <b>{it.b}</b>}
      {it.pos && <span className="pos">{it.pos}</span>}
      {it.neg && <span className="neg">{it.neg}</span>}
    </span>
  );

  return (
    <div className="thw-ticker" aria-label="This week in the fund — wire">
      <div className="thw-ticker-track">
        {items.map((it, i) => renderItem(it, `a-${i}`))}
        {items.map((it, i) => renderItem(it, `b-${i}`))}
      </div>
    </div>
  );
}

/* ── Hero fund-value chart (live snapshots, range-switchable) ─── */
const RANGES = ['1W', '1M', '3M', 'YTD'];
const RANGE_DAYS = { '1W': 7, '1M': 31, '3M': 92 };

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
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, arr.length).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
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

function FundChart({ snapshots, loading }) {
  const [range, setRange] = useState('YTD');
  const [hover, setHover] = useState(null);
  const chartRef = useRef(null);

  const live = Array.isArray(snapshots) && snapshots.length >= 3 ? snapshots : null;
  const view = useMemo(() => {
    if (!live) return null;
    const pts = sliceSnapshots(live, range);
    const withDay = range === '1W' || range === '1M';
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
      <div className="thw-chart-head">
        <span className="thw-chart-label">
          Fund value{months ? ` · trailing ${months} months` : ''}
        </span>
        <div className="thw-ranges">
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
            <line x1="0" y1="45" x2="800" y2="45" stroke="rgba(16,185,129,0.06)" strokeWidth="1" />
            <line x1="0" y1="90" x2="800" y2="90" stroke="rgba(16,185,129,0.06)" strokeWidth="1" />
            <line x1="0" y1="135" x2="800" y2="135" stroke="rgba(16,185,129,0.06)" strokeWidth="1" />
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
                <div
                  className="thw-chart-dot"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                />
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
                No fund snapshots yet — the chart fills in as daily snapshots are recorded from
                Fund Analytics.
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

/* ── Sector desk (live team sleeves ranked by ROI) ────────────── */
function SectorDesk({ sectors, cohort, loading, onOpen }) {
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

  return (
    <section className="thw-sectors" aria-label="Sector desk">
      <div className="thw-section-head">
        <span className="thw-eyebrow">Sector desk</span>
        <span className="thw-section-meta">
          RANKED BY ROI{cohort ? ` · ${cohort.toUpperCase()}` : ''}
        </span>
      </div>
      <div className="thw-sector-grid">
        {loading && !live
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="thw-sector" aria-hidden="true">
                <Skel w={22} h={10} />
                <div style={{ marginTop: 8 }}>
                  <Skel w="80%" h={12} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <Skel w={64} h={16} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <Skel w={40} h={10} />
                </div>
              </div>
            ))
          : rows.map((s, i) => (
              <button key={s.teamId || s.name} type="button" className="thw-sector" onClick={onOpen}>
                <div className="thw-sector-rank">#{i + 1}</div>
                <div className="thw-sector-name">{s.name}</div>
                <div className={`thw-sector-roi${(s.roiPct ?? 0) < 0 ? ' neg' : ''}`}>
                  {s.roiPct == null ? '—' : `${fmtSignedPct(s.roiPct)} ROI`}
                </div>
                <div className="thw-sector-val">{fmtCompactMoney(s.value)}</div>
                <div className="thw-sector-tkrs">
                  {(s.tickers || []).map((t) => (
                    <span key={t} className="thw-tkr">
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            ))}
      </div>
    </section>
  );
}

/* ── This week in the fund (live digest) ──────────────────────── */
function DigestCell({ label, count, loading, emptyCopy, children }) {
  return (
    <div className="thw-cell">
      <div className="thw-col-label">{label}</div>
      {loading ? (
        <>
          <div className="thw-cell-count">
            <Skel w={26} h={21} />
          </div>
          <Skel w="90%" h={11} style={{ marginTop: 6 }} />
        </>
      ) : (
        <>
          <div className={`thw-cell-count${count === 0 ? ' ghost' : ''}`}>{count}</div>
          {count === 0 ? (
            <div className="thw-empty" style={{ padding: '2px 0' }}>
              {emptyCopy}
            </div>
          ) : (
            children
          )}
        </>
      )}
    </div>
  );
}

function Digest({ digest, loading }) {
  const pitches = digest?.newPitches || [];
  const positions = digest?.positions || [];
  const movers = digest?.movers || [];
  const votes = digest?.votes || [];
  const notes = digest?.notes || [];
  const recognitions = digest?.recognitions || [];

  return (
    <section className="thw-card thw-span8" aria-label="This week in the fund">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Flame size={15} strokeWidth={1.8} /> This week in the fund
        </span>
        <span className="thw-section-meta">LAST 7 DAYS</span>
      </div>
      <div className="thw-digest-grid">
        <DigestCell
          label="New pitches"
          count={pitches.length}
          loading={loading}
          emptyCopy="No new pitches this week."
        >
          {pitches.slice(0, 3).map((p) => (
            <div key={p.id || p.ticker} className="thw-cell-line">
              <span className="thw-tkr">{p.ticker}</span>
              <span className="thw-nm">{p.company_name}</span>
            </div>
          ))}
        </DigestCell>
        <DigestCell
          label="Positions opened"
          count={positions.length}
          loading={loading}
          emptyCopy="No positions opened this week."
        >
          {positions.slice(0, 3).map((p) => (
            <div key={p.id || p.ticker_symbol} className="thw-cell-line">
              <span className="thw-tkr">{p.ticker_symbol}</span>
              <span className="thw-d">{`+${Math.round(Number(p.shares) || 0)} sh`}</span>
            </div>
          ))}
        </DigestCell>
        <DigestCell
          label="Performance movers"
          count={movers.length}
          loading={loading}
          emptyCopy="No outcome data yet."
        >
          {movers.slice(0, 3).map((m) => {
            const up = (m.alpha_pct ?? 0) >= 0;
            return (
              <div key={m.ticker} className="thw-cell-line">
                <span className={`thw-tkr${up ? ' em' : ''}`}>{m.ticker}</span>
                <span className={`thw-d ${up ? 'pos' : 'neg'}`}>
                  {`${up ? '+' : '−'}${Math.abs(m.alpha_pct).toFixed(1)}% alpha`}
                </span>
              </div>
            );
          })}
        </DigestCell>
        <DigestCell
          label="Votes cast"
          count={votes.length}
          loading={loading}
          emptyCopy="No committee votes this week."
        >
          {votes.slice(0, 3).map((v) => (
            <div key={v.id} className="thw-cell-line">
              {v.ticker && <span className="thw-tkr">{v.ticker}</span>}
              <span className="thw-nm" style={{ textTransform: 'capitalize' }}>
                {String(v.vote || '').replace('_', ' ')}
              </span>
            </div>
          ))}
        </DigestCell>
        <DigestCell
          label="Research notes"
          count={notes.length}
          loading={loading}
          emptyCopy="No research notes this week."
        >
          {notes.slice(0, 3).map((n) => (
            <div key={n.id} className="thw-cell-line">
              {n.ticker && <span className="thw-tkr">{n.ticker}</span>}
              <span className="thw-nm">{n.title}</span>
            </div>
          ))}
        </DigestCell>
        <DigestCell
          label="Recognition"
          count={recognitions.length}
          loading={loading}
          emptyCopy="No recognitions this week."
        >
          {recognitions.slice(0, 2).map((r) => (
            <div key={r.id} className="thw-cell-line">
              <Trophy size={13} strokeWidth={1.8} style={{ color: 'var(--warning)', flexShrink: 0 }} />
              <span className="thw-nm">
                {r.title} — {r.recipient_name}
              </span>
            </div>
          ))}
        </DigestCell>
      </div>
    </section>
  );
}

/* ── Shortcuts (all 14 destinations, compact grid) ────────────── */
function Shortcuts() {
  const router = useRouter();
  return (
    <section className="thw-card thw-span4" aria-label="Shortcuts">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Pin size={15} strokeWidth={1.8} /> Shortcuts
        </span>
        <span className="thw-section-meta">ALL · {ACTIONS.length}</span>
      </div>
      <div className="thw-card-body" style={{ paddingTop: 12, paddingBottom: 14 }}>
        <div className="thw-cmd-search" aria-hidden="true">
          <Search size={14} strokeWidth={1.8} /> Jump to anything…
          <span className="thw-kbd">⌘K</span>
        </div>
        <div className="thw-tiles">
          {ACTIONS.map((a) => {
            const Icon = a.Icon;
            return (
              <button
                key={a.id}
                type="button"
                className="thw-tile"
                onClick={() => router.push(a.href)}
              >
                <Icon size={14} strokeWidth={1.8} />
                {a.label}
              </button>
            );
          })}
        </div>
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
    <section className="thw-card thw-span5" aria-label="Tasks">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <ClipboardList size={15} strokeWidth={1.8} /> Task management
        </span>
        <span className="thw-section-meta">{loading ? <Skel w={44} h={10} /> : `${openCount} OPEN`}</span>
      </div>
      <div className="thw-card-body">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
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
          tasks.slice(0, 6).map((t) => {
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
    return [...overdue, ...upcoming].slice(0, 3).map((t) => ({
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
    <section className="thw-card thw-span4" aria-label="Deadlines">
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
      <div className="thw-card-body" style={{ paddingTop: 12, paddingBottom: 14 }}>
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
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
                  <Clock size={11} strokeWidth={1.8} /> <span style={{ textTransform: 'capitalize' }}>{d.meta}</span>
                </div>
              </div>
              <span className={`thw-badge thw-badge-${d.tone}`} style={{ textTransform: 'capitalize' }}>
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

/* ── Organization (live members, role-aware oversight) ────────── */
const AVATAR_TONE = { executive: 'exec', portfolio_manager: 'pm', analyst: 'an' };
const OVERSEE_LABEL = {
  executive: 'You oversee',
  portfolio_manager: 'Your analysts',
  analyst: 'Your pod',
};

function OrganizationCard({ organization, role, loading, onViewOrg }) {
  const you = organization?.you;
  const oversee = organization?.oversee || [];
  const extra = Math.max(0, oversee.length - 4);

  return (
    <section className="thw-card thw-span3" aria-label="Organization">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Users size={15} strokeWidth={1.8} /> Organization
        </span>
      </div>
      <div className="thw-card-body" style={{ paddingTop: 12 }}>
        {loading || !you ? (
          <Skel w="100%" h={58} style={{ borderRadius: 10 }} />
        ) : (
          <div className="thw-you">
            <div
              className={`thw-avatar ${AVATAR_TONE[you.role] || 'exec'}`}
              style={{ width: 34, height: 34, fontSize: 10 }}
            >
              {initials(you.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="thw-you-name">{you.name}</div>
              <div className="thw-you-role">{you.title}</div>
            </div>
          </div>
        )}
        <div className="thw-col-label" style={{ marginTop: 14 }}>
          {OVERSEE_LABEL[role] || 'Your team'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          {loading ? (
            <Skel w={120} h={26} style={{ borderRadius: 13 }} />
          ) : oversee.length === 0 ? (
            <span className="thw-empty" style={{ padding: 0 }}>
              No direct reports yet.
            </span>
          ) : (
            <div className="thw-avatar-stack">
              {oversee.slice(0, 4).map((p) => (
                <div
                  key={p.name}
                  className={`thw-avatar ${AVATAR_TONE[p.role] || 'pm'}`}
                  style={{ width: 26, height: 26, fontSize: 8.5 }}
                  title={p.name}
                >
                  {initials(p.name)}
                </div>
              ))}
              {extra > 0 && (
                <div className="thw-avatar an" style={{ width: 26, height: 26, fontSize: 8.5 }}>
                  +{extra}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="thw-section-meta" style={{ display: 'block', paddingTop: 2 }}>
          {loading ? (
            <Skel w={110} h={10} />
          ) : (
            `${organization?.pmCount ?? 0} PMS · ${organization?.analystCount ?? 0} ANALYSTS`
          )}
        </div>
      </div>
      <div className="thw-card-foot">
        <button type="button" className="thw-link" onClick={onViewOrg}>
          View org chart <ArrowRight size={12} strokeWidth={1.8} />
        </button>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function OrgTeamHubPage() {
  const router = useRouter();
  const { isOrgUser, orgRole, orgData, isLoading, fundName, universityName } = useOrg();
  const { summary, digest, tasksData, loading, setTasksData } = useTeamHubData(
    Boolean(isOrgUser && !isLoading),
  );

  // Optimistic task-status updates backed by PATCH /api/org/tasks.
  const handleStatusChange = useCallback(
    async (taskId, nextStatus) => {
      let prevStatus = null;
      setTasksData((d) => {
        if (!d) return d;
        const tasks = d.tasks.map((t) => {
          if (t.id !== taskId) return t;
          prevStatus = t.status;
          return { ...t, status: nextStatus, overdue: nextStatus === 'completed' ? false : t.overdue };
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

  if (isLoading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading Team Hub…</div>;
  }
  if (!isOrgUser) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
        This page is for organizational members only.
      </div>
    );
  }

  const perf = summary?.performance || null;
  const counts = summary?.counts || null;
  const strip = summary?.statStrip || null;
  const orgName = universityName || summary?.org?.name || orgData?.org?.name || 'Investment Council';
  const fundLabel = fundName || `${orgName} Fund`;
  const roleLabel = summary?.viewer?.title || ROLE_LABEL[orgRole] || 'Member';
  const violations = strip?.openViolations ?? 0;

  return (
    <div className="thw-root">
      <Ticker digest={digest} loading={loading} />

      <section className="thw-hero" aria-label="Fund overview">
        <div>
          <span className="thw-eyebrow">
            <b className="thw-brand">{fundLabel}</b> · {orgName} · {roleLabel}
          </span>
          <div className="thw-display">
            {loading ? <Skel w={280} h={48} style={{ borderRadius: 10 }} /> : fmtMoney(perf?.total_value)}
          </div>
          <div className="thw-hero-deltas">
            {loading ? (
              <Skel w={260} h={13} />
            ) : (
              <>
                <span className={(perf?.return_pct ?? 0) >= 0 ? 'pos' : 'neg'}>
                  {fmtSignedPct(perf?.return_pct)} return
                </span>
                <span className={(perf?.alpha_pct ?? 0) >= 0 ? 'pos' : 'neg'}>
                  {fmtSignedPct(perf?.alpha_pct)} alpha
                </span>
                <span className="mut">
                  {counts?.members ?? 0} members · {counts?.teams ?? 0} teams ·{' '}
                  {counts?.openTasks ?? 0} open tasks
                </span>
              </>
            )}
          </div>
          <div className="thw-hstats">
            <div className="thw-hstat">
              <div className="thw-hstat-label">Cohort</div>
              <div className="thw-hstat-value">
                {loading ? <Skel w={70} h={17} /> : strip?.cohort || '—'}
              </div>
            </div>
            <div className="thw-hstat">
              <div className="thw-hstat-label">My assignments</div>
              <div className="thw-hstat-value">
                {loading ? <Skel w={20} h={17} /> : (strip?.myAssignments ?? 0)}
              </div>
            </div>
            <div className="thw-hstat">
              <div className="thw-hstat-label">IPS violations</div>
              <div className={`thw-hstat-value ${violations === 0 ? 'pos' : 'neg'}`}>
                {loading ? (
                  <Skel w={60} h={17} />
                ) : violations === 0 ? (
                  '0 · Clear'
                ) : (
                  `${violations} Open`
                )}
              </div>
            </div>
            <div className="thw-hstat">
              <div className="thw-hstat-label">Vs S&amp;P 500</div>
              <div className={`thw-hstat-value ${(perf?.alpha_pct ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                {loading ? (
                  <Skel w={64} h={17} />
                ) : perf?.alpha_pct == null ? (
                  '—'
                ) : (
                  `${perf.alpha_pct >= 0 ? '+' : '−'}${Math.abs(perf.alpha_pct).toFixed(1)} PTS`
                )}
              </div>
            </div>
          </div>
        </div>

        <FundChart snapshots={summary?.snapshots} loading={loading} />
      </section>

      <SectorDesk
        sectors={summary?.sectors}
        cohort={strip?.cohort}
        loading={loading}
        onOpen={() => router.push('/org-team-hub/fund-analytics')}
      />

      <div className="thw-bento">
        <Digest digest={digest} loading={loading} />
        <Shortcuts />
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
        <OrganizationCard
          organization={summary?.organization}
          role={summary?.viewer?.role || orgRole}
          loading={loading}
          onViewOrg={() => router.push('/org-team-hub/org-chart')}
        />
      </div>
    </div>
  );
}
