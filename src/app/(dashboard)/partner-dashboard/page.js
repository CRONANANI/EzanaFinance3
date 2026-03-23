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

const MARKET_PULSE = [
  { name: 'S&P 500', value: '5,892', change: '+0.45%', up: true },
  { name: 'NASDAQ', value: '18,743', change: '+0.72%', up: true },
  { name: 'DOW', value: '43,128', change: '-0.18%', up: false },
  { name: 'VIX', value: '14.32', change: '-3.2%', up: false },
  { name: 'BTC', value: '$87,234', change: '+2.34%', up: true },
  { name: 'GOLD', value: '$2,178', change: '+0.15%', up: true },
];

const ACTIVITY_TIMELINE = [
  { icon: 'bi-lightning-charge', text: 'New trade executed: BUY NVDA', time: '2 hours ago', color: '#10b981' },
  { icon: 'bi-person-plus', text: '12 new copiers joined your Growth Alpha strategy', time: '5 hours ago', color: '#d4a853' },
  { icon: 'bi-newspaper', text: 'Your article "AI Stocks 2026" received 340 reads', time: '1 day ago', color: '#3b82f6' },
  { icon: 'bi-cash-stack', text: 'Commission payout of $1,240 processed', time: '2 days ago', color: '#10b981' },
  { icon: 'bi-mortarboard', text: '8 new students enrolled in your Options course', time: '3 days ago', color: '#a78bfa' },
];

const TOP_CONTENT = [
  { type: 'Article', title: 'AI Stocks to Watch in 2026', metric: '2,340 reads', icon: 'bi-newspaper', change: '+45%' },
  { type: 'Course', title: 'Options Trading Fundamentals', metric: '156 enrolled', icon: 'bi-mortarboard', change: '+12%' },
  { type: 'Article', title: 'Why the Fed Will Cut Rates', metric: '1,890 reads', icon: 'bi-newspaper', change: '+32%' },
  { type: 'Strategy', title: 'Growth Alpha', metric: '234 copiers', icon: 'bi-lightning-charge', change: '+8.7%' },
];

export default function PartnerDashboardPage() {
  const [timeframe, setTimeframe] = useState('1M');
  const [audienceTf, setAudienceTf] = useState('1M');

  return (
    <div className="ptr-page">
      <div className="ptr-page-header">
        <h1 className="ptr-page-title">Partner Dashboard</h1>
        <div className="ptr-tf-group">
          {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
            <button key={tf} type="button" className={`ptr-tf-btn ${timeframe === tf ? 'active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
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

      <div className="ptr-row-2">
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Market Pulse</h3>
            <span className="ptr-card-badge">LIVE</span>
          </div>
          <div className="ptr-market-pulse">
            {MARKET_PULSE.map((item, i) => (
              <div key={i} className="ptr-market-item">
                <span className="ptr-market-name">{item.name}</span>
                <span className="ptr-market-value">{item.value}</span>
                <span className={`ptr-market-change ${item.up ? 'positive' : 'negative'}`}>{item.change}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Audience Growth</h3>
            <div className="ptr-tf-group">
              {['1W', '1M', '3M', '6M'].map((tf) => (
                <button key={tf} type="button" className={`ptr-tf-btn ${audienceTf === tf ? 'active' : ''}`} onClick={() => setAudienceTf(tf)}>{tf}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div className="ptr-audience-stats-row">
              <div>
                <span className="ptr-audience-stat-label">Followers</span>
                <span className="ptr-audience-stat-value">847</span>
                <span className="ptr-audience-stat-delta">+12.4%</span>
              </div>
              <div>
                <span className="ptr-audience-stat-label">Copiers</span>
                <span className="ptr-audience-stat-value">234</span>
                <span className="ptr-audience-stat-delta">+8.7%</span>
              </div>
              <div>
                <span className="ptr-audience-stat-label">Echo Subscribers</span>
                <span className="ptr-audience-stat-value">1,203</span>
                <span className="ptr-audience-stat-delta">+15.2%</span>
              </div>
            </div>
            <div className="ptr-audience-chart-placeholder">
              <span>Growth chart renders here</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card ptr-strategies-card">
          <div className="ptr-card-header">
            <h3>Your Strategies</h3>
            <button type="button" className="ptr-btn-sm"><i className="bi bi-plus-lg" /> New Strategy</button>
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
            <h3>Top Performing Content</h3>
          </div>
          <div style={{ padding: 0 }}>
            {TOP_CONTENT.map((item, i) => (
              <div key={i} className="ptr-top-content-row">
                <div className="ptr-top-content-icon">
                  <i className={`bi ${item.icon}`} style={{ color: '#d4a853', fontSize: '0.875rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <span className="ptr-top-content-type">{item.type}</span>
                  <span className="ptr-top-content-title">{item.title}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="ptr-top-content-metric">{item.metric}</span>
                  <span className="ptr-top-content-change">{item.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ptr-row-2">
        <div className="ptr-card">
          <div className="ptr-card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="ptr-activity-timeline">
            {ACTIVITY_TIMELINE.map((item, i) => (
              <div key={i} className="ptr-timeline-item">
                <div className="ptr-timeline-dot" style={{ background: item.color }}>
                  <i className={`bi ${item.icon}`} />
                </div>
                <div className="ptr-timeline-content">
                  <span className="ptr-timeline-text">{item.text}</span>
                  <span className="ptr-timeline-time">{item.time}</span>
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
