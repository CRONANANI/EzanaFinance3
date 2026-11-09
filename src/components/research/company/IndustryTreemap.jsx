'use client';

/**
 * Small treemap of the company and its peers for the Industry research card:
 * tile size by market cap, colour by today's change (positive / negative
 * tokens, stronger with a bigger move, and the sign written in the tile).
 * Recharts (already a dependency); loaded on demand by the card.
 */
import { ResponsiveContainer, Treemap } from 'recharts';

function Tile(props) {
  const { x, y, width, height, name, change } = props;
  if (!Number.isFinite(width) || width <= 0 || height <= 0) return null;
  const up = Number.isFinite(change) ? change >= 0 : null;
  const strength = Number.isFinite(change) ? Math.min(0.85, 0.3 + Math.abs(change) / 5) : 0.15;
  const label = Number.isFinite(change)
    ? `${change >= 0 ? '+' : '-'}${Math.abs(change).toFixed(1)}%`
    : '';
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: up == null ? 'var(--text-muted)' : up ? 'var(--positive)' : 'var(--negative)',
          fillOpacity: strength,
          stroke: 'var(--app-bg)',
          strokeWidth: 2,
        }}
      />
      {width > 44 && height > 26 ? (
        <text
          x={x + 6}
          y={y + 15}
          style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}
        >
          {name}
        </text>
      ) : null}
      {width > 44 && height > 40 ? (
        <text x={x + 6} y={y + 29} style={{ fill: 'var(--text-primary)', fontSize: 11 }}>
          {label}
        </text>
      ) : null}
    </g>
  );
}

export default function IndustryTreemap({ tiles }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={tiles}
        dataKey="size"
        nameKey="name"
        isAnimationActive={false}
        content={<Tile />}
      />
    </ResponsiveContainer>
  );
}
