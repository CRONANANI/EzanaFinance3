'use client';

import { useStockMetric } from '@/hooks/useFinnhub';
import { MetricInfo } from '@/components/beginner/MetricInfo';
import './research-tab-cards.css';

function fmt(v) {
  if (v == null || v === '' || v === undefined) return 'n/a';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  if (n < 1 && n > 0) return n.toFixed(2);
  return n.toFixed(2);
}

const METRIC_LABELS = {
  peBasicExclExtraTTM: 'P/E (TTM)',
  pbAnnual: 'P/B',
  psAnnual: 'P/S',
  dividendYieldIndicatedAnnual: 'Div Yield',
  revenuePerShareTTM: 'Revenue/Share',
  netProfitMarginTTM: 'Net Margin',
  roeTTM: 'ROE',
  roaTTM: 'ROA',
  currentRatioQuarterly: 'Current Ratio',
  longTermDebtEquityQuarterly: 'Debt/Equity',
  marketCapitalization: 'Market Cap',
  '52WeekHigh': '52W High',
  '52WeekLow': '52W Low',
};

export function KeyMetrics({ symbol }) {
  const { data, loading, error } = useStockMetric(symbol);

  if (!symbol) return null;
  if (loading) {
    return (
      <section className="rkm research-fade-in" aria-busy="true">
        <div className="rkm-head-id">
          <span className="rkm-skel rkm-skel--icon" />
          <div className="rkm-head-text">
            <span className="rkm-skel rkm-skel--title" />
            <span className="rkm-skel rkm-skel--line" />
          </div>
        </div>
        <span className="rkm-skel rkm-skel--block" />
        <span className="rkm-sr" role="status">
          Loading metrics...
        </span>
      </section>
    );
  }
  if (error || !data?.metric) {
    return (
      <section className="rkm rkm--state research-fade-in">
        <p className="rkm-state-title">Key metrics unavailable.</p>
        <p className="rkm-state-text">No fundamentals were returned for {symbol}.</p>
      </section>
    );
  }

  const metric = data.metric || {};
  const entries = Object.entries(metric).filter(([, v]) => v != null && v !== '');

  return (
    <section className="rkm research-fade-up">
      <header className="rkm-head">
        <div className="rkm-head-id">
          <span className="rkm-icon" aria-hidden="true">
            <i className="bi bi-clipboard-data" />
          </span>
          <div className="rkm-head-text">
            <h3 className="rkm-title">
              Key Financial Metrics
              <MetricInfo term="pe" />
            </h3>
            <p className="rkm-desc">Reported fundamentals for {symbol}</p>
          </div>
        </div>
      </header>
      <dl className="rkm-list">
        {entries.slice(0, 12).map(([key, value]) => {
          const shown = fmt(value);
          return (
            <div key={key} className="rkm-row">
              <dt>{METRIC_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim()}</dt>
              <dd className={shown === 'n/a' ? 'is-na' : undefined}>{shown}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
