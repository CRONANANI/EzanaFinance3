'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useOrg } from '@/contexts/OrgContext';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import './broadsheet.css';

/* ═══ CONSTANTS ═══ */
const INDICES = [
  { sym: 'S&P 500', last: '5,847.21', chg: '+0.42%', up: true },
  { sym: 'NASDAQ', last: '18,402.10', chg: '+0.61%', up: true },
  { sym: 'Russell 2K', last: '2,168.43', chg: '-0.18%', up: false },
  { sym: 'Dow Jones', last: '43,209.55', chg: '+0.12%', up: true },
  { sym: 'VIX', last: '14.32', chg: '-2.91%', up: false },
  { sym: 'WTI', last: '$78.41', chg: '+1.04%', up: true },
  { sym: '10Y', last: '4.28%', chg: '-3bp', up: false },
];

const TICKER_ITEMS = [
  { tag: 'LIVE', text: 'JT CLOSED 20,371.81  +0.61%' },
  { tag: 'FLOWS', text: 'Equities +$2.1B · IG credit tight 2bps · HY issuance light' },
  { tag: 'CONGRESS', text: '14 STOCK Act filings (24h) — committees: Energy, Intel, Banking' },
  { tag: 'EIF', text: 'Quarterly window: elevated odds in AI · mfg · biotech mega caps' },
  { tag: 'FED WATCH', text: 'Speakers on deck — front-end yields tick higher into auction' },
];

const SECTORS_TOP = [
  { name: 'Energy', chg: 1.43 },
  { name: 'Communication Services', chg: 0.82 },
  { name: 'Industrials', chg: 0.53 },
];
const SECTORS_BOTTOM = [
  { name: 'Health Care', chg: -0.67 },
  { name: 'Consumer Staples', chg: -0.64 },
  { name: 'Financials', chg: -0.39 },
  { name: 'Consumer Discretionary', chg: -0.11 },
  { name: 'Technology', chg: -0.06 },
];

const EVENTS = {
  TOMORROW: [
    {
      date: 'May 27',
      title: 'API Crude Oil Stock Change (May/22)',
      region: 'US',
      kind: 'economic',
    },
    { date: 'May 27', title: 'Fed Cook Speech', region: 'US', kind: 'fed' },
    { date: 'May 27', title: 'MBA 30-Year Mortgage Rate (May/22)', region: 'US', kind: 'economic' },
    { date: 'May 27', title: 'Fed Logan Speech', region: 'US', kind: 'fed' },
  ],
  'THU MAY 28': [
    {
      date: 'May 28',
      title: 'EIA Gasoline Stocks Change (May/22)',
      region: 'US',
      kind: 'economic',
    },
    {
      date: 'May 28',
      title: 'EIA Crude Oil Stocks Change (May/22)',
      region: 'US',
      kind: 'economic',
    },
    { date: 'May 28', title: 'New Home Sales (Apr)', region: 'US', kind: 'economic' },
    { date: 'May 28', title: 'Fed Williams Speech', region: 'US', kind: 'fed' },
    {
      date: 'May 28',
      title: 'PCE Price Index YoY (Apr)',
      region: 'US',
      kind: 'economic',
      flag: 'HIGH',
    },
  ],
};

const CONGRESS = [
  {
    rep: 'Jake Auchincloss',
    cham: 'House',
    when: '2d ago',
    sym: 'STT',
    side: 'SELL',
    size: '$1K–$15K',
  },
  {
    rep: 'Thomas H. Kean',
    cham: 'House',
    when: '2d ago',
    sym: 'ADI',
    side: 'SELL',
    size: '$1K–$15K',
  },
  {
    rep: 'Thomas H. Kean',
    cham: 'House',
    when: '2d ago',
    sym: 'FCNCA',
    side: 'SELL',
    size: '$1K–$15K',
  },
  {
    rep: 'Thomas H. Kean',
    cham: 'House',
    when: '2d ago',
    sym: 'TTWO',
    side: 'SELL',
    size: '$1K–$15K',
  },
  {
    rep: 'Thomas H. Kean',
    cham: 'House',
    when: '2d ago',
    sym: 'TJX',
    side: 'BUY',
    size: '$1K–$15K',
  },
];

