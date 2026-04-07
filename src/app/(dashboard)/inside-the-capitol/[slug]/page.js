'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import '../../../../../app-legacy/assets/css/theme.css';
import '../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../app-legacy/assets/css/light-mode-fixes.css';
import './politician-profile.css';

function formatUSD(n) {
  if (n >= 1e6) return `US$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `US$${(n / 1e3).toFixed(1)}K`;
  return `US$${n.toLocaleString()}`;
}

function partyClass(party) {
  if (party === 'Democrat') return 'democrat';
  if (party === 'Republican') return 'republican';
  return 'unknown';
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

function HoldingsDonut({ holdings }) {
  const colors = ['#10b981', '#3b82f6', '#a78bfa', '#fbbf24', '#f87171', '#22d3ee'];
  const total = holdings.reduce((s, h) => s + h.value, 0);
  let cumulative = 0;
  const r = 40; const cx = 50; const cy = 50; const circ = 2 * Math.PI * r;

  return (
    <div className="pp-donut-wrap">
      <svg viewBox="0 0 100 100" className="pp-donut-svg">
        {holdings.map((h, i) => {
          const pct = h.value / total;
          const offset = (cumulative / total) * circ;
          const length = pct * circ;
          cumulative += h.value;
          return (
            <circle key={`${h.ticker}-${i}`} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i % colors.length]}
              strokeWidth="12" strokeDasharray={`${length} ${circ - length}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`} className="pp-donut-seg" />
          );
        })}
      </svg>
      <div className="pp-donut-legend">
        {holdings.map((h, i) => (
          <div key={`${h.ticker}-leg-${i}`} className="pp-donut-item">
            <span className="pp-donut-color" style={{ background: colors[i % colors.length] }} />
            {h.ticker && h.ticker !== '—' ? (
              <Link href={`/company-research?ticker=${h.ticker}`} className="pp-donut-tk">{h.ticker}</Link>
            ) : (
              <span className="pp-donut-tk">{h.ticker}</span>
            )}
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
  const [pol, setPol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('not_found');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/fmp/politician-profile?slug=${encodeURIComponent(slug)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setPol(null);
          setError(res.status === 404 ? 'not_found' : 'api');
          return;
        }
        if (data.profile) {
          setPol(data.profile);
        } else {
          setPol(null);
          setError('not_found');
        }
      } catch {
        if (!cancelled) {
          setPol(null);
          setError('api');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="pp-page dashboard-page-inset">
        <div className="pp-not-found">
          <div className="pp-loading-spinner" aria-hidden />
          <p>Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error === 'api') {
    return (
      <div className="pp-page dashboard-page-inset">
        <div className="pp-not-found">
          <i className="bi bi-wifi-off" />
          <h2>Couldn&apos;t load profile</h2>
          <p>Please try again in a moment.</p>
          <Link href="/inside-the-capitol" className="pp-back-btn">
            <i className="bi bi-arrow-left" /> Back to Inside The Capitol
          </Link>
        </div>
      </div>
    );
  }

  if (error === 'not_found' || !pol) {
    return (
      <div className="pp-page dashboard-page-inset">
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

  const pc = partyClass(pol.party);
  const isPositive = pol.monthlyChange >= 0;
  const totalPositions = pol.holdings?.length ?? 0;
  const sectorCount = Math.max(1, Math.ceil(totalPositions / 2));
  const topPct = Math.min(100, Math.max(0, pol.topIndustry?.pct ?? 0));
  const ytdPct = pol.ytdReturns ?? 0;
  const ytdDollar = pol.ytdDollar ?? 0;
  const stateLabel = pol.stateFull || pol.state || '';
  const stateHref = pol.stateUrlSlug ? `/inside-the-capitol?state=${pol.stateUrlSlug}` : '/inside-the-capitol';

  return (
    <div className="pp-page dashboard-page-inset">
      <div className="pp-back-row">
        <Link href="/inside-the-capitol" className="pp-back">
          <i className="bi bi-arrow-left" /> Inside The Capitol
        </Link>
      </div>

      <div className="pp-layout politician-profile-grid capitol-profile-grid">
        {/* LEFT SIDEBAR */}
        <div className="pp-sidebar">
          <div className="pp-avatar-section">
            <div className={`pp-avatar-xl ${pc}`}>{pol.initials}</div>
            <h1 className="pp-name">{pol.name}</h1>
            <div className="pp-badges">
              <Link href={`/inside-the-capitol?party=${pol.party.toLowerCase()}`} className="pp-badge-link">
                <span className={`pp-party-badge ${pc}`}>{pol.party}</span>
              </Link>
              {stateLabel ? (
                <Link href={stateHref} className="pp-badge-link">
                  <span className="pp-state-badge">{stateLabel}</span>
                </Link>
              ) : null}
            </div>
            <p className="pp-role">{pol.role}{pol.district ? ` (${pol.district})` : ''}</p>
          </div>

          <div className="pp-info-card">
            <h4>Politician Info</h4>
            <div className="pp-info-row"><span className="pp-info-lbl">Role</span><span className="pp-info-val">{pol.role}</span></div>
            <div className="pp-info-row"><span className="pp-info-lbl">Years in Office</span><span className="pp-info-val">{pol.yearsInOffice}</span></div>
            <div className="pp-info-row"><span className="pp-info-lbl">Age</span><span className="pp-info-val">{pol.age != null ? `${pol.age} years` : '—'}</span></div>
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
          <div className="po-card">
            <div className="po-header">
              <h3>Portfolio Overview</h3>
              <button type="button" className="po-summary-btn">Summary</button>
            </div>

            <div className="po-primary">
              <div className="po-primary-left">
                <span className="po-primary-label">TOTAL VALUE</span>
                <span className="po-primary-value">US${pol.totalValue.toLocaleString()}</span>
              </div>
              <div className={`po-primary-change ${isPositive ? 'positive' : 'negative'}`}>
                <i className={`bi ${isPositive ? 'bi-arrow-up-short' : 'bi-arrow-down-short'}`} />
                <span>
                  {isPositive ? '+' : ''}
                  {pol.monthlyChange}% this month
                </span>
              </div>
            </div>

            <div className="po-secondary-row">
              <div className="po-secondary-item">
                <span className="po-secondary-label">TOP INDUSTRY</span>
                <span className="po-secondary-value">{pol.topIndustry?.name || 'N/A'}</span>
                <div className="po-secondary-bar">
                  <div className="po-secondary-bar-fill" style={{ width: `${topPct}%` }} />
                </div>
                <span className="po-secondary-sub">{topPct}% of portfolio</span>
              </div>
              <div className="po-secondary-item">
                <span className="po-secondary-label">YTD RETURNS</span>
                <span className={`po-secondary-value ${ytdPct >= 0 ? 'positive' : 'negative'}`}>
                  {ytdPct >= 0 ? '+' : ''}
                  {ytdPct}%
                </span>
                <span className="po-secondary-sub">
                  {ytdDollar >= 0 ? '+' : '-'}
                  $
                  {Math.abs(ytdDollar).toLocaleString()}
                </span>
              </div>
              <div className="po-secondary-item">
                <span className="po-secondary-label">TOTAL POSITIONS</span>
                <span className="po-secondary-value">{totalPositions}</span>
                <span className="po-secondary-sub">
                  across {sectorCount} sector{sectorCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {pol.similarTraders?.length > 0 && (
              <div className="po-traders">
                <span className="po-traders-label">SIMILAR TRADERS</span>
                <div className="po-traders-row">
                  {pol.similarTraders.map((s) => (
                    <Link key={s.slug} href={`/inside-the-capitol/${s.slug}`} className="po-trader">
                      <div className={`po-trader-avatar ${partyClass(s.party)}`}>{s.initials}</div>
                      <span className="po-trader-name">{s.name}</span>
                      <span className="po-trader-pct">{s.overlap}%</span>
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
                      {h.ticker && h.ticker !== '—' ? (
                        <>
                          <Link href={`/company-research?ticker=${h.ticker}`} className="pp-hold-tk">{h.ticker}</Link>
                          <Link href={`/company-research?ticker=${h.ticker}`} className="pp-hold-name">{h.name}</Link>
                        </>
                      ) : (
                        <>
                          <span className="pp-hold-tk">{h.ticker}</span>
                          <span className="pp-hold-name">{h.name}</span>
                        </>
                      )}
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
                {pol.trades.length === 0 ? (
                  <div className="pp-trade-row pp-trade-empty">No recent trades in our feed.</div>
                ) : (
                  pol.trades.map((t, i) => (
                    <div key={i} className="pp-trade-row">
                      <span className="pp-trade-date">{t.date}</span>
                      <span className="pp-trade-tk">
                        <span className={`pp-trade-dot ${t.type.toLowerCase()}`} />{t.ticker}
                      </span>
                      <span className={`pp-trade-type ${t.type.toLowerCase()}`}>{t.type}</span>
                      <span className="pp-trade-amt">{t.amount}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
