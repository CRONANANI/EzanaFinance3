'use client';

/**
 * Centered delta: positive (undervalued) extends right, negative (overvalued) extends left.
 * Primary: emerald/red. Peers: blue/orange.
 */

export default function PriceComparisonChart({
  stocks,
  loadingSelected,
  errorSelected,
  peerLoadComplete = true,
}) {
  const primary = stocks?.find((s) => s.isPrimary);

  if (!primary && loadingSelected) {
    return (
      <div className="dcf-chart-empty">
        <div className="dcf-chart-spinner" />
        <span>Calculating DCF…</span>
      </div>
    );
  }
  if (!primary && errorSelected) {
    return (
      <div className="dcf-chart-empty">
        <i className="bi bi-exclamation-triangle" style={{ color: '#ef4444', fontSize: '1.5rem' }} />
        <span style={{ color: '#ef4444' }}>{errorSelected}</span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          Try clicking Recalculate, or check your assumptions.
        </span>
      </div>
    );
  }
  if (!primary) {
    return (
      <div className="dcf-chart-empty">
        <i className="bi bi-graph-up" style={{ fontSize: '1.5rem', color: '#6b7280' }} />
        <span>Loading price data…</span>
      </div>
    );
  }

  const renderable = stocks.filter(
    (s) =>
      s.livePrice != null &&
      Number.isFinite(Number(s.livePrice)) &&
      s.fairValue != null &&
      Number.isFinite(Number(s.fairValue)),
  );

  const rows = renderable.map((s) => {
    const live = Number(s.livePrice);
    const fair = Number(s.fairValue);
    const delta = fair - live;
    const deltaPct = (delta / live) * 100;
    return {
      ...s,
      livePrice: live,
      fairValue: fair,
      delta,
      deltaPct,
      isUndervalued: delta > 0,
    };
  });

  if (rows.length === 0) {
    return (
      <div className="dcf-chart-empty">
        <div className="dcf-chart-spinner" />
        <span>Loading chart data…</span>
      </div>
    );
  }

  const maxDeltaAbs =
    rows.length > 0 ? Math.max(...rows.map((r) => Math.abs(r.deltaPct))) : 20;
  const maxAbsDelta = Math.max(20, Math.min(100, maxDeltaAbs));

  const primaryRow = rows.find((r) => r.isPrimary);
  const peerRows = rows.filter((r) => !r.isPrimary);

  const peerAvg =
    peerRows.length > 0 ? peerRows.reduce((s, p) => s + p.deltaPct, 0) / peerRows.length : null;

  return (
    <div className="dcf-chart-root">
      <div className="dcf-chart-header">
        <h4>Fair Value vs Market — {primary.symbol} & Peers</h4>
        {primaryRow && (
          <div className={`dcf-chart-verdict ${primaryRow.isUndervalued ? 'undervalued' : 'overvalued'}`}>
            {primaryRow.isUndervalued ? '↑ Undervalued' : '↓ Overvalued'}
            <span className="dcf-chart-delta">
              {primaryRow.isUndervalued ? '+' : ''}
              {primaryRow.deltaPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="dcf-delta-axis">
        <span className="dcf-delta-axis-label">−{maxAbsDelta.toFixed(0)}%</span>
        <span className="dcf-delta-axis-label dcf-delta-axis-zero">0% (fairly valued)</span>
        <span className="dcf-delta-axis-label">+{maxAbsDelta.toFixed(0)}%</span>
      </div>

      <div className="dcf-delta-bars">
        {primaryRow && <DeltaBarRow row={primaryRow} maxAbsDelta={maxAbsDelta} isPrimary />}

        {peerRows.length > 0 && (
          <>
            <div className="dcf-delta-divider">
              <span>SECTOR PEERS</span>
            </div>
            {peerRows.map((row) => (
              <DeltaBarRow key={row.symbol} row={row} maxAbsDelta={maxAbsDelta} isPrimary={false} />
            ))}
          </>
        )}

        {peerLoadComplete && peerRows.length === 0 && primaryRow && (
          <div className="dcf-delta-no-peers">
            <i className="bi bi-info-circle" /> Peer DCF data unavailable for this stock.
          </div>
        )}
      </div>

      <div className="dcf-chart-footer">
        <p>
          The DCF model values <strong>{primary.symbol}</strong> at{' '}
          <strong>${primaryRow ? primaryRow.fairValue.toFixed(2) : '—'}</strong> per share, a{' '}
          <strong>{primaryRow ? Math.abs(primaryRow.deltaPct).toFixed(1) : '0'}%</strong>{' '}
          {primaryRow?.isUndervalued ? 'discount to' : 'premium over'} the current market price of{' '}
          <strong>${primaryRow ? primaryRow.livePrice.toFixed(2) : '—'}</strong>.
          {peerRows.length > 0 && primaryRow && peerAvg != null && (
            <>
              {' '}
              Compared against {peerRows.length} sector {peerRows.length === 1 ? 'peer' : 'peers'} (
              {peerRows.map((p) => p.symbol).join(', ')}), {primary.symbol} is{' '}
              {primaryRow.deltaPct > peerAvg ? 'more attractively priced' : 'less attractively priced'} on a DCF
              basis.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function DeltaBarRow({ row, maxAbsDelta, isPrimary }) {
  const halfWidth = (Math.min(Math.abs(row.deltaPct), maxAbsDelta) / maxAbsDelta) * 50;
  const barColor = isPrimary
    ? row.isUndervalued
      ? '#10b981'
      : '#ef4444'
    : row.isUndervalued
      ? '#3b82f6'
      : '#f97316';

  const fillStyle = row.isUndervalued
    ? { left: '50%', width: `${halfWidth}%`, background: barColor }
    : { left: `${50 - halfWidth}%`, width: `${halfWidth}%`, background: barColor };

  return (
    <div className={`dcf-delta-row ${isPrimary ? 'primary' : 'peer'}`}>
      <span className="dcf-delta-row-label">{row.symbol}</span>
      <div className="dcf-delta-row-track">
        <div className="dcf-delta-row-center" />
        <div className="dcf-delta-row-fill" style={fillStyle} />
      </div>
      <span
        className="dcf-delta-row-value"
        style={{ color: row.isUndervalued ? '#059669' : '#dc2626' }}
      >
        {row.isUndervalued ? '+' : ''}
        {row.deltaPct.toFixed(1)}%
      </span>
    </div>
  );
}
