'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useMemo } from 'react';

import '../../../../../app-legacy/assets/css/theme.css';
import '../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../app-legacy/assets/css/light-mode-fixes.css';
import './politician-profile.css';

/* ── Demo politician database ── */
const POLITICIANS = {
  'nancy-pelosi': {
    name: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', state: 'California', district: 'District 11', initials: 'NP',
    role: 'Representative', yearsInOffice: '1987 – Present', age: 85, committees: 'Appropriations Committee',
    committeeUrl: 'https://clerk.house.gov/members/P000197',
    totalValue: 3036028, monthlyChange: 2.9, avgReportingTime: 28,
    topIndustry: { name: 'Technology', pct: 52 },
    ytdReturns: 18.4, ytdDollar: 483200,
    similarTraders: [
      { slug: 'mark-warner', name: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', initials: 'MW', overlap: 72 },
      { slug: 'dan-crenshaw', name: 'Dan Crenshaw', party: 'Republican', chamber: 'House', state: 'TX', initials: 'DC', overlap: 61 },
      { slug: 'josh-gottheimer', name: 'Josh Gottheimer', party: 'Democrat', chamber: 'House', state: 'NJ', initials: 'JG', overlap: 54 },
    ],
    perfData: { '1M': { returnPct: 2.4 }, '3M': { returnPct: 8.1 }, '6M': { returnPct: 14.2 }, '1Y': { returnPct: 18.4 }, 'All': { returnPct: 54.3 } },
    holdings: [
      { ticker: 'NVDA', name: 'NVIDIA Corp', value: 1200000, pct: 39.5, change: 12.4 },
      { ticker: 'AAPL', name: 'Apple Inc', value: 580000, pct: 19.1, change: 5.2 },
      { ticker: 'RBLX', name: 'Roblox Corp', value: 450000, pct: 14.8, change: -3.1 },
      { ticker: 'MSFT', name: 'Microsoft Corp', value: 320000, pct: 10.5, change: 8.7 },
      { ticker: 'GOOGL', name: 'Alphabet Inc', value: 280000, pct: 9.2, change: 4.3 },
      { ticker: 'CRM', name: 'Salesforce Inc', value: 206028, pct: 6.9, change: -1.2 },
    ],
    trades: [
      { date: 'Mar 10, 2026', ticker: 'NVDA', type: 'BUY', amount: '1M–5M', price: '$875.20' },
      { date: 'Mar 5, 2026', ticker: 'RBLX', type: 'BUY', amount: '250K–500K', price: '$52.10' },
      { date: 'Feb 28, 2026', ticker: 'AAPL', type: 'SELL', amount: '100K–250K', price: '$198.40' },
      { date: 'Feb 20, 2026', ticker: 'MSFT', type: 'BUY', amount: '100K–250K', price: '$428.75' },
      { date: 'Feb 14, 2026', ticker: 'CRM', type: 'SELL', amount: '50K–100K', price: '$312.60' },
      { date: 'Feb 8, 2026', ticker: 'GOOGL', type: 'BUY', amount: '100K–250K', price: '$172.30' },
      { date: 'Jan 30, 2026', ticker: 'NVDA', type: 'BUY', amount: '500K–1M', price: '$812.45' },
      { date: 'Jan 22, 2026', ticker: 'AAPL', type: 'BUY', amount: '250K–500K', price: '$185.20' },
    ],
    filingStats: { avgReportingTime: 28, totalFilings: 8, timeliness: 'Late' },
  },
  'tommy-tuberville': {
    name: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'Alabama', district: null, initials: 'TT',
    role: 'Senator', yearsInOffice: '2021 – Present', age: 70, committees: 'Armed Services, Agriculture',
    committeeUrl: 'https://www.senate.gov/senators/tuberville',
    totalValue: 1280000, monthlyChange: -1.4, avgReportingTime: 41,
    topIndustry: { name: 'Consumer Staples', pct: 42 },
    ytdReturns: -12.8, ytdDollar: -163840,
    similarTraders: [
      { slug: 'dan-crenshaw', name: 'Dan Crenshaw', party: 'Republican', chamber: 'House', state: 'TX', initials: 'DC', overlap: 78 },
      { slug: 'mark-warner', name: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', initials: 'MW', overlap: 65 },
      { slug: 'josh-gottheimer', name: 'Josh Gottheimer', party: 'Democrat', chamber: 'House', state: 'NJ', initials: 'JG', overlap: 52 },
    ],
    perfData: { '1M': { returnPct: -1.4 }, '3M': { returnPct: -8.2 }, '6M': { returnPct: -22.5 }, '1Y': { returnPct: -38.7 }, 'All': { returnPct: -53.0 } },
    holdings: [
      { ticker: 'KMB', name: 'Kimberly-Clark', value: 380000, pct: 29.7, change: -2.1 },
      { ticker: 'HPQ', name: 'HP Inc', value: 240000, pct: 18.8, change: -4.3 },
      { ticker: 'CLX', name: 'Clorox Co', value: 210000, pct: 16.4, change: -1.8 },
      { ticker: 'PG', name: 'Procter & Gamble', value: 190000, pct: 14.8, change: 1.2 },
      { ticker: 'JNJ', name: 'Johnson & Johnson', value: 160000, pct: 12.5, change: 0.5 },
      { ticker: 'MRK', name: 'Merck & Co', value: 100000, pct: 7.8, change: 3.9 },
    ],
    trades: [
      { date: 'Mar 11, 2026', ticker: 'KMB', type: 'SELL', amount: '100K–250K', price: '$142.80' },
      { date: 'Mar 11, 2026', ticker: 'HPQ', type: 'SELL', amount: '15K–50K', price: '$32.15' },
      { date: 'Mar 10, 2026', ticker: 'CLX', type: 'SELL', amount: '1K–15K', price: '$148.90' },
      { date: 'Mar 10, 2026', ticker: 'CLX', type: 'SELL', amount: '15K–50K', price: '$148.90' },
      { date: 'Mar 9, 2026', ticker: 'CLX', type: 'SELL', amount: '15K–50K', price: '$147.25' },
      { date: 'Mar 5, 2026', ticker: 'PG', type: 'BUY', amount: '50K–100K', price: '$168.40' },
    ],
    filingStats: { avgReportingTime: 41, totalFilings: 2, timeliness: 'Late' },
  },
  'dan-crenshaw': {
    name: 'Dan Crenshaw', party: 'Republican', chamber: 'House', state: 'Texas', district: 'District 2', initials: 'DC',
    role: 'Representative', yearsInOffice: '2019 – Present', age: 40, committees: 'Energy and Commerce',
    committeeUrl: 'https://clerk.house.gov/members/C001120',
    totalValue: 890000, monthlyChange: 3.8, avgReportingTime: 18,
    topIndustry: { name: 'Technology', pct: 38 },
    ytdReturns: 8.2, ytdDollar: 72980,
    similarTraders: [
      { slug: 'tommy-tuberville', name: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', initials: 'TT', overlap: 65 },
      { slug: 'nancy-pelosi', name: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'NP', overlap: 58 },
      { slug: 'mark-warner', name: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', initials: 'MW', overlap: 49 },
    ],
    perfData: { '1M': { returnPct: 3.2 }, '3M': { returnPct: 8.5 }, '6M': { returnPct: 14.1 }, '1Y': { returnPct: 22.8 }, 'All': { returnPct: 38.7 } },
    holdings: [
      { ticker: 'AAPL', name: 'Apple Inc', value: 280000, pct: 31.5, change: 5.2 },
      { ticker: 'MSFT', name: 'Microsoft Corp', value: 220000, pct: 24.7, change: 8.7 },
      { ticker: 'AMZN', name: 'Amazon.com', value: 180000, pct: 20.2, change: 11.3 },
      { ticker: 'XOM', name: 'Exxon Mobil', value: 120000, pct: 13.5, change: -2.1 },
      { ticker: 'CVX', name: 'Chevron Corp', value: 90000, pct: 10.1, change: -3.5 },
    ],
    trades: [
      { date: 'Mar 8, 2026', ticker: 'AAPL', type: 'BUY', amount: '100K–250K', price: '$192.30' },
      { date: 'Mar 2, 2026', ticker: 'AMZN', type: 'BUY', amount: '50K–100K', price: '$188.75' },
      { date: 'Feb 25, 2026', ticker: 'XOM', type: 'SELL', amount: '15K–50K', price: '$108.40' },
    ],
    filingStats: { avgReportingTime: 18, totalFilings: 4, timeliness: 'On Time' },
  },
  'mark-warner': {
    name: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'Virginia', district: null, initials: 'MW',
    role: 'Senator', yearsInOffice: '2009 – Present', age: 71, committees: 'Intelligence, Banking',
    committeeUrl: 'https://www.senate.gov/senators/warner',
    totalValue: 2140000, monthlyChange: 1.2, avgReportingTime: 22,
    topIndustry: { name: 'Technology', pct: 48 },
    ytdReturns: 5.4, ytdDollar: 115560,
    similarTraders: [
      { slug: 'nancy-pelosi', name: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'NP', overlap: 68 },
      { slug: 'ro-khanna', name: 'Ro Khanna', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'RK', overlap: 55 },
      { slug: 'josh-gottheimer', name: 'Josh Gottheimer', party: 'Democrat', chamber: 'House', state: 'NJ', initials: 'JG', overlap: 51 },
    ],
    perfData: { '1M': { returnPct: 1.2 }, '3M': { returnPct: 3.8 }, '6M': { returnPct: 6.9 }, '1Y': { returnPct: 9.4 }, 'All': { returnPct: 41.2 } },
    holdings: [
      { ticker: 'META', name: 'Meta Platforms', value: 520000, pct: 24.3, change: 6.8 },
      { ticker: 'CRM', name: 'Salesforce Inc', value: 380000, pct: 17.8, change: 4.2 },
      { ticker: 'SNOW', name: 'Snowflake Inc', value: 310000, pct: 14.5, change: -8.4 },
      { ticker: 'MSFT', name: 'Microsoft Corp', value: 420000, pct: 19.6, change: 8.7 },
      { ticker: 'GOOGL', name: 'Alphabet Inc', value: 510000, pct: 23.8, change: 4.3 },
    ],
    trades: [
      { date: 'Mar 6, 2026', ticker: 'META', type: 'SELL', amount: '50K–100K', price: '$512.80' },
      { date: 'Feb 28, 2026', ticker: 'CRM', type: 'BUY', amount: '100K–250K', price: '$318.40' },
      { date: 'Feb 18, 2026', ticker: 'SNOW', type: 'SELL', amount: '50K–100K', price: '$172.15' },
      { date: 'Feb 10, 2026', ticker: 'GOOGL', type: 'BUY', amount: '100K–250K', price: '$168.90' },
    ],
    filingStats: { avgReportingTime: 22, totalFilings: 6, timeliness: 'On Time' },
  },
  'josh-gottheimer': {
    name: 'Josh Gottheimer', party: 'Democrat', chamber: 'House', state: 'New Jersey', district: 'District 5', initials: 'JG',
    role: 'Representative', yearsInOffice: '2017 – Present', age: 49, committees: 'Financial Services',
    committeeUrl: 'https://clerk.house.gov/members/G000583',
    totalValue: 640000, monthlyChange: 2.1, avgReportingTime: 15,
    topIndustry: { name: 'Technology', pct: 62 },
    ytdReturns: 11.2, ytdDollar: 71680,
    similarTraders: [
      { slug: 'nancy-pelosi', name: 'Nancy Pelosi', party: 'Democrat', chamber: 'House', state: 'CA', initials: 'NP', overlap: 54 },
      { slug: 'mark-warner', name: 'Mark Warner', party: 'Democrat', chamber: 'Senate', state: 'VA', initials: 'MW', overlap: 51 },
      { slug: 'tommy-tuberville', name: 'Tommy Tuberville', party: 'Republican', chamber: 'Senate', state: 'AL', initials: 'TT', overlap: 52 },
    ],
    perfData: { '1M': { returnPct: 2.1 }, '3M': { returnPct: 5.4 }, '6M': { returnPct: 9.2 }, '1Y': { returnPct: 14.2 }, 'All': { returnPct: 46.1 } },
    holdings: [
      { ticker: 'MSFT', name: 'Microsoft Corp', value: 280000, pct: 43.8, change: 8.7 },
      { ticker: 'GOOGL', name: 'Alphabet Inc', value: 210000, pct: 32.8, change: 4.3 },
      { ticker: 'JPM', name: 'JPMorgan Chase', value: 150000, pct: 23.4, change: 7.5 },
    ],
    trades: [
      { date: 'Mar 4, 2026', ticker: 'MSFT', type: 'BUY', amount: '15K–50K', price: '$425.10' },
      { date: 'Feb 22, 2026', ticker: 'GOOGL', type: 'BUY', amount: '15K–50K', price: '$170.40' },
    ],
    filingStats: { avgReportingTime: 15, totalFilings: 3, timeliness: 'On Time' },
  },
};

function formatUSD(n) {
  if (n >= 1e6) return `US$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `US$${(n / 1e3).toFixed(1)}K`;
  return `US$${n.toLocaleString()}`;
}

/* ── Performance chart paths per timeframe (downward = negative returns) ── */
const PERF_PATHS = {
  '1M': 'M0,120 L100,115 L200,125 L300,110 L400,118 L500,105 L600,95',
  '3M': 'M0,130 L100,140 L200,125 L300,145 L400,130 L500,115 L600,100',
  '6M': 'M0,110 L100,130 L200,150 L300,165 L400,155 L500,140 L600,120',
  '1Y': 'M0,90 L100,110 L200,130 L300,155 L400,170 L500,165 L600,150',
  'All': 'M0,70 L100,95 L200,120 L300,150 L400,170 L500,175 L600,185',
};

const TIME_LABELS = {
  '1M': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  '3M': ['Jan', 'Feb', 'Mar'],
  '6M': ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
  '1Y': ['Apr', 'Jul', 'Oct', 'Jan', 'Apr'],
  'All': ['2021', '2022', '2023', '2024', '2025', '2026'],
};

function PerformanceChart({ perfData }) {
  const [perfTimeframe, setPerfTimeframe] = useState('All');
  const data = perfData[perfTimeframe];
  const returnPct = data.returnPct;
  const positive = returnPct >= 0;
  const color = positive ? '#10b981' : '#ef4444';
  const path = PERF_PATHS[perfTimeframe];
  const area = `${path} L600,200 L0,200 Z`;

  return (
    <div className="pp-perf">
      <div className="pp-perf-header">
        <h3>Portfolio Performance</h3>
        <div className="pp-perf-badge" style={{ color }}>
          <i className={`bi ${positive ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
          {positive ? '+' : ''}{returnPct}%
        </div>
      </div>
      <div className="pp-perf-timerange">
        {['1M', '3M', '6M', '1Y', 'All'].map((t) => (
          <button key={t} type="button" className={`pp-tr-btn ${perfTimeframe === t ? 'on' : ''}`} onClick={() => setPerfTimeframe(t)}>{t}</button>
        ))}
      </div>
      <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="pp-perf-svg">
        <defs>
          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#perfGrad)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="perf-chart-xaxis">
        {(TIME_LABELS[perfTimeframe] || []).map((label, i) => (
          <span key={i} className="perf-chart-xlabel">{label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut chart for holdings ── */
function HoldingsDonut({ holdings }) {
  const colors = ['#10b981', '#3b82f6', '#a78bfa', '#fbbf24', '#f87171', '#22d3ee'];
  const total = holdings.reduce((s, h) => s + h.value, 0);
  let cumulative = 0;
  const r = 40, cx = 50, cy = 50, circ = 2 * Math.PI * r;

  return (
    <div className="pp-donut-wrap">
      <svg viewBox="0 0 100 100" className="pp-donut-svg">
        {holdings.map((h, i) => {
          const pct = h.value / total;
          const offset = (cumulative / total) * circ;
          const length = pct * circ;
          cumulative += h.value;
          return (
            <circle key={h.ticker} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i % colors.length]}
              strokeWidth="12" strokeDasharray={`${length} ${circ - length}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} className="pp-donut-seg" />
          );
        })}
      </svg>
      <div className="pp-donut-legend">
        {holdings.map((h, i) => (
          <div key={h.ticker} className="pp-donut-item">
            <span className="pp-donut-color" style={{ background: colors[i % colors.length] }} />
            <Link href={`/company-research?ticker=${h.ticker}`} className="pp-donut-tk">{h.ticker}</Link>
            <span className="pp-donut-pct">{h.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PoliticianProfilePage() {
  const params = useParams();
  const slug = params?.slug;
  const [activeTab, setActiveTab] = useState('overview');
  const pol = slug ? POLITICIANS[slug] : null;

  if (!pol) {
    return (
      <div className="pp-page">
        <div className="pp-not-found">
          <i className="bi bi-person-x" />
          <h2>Politician Not Found</h2>
          <p>We don&apos;t have data for this congress member yet.</p>
          <Link href="/inside-the-capitol" className="pp-back-btn">
            <i className="bi bi-arrow-left" /> Back to Inside The Capitol
          </Link>
        </div>
      </div>
    );
  }

  const isPositive = pol.monthlyChange >= 0;

  return (
    <div className="pp-page">
      <Link href="/inside-the-capitol" className="pp-back">
        <i className="bi bi-arrow-left" /> Inside The Capitol
      </Link>

      <div
        className="pp-layout politician-profile-grid capitol-profile-grid"
        style={{
          /* gridTemplateColumns lives in CSS so @media can switch to 1fr on small screens */
          display: 'grid',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT SIDEBAR */}
        <div className="pp-sidebar">
          <div className="pp-avatar-section">
            <div className={`pp-avatar-xl ${pol.party.toLowerCase()}`}>{pol.initials}</div>
            <h1 className="pp-name">{pol.name}</h1>
            <div className="pp-badges">
              <Link href={`/inside-the-capitol?party=${pol.party.toLowerCase()}`} className="pp-badge-link">
                <span className={`pp-party-badge ${pol.party.toLowerCase()}`}>{pol.party}</span>
              </Link>
              <Link href={`/inside-the-capitol?state=${pol.state.toLowerCase().replace(/\s+/g, '-')}`} className="pp-badge-link">
                <span className="pp-state-badge">{pol.state}</span>
              </Link>
            </div>
            <p className="pp-role">{pol.role}{pol.district ? ` (${pol.district})` : ''}</p>
          </div>

          <div className="pp-info-card">
            <h4>Politician Info</h4>
            <div className="pp-info-row"><span className="pp-info-lbl">Role</span><span className="pp-info-val">{pol.role}</span></div>
            <div className="pp-info-row"><span className="pp-info-lbl">Years in Office</span><span className="pp-info-val">{pol.yearsInOffice}</span></div>
            <div className="pp-info-row"><span className="pp-info-lbl">Age</span><span className="pp-info-val">{pol.age} years</span></div>
            <div className="pp-info-row">
              <span className="pp-info-lbl">Committees</span>
              <a href={pol.committeeUrl} target="_blank" rel="noopener noreferrer" className="pp-info-link">{pol.committees}</a>
            </div>
          </div>

          <div className="pp-info-card">
            <h4>Filing Statistics</h4>
            <div className="pp-info-row"><span className="pp-info-lbl">Avg. Reporting Time</span><span className="pp-info-val">{pol.filingStats.avgReportingTime} days</span></div>
            <div className="pp-info-row"><span className="pp-info-lbl">Total Filings</span><span className="pp-info-val">{pol.filingStats.totalFilings}</span></div>
            <div className="pp-info-row"><span className="pp-info-lbl">Timeliness</span><span className={`pp-timeliness ${pol.filingStats.timeliness === 'On Time' ? 'good' : 'late'}`}>{pol.filingStats.timeliness}</span></div>
          </div>
        </div>

        {/* RIGHT MAIN */}
        <div className="pp-main">
          <div className="pp-overview-card">
            <div className="pp-ov-header">
              <h3>Portfolio Overview</h3>
              <span className="pp-ov-badge">Summary</span>
            </div>
            <div className="pp-ov-stats">
              <div className="pp-ov-stat">
                <span className="pp-ov-label">Total Value</span>
                <span className="pp-ov-value">US${pol.totalValue.toLocaleString()}</span>
              </div>
              <div className="pp-ov-stat">
                <span className="pp-ov-label">Monthly Change</span>
                <span className={`pp-ov-change ${isPositive ? 'up' : 'down'}`}>
                  <i className={`bi ${isPositive ? 'bi-arrow-up' : 'bi-arrow-down'}`} />
                  {isPositive ? '+' : ''}{pol.monthlyChange}%
                </span>
              </div>
              <div className="pp-ov-stat">
                <span className="pp-ov-label">Top Industry</span>
                <span className="pp-ov-value">{pol.topIndustry?.name || 'N/A'}</span>
                <span className="pp-ov-sub">{pol.topIndustry?.pct || 0}% of portfolio</span>
              </div>
              <div className="pp-ov-stat">
                <span className="pp-ov-label">YTD Returns</span>
                <span className={`pp-ov-value ${(pol.ytdReturns ?? 0) >= 0 ? 'up' : 'down'}`}>
                  {(pol.ytdReturns ?? 0) >= 0 ? '+' : ''}{pol.ytdReturns ?? 0}%
                </span>
                <span className="pp-ov-sub">{(pol.ytdDollar ?? 0) >= 0 ? '+' : ''}${Math.abs(pol.ytdDollar ?? 0).toLocaleString()}</span>
              </div>
            </div>
            {pol.similarTraders?.length > 0 && (
              <div className="pp-similar-traders">
                <span className="pp-similar-label">Most Similar Traders</span>
                <div className="pp-similar-row">
                  {pol.similarTraders.map((s) => (
                    <Link key={s.slug} href={`/inside-the-capitol/${s.slug}`} className="pp-similar-item">
                      <div className={`pp-similar-avatar ${s.party.toLowerCase()}`}>{s.initials}</div>
                      <span className="pp-similar-name">{s.name}</span>
                      <span className="pp-similar-pct">{s.overlap}%</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <PerformanceChart perfData={pol.perfData} />

          <div className="pp-bottom-grid">
            <div className="pp-card">
              <h3 className="pp-card-title">Top Holdings</h3>
              <HoldingsDonut holdings={pol.holdings} />
              <div className="pp-holdings-table">
                {pol.holdings.map((h) => (
                  <div key={h.ticker} className="pp-holding-row">
                    <div className="pp-hold-info">
                      <Link href={`/company-research?ticker=${h.ticker}`} className="pp-hold-tk">{h.ticker}</Link>
                      <Link href={`/company-research?ticker=${h.ticker}`} className="pp-hold-name">{h.name}</Link>
                    </div>
                    <div className="pp-hold-right">
                      <span className="pp-hold-val">{formatUSD(h.value)}</span>
                      <span className={`pp-hold-chg ${h.change >= 0 ? 'up' : 'down'}`}>{h.change >= 0 ? '+' : ''}{h.change}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pp-card">
              <h3 className="pp-card-title">Recent Trades</h3>
              <div className="pp-trades-table">
                <div className="pp-trades-hdr">
                  <span>Date</span><span>Ticker</span><span>Type</span><span>Amount</span>
                </div>
                {pol.trades.map((t, i) => (
                  <div key={i} className="pp-trade-row">
                    <span className="pp-trade-date">{t.date}</span>
                    <span className="pp-trade-tk">
                      <span className={`pp-trade-dot ${t.type.toLowerCase()}`} />{t.ticker}
                    </span>
                    <span className={`pp-trade-type ${t.type.toLowerCase()}`}>{t.type}</span>
                    <span className="pp-trade-amt">{t.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
