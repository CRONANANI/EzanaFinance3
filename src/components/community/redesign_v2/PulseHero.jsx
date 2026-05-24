'use client';

function sentimentColor(value) {
  if (value > 30) return 'var(--positive)';
  if (value < -10) return 'var(--negative)';
  return 'var(--warning)';
}

function dialAngle(sentiment) {
  const clamped = Math.max(-100, Math.min(100, sentiment));
  return -180 + ((clamped + 100) / 200) * 180;
}

export function PulseHero({ pulse, activeTicker, setActiveTicker }) {
  const p = pulse || {};
  const sentiment = p.netSentiment ?? 0;
  const color = sentimentColor(sentiment);
  const needleDeg = dialAngle(sentiment);
  const sectors = (p.sectors || []).slice(0, 5);

  return (
    <div className="ez-card evo-pulse-hero" style={{ padding: 20, marginBottom: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr',
          gap: 24,
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <svg viewBox="0 0 200 110" width="180" height="100" aria-label="Community sentiment dial">
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
            <text
              x="18"
              y="108"
              fill="var(--text-faint)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              -100
            </text>
            <text
              x="168"
              y="108"
              fill="var(--text-faint)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              +100
            </text>
          </svg>
          <div className="ez-mono" style={{ fontSize: 22, fontWeight: 800, color, marginTop: 4 }}>
            {sentiment > 0 ? '+' : ''}
            {sentiment}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Net sentiment
          </div>
        </div>

        <div>
          <div
            className="evo-pulse-stats"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: 'Posts / hr', value: p.postsLastHour ?? 0 },
              { label: 'Active investors', value: p.activeInvestors ?? 0 },
              { label: 'Discussions', value: p.discussionsCount ?? 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 8,
                  border: '1px solid var(--border-secondary)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {stat.label}
                </div>
                <div
                  className="ez-mono"
                  style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {sectors.length > 0 && (
            <div className="evo-sector-strip">
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                Sector heat
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {sectors.map((s) => {
                  const c =
                    (s.sentiment ?? s.heat ?? 0) > 20
                      ? 'var(--positive)'
                      : (s.sentiment ?? s.heat ?? 0) < 0
                        ? 'var(--negative)'
                        : 'var(--warning)';
                  const val = s.sentiment ?? s.heat ?? 0;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      className="evo-sector-chip"
                      onClick={() => setActiveTicker?.(s.ticker || s.symbol || activeTicker)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        background: 'var(--bg-tertiary)',
                        border: `1px solid ${c}`,
                        borderRadius: 8,
                        cursor: setActiveTicker ? 'pointer' : 'default',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                        {s.name}
                      </div>
                      <div className="ez-mono" style={{ fontSize: 12, fontWeight: 700, color: c }}>
                        {val > 0 ? '+' : ''}
                        {val}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {p.hottest && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Hottest ticker:{' '}
              <button
                type="button"
                onClick={() => setActiveTicker?.(p.hottest)}
                className="ez-mono"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--emerald)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ${p.hottest}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
