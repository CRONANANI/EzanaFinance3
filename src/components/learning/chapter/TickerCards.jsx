'use client';

const BADGE_COLORS = {
  blue: { bg: 'rgba(62,122,216,.12)', fg: '#3E7AD8' },
  green: { bg: 'rgba(16,160,106,.12)', fg: '#0A4A33' },
  amber: { bg: 'rgba(232,155,47,.12)', fg: '#E89B2F' },
  red: { bg: 'rgba(216,81,61,.12)', fg: '#D8513D' },
  violet: { bg: 'rgba(123,108,212,.12)', fg: '#7B6CD4' },
  coralDeep: { bg: 'rgba(228,122,101,.12)', fg: '#E47A65' },
};

export function TickerCards({ eyebrow, title, cards = [] }) {
  return (
    <section className="lc-edit-tickers">
      {eyebrow && (
        <div className="lc-edit-tickers-eyebrow">
          <i className="bi bi-diamond-fill" /> {eyebrow}
        </div>
      )}
      {title && <h3 className="lc-edit-tickers-title">{title}</h3>}
      <div className="lc-edit-tickers-row">
        {cards.map((c, i) => (
          <TickerCard key={c.ticker || i} card={c} />
        ))}
      </div>
    </section>
  );
}

function TickerCard({ card }) {
  const badge = BADGE_COLORS[card.riskBadgeColor] || BADGE_COLORS.blue;
  const assetColor = card.assetColor || badge.fg;
  return (
    <article className="lc-edit-ticker">
      <header className="lc-edit-ticker-head">
        <div className="lc-edit-ticker-id">
          <span
            className="lc-edit-ticker-badge"
            style={{
              background: `${assetColor}22`,
              border: `1px solid ${assetColor}44`,
              color: assetColor,
            }}
          >
            {card.ticker}
          </span>
          <div>
            <div className="lc-edit-ticker-name">{card.name}</div>
            {card.headline && <div className="lc-edit-ticker-headline">{card.headline}</div>}
          </div>
        </div>
        <span className="lc-edit-ticker-risk" style={{ background: badge.bg, color: badge.fg }}>
          {card.riskBadge}
        </span>
      </header>
      <Sparkline color={assetColor} trend={card.trend || 'up'} />
      <div className="lc-edit-ticker-stats">
        <div className="lc-edit-ticker-stat">
          <span className="lc-edit-ticker-stat-label">1yr vol</span>
          <span className="lc-edit-ticker-stat-value">{card.vol}</span>
        </div>
        <span className="lc-edit-ticker-stat-divider" />
        <div className="lc-edit-ticker-stat">
          <span className="lc-edit-ticker-stat-label">avg return</span>
          <span className="lc-edit-ticker-stat-value">{card.avgReturn}</span>
        </div>
      </div>
      {card.body && <p className="lc-edit-ticker-body">{card.body}</p>}
    </article>
  );
}

function Sparkline({ color, trend = 'up' }) {
  const width = 264;
  const height = 48;
  const points = 24;
  let prng = 7;
  const rand = () => {
    prng = (prng * 1103515245 + 12345) & 0x7fffffff;
    return prng / 0x7fffffff;
  };
  const ys = [];
  let y = 0.5;
  const bias = trend === 'up' ? -0.015 : trend === 'down' ? 0.015 : 0;
  for (let i = 0; i < points; i += 1) {
    y += (rand() - 0.5) * 0.15 + bias;
    y = Math.max(0.1, Math.min(0.9, y));
    ys.push(y);
  }
  const path = ys
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points - 1)) * width} ${v * height}`)
    .join(' ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="lc-edit-ticker-spark"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
