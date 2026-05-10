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
    </div>
  );
}
