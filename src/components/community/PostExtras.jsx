'use client';

/**
 * Community v3 post extras (Nov 23 2026):
 *   PostAttachment  the safe public preview of a shared Sonar report or an
 *                   Echo article (built on the server from the share page or
 *                   the published article; never the private source row).
 *   PostChart       a compact price chart for a ticker the author attached,
 *                   drawn from real daily closes (stock-candles). If there is
 *                   no data the chart is omitted: no placeholder curve.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/community/community.module.css';

const RANGE = { '1D': '1M', '1W': '1M', '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y' };
const CACHE = new Map();

export function PostAttachment({ attachment }) {
  if (!attachment?.url) return null;
  if (attachment.kind === 'echo') {
    return (
      <Link href={attachment.url} className={s.cv3Attach}>
        {attachment.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attachment.image} alt="" loading="lazy" decoding="async" />
        ) : null}
        <span className={s.cv3AttachText}>
          <span className={s.cv3AttachKind}>
            <i className="bi bi-broadcast" aria-hidden="true" /> Ezana Echo
            {attachment.read_minutes ? ` · ${attachment.read_minutes} min read` : ''}
          </span>
          <span className={s.cv3AttachTitle}>{attachment.title}</span>
          {attachment.excerpt ? <span className={s.cv3AttachSub}>{attachment.excerpt}</span> : null}
        </span>
      </Link>
    );
  }
  return (
    <Link href={attachment.url} className={s.cv3Attach}>
      <span className={s.cv3AttachIcon} aria-hidden="true">
        <i className="bi bi-radar" />
      </span>
      <span className={s.cv3AttachText}>
        <span className={s.cv3AttachKind}>
          Sonar research{attachment.depth ? ` · ${attachment.depth}` : ''}
          {attachment.ticker ? ` · ${attachment.ticker}` : ''}
        </span>
        <span className={s.cv3AttachTitle}>{attachment.title || attachment.question}</span>
        {attachment.question && attachment.question !== attachment.title ? (
          <span className={s.cv3AttachSub}>{attachment.question}</span>
        ) : null}
      </span>
      <span className={s.cv3AttachGo}>
        View build <i className="bi bi-arrow-right" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function PostChart({ symbol, period = '1M' }) {
  const range = RANGE[period] || '1M';
  const key = `${symbol}:${range}`;
  const [closes, setCloses] = useState(() => CACHE.get(key) || null);
  useEffect(() => {
    if (!symbol || CACHE.has(key)) {
      setCloses(CACHE.get(key) || null);
      return undefined;
    }
    let alive = true;
    fetch(`/api/market-data/stock-candles?symbol=${encodeURIComponent(symbol)}&range=${range}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : { candles: [] }))
      .then((d) => {
        const v = (d.candles || [])
          .map((c) => Number(c.price ?? c.close))
          .filter((n) => Number.isFinite(n));
        CACHE.set(key, v);
        if (alive) setCloses(v);
      })
      .catch(() => {
        CACHE.set(key, []);
        if (alive) setCloses([]);
      });
    return () => {
      alive = false;
    };
  }, [symbol, range, key]);

  if (!closes || closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes.map((v, i) => [(i / (closes.length - 1)) * 100, 38 - ((v - min) / span) * 34]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const first = closes[0];
  const last = closes[closes.length - 1];
  const pct = ((last - first) / first) * 100;
  const up = pct >= 0;
  const label = `${symbol} closing price over ${range}: ${first.toFixed(2)} to ${last.toFixed(2)}, ${up ? 'up' : 'down'} ${Math.abs(pct).toFixed(1)}%`;
  return (
    <figure className={s.cv3Chart}>
      <figcaption className={s.cv3ChartCap}>
        <span className={s.num}>{symbol}</span>
        <span className={s.muted}>{range}</span>
        <span className={`${s.num} ${up ? s.up : s.down}`}>
          {up ? '+' : '−'}
          {Math.abs(pct).toFixed(1)}%
        </span>
      </figcaption>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label={label}>
        <path
          d={`${d} L100 40 L0 40 Z`}
          className={up ? s.cv3ChartFillUp : s.cv3ChartFillDown}
          stroke="none"
        />
        <path
          d={d}
          fill="none"
          className={up ? s.cv3ChartLineUp : s.cv3ChartLineDown}
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
  );
}
