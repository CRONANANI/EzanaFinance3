'use client';

import { useOrg } from '@/contexts/OrgContext';

export function PositionRow({
  position,
  teamId,
  analystName,
  showSector = false,
  onFlag,
  canFlag,
  existingFlag,
}) {
  const { canFlagPositions } = useOrg();
  const finalCanFlag = canFlag !== undefined ? canFlag : canFlagPositions;

  // Real book rows can be unpriced (current_price null) — carry at cost so P/L
  // reads 0 rather than NaN, and the price cell renders an em-dash.
  const priced = position.current_price != null;
  const price = priced ? position.current_price : position.avg_cost;
  const value = position.shares * price;
  const cost = position.shares * position.avg_cost;
  const pl = value - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;

  return (
    <tr>
      {/* Retail table contract: bold token-colored symbol, mono tabular
          numerals, emerald/red data semantics (no hardcoded hex). */}
      <td className="ot-position-ticker">
        {position.ticker}
        {existingFlag && (
          <span
            className={`ot-position-flag-existing ${existingFlag.color}`}
            style={{ marginLeft: 6 }}
          >
            <i className="bi bi-flag-fill" />
            {existingFlag.count}
          </span>
        )}
      </td>
      {showSector && (
        <td style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{position.sector}</td>
      )}
      <td className="ot-num">{position.shares}</td>
      <td className="ot-num">
        {position.avg_cost != null ? `$${position.avg_cost.toFixed(2)}` : '—'}
      </td>
      <td className="ot-num">{priced ? `$${position.current_price.toFixed(2)}` : '—'}</td>
      <td className={`ot-num ot-position-pl ${pl >= 0 ? 'pos' : 'neg'}`}>
        {pl >= 0 ? '+' : ''}
        {plPct.toFixed(1)}%
      </td>
      {analystName !== undefined && <td className="ot-position-meta">{analystName || '—'}</td>}
      <td style={{ textAlign: 'right' }}>
        <button
          type="button"
          className="ot-position-flag-btn"
          onClick={onFlag}
          disabled={!finalCanFlag}
          title={
            finalCanFlag
              ? 'Flag this position'
              : "You don't have flag permissions. Contact your PM or executive to enable."
          }
        >
          <i className="bi bi-flag" />
          Flag
        </button>
      </td>
    </tr>
  );
}
