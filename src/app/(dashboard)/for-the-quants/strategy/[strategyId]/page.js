'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStrategyDetail } from '@/lib/for-the-quants-mock-data';
import { useCreatorSubscriptions, FREE_CREATOR_SUBSCRIPTION_LIMIT } from '@/hooks/useCreatorSubscriptions';

import '../../../../../../app-legacy/assets/css/theme.css';
import '../../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../../../app-legacy/pages/home-dashboard.css';
import '../../for-the-quants.css';

function generatePoints(seed, n, min, max) {
  const pts = [];
  let v = min + (max - min) * 0.3;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.28 + seed) * ((max - min) * 0.035) + (max - min) * 0.003;
    v += (Math.random() - 0.45) * ((max - min) * 0.018);
    v = Math.max(min, Math.min(max, v));
    pts.push(v);
  }
  return pts;
}

function pointsToPath(pts, w, h) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const pad = 8;
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = pad + (h - 2 * pad) * (1 - (p - min) / range);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function pointsToArea(pts, w, h) {
  const line = pointsToPath(pts, w, h);
  return `${line} L${w},${h} L0,${h} Z`;
}

function StrategyEquityChart({ seed }) {
  const w = 720;
  const h = 220;
  const pts = useMemo(() => generatePoints(seed, 80, 100, 280), [seed]);
  const bench = useMemo(() => generatePoints(seed + 9, 80, 90, 200), [seed]);
  const line = pointsToPath(pts, w, h);
  const area = pointsToArea(pts, w, h);
  const benchLine = pointsToPath(bench, w, h);
  return (
    <div style={{ marginTop: '1rem' }}>
      <p className="ftq-bt-label" style={{ marginBottom: '0.5rem' }}>Equity curve (mock)</p>
      <div className="ftq-mini-chart-wrap" style={{ height: 200 }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <linearGradient id="ftqEqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ftqEqGrad)" />
          <path d={line} fill="none" stroke="#10b981" strokeWidth="2.5" />
          <path d={benchLine} fill="none" stroke="#f97316" strokeWidth="1.75" strokeDasharray="5 4" />
        </svg>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
        <span style={{ color: '#10b981' }}>● Strategy</span>
        {' · '}
        <span style={{ color: '#f97316' }}>● Benchmark</span>
      </div>
    </div>
  );
}

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = params?.strategyId;
  const detail = typeof strategyId === 'string' ? getStrategyDetail(strategyId) : null;

  const {
    subscribeToCreator,
    isSubscribedToCreator,
    freeSlotsRemaining,
    freeUsed,
    freeLimit,
  } = useCreatorSubscriptions();

  const [paramsState, setParamsState] = useState({});

  useEffect(() => {
    if (detail) {
      setParamsState(Object.fromEntries(detail.parameters.map((p) => [p.key, p.value])));
    }
  }, [detail]);

  const [toast, setToast] = useState(null);

  const subscribed = detail ? isSubscribedToCreator(detail.creatorId) : false;

  const updateParam = useCallback((key, value) => {
    setParamsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubscribe = () => {
    if (!detail) return;
    const res = subscribeToCreator(detail.creatorId);
    if (res.ok) {
      setToast(
        res.already
          ? 'Already subscribed to this creator.'
          : `Subscribed (${res.kind === 'free' ? 'free slot' : 'paid'}).`
      );
    } else if (res.reason === 'free_exhausted') {
      setToast(
        `Free creator subscriptions used (${freeLimit}). Upgrade to a paid plan to follow more creators.`
      );
    }
  };

  const handleDeploy = () => {
    setToast('Deploy queued (mock). Connect execution API to go live.');
  };

  if (!detail) {
    return (
      <div className="dashboard-page-inset ftq-page">
        <div className="db-card" style={{ padding: '2rem' }}>
          <h1 className="ftq-title">Strategy not found</h1>
          <p className="ftq-subtitle">No strategy matches this ID.</p>
          <Link href="/for-the-quants" className="ftq-view-all" style={{ marginTop: '1rem' }}>
            ← Back to For The Quants
          </Link>
        </div>
      </div>
    );
  }

  const canDeploy = subscribed;

  return (
    <div className="dashboard-page-inset ftq-page">
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => router.push('/for-the-quants')}
          className="ftq-btn-ghost"
          style={{ marginBottom: '0.75rem' }}
        >
          ← Back
        </button>
        <h1 className="ftq-title">{detail.name}</h1>
        <p className="ftq-subtitle">
          by {detail.creator} · {detail.creatorHandle}
        </p>
      </div>

      {toast && (
        <div
          className="db-card"
          style={{ padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#d1d5db' }}
        >
          {toast}
        </div>
      )}

      <div className="db-card" style={{ marginBottom: '1rem' }}>
        <div className="db-card-header">
          <h3>Overview</h3>
        </div>
        <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>{detail.description}</p>
          <div className="ftq-bt-grid" style={{ marginTop: '1rem' }}>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">6mo return</span>
              <span className="ftq-bt-value positive">{detail.performance.return6mo}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Sharpe</span>
              <span className="ftq-bt-value">{detail.performance.sharpe}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Max DD</span>
              <span className="ftq-bt-value" style={{ color: '#f87171' }}>{detail.performance.maxDd}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Win rate</span>
              <span className="ftq-bt-value">{detail.performance.winRate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1rem' }}>
        <div className="db-card-header">
          <h3>Parameters</h3>
        </div>
        <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
          {detail.parameters.map((p) => (
            <div key={p.key} style={{ marginBottom: '1rem' }}>
              <label className="ftq-bt-label" style={{ display: 'block', marginBottom: '0.35rem' }} htmlFor={p.key}>
                {p.label}
              </label>
              <input
                id={p.key}
                type="number"
                min={p.min}
                max={p.max}
                step={p.step}
                value={paramsState[p.key] ?? p.value}
                onChange={(e) => updateParam(p.key, Number(e.target.value))}
                className="ftq-pm-input"
                style={{ maxWidth: 200 }}
                disabled={!canDeploy}
              />
              {!canDeploy && (
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                  Subscribe to customize
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1rem' }}>
        <div className="db-card-header">
          <h3>Backtest results</h3>
        </div>
        <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.75rem' }}>Period: {detail.backtest.period}</p>
          <div className="ftq-bt-grid">
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Return</span>
              <span className="ftq-bt-value positive">{detail.backtest.returnPct}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Sharpe</span>
              <span className="ftq-bt-value">{detail.backtest.sharpe}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Max DD</span>
              <span className="ftq-bt-value" style={{ color: '#f87171' }}>{detail.backtest.maxDd}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Trades</span>
              <span className="ftq-bt-value">{detail.backtest.trades}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Benchmark</span>
              <span className="ftq-bt-value">{detail.backtest.benchmark}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Alpha</span>
              <span className="ftq-bt-value positive">{detail.backtest.alpha}</span>
            </div>
          </div>
          <StrategyEquityChart seed={strategyId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)} />
        </div>
      </div>

      <div className="db-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {!subscribed ? (
            <>
              <button type="button" className="ftq-btn-primary" style={{ width: 'auto', margin: 0 }} onClick={handleSubscribe}>
                Subscribe to Creator
              </button>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Free creator slots remaining: {freeSlotsRemaining} / {freeLimit} (used {freeUsed})
              </span>
            </>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: '#10b981', margin: 0 }}>You are subscribed to this creator.</p>
          )}
          <button
            type="button"
            className="ftq-btn-primary"
            style={{
              width: 'auto',
              margin: 0,
              opacity: canDeploy ? 1 : 0.45,
              cursor: canDeploy ? 'pointer' : 'not-allowed',
            }}
            disabled={!canDeploy}
            onClick={handleDeploy}
          >
            Deploy
          </button>
        </div>
        {!canDeploy && (
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.75rem 0 0' }}>
            Deploy unlocks after you subscribe to {detail.creator}. You get {FREE_CREATOR_SUBSCRIPTION_LIMIT} free creator subscriptions; beyond that, a paid plan is required (mock).
          </p>
        )}
      </div>
    </div>
  );
}
