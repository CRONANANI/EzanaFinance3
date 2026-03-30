'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { parseSentinelReportText, cleanSentinelField } from '@/lib/sentinel-report';

const GOLD = '#D4AF37';
const GOLD_DIM = 'rgba(212, 175, 55, 0.35)';

/** Demo series for visual polish when report is plain text */
const DEMO_TREND = [
  { w: 'W1', v: 100 },
  { w: 'W2', v: 102 },
  { w: 'W3', v: 101 },
  { w: 'W4', v: 105 },
  { w: 'W5', v: 108 },
  { w: 'W6', v: 107 },
];

const DEMO_ALLOC = [
  { name: 'Equities', pct: 58 },
  { name: 'Fixed inc.', pct: 22 },
  { name: 'Alts', pct: 12 },
  { name: 'Cash', pct: 8 },
];

function SectionBody({ text }) {
  const cleaned = cleanSentinelField(text || '');
  if (!cleaned.trim()) {
    return <p className="sentinel-report-section-body sentinel-report-section-body--empty">—</p>;
  }
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <div className="sentinel-report-section-body">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  );
}

export function SentinelReportModal({ open, onClose, report }) {
  if (!open || !report) return null;

  const parsed = parseSentinelReportText(report.report_text || '');
  const title = 'Sentinel Weekly Report';
  const dateLabel = report.report_date
    ? new Date(report.report_date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div
      className="sentinel-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sentinel-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sentinel-modal-shell">
        <header className="sentinel-modal-header">
          <div>
            <p className="sentinel-modal-kicker">Confidential · Portfolio intelligence</p>
            <h2 id="sentinel-modal-title" className="sentinel-modal-title">
              {title}
            </h2>
            {dateLabel && <p className="sentinel-modal-date">{dateLabel}</p>}
          </div>
          <button type="button" className="sentinel-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="sentinel-modal-grid">
          <section className="sentinel-modal-main">
            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Portfolio Health</h3>
              <p className="sentinel-report-health-value">{cleanSentinelField(parsed.portfolioHealth || 'Strong')}</p>
            </div>

            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Key Insights</h3>
              <SectionBody text={parsed.keyInsights} />
            </div>

            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Top Performers</h3>
              <SectionBody text={parsed.topPerformers} />
            </div>

            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Events to Monitor</h3>
              <SectionBody text={parsed.events} />
            </div>

            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Recommendations</h3>
              <SectionBody text={parsed.recommendations} />
            </div>

            <div className="sentinel-report-section">
              <h3 className="sentinel-report-section-title sentinel-report-section-title--gold">Disclaimer</h3>
              <p className="sentinel-report-disclaimer-block">{cleanSentinelField(parsed.disclaimer)}</p>
            </div>
          </section>

          <aside className="sentinel-modal-charts">
            <div className="sentinel-chart-card">
              <div className="sentinel-chart-title">Portfolio trajectory (indexed)</div>
              <div className="sentinel-chart-h">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={DEMO_TREND} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sentinelArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.12)" />
                    <XAxis dataKey="w" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} />
                    <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip
                      contentStyle={{
                        background: '#111827',
                        border: `1px solid ${GOLD_DIM}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: GOLD }}
                    />
                    <Area type="monotone" dataKey="v" stroke={GOLD} fill="url(#sentinelArea)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sentinel-chart-card">
              <div className="sentinel-chart-title">Strategic allocation</div>
              <div className="sentinel-chart-h sentinel-chart-h--bar">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DEMO_ALLOC} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.08)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={72} tick={{ fill: '#d1d5db', fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(212,175,55,0.06)' }}
                      contentStyle={{
                        background: '#111827',
                        border: `1px solid ${GOLD_DIM}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="pct" fill={GOLD} radius={[0, 4, 4, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sentinel-kpi-row">
              <div className="sentinel-kpi">
                <span className="sentinel-kpi-label">Conviction</span>
                <span className="sentinel-kpi-val">High</span>
              </div>
              <div className="sentinel-kpi">
                <span className="sentinel-kpi-label">Risk posture</span>
                <span className="sentinel-kpi-val">Balanced</span>
              </div>
              <div className="sentinel-kpi">
                <span className="sentinel-kpi-label">Horizon</span>
                <span className="sentinel-kpi-val">Multi-qtr</span>
              </div>
            </div>

            <div className="sentinel-news-section">
              <div className="sentinel-chart-title" style={{ marginBottom: '0.75rem' }}>Market news</div>
              {[
                { title: 'Fed signals patience on rate cuts amid sticky inflation', source: 'Reuters', ago: '2h ago' },
                { title: 'NVDA hits new high on AI datacenter demand', source: 'Bloomberg', ago: '4h ago' },
                { title: 'Senate committee advances new crypto regulation bill', source: 'WSJ', ago: '1d ago' },
              ].map((article, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0',
                    borderBottom: idx < 2 ? '1px solid rgba(212, 175, 55, 0.1)' : 'none',
                  }}
                >
                  <p
                    style={{
                      color: '#e5e7eb',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      margin: '0 0 0.2rem 0',
                      lineHeight: 1.4,
                    }}
                  >
                    {article.title}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.65rem', margin: 0 }}>
                    {article.source} · {article.ago}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
}
