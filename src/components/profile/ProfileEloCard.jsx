'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import Link from 'next/link';
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import './profile-elo-card.css';

const TIER_DISPLAY = {
  novice: { label: 'Novice', color: '#94a3b8', range: [0, 999] },
  apprentice: { label: 'Apprentice', color: '#60a5fa', range: [1000, 2499] },
  strategist: { label: 'Strategist', color: '#a78bfa', range: [2500, 4999] },
  tactician: { label: 'Tactician', color: '#10b981', range: [5000, 6999] },
  master: { label: 'Master', color: '#f59e0b', range: [7000, 8499] },
  grandmaster: { label: 'Grandmaster', color: '#D4AF37', range: [8500, 10000] },
};

const NEXT_TIER = {
  novice: 'apprentice',
  apprentice: 'strategist',
  strategist: 'tactician',
  tactician: 'master',
  master: 'grandmaster',
  grandmaster: null,
};

const CATEGORY_LABELS = {
  learning: { label: 'Learning', icon: 'bi-book', color: '#60a5fa' },
  activity: { label: 'Activity', icon: 'bi-lightning', color: '#10b981' },
  portfolio: { label: 'Portfolio', icon: 'bi-graph-up', color: '#a78bfa' },
  social: { label: 'Social', icon: 'bi-people', color: '#f59e0b' },
  competition: { label: 'Competition', icon: 'bi-trophy', color: '#D4AF37' },
  decay: { label: 'Decay', icon: 'bi-hourglass', color: '#6b7280' },
  admin: { label: 'Admin', icon: 'bi-tools', color: '#94a3b8' },
};

const IMPROVEMENT_PATHS = [
  {
    category: 'learning',
    icon: 'bi-book',
    title: 'Complete a course module',
    description: 'Bronze courses give 5–15 ELO each',
    cta: 'Browse Learning Center',
    href: '/learning-center',
    points: '5–15',
  },
  {
    category: 'activity',
    icon: 'bi-lightning',
    title: 'Maintain your day streak',
    description: '+1 ELO daily, bonus +5 every 7 days',
    cta: 'Open dashboard',
    href: '/home-dashboard',
    points: '1–5',
  },
  {
    category: 'portfolio',
    icon: 'bi-graph-up',
    title: 'Beat the market this month',
    description: 'Outperforming SPY earns +50 to +200 ELO based on margin',
    cta: 'View portfolio',
    href: '/home-dashboard',
    points: '50–200',
  },
  {
    category: 'social',
    icon: 'bi-people-fill',
    title: 'Get a copy-trade request approved',
    description: 'Each approved follower yields ELO based on copier returns',
    cta: 'Manage copy requests',
    href: '/community',
    points: '10–50',
  },
  {
    category: 'competition',
    icon: 'bi-trophy',
    title: 'Enter a competition',
    description: 'Top 1% earns +500 ELO; top 10% earns +200',
    cta: 'See active competitions',
    href: '/leaderboard/elo',
    points: '200–500',
  },
];

