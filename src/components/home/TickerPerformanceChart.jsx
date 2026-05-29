'use client';

import { useEffect, useState } from 'react';

function Spark({
  values,
  w = 520,
  h = 220,
  color = 'var(--emerald)',
  fill = true,
  strokeWidth = 2,
}) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 8;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * innerW;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return `${x},${y}`;
  });
  const line = `M ${pts.join(' L ')}`;
  const area = `${line} L ${pad + innerW},${pad + innerH} L ${pad},${pad + innerH} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-hidden>
      {fill && <path d={area} fill={color} fillOpacity={0.12} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TickerPerformanceChart({ symbol, range }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/market-data/stock-candles?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const series = (d.candles || d.points || d.prices || []).map((c) =>
          typeof c === 'number' ? c : (c.close ?? c.c ?? c.price ?? 0),
        );
        setPoints(series.filter((n) => Number.isFinite(n) && n > 0));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  if (loading) {
    return <div className="bs-ticker-modal-loading">Loading {symbol}…</div>;
  }
  if (!points.length) {
    return <div className="bs-ticker-modal-loading">No data for {symbol}.</div>;
  }
  const up = points[points.length - 1] >= points[0];
  return (
    <Spark
      values={points}
      w={520}
      h={220}
      color={up ? 'var(--positive, var(--emerald))' : 'var(--negative)'}
      fill
      strokeWidth={2}
    />
  );
}