const OPPORTUNITIES = [
  {
    sym: 'BBONE',
    title: 'Baron First Principles ETF Q1 2026 Commentary',
    src: 'seekingalpha.com',
    when: '7:42 PM',
  },
  {
    sym: 'SQQM',
    title: 'Comm Q1 Earnings Call Highlights',
    src: 'seekingalpha.com',
    when: '7:34 PM',
  },
  {
    sym: 'BIOC',
    title: 'ROC EQUITY ACTION REMINDER: Faruqi & Faruqi, LLP Reminds Regenxbio...',
    src: 'newsfree.com',
    when: '6:29 PM',
  },
  {
    sym: 'EGMT',
    title: 'Enthusiast Gaming Launches New Subscription Offering',
    src: 'newsfree.com',
    when: '6:14 PM',
  },
  {
    sym: 'HOTL',
    title: 'Hotel Platform Mews Embeds Uber to Transport Guests',
    src: 'newsfree.com',
    when: '6:01 PM',
  },
];

const GAINERS = [
  { sym: 'YMAT', pct: 203.16, chg: '+0.92' },
  { sym: 'VCIG', pct: 118.05, chg: '+1.57' },
  { sym: 'MNTS', pct: 109.76, chg: '+8.10' },
];
const LOSERS = [
  { sym: 'ADTX', pct: -50.57, chg: '-0.26' },
  { sym: 'ENHA', pct: -45.47, chg: '-2.33' },
  { sym: 'YYGH', pct: -37.07, chg: '-0.14' },
];

const RANGE_BUTTONS = ['1D', '5D', '1M', '3M', '6M', '1Y', 'ALL'];

const CAL_LEGEND = [
  { label: 'Earnings', color: '#0e7c4f' },
  { label: 'Dividends', color: '#0ea5e9' },
  { label: 'IPOs', color: '#a855f7' },
  { label: 'Economic', color: '#d97706' },
  { label: 'Capitol', color: '#94a3b8' },
];

/* ═══ HELPERS ═══ */
const fmtMoney = (n) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatLongDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBriefLabel() {
  const hour = new Date().getHours();
  if (hour < 12) return 'The Morning Brief';
  if (hour < 17) return 'The Afternoon Brief';
  return 'The Evening Brief';
}

/* Smooth SVG path from values array */
function pathFromValues(values, w, h, padY = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, h - padY - ((v - min) / range) * (h - padY * 2)]);
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx.toFixed(2)} ${y0.toFixed(2)}, ${cx.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return { d, pts };
}

/* Deterministic series generator for placeholder charts */
function genSeries(seed, n = 40, drift = 0.5, vol = 1) {
  let x = seed;
  const out = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const r = x / 233280;
    v += (r - 0.5) * vol + drift * 0.02;
    out.push(v);
  }
  return out;
}

