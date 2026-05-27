'use client';

const ASSET_CLASSES = [
  { key: 'crypto', label: 'Crypto' },
  { key: 'commodities', label: 'Commodities' },
];

export function AmPageHeader({ assetClass, onAssetClassChange, onExport, onAddWatchlist }) {
  return (
    <header className="am2-page-header">
      <div>
        <p className="am2-page-eyebrow">
          <span className="am2-page-eyebrow-dot" aria-hidden />
          Research · Alternative Markets
        </p>
        <h1 className="am2-page-title">Digital assets &amp; commodities</h1>
        <p className="am2-page-sub">
          Cross-asset signal across crypto markets, on-chain telemetry, community sentiment, and the
          macro tape.
        </p>
      </div>
      <div className="am2-page-header-actions">
        <div className="am2-seg" role="tablist" aria-label="Asset class">
          {ASSET_CLASSES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={assetClass === c.key}
              className={`am2-seg-btn ${assetClass === c.key ? 'am2-seg-btn--active' : ''}`}
              onClick={() => onAssetClassChange(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" className="am2-btn am2-btn-secondary" onClick={onExport}>
          Export
        </button>
        <button type="button" className="am2-btn am2-btn-primary" onClick={onAddWatchlist}>
          + Watchlist
        </button>
      </div>
    </header>
  );
}
