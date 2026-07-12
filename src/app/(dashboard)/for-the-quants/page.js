'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FTQ_STAT_CARDS,
  MY_STRATEGIES,
  LEADERBOARD,
  RISK_ANALYTICS,
  TRENDING_MARKETS,
  BETTING_ANALYTICS,
  INDICATOR_TABS,
  INDICATOR_CARDS,
  STRATEGY_TEMPLATES,
} from '@/lib/for-the-quants-mock-data';
import { VisualStrategyBuilder } from '@/components/quants/VisualStrategyBuilder';
import { DatasetRegistryCard } from '@/components/quants/DatasetRegistryCard';
import { TechnicalScannerCard } from '@/components/quants/TechnicalScannerCard';
import { CorrelationMatrixCard } from '@/components/quants/CorrelationMatrixCard';
import { PairsTradingCard } from '@/components/quants/PairsTradingCard';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { getCoursesForQuantsPreview } from '@/lib/learning-curriculum';

/* BacktestResultsCard and StrategyComparisonCard both render Recharts charts
   and sit well below the fold on this long page. Defer them so Recharts leaves
   the route's critical bundle; reserved heights ≈ each card's footprint. */
const BacktestResultsCard = dynamic(
  () =>
    import('@/components/quants/BacktestResultsCard').then((m) => ({
      default: m.BacktestResultsCard,
    })),
  { ssr: false, loading: () => <div aria-hidden style={{ minHeight: 460, width: '100%' }} /> },
);
const StrategyComparisonCard = dynamic(
  () =>
    import('@/components/quants/StrategyComparisonCard').then((m) => ({
      default: m.StrategyComparisonCard,
    })),
  { ssr: false, loading: () => <div aria-hidden style={{ minHeight: 360, width: '100%' }} /> },
);

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import './for-the-quants.css';
import ProbabilityLatticeCard from './ProbabilityLatticeCard';
import TailProbabilityRidgeCard from './TailProbabilityRidgeCard';
import RelationshipGraphCard from './RelationshipGraphCard';
import './simulation-visuals.css';

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
  const quantsCourses = useMemo(() => getCoursesForQuantsPreview(4), []);
  const [builderTab, setBuilderTab] = useState('mine');
  const [showBuilder, setShowBuilder] = useState(false);
  const [pmQuery, setPmQuery] = useState('');
  const [leaderPeriod, setLeaderPeriod] = useState('month');
  const [indTab, setIndTab] = useState(INDICATOR_TABS[0]);
  const [simSeed, setSimSeed] = useState(7); // re-roll → new simulated backtest run

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
            <div className="ftq-stat-icon" aria-hidden>
              <div className="ftq-stat-icon-inner">
                <i className={`bi ${s.biClass}`} />
              </div>
            </div>
            <div className="ftq-stat-label">{s.label}</div>
            <div className="ftq-stat-value">{s.value}</div>
            <div className={`ftq-stat-sub ${s.sub.includes('+') ? 'positive' : ''}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="ftq-row-60-40">
        <div className="db-card">
          <div className="db-card-header">
            <h3 className="ftq-section-title">
              <i className="bi bi-tools" aria-hidden />
              Strategy Builder
            </h3>
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
                  onClick={() => {
                    setBuilderTab(t.id);
                    if (t.id !== 'mine') setShowBuilder(false);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {builderTab === 'mine' && (
              <>
                {showBuilder ? (
                  <VisualStrategyBuilder
                    onSave={() => {
                      setShowBuilder(false);
                    }}
                  />
                ) : (
                  <div className="ftq-strategy-list">
                    {MY_STRATEGIES.map((st) => (
                      <div key={st.id} className="ftq-strategy-row">
                        <h4 className="ftq-strategy-name">
                          <i
                            className={`bi ${st.biClass}`}
                            style={{ marginRight: '0.35rem' }}
                            aria-hidden
                          />
                          {st.name}
                          <span className="ftq-version-badge">v{st.version ?? 1}</span>
                        </h4>
                        <p className="ftq-strategy-detail">{st.detail}</p>
                        <div className="ftq-strategy-meta">
                          {st.lastRun ? <>Last run: {st.lastRun} · </> : null}
                          Status: <span className={`ftq-status ${st.statusTone}`}>{st.status}</span>
                        </div>
                        <div className="ftq-row-actions">
                          <button
                            type="button"
                            className="ftq-btn-ghost"
                            onClick={() => setShowBuilder(true)}
                          >
                            Edit
                          </button>
                          <button type="button" className="ftq-btn-ghost">
                            Backtest
                          </button>
                          {st.statusTone !== 'draft' ? (
                            <button type="button" className="ftq-btn-ghost">
                              Deploy
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="ftq-btn-ghost"
                            title="Version history"
                            aria-label="Version history"
                          >
                            <i className="bi bi-clock-history" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {builderTab === 'templates' && (
              <div className="ftq-template-grid">
                {STRATEGY_TEMPLATES.map((tmpl) => (
                  <div key={tmpl.id} className="ftq-template-card">
                    <div className="ftq-template-icon">
                      <i className={`bi ${tmpl.icon}`} />
                    </div>
                    <div className="ftq-template-body">
                      <h4 className="ftq-template-name">{tmpl.name}</h4>
                      <p className="ftq-template-desc">{tmpl.description}</p>
                      <div className="ftq-template-meta">
                        <span className="ftq-template-cat">{tmpl.category}</span>
                        <span className="ftq-template-ret">{tmpl.expectedReturn}</span>
                        <span className="ftq-template-sharpe">Sharpe {tmpl.sharpe}</span>
                      </div>
                      {tmpl.datasets.length > 0 && (
                        <div className="ftq-template-datasets">
                          Requires: {tmpl.datasets.join(', ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="ftq-btn-ghost ftq-template-clone"
                      onClick={() => {
                        setBuilderTab('mine');
                        setShowBuilder(true);
                      }}
                    >
                      <i className="bi bi-copy" /> Clone & Edit
                    </button>
                  </div>
                ))}
              </div>
            )}

            {builderTab === 'community' && (
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: 0 }}>
                Browse community strategies below or open the leaderboard to subscribe to a creator.
              </p>
            )}

            <button
              type="button"
              className="ftq-btn-primary"
              onClick={() => {
                if (showBuilder) {
                  setShowBuilder(false);
                } else {
                  setBuilderTab('mine');
                  setShowBuilder(true);
                }
              }}
            >
              {showBuilder ? (
                <>
                  <i className="bi bi-arrow-left" /> Back to List
                </>
              ) : (
                <>
                  <i className="bi bi-plus-circle" /> Create New Strategy
                </>
              )}
            </button>
          </div>
        </div>

        <BacktestResultsCard />
      </div>

      {/* ===== Strategy Simulation (animated) ===== */}
      <section className="ftq-sim-section" aria-label="Strategy simulation visuals">
        <div className="ftq-sim-section-head">
          <h3 className="ftq-section-title">
            <i className="bi bi-activity" aria-hidden />
            Strategy Simulation
          </h3>
          <button type="button" className="ftq-btn-ghost" onClick={() => setSimSeed((s) => s + 1)}>
            <i className="bi bi-shuffle" /> New run
          </button>
        </div>
        <div className="ftq-sim-grid">
          <ProbabilityLatticeCard seed={simSeed} />
          <TailProbabilityRidgeCard seed={simSeed} />
        </div>
        <RelationshipGraphCard seed={simSeed} />
      </section>

      <div className="ftq-row-50">
        <div className="db-card" id="ftq-leaderboard">
          <div className="db-card-header ftq-lb-head">
            <h3 className="ftq-section-title">
              <i className="bi bi-trophy" aria-hidden />
              Community Strategy Leaderboard
            </h3>
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
                  <span className="ftq-lb-ret">
                    {row.returnPct}
                    {row.hot ? (
                      <>
                        {' '}
                        <i className="bi bi-fire" aria-hidden title="Hot" />
                      </>
                    ) : (
                      ''
                    )}
                  </span>
                </div>
                <p className="ftq-lb-meta">
                  by {row.author} · {row.subscribers.toLocaleString()} subscribers
                </p>
                <div className="ftq-lb-actions">
                  <Link href={`/for-the-quants/strategy/${row.id}`} className="ftq-link-btn">
                    View Strategy →
                  </Link>
                  <button
                    type="button"
                    className="ftq-btn-ghost ftq-lb-side"
                    onClick={() => router.push(`/for-the-quants/strategy/${row.id}?clone=1`)}
                  >
                    <i className="bi bi-copy" /> Clone
                  </button>
                  <button type="button" className="ftq-btn-ghost ftq-lb-side">
                    <i className="bi bi-bell" /> Subscribe
                  </button>
                </div>
              </div>
            ))}
            <Link href="/for-the-quants#ftq-leaderboard" className="ftq-view-all">
              View All Strategies →
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3 className="ftq-section-title">
              <i className="bi bi-exclamation-triangle" aria-hidden />
              Risk Analytics
            </h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <div className="ftq-bt-row" style={{ marginBottom: '0.25rem' }}>
              <span className="ftq-bt-label">Portfolio Beta</span>
              <span className="ftq-bt-value">{RISK_ANALYTICS.beta}</span>
            </div>
            <div className="ftq-risk-bar">
              <div
                className="ftq-risk-bar-fill"
                style={{ width: `${RISK_ANALYTICS.betaBarPct}%` }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem' }}>
              vs S&amp;P 500
            </p>

            <p className="ftq-bt-label" style={{ marginBottom: '0.25rem' }}>
              Value at Risk (95%)
            </p>
            <p
              style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171', margin: '0 0 0.25rem' }}
            >
              {RISK_ANALYTICS.var95}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem' }}>
              Max potential 1-day loss
            </p>

            <p className="ftq-bt-label" style={{ marginBottom: '0.5rem' }}>
              Sector Concentration
            </p>
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
            <h3 className="ftq-section-title">
              <i className="bi bi-globe2" aria-hidden />
              Polymarket Research
            </h3>
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
            <p className="ftq-bt-label" style={{ marginBottom: '0.5rem' }}>
              Trending Markets
            </p>
            <div className="ftq-betting-list">
              {TRENDING_MARKETS.map((m) => (
                <div
                  key={m.id}
                  className="ftq-betting-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/betting-markets?focus=${encodeURIComponent(m.id)}`)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    router.push(`/betting-markets?focus=${encodeURIComponent(m.id)}`)
                  }
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
            <h3 className="ftq-section-title">
              <i className="bi bi-bar-chart-line" aria-hidden />
              Betting Market Analytics
            </h3>
          </div>
          <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
            <p className="ftq-bt-label">Smart Money Flow</p>
            <div className="ftq-smart-bar">
              <div
                className="ftq-smart-fill"
                style={{ width: `${BETTING_ANALYTICS.smartMoneyBullish}%` }}
              />
            </div>
            <p
              style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, margin: '0 0 1rem' }}
            >
              {BETTING_ANALYTICS.smartMoneyBullish}% Bullish · Based on top 100 traders
            </p>

            <p className="ftq-bt-label" style={{ marginBottom: '0.35rem' }}>
              Biggest Position Changes (24h)
            </p>
            {BETTING_ANALYTICS.positionChanges.map((p) => (
              <div key={p.trader + p.market} className="ftq-pos-row">
                <span className="ftq-pos-name">{p.trader}</span>{' '}
                <span style={{ color: p.change.startsWith('-') ? '#f87171' : '#10b981' }}>
                  {p.change}
                </span>{' '}
                on &quot;{p.market}&quot;
              </div>
            ))}

            <p className="ftq-bt-label" style={{ margin: '1rem 0 0.35rem' }}>
              Market Accuracy (last 30d)
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#d1d5db', margin: 0 }}>
              Resolved correctly: {BETTING_ANALYTICS.accuracy}
              <br />
              Avg prediction error: {BETTING_ANALYTICS.avgError}
            </p>

            <p className="ftq-bt-label" style={{ margin: '1rem 0 0.35rem' }}>
              Volume Trend
            </p>
            <VolumeBars />
          </div>
        </div>
      </div>

      <div className="ftq-row-50">
        <DatasetRegistryCard />
        <StrategyComparisonCard />
      </div>

      <div className="ftq-row-50">
        <TechnicalScannerCard />
        <PairsTradingCard />
      </div>

      <CorrelationMatrixCard />

      <div className="db-card" style={{ marginBottom: '1.5rem' }}>
        <div className="db-card-header">
          <h3 className="ftq-section-title">
            <i className="bi bi-book" aria-hidden />
            Technical Indicators Library
          </h3>
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
                <button type="button" className="ftq-btn-ghost">
                  {c.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CoursePreviewSection
        title="Recommended Courses"
        subtitle="Risk management, quantitative analysis & algorithmic topics"
        courses={quantsCourses}
        viewAllHref="/learning-center"
      />
    </div>
  );
}
