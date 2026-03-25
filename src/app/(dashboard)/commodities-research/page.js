'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  COMMODITY_STATS,
  COMMODITY_ROWS,
  COMMODITY_MOVERS,
  SUPPLY_DEMAND,
  COMM_NEWS,
  COMMUNITY_POSTS,
} from '@/lib/commodities-research-mock';
import { ResearchSparkline } from '@/components/research/ResearchSparkline';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import './commodities-research.css';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'energy', label: 'Energy' },
  { id: 'metals', label: 'Metals' },
  { id: 'ag', label: 'Agriculture' },
];

export default function CommoditiesResearchPage() {
  const [tab, setTab] = useState('all');
  const [chartCommodity, setChartCommodity] = useState('Crude Oil (WTI)');
  const [timeframe, setTimeframe] = useState('1M');

  const filteredRows = useMemo(() => {
    if (tab === 'all') return COMMODITY_ROWS;
    return COMMODITY_ROWS.filter((r) => r.category === tab);
  }, [tab]);

  const chartSeed = useMemo(
    () => chartCommodity.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    [chartCommodity]
  );

  return (
    <div className="dashboard-page-inset cm-page">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="cm-header-title">Commodities Research</h1>
        <p className="cm-header-desc">
          Track prices, trends, and fundamentals across global commodity markets
        </p>
      </header>

      <div className="ra-stat-grid">
        {COMMODITY_STATS.map((s) => (
          <div key={s.id} className="ra-stat-card">
            <div className="ra-stat-icon" aria-hidden>{s.icon}</div>
            <div className="ra-stat-label">{s.label}</div>
            <div className="ra-stat-price">{s.price}</div>
            <div className={`ra-stat-chg ${s.positive ? 'up' : 'down'}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="ra-row-60-40">
        <div className="db-card">
          <div className="db-card-header">
            <h3>📊 Commodity Prices</h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Live Prices</span>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="ra-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`ra-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ra-table-wrap">
              {filteredRows.map((row) => (
                <div key={row.name} className="ra-table-row">
                  <span className="ra-td-name">{row.name}</span>
                  <span className="ra-td-price">{row.price}</span>
                  <span className={`ra-td-chg ${row.pos ? 'up' : 'down'}`}>
                    {row.pos ? '▲' : '▼'} {row.chg}
                  </span>
                  <div className="ra-bar">
                    <div className="ra-bar-fill" style={{ width: `${row.bar}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>🔥 Today&apos;s Biggest Movers</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {COMMODITY_MOVERS.map((m) => (
              <div key={m.name} className="ra-mover-row">
                <span className={m.pos ? 'ra-td-chg up' : 'ra-td-chg down'} style={{ fontWeight: 700 }}>
                  {m.pos ? '▲' : '▼'} {m.name} {m.chg}
                </span>
                {' '}
                <span style={{ color: '#6b7280' }}>{m.note}</span>
              </div>
            ))}
            <hr className="ra-divider" />
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', margin: '0 0 0.5rem' }}>
              Supply &amp; Demand Watch
            </p>
            {SUPPLY_DEMAND.map((line) => (
              <p key={line} style={{ fontSize: '0.8125rem', color: '#d1d5db', margin: '0.35rem 0' }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="ra-row-50">
        <div className="db-card">
          <div className="db-card-header">
            <h3>📈 Commodity Charts</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <label className="ra-stat-label" style={{ display: 'block', marginBottom: '0.35rem' }} htmlFor="cm-chart-select">
              Select commodity
            </label>
            <select
              id="cm-chart-select"
              className="ra-chart-select"
              value={chartCommodity}
              onChange={(e) => setChartCommodity(e.target.value)}
            >
              {COMMODITY_ROWS.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
            <div className="ra-tf-group">
              {['1D', '1W', '1M', '3M', '1Y'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`ra-tf ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(0,0,0,0.12)' }}>
              <ResearchSparkline seed={chartSeed + timeframe.charCodeAt(0)} height={140} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0' }}>
              Mock price history for {chartCommodity} · {timeframe} (connect market data API for live series).
            </p>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>💬 Community on Commodities</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#f0f6fc', margin: '0 0 0.25rem', fontWeight: 600 }}>Most Discussed: Oil</p>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem' }}>234 mentions this week</p>
            <p style={{ fontSize: '0.875rem', color: '#f0f6fc', margin: '0 0 0.25rem', fontWeight: 600 }}>Trending: &quot;Gold as inflation hedge&quot;</p>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem' }}>89 discussions</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.35rem' }}>Community Sentiment on Oil</p>
            <div className="ra-sentiment-bar">
              <div className="ra-sentiment-fill" style={{ width: '76%' }} />
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600, margin: '0 0 1rem' }}>Bullish 76%</p>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', margin: '0 0 0.5rem' }}>Latest Posts</p>
            {COMMUNITY_POSTS.map((p) => (
              <p key={p.author} style={{ fontSize: '0.8125rem', color: '#d1d5db', margin: '0.35rem 0' }}>
                {p.text} — {p.author}
              </p>
            ))}
            <Link href="/community" className="ra-join-link">
              Join Discussion →
            </Link>
          </div>
        </div>
      </div>

      <div className="db-card">
        <div className="db-card-header">
          <h3>📰 Commodity News</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="ra-news-wrap">
            {COMM_NEWS.map((n) => (
              <div key={n.title} className="ra-news-item">
                <p className="ra-news-title">{n.title}</p>
                <p className="ra-news-meta">{n.source} · {n.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