/* Inline sparkline SVG */
function Spark({ values, w = 96, h = 28, color = '#0e7c4f', fill = false, strokeWidth = 1.5 }) {
  const { d, pts } = pathFromValues(values, w, h, 3);
  const areaD = d + ` L ${pts[pts.length - 1][0].toFixed(2)} ${h} L ${pts[0][0].toFixed(2)} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      {fill && <path d={areaD} fill={color} fillOpacity="0.12" />}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Band header component (Bands I-V) */
function BandHeader({ number, label, meta, dark = false }) {
  return (
    <div className={`bs-band-head ${dark ? 'bs-band-head--dark' : ''}`}>
      <div className="bs-band-head-left">
        <span className={`bs-band-num ${dark ? 'bs-band-num--dark' : ''}`}>{number}</span>
        <h2 className={`bs-band-label ${dark ? 'bs-band-label--dark' : ''}`}>{label}</h2>
      </div>
      <span className={`bs-band-meta ${dark ? 'bs-band-meta--dark' : ''}`}>{meta}</span>
    </div>
  );
}

/* Mini calendar component */
function MiniCalendar() {
  const weeks = [
    [null, null, null, null, 1, 2, 3],
    [4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17],
    [18, 19, 20, 21, 22, 23, 24],
    [25, 26, 27, 28, 29, 30, 31],
  ];
  const today = new Date().getDate();
  const eventDays = new Set([27, 28, 29, 30]);
  return (
    <div className="bs-cal-box">
      <div className="bs-cal-head">May 2026</div>
      <div className="bs-cal-grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="bs-cal-dow">
            {d}
          </div>
        ))}
        {weeks.flat().map((d, i) => (
          <div
            key={i}
            className={`bs-cal-cell ${d === today ? 'bs-cal-cell--today' : ''} ${d === null ? 'bs-cal-cell--empty' : ''}`}
          >
            {d}
            {eventDays.has(d) && <span className="bs-cal-dot" />}
          </div>
        ))}
      </div>
      <div className="bs-cal-legend">
        {CAL_LEGEND.map((c) => (
          <div key={c.label} className="bs-cal-leg-item">
            <span className="bs-cal-leg-dot" style={{ background: c.color }} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Big performance chart (Band I) */
function BigChart({ timeframe }) {
  const w = 880,
    h = 280;
  const ssp = genSeries(11, 60, 0.3, 1.0);
  const nas = genSeries(23, 60, 0.45, 1.1);
  const rus = genSeries(37, 60, 0.1, 1.4);
  const dow = genSeries(53, 60, 0.2, 0.9);
  const port = genSeries(71, 60, 0.55, 1.0);
  const sets = [
    { vals: ssp, c: '#94928a', sw: 1.2 },
    { vals: nas, c: '#0e7c4f', sw: 1.4 },
    { vals: rus, c: '#7c3aed', sw: 1.4 },
    { vals: dow, c: '#d97706', sw: 1.4 },
    { vals: port, c: '#0b0d10', sw: 2.4 },
  ];
  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        aria-label="Portfolio performance chart over trailing period"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="0"
            x2={w}
            y1={(h / 4) * i + 0.5}
            y2={(h / 4) * i + 0.5}
            stroke="#e6e2d1"
            strokeWidth="1"
          />
        ))}
        {sets.map((s, i) => {
          const { d } = pathFromValues(s.vals, w, h, 12);
          return (
            <path key={i} d={d} fill="none" stroke={s.c} strokeWidth={s.sw} strokeLinecap="round" />
          );
        })}
      </svg>
      <div className="bs-chart-x">
        {['Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25', 'Mon 26', 'Tue 27'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function HomePage() {
  const { user } = useAuth();
  const { isOrgUser, orgData } = useOrg();
  const { connected: plaidConnected, summary: plaidSummary } = usePlaidPortfolioSummary();
  const [timeframe, setTimeframe] = useState('5D');
  const { dataForCurrentRange } = usePortfolioValueSeries(timeframe);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [plaidHoldingsPayload, setPlaidHoldingsPayload] = useState(null);

  const mock = useMockPortfolio();
  const useMock = mock.hasMockPortfolio;

  const currentValue = useMock
    ? mock.totalValue
    : plaidConnected
      ? (plaidSummary?.totalValue ?? null)
      : null;

  const valueWindowFromApi = useMemo(() => {
    const d = dataForCurrentRange;
    if (!d || d.length < 1) return null;
    const liveLast = Number.isFinite(currentValue) ? currentValue : d[d.length - 1].value;
    if (d.length < 2) return { last: liveLast, changeAbs: 0, changePct: 0 };
    const first = d[0].value;
    const last = liveLast;
    return {
      last,
      changeAbs: last - first,
      changePct: first > 0 ? ((last - first) / first) * 100 : 0,
    };
  }, [dataForCurrentRange, currentValue]);

  /* Existing holdings normalization (preserve from current page.js) */
  const useLiveHoldings =
    !!plaidHoldingsPayload?.connected && (plaidHoldingsPayload?.aggregated?.length ?? 0) > 0;

  const normalizedHoldings = useMemo(() => {
    if (useMock && mock.enrichedPositions.length > 0) {
      return mock.enrichedPositions.map((pos) => ({
        ticker: pos.symbol,
        name: pos.name,
        qty: pos.qty,
        price: pos.currentPrice,
        positionValue: pos.posValue,
        change: pos.dayChangePct,
        sector: pos.sector || 'Other',
      }));
    }
    if (useLiveHoldings) {
      return (plaidHoldingsPayload.aggregated || [])
        .map((h) => {
          const ticker = h.ticker;
          const q = liveQuotes[ticker];
          const qty = Number(h.totalQuantity) || 0;
          const price = q?.price ?? Number(h.lastPrice) ?? 0;
          const positionValue = price * qty || Number(h.totalValue) || 0;
          const ch = q?.changePercent ?? 0;
          return {
            ticker,
            name: h.name || ticker,
            qty,
            price,
            positionValue,
            change: ch,
            sector: h.sector || 'Other',
          };
        })
        .sort((a, b) => b.positionValue - a.positionValue);
    }
    return [];
  }, [useMock, mock.enrichedPositions, useLiveHoldings, plaidHoldingsPayload, liveQuotes]);

  const topHoldings = normalizedHoldings.slice(0, 6);
  const totalPortfolioValue =
    currentValue || normalizedHoldings.reduce((s, h) => s + h.positionValue, 0);

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.user_metadata?.name?.split(' ')[0] ||
    'there';

  const displayValue = Number.isFinite(currentValue) ? currentValue : 0;
  const changePct = valueWindowFromApi?.changePct ?? 0;
  const changeAbs = valueWindowFromApi?.changeAbs ?? 0;

  /* Fetch Plaid holdings if connected */
  useEffect(() => {
    if (!plaidConnected) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/plaid/holdings');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPlaidHoldingsPayload(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plaidConnected]);

  /* Fetch live quotes for holdings */
  useEffect(() => {
    const tickers = normalizedHoldings.map((h) => h.ticker).filter(Boolean);
    if (!tickers.length) return;
    let cancelled = false;
    const fetchQuotes = async () => {
      try {
        const res = await fetch(`/api/market/quotes?symbols=${tickers.join(',')}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.quotes) setLiveQuotes(data.quotes);
      } catch {
        /* ignore */
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [normalizedHoldings.length]);

  return (
    <div className="bs-shell">
      {/* ═══ TICKER MARQUEE ═══ */}
      <div className="bs-ticker">
        <div className="bs-ticker-inner">
          {TICKER_ITEMS.concat(TICKER_ITEMS).map((t, i) => (
            <span key={i} className="bs-ticker-item">
              <span className="bs-ticker-tag">{t.tag}</span>
              <span className="bs-ticker-text">{t.text}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ BAND 0 — HERO ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <div className="bs-hero-row">
            <div className="bs-hero-l">
              <div className="bs-eyebrow">
                {formatBriefLabel()} · {formatLongDate()}
              </div>
              <h1 className="bs-hero-greet">
                {getGreeting()},<br />
                {firstName}.
              </h1>
              <p className="bs-hero-lede">
                Markets closed higher. Your portfolio outpaced the S&amp;P 500 by{' '}
                <strong className="bs-strong">1.24 points</strong> today, led by{' '}
                <strong className="bs-strong">TSLA</strong> and{' '}
                <strong className="bs-strong">AVGO</strong>. Watch the{' '}
                <strong className="bs-strong">PCE print</strong> Thursday.
              </p>
            </div>
            <div className="bs-hero-r">
              <div className="bs-section-label">
                {isOrgUser && orgData?.name ? orgData.name : 'Maca'} portfolio
              </div>
              <div className="bs-hero-num">{fmtMoney(displayValue)}</div>
              <div className="bs-hero-delta-row">
                <span className={`bs-hero-pos ${changePct >= 0 ? '' : 'bs-hero-pos--neg'}`}>
                  {fmtPct(changePct)}
                </span>
                <span className="bs-hero-abs">
                  {changeAbs >= 0 ? '+' : ''}
                  {fmtMoney(Math.abs(changeAbs))} · today
                </span>
              </div>
              <div className="bs-hero-stats">
                {[
                  ['1W', '+8.42%'],
                  ['1M', '+12.10%'],
                  ['YTD', '+24.7%'],
                  ['Beta', '1.08'],
                ].map(([l, v]) => (
                  <div key={l} className="bs-hero-stat">
                    <div className="bs-hero-stat-label">{l}</div>
                    <div className="bs-hero-stat-val">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INDEX STRIP ═══ */}
      <div className="bs-band bs-band--dark">
        <div className="bs-page-inner bs-page-inner--tight">
          <div className="bs-index-strip">
            {INDICES.map((idx, i) => (
              <div key={i} className={`bs-index-cell ${i > 0 ? 'bs-index-cell--bordered' : ''}`}>
                <div className="bs-index-sym">{idx.sym}</div>
                <div className="bs-index-last">{idx.last}</div>
                <div
                  className={`bs-index-chg ${idx.up ? 'bs-index-chg--up' : 'bs-index-chg--down'}`}
                >
                  {idx.chg}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ BAND I — LATELY ON EZANA ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <BandHeader number="I" label="Lately on Ezana" meta="Performance · trailing seven days" />
          <div className="bs-chart-row">
            <div className="bs-chart-wide">
              <BigChart timeframe={timeframe} />
            </div>
            <div className="bs-chart-aside">
              <div className="bs-aside-head">Legend</div>
              {[
                ['Maca', '#0b0d10', '+5.86%'],
                ['NASDAQ', '#0e7c4f', '+3.62%'],
                ['S&P 500', '#94928a', '+4.62%'],
                ['Dow Jones', '#d97706', '+1.42%'],
                ['Russell 2K', '#7c3aed', '+0.83%'],
              ].map(([lbl, c, chg]) => (
                <div key={lbl} className="bs-aside-row">
                  <span className="bs-aside-dot" style={{ background: c }} />
                  <span className="bs-aside-label">{lbl}</span>
                  <span className="bs-aside-val">{chg}</span>
                </div>
              ))}
              <div className="bs-aside-head" style={{ marginTop: 18 }}>
                Range
              </div>
              <div className="bs-seg-group">
                {RANGE_BUTTONS.map((r) => (
                  <button
                    key={r}
                    className={`bs-seg ${timeframe === r ? 'bs-seg--active' : ''}`}
                    onClick={() => setTimeframe(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND II — POSITIONS & PROGRESS ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <BandHeader number="II" label="Positions &amp; progress" meta="Holdings · streak · ELO" />
          <div className="bs-pos-row">
            <div className="bs-pos-l">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Top holdings</h3>
                <span className="bs-sub-meta">
                  {topHoldings.length} of {normalizedHoldings.length} positions
                </span>
              </div>
              <table className="bs-table">
                <thead>
                  <tr>
                    <th className="bs-th bs-th--l">Symbol</th>
                    <th className="bs-th bs-th--l">Name</th>
                    <th className="bs-th bs-th--r">Day</th>
                    <th className="bs-th bs-th--r">Value</th>
                    <th className="bs-th bs-th--r">Weight</th>
                    <th className="bs-th bs-th--r">7-day</th>
                  </tr>
                </thead>
                <tbody>
                  {topHoldings.map((h, i) => {
                    const weight =
                      totalPortfolioValue > 0 ? (h.positionValue / totalPortfolioValue) * 100 : 0;
                    const up = h.change >= 0;
                    return (
                      <tr key={h.ticker} className="bs-tr">
                        <td className="bs-td-sym">{h.ticker}</td>
                        <td className="bs-td-name">{h.name}</td>
                        <td className={`bs-td-r ${up ? 'bs-td-r--up' : 'bs-td-r--down'}`}>
                          {fmtPct(h.change)}
                        </td>
                        <td className="bs-td-r">
                          ${h.positionValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="bs-td-r">{weight.toFixed(1)}%</td>
                        <td className="bs-td-spark">
                          <Spark
                            values={genSeries(7 + i * 11, 28, up ? 0.6 : -0.3, 1.2)}
                            color={up ? '#0e7c4f' : '#a8261d'}
                            fill
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {normalizedHoldings.length > 6 && (
                <Link href="/trading/dashboard" className="bs-table-link">
                  All {normalizedHoldings.length} positions
                </Link>
              )}
            </div>
            <div className="bs-pos-r">
              {/* Streak card */}
              <div className="bs-prog-card">
                <div className="bs-prog-label">Day streak</div>
                <div className="bs-prog-num">
                  9<span className="bs-prog-slash">/30</span>
                </div>
                <div className="bs-streak-bars">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <span
                      key={i}
                      className={`bs-streak-bar ${i < 9 ? 'bs-streak-bar--filled' : ''}`}
                    />
                  ))}
                </div>
                <div className="bs-prog-foot">
                  Active investor — 21 sessions remain in the May challenge.
                </div>
              </div>
              {/* ELO card */}
              <div className="bs-prog-card">
                <div className="bs-prog-label">ELO rating · Novice</div>
                <div className="bs-prog-num">
                  275<span className="bs-prog-slash">/10,000</span>
                </div>
                <div className="bs-elo-track">
                  <div className="bs-elo-fill" style={{ width: '2.75%' }} />
                </div>
                <div className="bs-elo-marks">
                  <span>Novice</span>
                  <span>Apprentice</span>
                  <span>Journeyman</span>
                  <span>Expert</span>
                  <span>Master</span>
                </div>
                <div className="bs-prog-foot">275 into Novice. 725 to Apprentice.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND III — MARKETS PULSE (dark) ═══ */}
      <section className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <BandHeader number="III" label="Markets pulse" meta="S&P 500 GICS · today" dark />
          <div className="bs-pulse-row">
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Leaders</div>
              {SECTORS_TOP.map((s) => (
                <div key={s.name} className="bs-pulse-line">
                  <span className="bs-pulse-name">{s.name}</span>
                  <div className="bs-pulse-bar">
                    <div
                      className="bs-pulse-bar-fill bs-pulse-bar-fill--up"
                      style={{ width: `${Math.min((Math.abs(s.chg) / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="bs-pulse-pct bs-pulse-pct--up">+{s.chg.toFixed(2)}%</span>
                </div>
              ))}
            </div>
            <div className="bs-pulse-divider" />
            <div className="bs-pulse-col">
              <div className="bs-pulse-head-dark">Laggards</div>
              {SECTORS_BOTTOM.map((s) => (
                <div key={s.name} className="bs-pulse-line">
                  <span className="bs-pulse-name">{s.name}</span>
                  <div className="bs-pulse-bar">
                    <div
                      className="bs-pulse-bar-fill bs-pulse-bar-fill--down"
                      style={{ width: `${Math.min((Math.abs(s.chg) / 2) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="bs-pulse-pct bs-pulse-pct--down">{s.chg.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND IV — THE SCHEDULE ═══ */}
      <section className="bs-band bs-band--cream">
        <div className="bs-page-inner">
          <BandHeader number="IV" label="The schedule" meta="Events, releases &amp; filings" />
          <div className="bs-sched-row">
            <div className="bs-sched-events">
              {Object.entries(EVENTS).map(([day, list]) => (
                <div key={day} className="bs-event-day-block">
                  <div className="bs-event-day-head">
                    <span className="bs-event-day-label">{day}</span>
                    <span className="bs-event-day-count">{list.length} events</span>
                  </div>
                  <div className="bs-event-grid">
                    {list.map((ev, i) => (
                      <div key={i} className="bs-event-item">
                        <div className="bs-event-date">{ev.date}</div>
                        <div className="bs-event-title">{ev.title}</div>
                        <div className="bs-event-meta-row">
                          <span>{ev.region}</span>
                          {ev.flag && <span className="bs-event-flag">{ev.flag}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bs-sched-aside">
              <MiniCalendar />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BAND V — INTELLIGENCE ═══ */}
      <section className="bs-band bs-band--light">
        <div className="bs-page-inner">
          <BandHeader number="V" label="Intelligence" meta="Opportunities · disclosures · movers" />
          <div className="bs-intel-grid">
            {/* Column A — Market opportunities */}
            <div className="bs-intel-col">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Market opportunities</h3>
                <span className="bs-sub-meta">Matched · moderate</span>
              </div>
              {OPPORTUNITIES.map((o, i) => (
                <div key={i} className="bs-opp-row">
                  <div className="bs-opp-rule">
                    <span className="bs-opp-sym">{o.sym}</span>
                    <span className="bs-opp-when">{o.when}</span>
                  </div>
                  <div className="bs-opp-title">{o.title}</div>
                  <div className="bs-opp-src">{o.src}</div>
                </div>
              ))}
            </div>

            {/* Column B — Congressional tracker */}
            <div className="bs-intel-col">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Congressional tracker</h3>
                <span className="bs-sub-meta">Latest 24h</span>
              </div>
              {CONGRESS.map((c, i) => (
                <div key={i} className="bs-cong-row">
                  <div className="bs-cong-left">
                    <div className="bs-cong-name">{c.rep}</div>
                    <div className="bs-cong-meta">
                      {c.cham} · {c.when}
                    </div>
                  </div>
                  <div className="bs-cong-right">
                    <div className="bs-cong-sym">{c.sym}</div>
                    <div
                      className={`bs-cong-side ${c.side === 'BUY' ? 'bs-cong-side--buy' : 'bs-cong-side--sell'}`}
                    >
                      {c.side}
                    </div>
                    <div className="bs-cong-size">{c.size}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Column C — Top movers */}
            <div className="bs-intel-col">
              <div className="bs-sub-head">
                <h3 className="bs-sub-title">Top movers today</h3>
                <span className="bs-sub-meta">U.S. equities</span>
              </div>
              <div className="bs-mover-head">Gainers</div>
              {GAINERS.map((g, i) => (
                <div key={g.sym} className="bs-mover-row">
                  <span className="bs-mover-sym">{g.sym}</span>
                  <span className="bs-mover-pct bs-mover-pct--up">+{g.pct.toFixed(2)}%</span>
                  <Spark
                    values={genSeries(91 + i * 7, 24, 0.8, 1.0)}
                    color="#0e7c4f"
                    w={56}
                    h={20}
                  />
                </div>
              ))}
              <div className="bs-mover-head" style={{ marginTop: 14 }}>
                Losers
              </div>
              {LOSERS.map((l, i) => (
                <div key={l.sym} className="bs-mover-row">
                  <span className="bs-mover-sym">{l.sym}</span>
                  <span className="bs-mover-pct bs-mover-pct--down">{l.pct.toFixed(2)}%</span>
                  <Spark
                    values={genSeries(31 + i * 9, 24, -0.6, 1.0)}
                    color="#a8261d"
                    w={56}
                    h={20}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COLOPHON ═══ */}
      <div className="bs-band bs-band--dark">
        <div className="bs-page-inner">
          <div className="bs-colophon">
            <span>EZANA · {formatBriefLabel()}</span>
            <span>
              Compiled{' '}
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'America/New_York',
              })}{' '}
              ET · next update 22:00 ET
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
