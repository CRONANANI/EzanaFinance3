'use client';

import { useEffect, useState } from 'react';
import './elo-widget.css';

const TIER_DISPLAY = {
  novice: { label: 'Novice', color: '#94a3b8' },
  apprentice: { label: 'Apprentice', color: '#60a5fa' },
  strategist: { label: 'Strategist', color: '#a78bfa' },
  tactician: { label: 'Tactician', color: '#10b981' },
  master: { label: 'Master', color: '#f59e0b' },
  grandmaster: { label: 'Grandmaster', color: '#D4AF37' },
};

const TIER_THRESHOLDS = {
  novice: 0,
  apprentice: 1000,
  strategist: 2500,
  tactician: 5000,
  master: 7000,
  grandmaster: 8500,
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
  learning: { label: 'Learning', icon: 'bi-book' },
  activity: { label: 'Activity', icon: 'bi-lightning' },
  portfolio: { label: 'Portfolio', icon: 'bi-graph-up' },
  social: { label: 'Social', icon: 'bi-people' },
  competition: { label: 'Competition', icon: 'bi-trophy' },
  decay: { label: 'Decay', icon: 'bi-hourglass' },
  admin: { label: 'Admin', icon: 'bi-tools' },
};

function formatDelta(d) {
  if (d > 0) return `+${d}`;
  if (d < 0) return `${d}`;
  return '0';
}

function timeAgo(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EloWidget() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/elo/me')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled) return;
        setState(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="db-card elo-widget elo-widget-loading">
        <div className="elo-widget-spinner" />
      </div>
    );
  }

  if (error || !state) {
    return null;
  }

  const elo = state.elo || {};
  const transactions = state.transactions || [];
  const rating = elo.current_rating ?? 0;
  const tier = elo.tier || 'novice';
  const tierInfo = TIER_DISPLAY[tier] || TIER_DISPLAY.novice;
  const nextTier = NEXT_TIER[tier];
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : 10000;
  const currentThreshold = TIER_THRESHOLDS[tier];
  const progressPct = nextTier
    ? Math.max(
        0,
        Math.min(100, ((rating - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      )
    : 100;

  const recentTransactions = transactions.filter((t) => t.delta !== 0).slice(0, 5);

  return (
    <div className="db-card elo-widget" data-dashboard-card>
      <div className="elo-widget-header">
        <div className="elo-widget-title-row">
          <h3>Skill Rating</h3>
          <span
            className="elo-widget-tier-pill"
            style={{ color: tierInfo.color, borderColor: `${tierInfo.color}40` }}
          >
            {tierInfo.label}
          </span>
        </div>
      </div>

      <div className="elo-widget-rating-block">
        <div className="elo-widget-rating-num" style={{ color: tierInfo.color }}>
          {rating.toLocaleString()}
        </div>
        <div className="elo-widget-rating-suffix">/ 10,000</div>
      </div>

      {nextTier && (
        <div className="elo-widget-progress">
          <div className="elo-widget-progress-bar-bg">
            <div
              className="elo-widget-progress-bar-fill"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${tierInfo.color}, ${TIER_DISPLAY[nextTier].color})`,
              }}
            />
          </div>
          <div className="elo-widget-progress-meta">
            <span>
              {rating - currentThreshold} into {tierInfo.label}
            </span>
            <span>
              {nextThreshold - rating} to {TIER_DISPLAY[nextTier].label}
            </span>
          </div>
        </div>
      )}

      {recentTransactions.length > 0 && (
        <div className="elo-widget-recent">
          <div className="elo-widget-recent-header">Recent</div>
          <ul className="elo-widget-recent-list">
            {recentTransactions.map((tx) => {
              const catInfo = CATEGORY_LABELS[tx.category] || { label: tx.category, icon: 'bi-asterisk' };
              const isPositive = tx.delta > 0;
              return (
                <li key={tx.id} className="elo-widget-recent-row">
                  <div className="elo-widget-recent-left">
                    <i className={`bi ${catInfo.icon} elo-widget-recent-icon`} aria-hidden />
                    <div className="elo-widget-recent-text">
                      <span className="elo-widget-recent-reason">{tx.reason}</span>
                      <span className="elo-widget-recent-time">{timeAgo(tx.created_at)}</span>
                    </div>
                  </div>
                  <span className={`elo-widget-recent-delta ${isPositive ? 'is-up' : 'is-down'}`}>
                    {formatDelta(tx.delta)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
