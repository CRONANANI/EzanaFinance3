'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './analytics.css';

const money = (n) => (n == null ? '—' : `$${Math.round(Number(n)).toLocaleString()}`);
const pct = (n) => (n == null ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`);

/** Compact fund value / return / alpha strip for the Team Hub home. */
export function FundStatStrip() {
  const [perf, setPerf] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/org/analytics/fund', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPerf(data.performance || null);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!perf) return null;

  return (
    <Link
      href="/org-team-hub/fund-analytics"
      className="an4-root"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.6rem',
        marginBottom: '1.25rem',
        textDecoration: 'none',
      }}
    >
      <div className="an4-stat">
        <div className="an4-stat-lbl">Fund value</div>
        <div className="an4-stat-val" style={{ fontSize: '1.2rem' }}>{money(perf.total_value)}</div>
      </div>
      <div className="an4-stat">
        <div className="an4-stat-lbl">Return</div>
        <div className={`an4-stat-val ${(perf.return_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`} style={{ fontSize: '1.2rem' }}>
          {pct(perf.return_pct)}
        </div>
      </div>
      <div className="an4-stat">
        <div className="an4-stat-lbl">Alpha</div>
        <div className={`an4-stat-val ${(perf.alpha_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`} style={{ fontSize: '1.2rem' }}>
          {pct(perf.alpha_pct)}
        </div>
      </div>
    </Link>
  );
}
