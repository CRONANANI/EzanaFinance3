'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LEADERBOARD, TRENDING_MARKETS, BETTING_ANALYTICS } from '@/lib/for-the-quants-mock-data';
import { QuantLabWorkbench } from '@/components/quants/lab/QuantLabWorkbench';
import { PortfolioRiskCard } from '@/components/quants/lab/PortfolioRiskCard';
import { EventStudyCard } from '@/components/quants/lab/EventStudyCard';
import { DatasetRegistryCard } from '@/components/quants/DatasetRegistryCard';
import { TechnicalScannerCard } from '@/components/quants/TechnicalScannerCard';
import { CorrelationMatrixCard } from '@/components/quants/CorrelationMatrixCard';
import { FactorLabCard } from '@/components/quants/lab/FactorLabCard';
import { PairsTradingCard } from '@/components/quants/PairsTradingCard';
import { CoursePreviewSection } from '@/components/learning/CoursePreviewSection';
import { getCoursesForQuantsPreview } from '@/lib/learning-curriculum';

/* StrategyComparisonCard renders Recharts charts and sits well below the fold
   on this long page. Defer it so Recharts leaves the route's critical bundle;
   the reserved height ≈ the card's footprint. */
const StrategyComparisonCard = dynamic(
  () =>
    import('@/components/quants/StrategyComparisonCard').then((m) => ({
      default: m.StrategyComparisonCard,
    })),
  { ssr: false, loading: () => <div aria-hidden style={{ minHeight: 360, width: '100%' }} /> },
);

/* The Model Library sits at the foot of the page: defer it too. */
const ModelLibraryCard = dynamic(
  () =>
    import('@/components/quants/model-library/ModelLibraryCard').then((m) => ({
      default: m.ModelLibraryCard,
    })),
  { ssr: false, loading: () => <div aria-hidden style={{ minHeight: 520, width: '100%' }} /> },
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
import './model-library.css';
import './quant-lab.css';
import './quant-risk.css';
import './quant-factors.css';

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
  const [pmQuery, setPmQuery] = useState('');
  const [leaderPeriod, setLeaderPeriod] = useState('month');
  const [simSeed, setSimSeed] = useState(7); // re-roll → new simulated backtest run

  const handlePmLookup = () => {
    if (!pmQuery.trim()) return;
    router.push(`/betting-markets?trader=${encodeURIComponent(pmQuery.trim())}`);
  };

  return (
    <div className="dashboard-page-inset ftq-page">
      <header className="ftq-header">
        <h1 className="ftq-title">Ezana Quant Lab</h1>
        <p className="ftq-subtitle">Research. Validate. Deploy.</p>
      </header>

      <QuantLabWorkbench />

      {/* ===== Strategy Simulation (animated) ===== */}
      <section className="ftq-sim-section" aria-label="Strategy simulation visuals">
        <div className="ftq-sim-section-head">
          <h3 className="ftq-section-title">
            <i className="bi bi-activity" aria-hidden />
            Strategy Simulation
          </h3>
          <span className="ql-tag">Sample data</span>
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
            <span className="ql-tag">Sample data</span>
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
                </div>
              </div>
            ))}
            <Link href="/for-the-quants#ftq-leaderboard" className="ftq-view-all">
              View All Strategies →
            </Link>
          </div>
        </div>

        <PortfolioRiskCard />
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
                className="ftq-pm-input ds-search-input"
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

      <EventStudyCard />

      <CorrelationMatrixCard />

      <FactorLabCard />

      <ModelLibraryCard />

      <CoursePreviewSection
        title="Recommended Courses"
        subtitle="Risk management, quantitative analysis & algorithmic topics"
        courses={quantsCourses}
        viewAllHref="/learning-center"
      />
    </div>
  );
}
