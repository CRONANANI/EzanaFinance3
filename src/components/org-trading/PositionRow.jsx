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

  const value = position.shares * position.current_price;
  const cost = position.shares * position.avg_cost;
  const pl = value - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;

  return (
    <tr>
      <td style={{ fontWeight: 700, color: '#f0f6fc' }}>
        {position.ticker}
        {existingFlag && (
          <span className={`ot-position-flag-existing ${existingFlag.color}`} style={{ marginLeft: 6 }}>
            <i className="bi bi-flag-fill" />
            {existingFlag.count}
          </span>
        )}
      </td>
      {showSector && <td style={{ fontSize: '0.7rem', color: '#8b949e' }}>{position.sector}</td>}
      <td>{position.shares}</td>
      <td>${position.avg_cost.toFixed(2)}</td>
      <td>${position.current_price.toFixed(2)}</td>
      <td style={{ color: pl >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
        {pl >= 0 ? '+' : ''}
        {plPct.toFixed(1)}%
      </td>
      {analystName !== undefined && (
        <td style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{analystName || '—'}</td>
      )}
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
