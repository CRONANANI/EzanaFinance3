'use client';

import { SECTOR_COLORS } from '@/components/watchlist/asset-icons';

function sentimentColor(value) {
  if (value > 30) return 'var(--positive)';
  if (value < -10) return 'var(--negative)';
  return 'var(--warning)';
}

function dialAngle(sentiment) {
  const clamped = Math.max(-100, Math.min(100, sentiment));
  return -180 + ((clamped + 100) / 200) * 180;
}

function sentimentTag(value) {
  if (value > 30) return 'Bullish';
  if (value > 10) return 'Mildly bullish';
  if (value < -10) return 'Cautious';
  if (value < -30) return 'Bearish';
  return 'Mixed';
}

export function PulseHero({ pulse, activeTicker, setActiveTicker }) {
  const p = pulse || {};
  const sentiment = p.netSentiment ?? 0;
  const color = sentimentColor(sentiment);
  const needleDeg = dialAngle(sentiment);
  const sectors = (p.sectors || []).slice(0, 5);

  return (
    <>
      <div className="pulse">
        <div className="dial-wrap">
          <div className="dial-label">Net sentiment</div>
          <svg viewBox="0 0 200 110" width="170" height="82" aria-label="Community sentiment dial">
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="251"
              strokeDashoffset={251 - ((sentiment + 100) / 200) * 251}
              style={{ transition: 'stroke-dashoffset .4s ease' }}
            />
            <g transform={`rotate(${needleDeg} 100 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="32"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="6" fill={color} />
            </g>
          </svg>
          <div className="dial-value" style={{ color }}>
            {sentiment > 0 ? '+' : ''}
            {sentiment}
          </div>
          <div className="dial-tag">{sentimentTag(sentiment)}</div>
        </div>

        <div className="pstat-row">
          {[
            { label: 'Posts / hr', value: p.postsLastHour ?? 0, icon: 'bi-lightning', delta: null },
            {
              label: 'Active investors',
              value: p.activeInvestors ?? 0,
              icon: 'bi-people',
              delta: null,
            },
            {
              label: 'Discussions',
              value: p.discussionsCount ?? 0,
              icon: 'bi-chat-dots',
              delta: null,
            },
          ].map((stat) => (
            <div key={stat.label} className="pstat">
              <div className="pstat-label">
                <i className={`bi ${stat.icon}`} style={{ fontSize: 11 }} aria-hidden />
                {stat.label}
              </div>
              <div className="pstat-value">{stat.value}</div>
              {stat.delta != null && (
                <div className={`pstat-delta ${stat.delta >= 0 ? 'pos' : 'neg'}`}>
                  {stat.delta >= 0 ? '+' : ''}
                  {stat.delta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {sectors.length > 0 && (
        <div className="sectorstrip">
          <span className="sectorstrip-label">Hot sectors</span>
          {sectors.map((s) => {
            const val = s.sentiment ?? s.heat ?? 0;
            const pctColor =
              val > 20 ? 'var(--positive)' : val < 0 ? 'var(--negative)' : 'var(--warning)';
            const dotColor = SECTOR_COLORS[s.name]?.[0] || 'var(--text-faint)';
            return (
              <button
                key={s.name}
                type="button"
                className="spill"
                onClick={() => setActiveTicker?.(s.ticker || s.symbol || activeTicker)}
              >
                <span className="dot" style={{ background: dotColor }} />
                <span>{s.name}</span>
                <span className="spill-pct" style={{ color: pctColor }}>
                  {val > 0 ? '+' : ''}
                  {val}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {p.hottest && (
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--line-soft)',
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          Hottest ticker:{' '}
          <button
            type="button"
            onClick={() => setActiveTicker?.(p.hottest)}
            className="ez-mono"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--emerald-ink)',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ${p.hottest}
          </button>
        </div>
      )}
    </>
  );
}
