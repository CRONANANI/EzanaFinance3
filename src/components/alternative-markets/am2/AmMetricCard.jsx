'use client';

import { AmSymbolChip } from './AmSymbolChip';
import { AmSpark } from './AmSpark';
import { AmPct } from './AmPct';

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
  const { id, label, value, delta, positive, sparkline, accent, mood, period, note } = metric;
  const sym = ACCENT_TO_SYM[id] || id?.toUpperCase() || 'IDX';
  const isFG = id === 'fg';

  return (
    <div className="am2-card am2-metric-card">
      <div className="am2-metric-header">
        <div className="am2-metric-header-left">
          <AmSymbolChip accent={accent}>{sym}</AmSymbolChip>
          <span className="am2-metric-label">{label}</span>
        </div>
        <span className="am2-illustrative">Illustrative</span>
      </div>

      <div className="am2-metric-value">{isFG && mood ? mood.num : value}</div>

      <div className="am2-metric-sub">
        {isFG && mood ? (
          <>
            <span className="am2-mood-pill">{mood.label}</span>
            <span>{note ? note.charAt(0).toUpperCase() + note.slice(1) : null}</span>
          </>
        ) : (
          <>
            <AmPct ch={delta} signed />
            <span>{period}</span>
          </>
        )}
      </div>

      <div className="am2-metric-spark">
        <AmSpark values={sparkline} positive={positive} w={84} h={28} dot />
      </div>
    </div>
  );
}