function formatRating(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

function HistorySparkline({ transactions, lineColor }) {
  const gradId = useId().replace(/:/g, '');
  const data = useMemo(() => {
    if (!transactions?.length) return [];
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted.map((tx, i) => ({
      idx: i,
      rating: tx.rating_after,
      label: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      delta: tx.delta,
    }));
  }, [transactions]);

  if (data.length < 2) {
    return (
      <div className="pec-spark-empty">
        Not enough history yet — keep playing to build a track record.
      </div>
    );
  }

  return (
    <div className="pec-spark">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="pec-spark-tooltip">
                  <div className="pec-spark-tooltip-date">{p.label}</div>
                  <div className="pec-spark-tooltip-rating">{formatRating(p.rating)}</div>
                  <div className={`pec-spark-tooltip-delta ${p.delta >= 0 ? 'is-up' : 'is-down'}`}>
                    {p.delta >= 0 ? '+' : ''}
                    {p.delta} ELO
                  </div>
                </div>
              );
            }}
            cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="rating"
            stroke={lineColor}
            strokeWidth={1.8}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const totals = {};
    for (const tx of transactions || []) {
      if (tx.category === 'decay' || tx.category === 'admin') continue;
      if (!totals[tx.category]) totals[tx.category] = 0;
      totals[tx.category] += tx.delta;
    }
    return Object.entries(totals)
      .map(([category, total]) => ({
        category,
        total,
        meta: CATEGORY_LABELS[category] || { label: category, icon: 'bi-circle', color: '#6b7280' },
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  if (breakdown.length === 0) return null;

  const maxTotal = breakdown.reduce((m, b) => Math.max(m, Math.abs(b.total)), 0) || 1;

  return (
    <div className="pec-breakdown">
      <h4 className="pec-section-title">Earned by category</h4>
      <ul className="pec-breakdown-list">
        {breakdown.map((b) => {
          const widthPct = (Math.abs(b.total) / maxTotal) * 100;
          return (
            <li key={b.category} className="pec-breakdown-row">
              <span className="pec-breakdown-icon" style={{ color: b.meta.color }}>
                <i className={`bi ${b.meta.icon}`} />
              </span>
              <span className="pec-breakdown-label">{b.meta.label}</span>
              <div className="pec-breakdown-bar">
                <div
                  className="pec-breakdown-bar-fill"
                  style={{ width: `${widthPct}%`, background: b.meta.color }}
                />
              </div>
              <span className="pec-breakdown-value" style={{ color: b.meta.color }}>
                {b.total >= 0 ? '+' : ''}
                {b.total}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ImprovementPaths() {
  return (
    <div className="pec-improvements">
      <h4 className="pec-section-title">
        <i className="bi bi-lightbulb" /> Ways to improve
      </h4>
      <ul className="pec-improvements-list">
        {IMPROVEMENT_PATHS.map((path) => {
          const meta = CATEGORY_LABELS[path.category] || { color: '#6b7280' };
          return (
            <li key={path.title} className="pec-improvement">
              <div className="pec-improvement-icon" style={{ color: meta.color, borderColor: `${meta.color}33` }}>
                <i className={`bi ${path.icon}`} />
              </div>
              <div className="pec-improvement-body">
                <div className="pec-improvement-head">
                  <span className="pec-improvement-title">{path.title}</span>
                  <span className="pec-improvement-points" style={{ color: meta.color }}>
                    +{path.points}
                  </span>
                </div>
                <p className="pec-improvement-desc">{path.description}</p>
                <Link href={path.href} className="pec-improvement-cta">
                  {path.cta} <i className="bi bi-arrow-right" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * @param {{ userId: string; isOwn: boolean }} props
 */
export function ProfileEloCard({ userId, isOwn }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const url = isOwn ? '/api/elo/me' : `/api/elo/user/${userId}`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) setState(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isOwn]);

  if (loading) {
    return (
      <div className="pec-card pec-loading">
        <div className="pec-skeleton-tier" />
        <div className="pec-skeleton-rating" />
      </div>
    );
  }

  if (error || !state) {
    return <div className="pec-card pec-error">Failed to load ranking</div>;
  }

  const elo = state.elo || {};
  const transactions = state.transactions || [];
  const tier = elo.tier || 'novice';
  const tierMeta = TIER_DISPLAY[tier] || TIER_DISPLAY.novice;
  const currentRating = elo.current_rating ?? 0;
  const peakRating = elo.peak_rating ?? 0;

  const nextTier = NEXT_TIER[tier];
  const progressMeta = nextTier ? TIER_DISPLAY[nextTier] : null;
  const tierStart = tierMeta.range[0];
  const nextStart = progressMeta ? progressMeta.range[0] : 10000;
  const progressInTier = Math.max(0, currentRating - tierStart);
  const tierWidth = nextStart - tierStart;
  const progressPct = tierWidth > 0 ? Math.min(100, (progressInTier / tierWidth) * 100) : 100;
  const eloToNext = nextTier ? Math.max(0, nextStart - currentRating) : 0;

  return (
    <div className="pec-card">
      <header className="pec-head">
        <div className="pec-head-left">
          <h3 className="pec-card-title">ELO Ranking</h3>
        </div>
        <Link href="/leaderboard/elo" className="pec-head-link" title="View leaderboard">
          Leaderboard <i className="bi bi-arrow-up-right" />
        </Link>
      </header>

      <div className="pec-rating-row">
        <div className="pec-rating-block">
          <div className="pec-rating-value" style={{ color: tierMeta.color }}>
            {formatRating(currentRating)}
          </div>
          <div className="pec-rating-label">Current</div>
        </div>
        <div className="pec-rating-block">
          <div className="pec-peak-value">{formatRating(peakRating)}</div>
          <div className="pec-rating-label">Peak</div>
        </div>
      </div>

      <div className="pec-tier-row">
        <span
          className="pec-tier-badge"
          style={{
            color: tierMeta.color,
            borderColor: `${tierMeta.color}66`,
            background: `${tierMeta.color}1a`,
          }}
        >
          <i className="bi bi-shield-fill" /> {tierMeta.label}
        </span>
        {nextTier && (
          <span className="pec-tier-progress-text">
            {eloToNext.toLocaleString()} ELO to {progressMeta.label}
          </span>
        )}
      </div>

      {nextTier && (
        <div className="pec-progress-bar">
          <div className="pec-progress-fill" style={{ width: `${progressPct}%`, background: tierMeta.color }} />
        </div>
      )}

      <div className="pec-spark-section">
        <h4 className="pec-section-title">Recent history</h4>
        <HistorySparkline transactions={transactions} lineColor={tierMeta.color} />
      </div>

      <CategoryBreakdown transactions={transactions} />

      {isOwn && <ImprovementPaths />}
    </div>
  );
}
