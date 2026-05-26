'use client';

import { useEffect, useState } from 'react';

export function PitchSupportingData({ pitchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/org/pitches/${pitchId}/supporting-data`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [pitchId]);

  if (loading) return <p className="op-hint">Loading FMP data…</p>;
  if (data?.error) return <p className="op-error">{data.error}</p>;
  if (!data) return null;

  const m0 = data.metrics?.[0];

  return (
    <div className="op-fmp-grid">
      <section className="op-fmp-card">
        <h3>Profile</h3>
        <p>{data.profile?.description?.slice(0, 400)}…</p>
        <p className="op-hint">
          {data.profile?.sector} · {data.profile?.industry} · MCap $
          {((data.profile?.mktCap || 0) / 1e9).toFixed(1)}B
        </p>
      </section>
      <section className="op-fmp-card">
        <h3>Quote</h3>
        <p className="op-fmp-big">${data.quote?.price?.toFixed(2)}</p>
        <p
          className={data.quote?.changesPercentage >= 0 ? 'op-hindsight--pos' : 'op-hindsight--neg'}
        >
          {data.quote?.changesPercentage >= 0 ? '+' : ''}
          {data.quote?.changesPercentage?.toFixed(2)}% today
        </p>
      </section>
      {m0 && (
        <section className="op-fmp-card">
          <h3>Key metrics</h3>
          <ul className="op-metrics-list">
            <li>P/E: {m0.peRatio?.toFixed(1) ?? '—'}</li>
            <li>P/B: {m0.pbRatio?.toFixed(1) ?? '—'}</li>
            <li>ROE: {((m0.roe || 0) * 100).toFixed(1)}%</li>
            <li>Debt/Equity: {m0.debtToEquity?.toFixed(2) ?? '—'}</li>
          </ul>
        </section>
      )}
      {data.dcf && (
        <section className="op-fmp-card">
          <h3>DCF</h3>
          <p>
            DCF: ${data.dcf.dcf?.toFixed(2)} · Price: ${data.dcf['Stock Price']?.toFixed(2)}
          </p>
        </section>
      )}
      {data.rating && (
        <section className="op-fmp-card">
          <h3>Rating</h3>
          <p>
            {data.rating.ratingRecommendation} · Score {data.rating.ratingScore}
          </p>
        </section>
      )}
      {data.peers?.length > 0 && (
        <section className="op-fmp-card">
          <h3>Peers</h3>
          <p>{(Array.isArray(data.peers) ? data.peers : []).slice(0, 8).join(', ')}</p>
        </section>
      )}
    </div>
  );
}
