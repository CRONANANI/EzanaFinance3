'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  MoreHorizontal,
  Pin,
  Flame,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import {
  MOCK_MEMBERS,
  MOCK_TEAMS,
  MOCK_TEAM_PERFORMANCE,
  getTasksByRole,
  getMemberByEmail,
} from '@/lib/orgMockData';
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
const DEFAULT_PINS = ['org', 'pitch', 'trading', 'analytics', 'assignments'];
const PINS_STORAGE_PREFIX = 'ezana:teamhub:pins:';

/* ── Weekly digest (org-wide for every role) ──────────────────── */
const DIGEST = {
  pitches: [
    { t: 'JPM', n: 'JPMorgan Chase' },
    { t: 'UNH', n: 'UnitedHealth Group' },
    { t: 'NVDA', n: 'NVIDIA Corp' },
  ],
  positions: [
    { t: 'NVDA', sh: '+300 sh' },
    { t: 'MSFT', sh: '+400 sh' },
    { t: 'UNH', sh: '+150 sh' },
  ],
  positionsCount: 5,
  movers: [
    { t: 'NVDA', d: '+15.0% alpha', pos: true },
    { t: 'UNH', d: '−2.0% alpha', pos: false },
    { t: 'JPM', d: '−1.5% alpha', pos: false },
  ],
  notes: [
    { t: 'NVDA', n: 'Datacenter demand still underappreciated' },
    { t: 'UNH', n: 'Health Care sleeve — defensive rotation thesis' },
  ],
  recognition: { title: 'Analyst of the Month', who: 'Mia Thompson' },
};

/* ── Oversight deadlines (curated alert chips) ────────────────── */
const DEADLINES = [
  { t: 'Review Q2 budget allocation across all teams', m: 'Overdue · Strategic', tag: 'Urgent' },
  { t: 'Approve Healthcare team stock pitch presentation', m: 'Overdue · Oversight', tag: 'High' },
  { t: 'Approve portfolio rebalancing recommendations', m: 'Due Friday · Oversight', tag: 'High' },
];

/* ── Hero fund summary (final design copy) ────────────────────── */
const FUND = {
  value: '$655,000',
  ret: '+17.8% return',
  alpha: '+6.8% alpha',
  cohort: 'Fall 2026',
  assignments: '0',
  violations: '0 · Clear',
  vsSP: '+6.8 PTS',
};

/* ── Trailing fund-value series per chart range ───────────────── */
const CHART = {
  '1W': {
    labels: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    cur: [648, 651, 649, 653, 650, 654, 655],
    prev: [638, 640, 641, 643, 644, 646, 648],
  },
  '1M': {
    labels: ['W1', 'W2', 'W3', 'W4'],
    cur: [624, 631, 640, 648, 655],
    prev: [592, 598, 605, 612, 618],
  },
  '3M': {
    labels: ['FEB', 'MAR', 'APR'],
    cur: [601, 612, 624, 638, 655],
    prev: [560, 568, 575, 584, 592],
  },
  YTD: {
    labels: ['SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR'],
    cur: [548, 556, 545, 572, 588, 601, 624, 655],
    prev: [505, 512, 521, 528, 540, 551, 560, 572],
  },
};
const RANGES = ['1W', '1M', '3M', 'YTD'];

const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio Manager',
  analyst: 'Analyst',
};

