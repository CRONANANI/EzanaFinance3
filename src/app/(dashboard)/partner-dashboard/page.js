'use client';

import { useState, useMemo } from 'react';
import { AnimatedCounter } from '@/components/partner/AnimatedCounter';
import '../partner.css';

const EARNINGS_DATA = {
  totalEarnings: 12450.0,
  thisMonth: 2340.0,
  lastMonth: 1890.0,
  monthlyChange: 23.8,
  pendingPayout: 780.5,
  nextPayoutDate: 'April 1, 2026',
};

const EARNINGS_CHART_DATA = [1200, 1450, 1320, 1890, 2100, 2340];

function EarningsChart({ data }) {
  const max = Math.max(...data);
  const w = 400; const h = 120;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 20)}`).join(' ');
  const linePath = `M${pts}`;
  const areaPath = `M${pts} L${w},${h} L0,${h} Z`;
  return (
    <div className="ptr-earnings-chart">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="ptrEarningsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a853" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4a853" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#ptrEarningsGrad)" />
        <path d={linePath} fill="none" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function NextPayoutCountdown({ dateStr }) {
  const { days, hours } = useMemo(() => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d - now;
    if (diff <= 0) return { days: 0, hours: 0 };
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return { days, hours };
  }, [dateStr]);
  return (
    <span className="ptr-countdown">
      <AnimatedCounter value={days} />d <AnimatedCounter value={hours} />h
    </span>
  );
}

const COPIER_METRICS = {
  totalCopiers: 234,
  activeCopiers: 198,
  newThisWeek: 12,
  churnRate: 3.2,
  avgCopyAmount: 4520.0,
  totalAUM: 895680.0,
};

const STRATEGIES = [
  { name: 'Growth Alpha', copiers: 142, aum: 542000, returnPct: 34.2, returnMo: 4.8, status: 'active' },
  { name: 'Dividend Machine', copiers: 67, aum: 248000, returnPct: 18.7, returnMo: 2.1, status: 'active' },
  { name: 'Swing Trader', copiers: 25, aum: 105680, returnPct: 52.3, returnMo: 8.4, status: 'active' },
];

const PAYOUT_HISTORY = [
  { date: 'Mar 1, 2026', amount: 2340.0, method: 'Bank Transfer', status: 'Paid' },
  { date: 'Feb 1, 2026', amount: 1890.0, method: 'Bank Transfer', status: 'Paid' },
  { date: 'Jan 1, 2026', amount: 2100.0, method: 'Bank Transfer', status: 'Paid' },
  { date: 'Dec 1, 2025', amount: 1650.0, method: 'Bank Transfer', status: 'Paid' },
  { date: 'Nov 1, 2025', amount: 1420.0, method: 'Bank Transfer', status: 'Paid' },
];

const TOP_COPIERS = [
  { name: 'Alex M.', copyAmount: 25000, since: 'Jan 2025', pnl: 4200, pnlPct: 16.8 },
  { name: 'Sarah K.', copyAmount: 18500, since: 'Mar 2025', pnl: 2960, pnlPct: 16.0 },
  { name: 'James L.', copyAmount: 15200, since: 'Feb 2025', pnl: 2128, pnlPct: 14.0 },
  { name: 'Maria R.', copyAmount: 12800, since: 'Apr 2025', pnl: 1536, pnlPct: 12.0 },
  { name: 'David W.', copyAmount: 10000, since: 'Jun 2025', pnl: 1100, pnlPct: 11.0 },
];

export default function PartnerDashboardPage() {
  const [timeframe, setTimeframe] = useState('1M');

  return (
    <div className="ptr-page">
      <div className="ptr-page-header">
        <h1 className="ptr-page-title">Partner Dashboard</h1>
        <div className="ptr-tf-group">
          {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
            <button key={tf} className={`ptr-tf-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
          ))}
        </div>
      </div>

      <div className="ptr-stats-row">
        <div className="ptr-stat-card ptr-stat-gold">
          <i className="bi bi-cash-coin" />
          <div className="ptr-stat-info">
            <span className="ptr-stat-value">$<AnimatedCounter value={EARNINGS_DATA.totalEarnings} decimals={0} /></span>
            <span className="ptr-stat-label">Total Earnings</span>
          </div>
        </div>
        <div className="ptr-stat-card">
          <i className="bi bi-graph-up-arrow" />
          <div className="ptr-stat-info">
            <span className="ptr-stat-value">$<AnimatedCounter value={EARNINGS_DATA.thisMonth} decimals={0} /></span>
            <span className="ptr-stat-label">This Month <span className="ptr-stat-change positive">+{EARNINGS_DATA.monthlyChange}%</span></span>
          </div>
        </div>
        <div className="ptr-stat-card">
          <i className="bi bi-people-fill" />
          <div className="ptr-stat-info">
            <span className="ptr-stat-value"><AnimatedCounter value={COPIER_METRICS.totalCopiers} /></span>
            <span className="ptr-stat-label">Total Copiers <span className="ptr-stat-change positive">+{COPIER_METRICS.newThisWeek} this week</span></span>
          </div>
        </div>
        <div className="ptr-stat-card">
          <i className="bi bi-wallet2" />
          <div className="ptr-stat-info">
            <span className="ptr-stat-value">$<AnimatedCounter value={COPIER_METRICS.totalAUM} decimals={0} /></span>
            <span className="ptr-stat-label">Assets Under Management</span>
          </div>
        </div>
      </div>

      <div className="ptr-card ptr-earnings-chart-card">
        <div className="ptr-card-header">
          <h3>Earnings Trend</h3>
        </div>
        <EarningsChart data={EARNINGS_CHART_DATA} />
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card ptr-strategies-card">
          <div className="ptr-card-header">
            <h3>Your Strategies</h3>
            <button className="ptr-btn-sm"><i className="bi bi-plus-lg" /> New Strategy</button>
          </div>
          <div className="ptr-strategy-list">
            {STRATEGIES.map((s) => (
              <div key={s.name} className="ptr-strategy-item">
                <div className="ptr-strategy-left">
                  <span className="ptr-strategy-name">{s.name}</span>
                  <span className="ptr-strategy-meta">{s.copiers} copiers · ${(s.aum / 1000).toFixed(0)}K AUM</span>
                </div>
                <div className="ptr-strategy-right">
                  <div className="ptr-strategy-return">
                    <span className="ptr-strategy-return-total positive">+{s.returnPct}%</span>
                    <span className="ptr-strategy-return-mo">+{s.returnMo}% /mo</span>
                  </div>
                  <span className={`ptr-status-dot ${s.status}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Top Copiers</h3>
          </div>
          <div className="ptr-copiers-list">
            {TOP_COPIERS.map((c, i) => (
              <div key={c.name} className="ptr-copier-item">
                <div className="ptr-copier-rank">{i + 1}</div>
                <div className="ptr-copier-info">
                  <span className="ptr-copier-name">{c.name}</span>
                  <span className="ptr-copier-meta">Since {c.since} · ${c.copyAmount.toLocaleString()}</span>
                </div>
                <div className="ptr-copier-pnl">
                  <span className="positive">+${c.pnl.toLocaleString()}</span>
                  <span className="ptr-copier-pnl-pct">+{c.pnlPct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Commission Breakdown</h3>
          </div>
          <div className="ptr-commission-grid">
            <div className="ptr-commission-item">
              <span className="ptr-commission-label">Copy Trade Commission</span>
              <span className="ptr-commission-rate">10% of copier profits</span>
              <span className="ptr-commission-earned">$8,920.00 earned</span>
            </div>
            <div className="ptr-commission-item">
              <span className="ptr-commission-label">Course Revenue</span>
              <span className="ptr-commission-rate">70% revenue share</span>
              <span className="ptr-commission-earned">$2,680.00 earned</span>
            </div>
            <div className="ptr-commission-item">
              <span className="ptr-commission-label">Referral Bonus</span>
              <span className="ptr-commission-rate">$25 per referred user</span>
              <span className="ptr-commission-earned">$850.00 earned</span>
            </div>
          </div>
          <div className="ptr-payout-next">
            <i className="bi bi-clock" />
            <span>Next payout: <strong>${EARNINGS_DATA.pendingPayout.toLocaleString()}</strong> on {EARNINGS_DATA.nextPayoutDate} — <NextPayoutCountdown dateStr={EARNINGS_DATA.nextPayoutDate} /></span>
          </div>
        </div>

        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Payout History</h3>
          </div>
          <table className="ptr-table">
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
            <tbody>
              {PAYOUT_HISTORY.map((p) => (
                <tr key={p.date}>
                  <td>{p.date}</td>
                  <td className="ptr-table-amount">${p.amount.toLocaleString()}</td>
                  <td>{p.method}</td>
                  <td><span className="ptr-status-badge green">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
