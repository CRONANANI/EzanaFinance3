'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CRYPTO_STATS,
  COMMODITY_STATS,
  CRYPTO_ROWS_TOP20,
  COMMODITY_TABLE_ROWS,
  CRYPTO_TABLE_TABS,
  COMMODITY_TABLE_TABS,
  COMBINED_WINNERS,
  COMBINED_LOSERS,
  COMMUNITY_SENTIMENT_TOPICS,
  ONCHAIN,
  SUPPLY_DEMAND,
  CRYPTO_NEWS,
  COMM_NEWS,
} from '@/lib/alternative-markets-mock';
import { ResearchSparkline } from '@/components/research/ResearchSparkline';
import { getCoursesByTrack, getLevelLabel } from '@/lib/learning-curriculum';

import '../../../../app-legacy/assets/css/theme.css';
import '../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../app-legacy/assets/css/pages-common.css';
import '../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../app-legacy/pages/home-dashboard.css';
import '../../../../app-legacy/components/learning/learning-opportunities.css';
import './alternative-markets.css';

export default function AlternativeMarketsPage() {
  const [view, setView] = useState('crypto');
  const [tableTab, setTableTab] = useState('top');
  const [chartAsset, setChartAsset] = useState('Bitcoin (BTC)');
  const [chartCommodity, setChartCommodity] = useState('Crude Oil (WTI)');
  const [timeframe, setTimeframe] = useState('1M');

  const cryptoCourses = useMemo(() => getCoursesByTrack('crypto').slice(0, 4), []);
  const commodityCourses = useMemo(() => getCoursesByTrack('commodities').slice(0, 4), []);

  const filteredCryptoRows = useMemo(() => {
    if (tableTab === 'all') return CRYPTO_ROWS_TOP20;
    return CRYPTO_ROWS_TOP20.filter((r) => r.tier === tableTab);
  }, [tableTab]);

  const filteredCommodityRows = useMemo(() => {
    if (tableTab === 'all') return COMMODITY_TABLE_ROWS;
    return COMMODITY_TABLE_ROWS.filter((r) => r.category === tableTab);
  }, [tableTab]);

  const chartCryptoSeed = useMemo(
    () => chartAsset.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    [chartAsset]
  );
  const chartCommSeed = useMemo(
    () => chartCommodity.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    [chartCommodity]
  );

  const stats = view === 'crypto' ? CRYPTO_STATS : COMMODITY_STATS;
  const news = view === 'crypto' ? CRYPTO_NEWS : COMM_NEWS;
  const tableTabs = view === 'crypto' ? CRYPTO_TABLE_TABS : COMMODITY_TABLE_TABS;

  return (
    <div className="dashboard-page-inset am-page db-page">
      <div className="am-header-row">
        <div className="am-title-block">
          <h1>Alternative Markets</h1>
          <p>Research digital assets and commodity markets</p>
        </div>
        <div className="am-toggle" role="group" aria-label="Market type">
          <button
            type="button"
            className={view === 'crypto' ? 'active' : ''}
            onClick={() => {
              setView('crypto');
              setTableTab('top');
            }}
          >
            Crypto
          </button>
          <button
            type="button"
            className={view === 'commodities' ? 'active' : ''}
            onClick={() => {
              setView('commodities');
              setTableTab('all');
            }}
          >
            Commodities
          </button>
        </div>
      </div>

      <div className="am-stat-grid">
        {stats.map((s) => (
          <div key={s.id} className="am-stat-card">
            <div className="am-stat-icon" aria-hidden>
              {s.icon}
            </div>
            <div className="am-stat-label">{s.label}</div>
            <div className="am-stat-price">{s.price}</div>
            <div className={`am-stat-chg ${s.positive ? 'up' : 'down'}`}>{s.change}</div>
          </div>
        ))}
      </div>

      <div className="am-row-60-40">
        <div className="db-card">
          <div className="db-card-header">
            <h3>{view === 'crypto' ? '📊 Crypto Prices' : '📊 Commodity Prices'}</h3>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
              {view === 'crypto' ? '24h · Top 20' : 'Live prices'}
            </span>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <div className="am-tabs">
              {tableTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`am-tab ${tableTab === t.id ? 'active' : ''}`}
                  onClick={() => setTableTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="am-table-wrap">
              {view === 'crypto' ? (
                <>
                  <div className="am-table-head">
                    <span>Asset</span>
                    <span>Price</span>
                    <span>24h</span>
                    <span>Mkt cap</span>
                    <span />
                  </div>
                  {filteredCryptoRows.map((row) => {
                    const seed = row.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                    return (
                      <div key={row.name} className="am-table-row">
                        <div>
                          <div className="am-td-name">{row.name}</div>
                        </div>
                        <span className="am-td-num">{row.price}</span>
                        <span className={`am-td-chg ${row.pos ? 'up' : 'down'}`}>
                          {row.pos ? '▲' : '▼'} {row.chg}
                        </span>
                        <span className="am-td-num">{row.mcap}</span>
                        <div className="am-spark">
                          <ResearchSparkline seed={seed} height={28} />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <div className="am-table-head">
                    <span>Contract</span>
                    <span>Price</span>
                    <span>24h</span>
                    <span>Volume</span>
                    <span />
                  </div>
                  {filteredCommodityRows.map((row) => (
                    <div key={row.name} className="am-table-row">
                      <div>
                        <div className="am-td-name">{row.ticker}</div>
                        <div className="am-td-sub">{row.name}</div>
                      </div>
                      <span className="am-td-num">{row.price}</span>
                      <span className={`am-td-chg ${row.pos ? 'up' : 'down'}`}>
                        {row.pos ? '▲' : '▼'} {row.chg}
                      </span>
                      <span className="am-td-num">{row.volLabel}</span>
                      <div className="am-spark">
                        <ResearchSparkline seed={row.sparkSeed} height={28} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="db-card am-movers-card">
          <div className="db-card-header">
            <h3>📊 Movers (24h)</h3>
            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Crypto + commodities</span>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <h4>🚀 Biggest Winners (24h)</h4>
            {COMBINED_WINNERS.map((w) => (
              <div key={w.sym} className="am-mover-line">
                <span className="am-mover-rank">{w.rank}</span>
                <span style={{ fontWeight: 800, color: '#f0f6fc' }}>{w.sym}</span>
                <span className="am-td-chg up">
                  ▲ {w.chg} {w.price}
                </span>
              </div>
            ))}
            <h4 className="losers">📉 Biggest Losers (24h)</h4>
            {COMBINED_LOSERS.map((w) => (
              <div key={w.sym} className="am-mover-line">
                <span className="am-mover-rank">{w.rank}</span>
                <span style={{ fontWeight: 800, color: '#f0f6fc' }}>{w.sym}</span>
                <span className="am-td-chg down">
                  ▼ {w.chg} {w.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="am-row-50">
        <div className="db-card">
          <div className="db-card-header">
            <h3>📈 Price chart</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <label className="am-stat-label" style={{ display: 'block', marginBottom: '0.35rem' }} htmlFor="am-chart-select">
              Select {view === 'crypto' ? 'asset' : 'contract'}
            </label>
            <select
              id="am-chart-select"
              className="am-chart-select"
              value={view === 'crypto' ? chartAsset : chartCommodity}
              onChange={(e) =>
                view === 'crypto' ? setChartAsset(e.target.value) : setChartCommodity(e.target.value)
              }
            >
              {view === 'crypto'
                ? CRYPTO_ROWS_TOP20.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))
                : COMMODITY_TABLE_ROWS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
            </select>
            <div className="am-tf-group">
              {['1D', '1W', '1M', '3M', '1Y'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  className={`am-tf ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(16, 185, 129, 0.1)',
                background: 'rgba(0,0,0,0.12)',
              }}
            >
              <ResearchSparkline
                seed={(view === 'crypto' ? chartCryptoSeed : chartCommSeed) + timeframe.charCodeAt(0)}
                height={140}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0 0' }}>
              Mock series · connect market data API for live prices ({timeframe}).
            </p>
          </div>
        </div>

        <div className="db-card">
          <div className="db-card-header">
            <h3>💬 Community Sentiment</h3>
          </div>
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem', fontWeight: 600 }}>
              Top discussions right now
            </p>
            {COMMUNITY_SENTIMENT_TOPICS.map((topic) => (
              <div key={topic.id} className="am-sentiment-topic">
                <p className="am-sentiment-title">
                  {topic.id}. {topic.title}
                </p>
                <p className="am-sentiment-count">{topic.discussing} people discussing</p>
                <div className="am-sent-row">
                  <span className="am-sent-label">Bullish</span>
                  <div className="am-sent-bar-track">
                    <div
                      className="am-sent-bar-fill bull"
                      style={{ width: `${topic.bullishPct}%` }}
                    />
                  </div>
                  <span className="am-sent-pct" style={{ color: '#10b981' }}>
                    {topic.bullishPct}%
                  </span>
                </div>
                <div className="am-sent-row">
                  <span className="am-sent-label">Bearish</span>
                  <div className="am-sent-bar-track">
                    <div
                      className="am-sent-bar-fill bear"
                      style={{ width: `${topic.bearishPct}%` }}
                    />
                  </div>
                  <span className="am-sent-pct" style={{ color: '#f87171' }}>
                    {topic.bearishPct}%
                  </span>
                </div>
              </div>
            ))}
            <Link href="/community" className="am-join-link">
              Join discussion <i className="bi bi-arrow-right" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>{view === 'crypto' ? '⛓️ On-chain snapshot' : '📦 Supply & demand'}</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          {view === 'crypto' ? (
            <>
              <div className="am-onchain-block">
                <p className="am-onchain-title">Bitcoin</p>
                {ONCHAIN.btc.map((row) => (
                  <div key={row.label} className="am-onchain-row">
                    <span className="am-onchain-label">{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                ))}
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.35rem 0 0' }}>{ONCHAIN.btcNote}</p>
              </div>
              <div className="am-onchain-block">
                <p className="am-onchain-title">Ethereum</p>
                {ONCHAIN.eth.map((row) => (
                  <div key={row.label} className="am-onchain-row">
                    <span className="am-onchain-label">{row.label}</span>
                    <span>{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="am-onchain-title" style={{ marginTop: '0.5rem' }}>
                Whale activity (24h)
              </p>
              {ONCHAIN.whales.map((w) => (
                <div key={w} className="am-whale">
                  {w}
                </div>
              ))}
            </>
          ) : (
            <>
              {SUPPLY_DEMAND.map((line) => (
                <p key={line} style={{ fontSize: '0.875rem', color: '#d1d5db', margin: '0.5rem 0', lineHeight: 1.45 }}>
                  • {line}
                </p>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="db-card" style={{ marginBottom: '1.25rem' }}>
        <div className="db-card-header">
          <h3>{view === 'crypto' ? '📰 Crypto news' : '📰 Commodity news'}</h3>
        </div>
        <div style={{ padding: '0 1.25rem 1.25rem' }}>
          <div className="am-news-wrap">
            {news.map((n) => (
              <div key={n.title} className="am-news-item">
                <p className="am-news-title">{n.title}</p>
                <p className="am-news-meta">
                  {n.source} · {n.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="learning-opportunities">
        <div className="learning-header">
          <div className="learning-title-area">
            <div className="learning-icon">
              <i className="bi bi-mortarboard-fill" />
            </div>
            <div className="learning-title-text">
              <h3>{view === 'crypto' ? 'Cryptocurrency & Digital Assets' : 'Commodities'}</h3>
              <p>
                {view === 'crypto'
                  ? 'Courses from Track 2 — Crypto & digital assets'
                  : 'Courses from Track 4 — Commodity markets'}
              </p>
            </div>
          </div>
          <Link href="/learning-center" className="view-all-btn">
            View all courses
          </Link>
        </div>
        <div className="courses-grid">
          {(view === 'crypto' ? cryptoCourses : commodityCourses).map((c) => {
            const levelUi = c.level === 'basic' ? 'beginner' : c.level === 'expert' ? 'advanced' : c.level;
            return (
            <div key={c.id} className="course-card">
              <div className="course-header">
                <span className="course-type">Course</span>
                <span className="course-duration">
                  <i className="bi bi-clock" /> {c.duration_minutes} min
                </span>
              </div>
              <h4 className="course-title">{c.title}</h4>
              <p className="course-description">{c.description}</p>
              <div className="course-meta">
                <div className="meta-item">
                  <i className="bi bi-book" /> Quiz included
                </div>
                <div className="meta-item">
                  <i className="bi bi-layers" /> {getLevelLabel(c.level)}
                </div>
              </div>
              <div className="course-footer">
                <span className={`course-level ${levelUi}`}>{getLevelLabel(c.level)}</span>
                <Link href={`/learning-center/course/${c.id}`} className="enroll-btn" style={{ textAlign: 'center' }}>
                  Open course
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