function initials(name) {
  return (name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ── Ticker tape ──────────────────────────────────────────────── */
function Ticker() {
  const items = useMemo(() => {
    const out = [];
    DIGEST.pitches.forEach((p) =>
      out.push({ lbl: 'NEW PITCH', tone: 'in', t: p.t, detail: p.n }),
    );
    DIGEST.positions.forEach((p) =>
      out.push({ lbl: 'POSITION', tone: 'em', t: p.t, pos: p.sh }),
    );
    DIGEST.movers.forEach((m) =>
      out.push({ lbl: 'MOVER', tone: m.pos ? 'em' : 'rd', t: m.t, [m.pos ? 'pos' : 'neg']: m.d }),
    );
    out.push({
      lbl: 'RECOGNITION',
      tone: 'am',
      detail: `${DIGEST.recognition.title} — `,
      b: DIGEST.recognition.who,
    });
    DIGEST.notes.forEach((n) =>
      out.push({ lbl: 'RESEARCH', tone: 'in', t: n.t, detail: n.n }),
    );
    return out;
  }, []);

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

/* ── Hero fund-value chart (SVG area, range-switchable) ───────── */
function buildChart(cur, prev) {
  const W = 800;
  const H = 180;
  const padTop = 18;
  const padBot = 22;
  const all = [...cur, ...prev];
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
    prevLine: toPath(prev),
    lastX: xAt(cur.length - 1, cur.length),
    lastY: yAt(cur[cur.length - 1]),
  };
}

function FundChart() {
  const [range, setRange] = useState('YTD');
  const { labels, cur, prev } = CHART[range];
  const { line, area, prevLine, lastX, lastY } = useMemo(() => buildChart(cur, prev), [cur, prev]);

  return (
    <div className="thw-chart-card">
      <div className="thw-chart-head">
        <span className="thw-chart-label">Fund value · trailing 8 months</span>
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
      <div className="thw-chart">
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
          <path
            d={prevLine}
            stroke="var(--chart-axis)"
            strokeWidth="1.2"
            strokeDasharray="3 5"
            fill="none"
            opacity="0.55"
          />
          <path d={area} fill="url(#thw-fill)" />
          <path d={line} stroke="var(--emerald)" strokeWidth="2" fill="none" />
          <circle cx={lastX} cy={lastY} r="3.5" fill="var(--emerald)" />
        </svg>
      </div>
      <div className="thw-axis">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Sector desk ──────────────────────────────────────────────── */
function SectorDesk({ onOpen }) {
  const sectors = useMemo(
    () =>
      [...MOCK_TEAM_PERFORMANCE]
        .sort((a, b) => b.ytd_return - a.ytd_return)
        .map((t, i) => ({
          rank: i + 1,
          name: t.team_name,
          roi: t.ytd_return,
          val: `$${Math.round(t.value / 1000)}K`,
          tickers: t.top_holdings.slice(0, 3),
        })),
    [],
  );

  return (
    <section className="thw-sectors" aria-label="Sector desk">
      <div className="thw-section-head">
        <span className="thw-eyebrow">Sector desk</span>
        <span className="thw-section-meta">RANKED BY ROI · FALL 2026</span>
      </div>
      <div className="thw-sector-grid">
        {sectors.map((s) => (
          <button key={s.name} type="button" className="thw-sector" onClick={onOpen}>
            <div className="thw-sector-rank">#{s.rank}</div>
            <div className="thw-sector-name">{s.name}</div>
            <div className={`thw-sector-roi${s.roi < 0 ? ' neg' : ''}`}>
              {s.roi >= 0 ? '+' : ''}
              {s.roi}% ROI
            </div>
            <div className="thw-sector-val">{s.val}</div>
            <div className="thw-sector-tkrs">
              {s.tickers.map((t) => (
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

/* ── This week in the fund (digest) ───────────────────────────── */
function Digest() {
  return (
    <section className="thw-card thw-span8" aria-label="This week in the fund">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Flame size={15} strokeWidth={1.8} /> This week in the fund
        </span>
        <span className="thw-section-meta">LAST 7 DAYS</span>
      </div>
      <div className="thw-digest-grid">
        <div className="thw-cell">
          <div className="thw-col-label">New pitches</div>
          <div className="thw-cell-count">{DIGEST.pitches.length}</div>
          {DIGEST.pitches.map((p) => (
            <div key={p.t} className="thw-cell-line">
              <span className="thw-tkr">{p.t}</span>
              <span className="thw-nm">{p.n}</span>
            </div>
          ))}
        </div>
        <div className="thw-cell">
          <div className="thw-col-label">Positions opened</div>
          <div className="thw-cell-count">{DIGEST.positionsCount}</div>
          {DIGEST.positions.map((p) => (
            <div key={p.t} className="thw-cell-line">
              <span className="thw-tkr">{p.t}</span>
              <span className="thw-d">{p.sh}</span>
            </div>
          ))}
        </div>
        <div className="thw-cell">
          <div className="thw-col-label">Performance movers</div>
          <div className="thw-cell-count">{DIGEST.movers.length}</div>
          {DIGEST.movers.map((m) => (
            <div key={m.t} className="thw-cell-line">
              <span className={`thw-tkr${m.pos ? ' em' : ''}`}>{m.t}</span>
              <span className={`thw-d ${m.pos ? 'pos' : 'neg'}`}>{m.d}</span>
            </div>
          ))}
        </div>
        <div className="thw-cell">
          <div className="thw-col-label">Votes cast</div>
          <div className="thw-cell-count ghost">0</div>
          <div className="thw-empty" style={{ padding: '2px 0' }}>
            No committee votes this week.
          </div>
        </div>
        <div className="thw-cell">
          <div className="thw-col-label">Research notes</div>
          <div className="thw-cell-count">{DIGEST.notes.length}</div>
          {DIGEST.notes.map((n) => (
            <div key={n.t} className="thw-cell-line">
              <span className="thw-tkr">{n.t}</span>
              <span className="thw-nm">{n.n}</span>
            </div>
          ))}
        </div>
        <div className="thw-cell">
          <div className="thw-col-label">Recognition</div>
          <div className="thw-cell-count">1</div>
          <div className="thw-cell-line">
            <Trophy size={13} strokeWidth={1.8} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span className="thw-nm">
              {DIGEST.recognition.title} — {DIGEST.recognition.who}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Shortcuts (pinned tiles + customizable popover) ──────────── */
function Shortcuts({ userId }) {
  const router = useRouter();
  const [pinned, setPinned] = useState(DEFAULT_PINS);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const storageKey = PINS_STORAGE_PREFIX + (userId || 'anon');

  // Hydrate pinned shortcuts from localStorage (per user).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setPinned(parsed.filter((id) => ACTIONS.some((a) => a.id === id)).slice(0, 5));
        }
      }
    } catch {
      /* localStorage unavailable — keep defaults */
    }
  }, [storageKey]);

  const persist = (next) => {
    setPinned(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id) =>
    persist(pinned.includes(id) ? pinned.filter((x) => x !== id) : [...pinned, id].slice(-5));

  // Close the popover on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pinnedActs = pinned.map((id) => ACTIONS.find((a) => a.id === id)).filter(Boolean);
  const overflow = ACTIONS.filter((a) => !pinned.includes(a.id));

  return (
    <section className="thw-card thw-span4" aria-label="Shortcuts">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Pin size={15} strokeWidth={1.8} /> Shortcuts
        </span>
        <span className="thw-section-meta">PINNED · {pinnedActs.length}</span>
      </div>
      <div className="thw-card-body" style={{ paddingTop: 12, paddingBottom: 14 }}>
        <div className="thw-cmd-search" aria-hidden="true">
          <Search size={14} strokeWidth={1.8} /> Jump to anything…
          <span className="thw-kbd">⌘K</span>
        </div>
        <div className="thw-tiles">
          {pinnedActs.map((a) => {
            const Icon = a.Icon;
            return (
              <button
                key={a.id}
                type="button"
                className="thw-tile"
                onClick={() => router.push(a.href)}
              >
                <Icon size={16} strokeWidth={1.8} />
                {a.label}
              </button>
            );
          })}
          <div className="thw-pop-wrap" ref={wrapRef}>
            <button
              type="button"
              className="thw-tile more"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-haspopup="menu"
              style={{ width: '100%' }}
            >
              <MoreHorizontal size={16} strokeWidth={1.8} />
              More · {overflow.length}
            </button>
            {open && (
              <div className="thw-pop" role="menu">
                <div className="thw-pop-head">Pinned shortcuts — choose up to 5</div>
                <div className="thw-pop-list">
                  {ACTIONS.map((a) => {
                    const Icon = a.Icon;
                    const isPinned = pinned.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`thw-pop-item${isPinned ? ' is-pinned' : ''}`}
                        onClick={() => toggle(a.id)}
                        role="menuitemcheckbox"
                        aria-checked={isPinned}
                      >
                        <Icon size={14} strokeWidth={1.8} />
                        {a.label}
                        <span className="thw-pop-pin">
                          <Pin size={13} strokeWidth={1.8} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Task management ──────────────────────────────────────────── */
const TASK_STATUS = {
  completed: { label: 'Completed', tone: 'positive' },
  in_progress: { label: 'In progress', tone: 'info' },
  pending: { label: 'Pending', tone: 'warning' },
};

function TaskManagement({ tasks, openCount }) {
  return (
    <section className="thw-card thw-span5" aria-label="Tasks">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <ClipboardList size={15} strokeWidth={1.8} /> Task management
        </span>
        <span className="thw-section-meta">{openCount} OPEN</span>
      </div>
      <div className="thw-card-body">
        {tasks.length === 0 && <p className="thw-empty">No tasks this week.</p>}
        {tasks.slice(0, 6).map((t) => {
          const st = TASK_STATUS[t.status] || TASK_STATUS.pending;
          const done = t.status === 'completed';
          const meta = [t.priority, t.category].filter(Boolean).join(' · ');
          return (
            <div key={t.id} className={`thw-task${done ? ' done' : ''}`}>
              <div className="thw-task-body">
                <div className="thw-task-title">{t.title}</div>
                {meta && <div className="thw-task-meta" style={{ textTransform: 'capitalize' }}>{meta}</div>}
              </div>
              <span className={`thw-badge thw-badge-${st.tone}`}>{st.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Deadlines ────────────────────────────────────────────────── */
const DEADLINE_TONE = { Urgent: 'negative', High: 'info' };

function Deadlines({ onOpenBoard }) {
  return (
    <section className="thw-card thw-span4" aria-label="Deadlines">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Clock size={15} strokeWidth={1.8} /> Deadlines
        </span>
        <span className="thw-badge thw-badge-negative">2 overdue</span>
      </div>
      <div className="thw-card-body" style={{ paddingTop: 12, paddingBottom: 14 }}>
        {DEADLINES.map((d) => (
          <div key={d.t} className="thw-deadline">
            <div className="thw-deadline-body">
              <div className="thw-deadline-title">{d.t}</div>
              <div className="thw-deadline-meta">
                <Clock size={11} strokeWidth={1.8} /> {d.m}
              </div>
            </div>
            <span className={`thw-badge thw-badge-${DEADLINE_TONE[d.tag] || 'info'}`}>{d.tag}</span>
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

/* ── Organization ─────────────────────────────────────────────── */
function OrganizationCard({ user, onViewOrg }) {
  const pms = useMemo(() => MOCK_MEMBERS.filter((m) => m.role === 'portfolio_manager'), []);
  const analystCount = useMemo(
    () => MOCK_MEMBERS.filter((m) => m.role === 'analyst').length,
    [],
  );
  const extraPms = Math.max(0, pms.length - 4);

  return (
    <section className="thw-card thw-span3" aria-label="Organization">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <Users size={15} strokeWidth={1.8} /> Organization
        </span>
      </div>
      <div className="thw-card-body" style={{ paddingTop: 12 }}>
        <div className="thw-you">
          <div className="thw-avatar exec" style={{ width: 34, height: 34, fontSize: 10 }}>
            {initials(user.name)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="thw-you-name">{user.name}</div>
            <div className="thw-you-role">{user.title}</div>
          </div>
        </div>
        <div className="thw-col-label" style={{ marginTop: 14 }}>
          You oversee
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          <div className="thw-avatar-stack">
            {pms.slice(0, 4).map((p) => (
              <div key={p.id} className="thw-avatar pm" style={{ width: 26, height: 26, fontSize: 8.5 }}>
                {initials(p.name)}
              </div>
            ))}
            {extraPms > 0 && (
              <div className="thw-avatar an" style={{ width: 26, height: 26, fontSize: 8.5 }}>
                +{extraPms}
              </div>
            )}
          </div>
        </div>
        <div className="thw-section-meta" style={{ display: 'block', paddingTop: 2 }}>
          {pms.length} PMS · {analystCount} ANALYSTS
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
  const { isOrgUser, orgRole, orgData, isLoading } = useOrg();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!isOrgUser) return;
    const emailMatch = getMemberByEmail(orgData?.member?.email);
    const currentMember =
      emailMatch || MOCK_MEMBERS.find((m) => m.role === orgRole) || MOCK_MEMBERS[0];
    setTasks(getTasksByRole(orgRole, currentMember.id));
  }, [isOrgUser, orgData, orgRole]);

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

  const member = getMemberByEmail(orgData?.member?.email);
  const user = {
    name: member?.name || orgData?.org?.name || 'Team member',
    title: member?.sub_role || ROLE_LABEL[orgRole] || 'Member',
  };
  const orgName = orgData?.org?.name || 'Investment Council';
  const roleLabel = ROLE_LABEL[orgRole] || 'Member';
  const openCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="thw-root">
      <Ticker />

      <section className="thw-hero" aria-label="Fund overview">
        <div>
          <span className="thw-eyebrow">
            Team Hub · {orgName} · {roleLabel}
          </span>
          <div className="thw-display">{FUND.value}</div>
          <div className="thw-hero-deltas">
            <span className="pos">{FUND.ret}</span>
            <span className="pos">{FUND.alpha}</span>
            <span className="mut">
              {MOCK_MEMBERS.length} members · {MOCK_TEAMS.length} teams · {openCount} open tasks
            </span>
          </div>
          <div className="thw-hstats">
            <div className="thw-hstat">
              <div className="thw-hstat-label">Cohort</div>
              <div className="thw-hstat-value">{FUND.cohort}</div>
            </div>
            <div className="thw-hstat">
              <div className="thw-hstat-label">My assignments</div>
              <div className="thw-hstat-value">{FUND.assignments}</div>
            </div>
            <div className="thw-hstat">
              <div className="thw-hstat-label">IPS violations</div>
              <div className="thw-hstat-value pos">{FUND.violations}</div>
            </div>
            <div className="thw-hstat">
              <div className="thw-hstat-label">Vs S&amp;P 500</div>
              <div className="thw-hstat-value pos">{FUND.vsSP}</div>
            </div>
          </div>
        </div>

        <FundChart />
      </section>

      <SectorDesk onOpen={() => router.push('/org-team-hub/fund-analytics')} />

      <div className="thw-bento">
        <Digest />
        <Shortcuts userId={orgData?.member?.id || orgData?.member?.email} />
        <TaskManagement tasks={tasks} openCount={openCount} />
        <Deadlines onOpenBoard={() => router.push('/org-team-hub/assignments')} />
        <OrganizationCard user={user} onViewOrg={() => router.push('/org-team-hub/org-chart')} />
      </div>
    </div>
  );
}
