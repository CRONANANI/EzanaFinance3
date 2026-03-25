'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FTQ_STAT_CARDS,
  MY_STRATEGIES,
  LATEST_BACKTEST,
  LEADERBOARD,
  RISK_ANALYTICS,
  TRENDING_MARKETS,
  BETTING_ANALYTICS,
  INDICATOR_TABS,
  INDICATOR_CARDS,
} from '@/lib/for-the-quants-mock-data';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import './for-the-quants.css';

function generatePoints(seed, n, min, max) {
  const pts = [];
  let v = min + (max - min) * 0.35;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.35 + seed) * ((max - min) * 0.04) + (max - min) * 0.002;
    v += (Math.random() - 0.45) * ((max - min) * 0.02);
    v = Math.max(min, Math.min(max, v));
    pts.push(v);
  }
  return pts;
}

function pointsToPath(pts, w, h) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const pad = 6;
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = pad + (h - 2 * pad) * (1 - (p - min) / range);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function MiniEquityChart({ seed = 1, color = '#10b981' }) {
  const w = 280;
  const h = 72;
  const pts = useMemo(() => generatePoints(seed, 40, 100, 220), [seed]);
  const line = pointsToPath(pts, w, h);
  return (
    <div className="ftq-mini-chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  );
}

function VolumeBars() {
  const heights = [40, 55, 35, 70, 45, 90, 65];
  return (
    <div className="ftq-vol-bars">
      {heights.map((h, i) => (
        <div key={i} className="ftq-vol-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export default function ForTheQuantsPage() {
  const router = useRouter();
  const [builderTab, setBuilderTab] = useState('mine');
  const [pmQuery, setPmQuery] = useState('');
  const [leaderPeriod, setLeaderPeriod] = useState('month');
  const [indTab, setIndTab] = useState(INDICATOR_TABS[0]);

  const handlePmLookup = () => {
    if (!pmQuery.trim()) return;
    router.push(`/betting-markets?trader=${encodeURIComponent(pmQuery.trim())}`);
  };

  return (
    <div className="dashboard-page-inset ftq-page">
      <header className="ftq-header">
        <h1 className="ftq-title">For The Quants</h1>
        <p className="ftq-subtitle">Build, test, and deploy quantitative trading strategies</p>
      </header>

      <div className="ftq-stat-grid">
        {FTQ_STAT_CARDS.map((s) => (
          <div key={s.id} className="ftq-stat-card">
            <div className="ftq-stat-icon" aria-hidden>{s.icon}</div>
            <div className="ftq-stat-label">{s.label}</div>
            <div className="ftq-stat-value">{s.value}</div>
            <div className={`ftq-stat-sub ${s.sub.includes('+') ? 'positive' : ''}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="ftq-row-60-40">
        <div className="db-card">
          <div className="db-card-header">
            <h3>🔧 Strategy Builder</h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <div className="ftq-tabs">
              {[
                { id: 'mine', label: 'My Strategies' },
                { id: 'templates', label: 'Templates' },
                { id: 'community', label: 'Community' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`ftq-tab ${builderTab === t.id ? 'active' : ''}`}
                  onClick={() => setBuilderTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {builderTab === 'mine' && (
              <div className="ftq-strategy-list">
                {MY_STRATEGIES.map((st) => (
                  <div key={st.id} className="ftq-strategy-row">
                    <h4 className="ftq-strategy-name">
                      <span aria-hidden>{st.icon}</span> {st.name}
                    </h4>
                    <p className="ftq-strategy-detail">{st.detail}</p>
                    <div className="ftq-strategy-meta">
                      {st.lastRun ? (
                        <>
                          Last run: {st.lastRun} ·{' '}
                        </>
                      ) : null}
                      Status:{' '}
                      <span className={`ftq-status ${st.statusTone}`}>{st.status}</span>
                    </div>
                    <div className="ftq-row-actions">
                      <button type="button" className="ftq-btn-ghost">Edit</button>
                      <button type="button" className="ftq-btn-ghost">Backtest</button>
                      {st.statusTone !== 'draft' ? (
                        <button type="button" className="ftq-btn-ghost">Deploy</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {builderTab === 'templates' && (
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: 0 }}>
                Strategy templates (pairs, factor, ML) — connect APIs to browse the library.
              </p>
            )}

            {builderTab === 'community' && (
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: 0 }}>
                Browse community strategies below or open the leaderboard to subscribe to a creator.
              </p>
            )}

            <button type="button" className="ftq-btn-primary">+ Create New Strategy</button>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>📈 Latest Backtest Results</h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: '0 0 0.75rem' }}>
              Strategy: <strong style={{ color: '#f0f6fc' }}>{LATEST_BACKTEST.strategyName}</strong>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem' }}>Period: {LATEST_BACKTEST.period}</p>
            <div className="ftq-bt-grid">
              <div className="ftq-bt-row">
                <span className="ftq-bt-label">Return</span>
                <span className="ftq-bt-value positive">{LATEST_BACKTEST.returnPct}</span>
              </div>
              <div className="ftq-bt-row">
                <span className="ftq-bt-label">Sharpe</span>
                <span className="ftq-bt-value">{LATEST_BACKTEST.sharpe}</span>
              </div>
              <div className="ftq-bt-row">
                <span className="ftq-bt-label">Max DD</span>
                <span className="ftq-bt-value" style={{ color: '#f87171' }}>{LATEST_BACKTEST.maxDd}</span>
              </div>
              <div className="ftq-bt-row">
                <span className="ftq-bt-label">Win Rate</span>
                <span className="ftq-bt-value">{LATEST_BACKTEST.winRate}</span>
              </div>
              <div className="ftq-bt-row">
                <span className="ftq-bt-label">Trades</span>
                <span className="ftq-bt-value">{LATEST_BACKTEST.trades}</span>
              </div>
            </div>
            <MiniEquityChart seed={11} />
            <div className="ftq-bench">
              Benchmark (S&amp;P 500): {LATEST_BACKTEST.benchmark}
              <br />
              Alpha: <span style={{ color: '#10b981', fontWeight: 700 }}>{LATEST_BACKTEST.alpha}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ftq-row-50">
        <div className="db-card" id="ftq-leaderboard">
          <div className="db-card-header ftq-lb-head">
            <h3>🏆 Community Strategy Leaderboard</h3>
            <select
              className="ftq-select"
              value={leaderPeriod}
              onChange={(e) => setLeaderPeriod(e.target.value)}
              aria-label="Leaderboard period"
            >
              <option value="month">This Month</option>
              <option value="week">This Week</option>
              <option value="year">YTD</option>
            </select>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            {LEADERBOARD.map((row) => (
              <div key={row.id} className="ftq-lb-entry">
                <div className="ftq-lb-line1">
                  <span className="ftq-lb-rank">{row.rank}</span>
                  <span className="ftq-lb-name">{row.name}</span>
                  <span className="ftq-lb-ret">{row.returnPct}{row.hot ? ' 🔥' : ''}</span>
                </div>
                <p className="ftq-lb-meta">
                  by {row.author} · {row.subscribers.toLocaleString()} subscribers
                </p>
                <Link href={`/for-the-quants/strategy/${row.id}`} className="ftq-link-btn">
                  View Strategy →
                </Link>
              </div>
            ))}
            <Link href="/for-the-quants#ftq-leaderboard" className="ftq-view-all">
              View All Strategies →
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>⚠️ Risk Analytics</h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <div className="ftq-bt-row" style={{ marginBottom: '0.25rem' }}>
              <span className="ftq-bt-label">Portfolio Beta</span>
              <span className="ftq-bt-value">{RISK_ANALYTICS.beta}</span>
            </div>
            <div className="ftq-risk-bar">
              <div className="ftq-risk-bar-fill" style={{ width: `${RISK_ANALYTICS.betaBarPct}%` }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem' }}>vs S&amp;P 500</p>

            <p className="ftq-bt-label" style={{ marginBottom: '0.25rem' }}>Value at Risk (95%)</p>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171', margin: '0 0 0.25rem' }}>{RISK_ANALYTICS.var95}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem' }}>Max potential 1-day loss</p>

            <p className="ftq-bt-label" style={{ marginBottom: '0.5rem' }}>Sector Concentration</p>
            {RISK_ANALYTICS.sectors.map((s) => (
              <div key={s.label} className="ftq-sector-row">
                <div className="ftq-sector-top">
                  <span className="ftq-sector-label">{s.label}</span>
                  <span className="ftq-sector-pct">{s.pct}%</span>
                </div>
                <div className="ftq-sector-bar">
                  <div className="ftq-sector-bar-fill" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}

            <div className="ftq-bt-row" style={{ marginTop: '0.75rem' }}>
              <span className="ftq-bt-label">Correlation to Market</span>
              <span className="ftq-bt-value">{RISK_ANALYTICS.correlation}</span>
            </div>
            <div className="ftq-bt-row">
              <span className="ftq-bt-label">Volatility (30d)</span>
              <span className="ftq-bt-value">{RISK_ANALYTICS.vol30d}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ftq-row-50">
        <div className="db-card">
          <div className="db-card-header">
            <h3>🔮 Polymarket Research</h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <div className="ftq-pm-search">
              <input
                className="ftq-pm-input"
                placeholder="Search trader username..."
                value={pmQuery}
                onChange={(e) => setPmQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePmLookup()}
              />
              <button type="button" className="ftq-btn-ghost" onClick={handlePmLookup}>
                Look Up
              </button>
            </div>
            <p className="ftq-bt-label" style={{ marginBottom: '0.5rem' }}>Trending Markets</p>
            <div className="ftq-betting-list">
              {TRENDING_MARKETS.map((m) => (
                <div
                  key={m.id}
                  className="ftq-betting-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/betting-markets?focus=${encodeURIComponent(m.id)}`)}
                  onKeyDown={(e) => e.key === 'Enter' && router.push(`/betting-markets?focus=${encodeURIComponent(m.id)}`)}
                >
                  <p className="ftq-bt-q">{m.question}</p>
                  <div className="ftq-bt-side">{m.side}</div>
                  <div className="ftq-bt-vol">
                    {m.volume} volume · {m.traders} traders
                  </div>
                </div>
              ))}
            </div>
            <Link href="/betting-markets" className="ftq-view-all">
              View All Markets →
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>📊 Betting Market Analytics</h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <p className="ftq-bt-label">Smart Money Flow</p>
            <div className="ftq-smart-bar">
              <div className="ftq-smart-fill" style={{ width: `${BETTING_ANALYTICS.smartMoneyBullish}%` }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, margin: '0 0 1rem' }}>
              {BETTING_ANALYTICS.smartMoneyBullish}% Bullish · Based on top 100 traders
            </p>

            <p className="ftq-bt-label" style={{ marginBottom: '0.35rem' }}>Biggest Position Changes (24h)</p>
            {BETTING_ANALYTICS.positionChanges.map((p) => (
              <div key={p.trader + p.market} className="ftq-pos-row">
                <span className="ftq-pos-name">{p.trader}</span>{' '}
                <span style={{ color: p.change.startsWith('-') ? '#f87171' : '#10b981' }}>{p.change}</span>
                {' '}on &quot;{p.market}&quot;
              </div>
            ))}

            <p className="ftq-bt-label" style={{ margin: '1rem 0 0.35rem' }}>Market Accuracy (last 30d)</p>
            <p style={{ fontSize: '0.8125rem', color: '#d1d5db', margin: 0 }}>
              Resolved correctly: {BETTING_ANALYTICS.accuracy}
              <br />
              Avg prediction error: {BETTING_ANALYTICS.avgError}
            </p>

            <p className="ftq-bt-label" style={{ margin: '1rem 0 0.35rem' }}>Volume Trend</p>
            <VolumeBars />
          </div>
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.5rem' }}>
        <div className="db-card-header">
          <h3>📚 Technical Indicators Library</h3>
        </div>
        <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
          <div className="ftq-ind-tabs">
            {INDICATOR_TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={`ftq-tab ${indTab === t ? 'active' : ''}`}
                onClick={() => setIndTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="ftq-ind-grid">
            {INDICATOR_CARDS.map((c) => (
              <div key={c.id} className="ftq-ind-card">
                <p className="ftq-ind-name">{c.name}</p>
                <p className="ftq-ind-val">{c.value}</p>
                <button type="button" className="ftq-btn-ghost">{c.action}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
