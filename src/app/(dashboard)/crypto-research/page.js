'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CRYPTO_STATS,
  CRYPTO_ROWS,
  ONCHAIN,
  TRENDING_PROJECTS,
  CRYPTO_NEWS,
} from '@/lib/crypto-research-mock';
import { ResearchSparkline } from '@/components/research/ResearchSparkline';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import './crypto-research.css';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'top', label: 'Top 20' },
  { id: 'defi', label: 'DeFi' },
  { id: 'l1', label: 'Layer 1' },
  { id: 'meme', label: 'Memecoins' },
];

export default function CryptoResearchPage() {
  const [tab, setTab] = useState('top');
  const [chartAsset, setChartAsset] = useState('Bitcoin (BTC)');
  const [timeframe, setTimeframe] = useState('1M');

  const filteredRows = useMemo(() => {
    if (tab === 'all') return CRYPTO_ROWS;
    return CRYPTO_ROWS.filter((r) => r.tier === tab);
  }, [tab]);

  const chartSeed = useMemo(
    () => chartAsset.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    [chartAsset]
  );

  return (
    <div className="dashboard-page-inset cr-page">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 className="cr-header-title">Crypto Research</h1>
        <p className="cr-header-desc">
          Analyze digital assets, on-chain data, and market trends
        </p>
      </header>

      <div className="cr-stat-grid">
        {CRYPTO_STATS.map((s) => (
          <div key={s.id} className="cr-stat-card">
            <div className="cr-stat-icon" aria-hidden>{s.icon}</div>
            <div className="cr-stat-label">{s.label}</div>
            <div className="cr-stat-price">{s.price}</div>
            <div className={`cr-stat-chg ${s.positive ? 'up' : 'down'}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="cr-row-60-40">
        <div className="db-card">
          <div className="db-card-header">
            <h3>📊 Crypto Prices</h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>24h Change</span>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="cr-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`cr-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="cr-table-wrap">
              <div className="cr-table-head">
                <span>Asset</span>
                <span>Price</span>
                <span>24h</span>
                <span>Mkt Cap</span>
              </div>
              {filteredRows.map((row) => (
                <div key={row.name} className="cr-table-row">
                  <span className="cr-td-name">{row.name}</span>
                  <span className="cr-td-num">{row.price}</span>
                  <span className={`cr-td-chg ${row.pos ? 'up' : 'down'}`}>
                    {row.pos ? '▲' : '▼'} {row.chg}
                  </span>
                  <span className="cr-td-num">{row.mcap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>⛓️ On-Chain Data</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="cr-onchain-block">
              <p className="cr-onchain-title">Bitcoin</p>
              {ONCHAIN.btc.map((row) => (
                <div key={row.label} className="cr-onchain-row">
                  <span className="cr-onchain-label">{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.35rem 0 0' }}>{ONCHAIN.btcNote}</p>
            </div>
            <div className="cr-onchain-block">
              <p className="cr-onchain-title">Ethereum</p>
              {ONCHAIN.eth.map((row) => (
                <div key={row.label} className="cr-onchain-row">
                  <span className="cr-onchain-label">{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="cr-onchain-block">
              <p className="cr-onchain-title">Whale Activity (24h)</p>
              {ONCHAIN.whales.map((w) => (
                <div key={w} className="cr-whale">{w}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="cr-row-3">
        <div className="db-card">
          <div className="db-card-header">
            <h3>📈 Crypto Charts</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <label className="cr-stat-label" style={{ display: 'block', marginBottom: '0.35rem' }} htmlFor="cr-chart-select">
              Select asset
            </label>
            <select
              id="cr-chart-select"
              className="cr-chart-select"
              value={chartAsset}
              onChange={(e) => setChartAsset(e.target.value)}
            >
              {CRYPTO_ROWS.filter((r) => r.tier === 'top').map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
            <div className="cr-tf-group">
              {['1D', '1W', '1M', '3M', '1Y'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`cr-tf ${timeframe === tf ? 'active' : ''}`}
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
              Mock series for {chartAsset} · {timeframe}
            </p>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>💬 Community on Crypto</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#f0f6fc', margin: '0 0 0.25rem', fontWeight: 600 }}>Most Discussed: Bitcoin</p>
            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 1rem' }}>567 mentions this week</p>
            <p style={{ fontSize: '0.875rem', color: '#f0f6fc', margin: '0 0 1rem', fontWeight: 600 }}>Hot Topic: &quot;ETH ETF approval?&quot;</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.35rem' }}>BTC Sentiment</p>
            <div className="cr-sentiment-bar">
              <div className="cr-sentiment-fill" style={{ width: '68%' }} />
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600, margin: '0 0 0' }}>Bullish 68%</p>
            <Link href="/community" className="cr-join-link">
              Join Discussion →
            </Link>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>🔥 Trending This Week</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {TRENDING_PROJECTS.map((t) => (
              <div key={t.rank} className="cr-trend-row">
                <span className="cr-trend-rank">{t.rank}</span>
                <span style={{ fontWeight: 700, color: '#f0f6fc' }}>{t.name}</span>
                <span style={{ color: '#6b7280' }}>{t.note}</span>
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.75rem 0 0' }}>
              Based on social mentions + volume (mock).
            </p>
          </div>
        </div>
      </div>

      <div className="db-card">
        <div className="db-card-header">
          <h3>📰 Crypto News</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="cr-news-wrap">
            {CRYPTO_NEWS.map((n) => (
              <div key={n.title} className="cr-news-item">
                <p className="cr-news-title">{n.title}</p>
                <p className="cr-news-meta">{n.source} · {n.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
