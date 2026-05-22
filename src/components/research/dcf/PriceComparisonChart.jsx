'use client';

/**
 * V5 horizontal peer comparison chart — centered at 0%, bars extend left
 * (overvalued / red) or right (undervalued / green) with hand-drawn SVG filter.
 * Exported for reuse; DCFInteractiveModel inlines the same markup in forward mode.
 */

export function computePeerDelta(fairValue, livePrice) {
  if (!Number.isFinite(fairValue) || !Number.isFinite(livePrice) || livePrice <= 0) return null;
  return ((fairValue - livePrice) / livePrice) * 100;
}

export function PeerBar({ ticker, delta, isSelf }) {
  const clamped = Math.max(-100, Math.min(100, delta ?? 0));
  const widthPct = Math.abs(clamped) / 2;
  const leftPct = clamped >= 0 ? 50 : 50 - widthPct;

  const isGood = clamped > 0;
  const barCls = isGood ? 'dcf-v5-peer-bar--good' : 'dcf-v5-peer-bar--bad';
  const valCls = isGood ? 'dcf-v5-peer-val--good' : 'dcf-v5-peer-val--bad';
  const sign = clamped >= 0 ? '+' : '';

  return (
    <div className="dcf-v5-peer-row">
      <span className={`dcf-v5-peer-ticker${isSelf ? ' is-self' : ''}`}>{ticker}</span>
      <span className="dcf-v5-peer-bar-track">
        <span
          className={`dcf-v5-peer-bar ${barCls}`}
          style={{ '--w': `${widthPct}%`, '--left': `${leftPct}%` }}
        />
      </span>
      <span className={`dcf-v5-peer-val ${valCls}`}>
        {sign}
        {clamped.toFixed(1)}%
      </span>
    </div>
  );
}

export default function PriceComparisonChart({
  stocks,
  loadingSelected,
  errorSelected,
  peerLoadComplete = true,
}) {
  const primary = stocks?.find((s) => s.isPrimary);

  if (!primary && loadingSelected) {
    return <div className="dcf-v5-loading">Calculating DCF…</div>;
  }
  if (!primary && errorSelected) {
    return <div className="dcf-v5-error">{errorSelected}</div>;
  }
  if (!primary) {
    return <div className="dcf-v5-loading">Loading price data…</div>;
  }

  const renderable = stocks.filter(
    (s) =>
      s.livePrice != null &&
      Number.isFinite(Number(s.livePrice)) &&
      s.fairValue != null &&
      Number.isFinite(Number(s.fairValue)),
  );

  const primaryRow = renderable.find((s) => s.isPrimary);
  const peerRows = renderable.filter((s) => !s.isPrimary);

  if (!primaryRow) {
    return <div className="dcf-v5-loading">Loading chart data…</div>;
  }

  const primaryDelta = computePeerDelta(primaryRow.fairValue, primaryRow.livePrice);

  return (
    <div className="dcf-v5-peer-chart">
      <div className="dcf-v5-peer-axis">
        <span>−100%</span>
        <span>0% (fairly valued)</span>
        <span>+100%</span>
      </div>
      <div className="dcf-v5-peer-rows">
        <div className="dcf-v5-peer-zone" aria-hidden />
        <div className="dcf-v5-peer-center" aria-hidden />
        <PeerBar ticker={primaryRow.symbol} delta={primaryDelta} isSelf />
        {peerRows.map((row) => (
          <PeerBar
            key={row.symbol}
            ticker={row.symbol}
            delta={computePeerDelta(row.fairValue, row.livePrice)}
          />
        ))}
      </div>
      {peerLoadComplete && peerRows.length === 0 && (
        <p className="dcf-v5-summary">Peer DCF data unavailable for this stock.</p>
      )}
    </div>
  );
}
