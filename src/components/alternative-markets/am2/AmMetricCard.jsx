'use client';

import { AmSymbolChip } from './AmSymbolChip';
import { AmSpark } from './AmSpark';
import { AmPct } from './AmPct';

const ACCENT_TO_VAR = {
  gold: 'rgba(212, 168, 83, 0.10)',
  purple: 'rgba(167, 139, 250, 0.10)',
  cyan: 'rgba(6, 182, 212, 0.10)',
  emerald: 'rgba(16, 185, 129, 0.10)',
};

const ACCENT_TO_SYM = {
  btc: 'BTC',
  eth: 'ETH',
  mcap: 'GLOBAL',
  wti: 'WTI',
  gold: 'GOLD',
  wheat: 'WHEAT',
  crb: 'CRB',
  fg: 'INDEX',
};

export function AmMetricCard({ metric }) {
  const { id, label, value, delta, positive, sparkline, accent, mood } = metric;
  const sym = ACCENT_TO_SYM[id] || id?.toUpperCase() || 'IDX';
  const isFG = id === 'fg';

  return (
    <div
      className="am2-card am2-metric-card"
      style={{ '--am2-accent-glow': ACCENT_TO_VAR[accent] || ACCENT_TO_VAR.emerald }}
    >
      <div className="am2-metric-header">
        <div className="am2-metric-header-left">
          <AmSymbolChip accent={accent}>{sym}</AmSymbolChip>
          <span className="am2-metric-label">{label}</span>
        </div>
        <span className="am2-live">
          <span className="am2-live-dot" aria-hidden />
          Live
        </span>
      </div>

      <div className="am2-metric-value">{isFG && mood ? mood.num : value}</div>

      <div className="am2-metric-sub">
        {isFG && mood ? (
          <>
            <span className="am2-mood-pill">{mood.label}</span>
            <span>{mood.label} last week</span>
          </>
        ) : (
          <>
            <AmPct ch={delta} signed />
            <span>vs. yesterday</span>
          </>
        )}
      </div>

      <div className="am2-metric-spark">
        <AmSpark values={sparkline} positive={positive} w={280} h={36} dot />
      </div>
    </div>
  );
}
