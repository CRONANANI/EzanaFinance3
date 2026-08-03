'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { ok: 'Healthy', attention: 'Needs attention', stale: 'Stale' };

function relTime(iso) {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  const h = Math.floor(ms / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function absDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Fund data health — exec-only trust signal. The endpoint 403s for non-execs,
 * so this simply renders nothing for them (and shows honest states otherwise).
 */
export function FundDataHealthCard() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | error | forbidden

  useEffect(() => {
    let alive = true;
    fetch('/api/org/fund-health')
      .then((r) => {
        if (r.status === 403) {
          if (alive) setState('forbidden');
          return null;
        }
        if (!r.ok) {
          if (alive) setState('error');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (alive && d) {
          setData(d);
          setState('ok');
        }
      })
      .catch(() => {
        if (alive) setState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'forbidden') return null;

  return (
    <section className="thw-card thw-health" aria-label="Fund data health">
      <div className="thw-card-head">
        <span className="thw-card-title">
          <i className="bi bi-shield-check" aria-hidden="true" /> Fund data health
        </span>
        {state === 'ok' && data && (
          <span className={`thw-health-pill thw-health-pill--${data.status}`}>
            {STATUS_LABEL[data.status] || data.status}
          </span>
        )}
      </div>
      <div className="thw-card-body">
        {state === 'loading' && <p className="thw-empty">Loading data health…</p>}
        {state === 'error' && <p className="thw-empty">Couldn&apos;t load data health.</p>}
        {state === 'ok' && data && (
          <div className="thw-health-rows">
            <div className="thw-health-row">
              <span className="thw-health-label">Prices updated</span>
              <span className="thw-health-val thw-mono">
                {relTime(data.pricing.last_priced_at)}
                {data.pricing.last_priced_at && (
                  <span className="thw-health-sub"> · {absDate(data.pricing.last_priced_at)}</span>
                )}
              </span>
            </div>
            <div className="thw-health-row">
              <span className="thw-health-label">Last snapshot</span>
              <span className="thw-health-val thw-mono">
                {data.snapshot.last_date ? absDate(`${data.snapshot.last_date}T00:00:00Z`) : '—'}
                {data.snapshot.days_since != null && (
                  <span className="thw-health-sub"> · {data.snapshot.days_since}d ago</span>
                )}
              </span>
            </div>
            <div className="thw-health-row">
              <span className="thw-health-label">Unpriced positions</span>
              <span className="thw-health-val thw-mono">
                {data.positions.unpriced > 0 ? (
                  <Link href="/org-trading" className="thw-health-link">
                    {data.positions.unpriced} of {data.positions.total}
                  </Link>
                ) : (
                  `0 of ${data.positions.total}`
                )}
              </span>
            </div>
            <div className="thw-health-row">
              <span className="thw-health-label">Missing sector / team</span>
              <span className="thw-health-val thw-mono">
                {data.positions.missing_sector} / {data.positions.missing_team}
              </span>
            </div>
            <div className="thw-health-row">
              <span className="thw-health-label">Benchmark</span>
              <span className="thw-health-val thw-mono">
                {data.benchmark.symbol || '—'}
                {data.benchmark.source === 'pitch_proxy' && (
                  <span className="thw-health-sub" title="Estimated from pitch hindsight, not live index prices.">
                    {' '}
                    · est.
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
