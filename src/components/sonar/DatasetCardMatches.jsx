'use client';

/**
 * The dataset component cards that match a datasets search, shown above the
 * Sonar results. Asks /api/datasets/cards for the ranked, loaded cards and
 * renders each with the hub's ListCard under a small header naming the
 * dataset it comes from (linked). Renders nothing while loading, on failure,
 * or when no card matches, so the results read as before in those cases.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ListCard from '@/components/datasets/hub/dataset-cards/ListCard';
import '@/app/datasets/[hub]/hub.css';
import './dataset-card-matches.css';

export default function DatasetCardMatches({ query }) {
  const [state, setState] = useState({ q: null, cards: [] });

  useEffect(() => {
    const q = String(query || '').trim();
    if (!q) return undefined;
    const ctrl = new AbortController();
    fetch(`/api/datasets/cards?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState({ q, cards: d?.ok && Array.isArray(d.cards) ? d.cards : [] }))
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ q, cards: [] });
      });
    return () => ctrl.abort();
  }, [query]);

  if (state.q !== String(query || '').trim() || !state.cards.length) return null;

  return (
    <section className="dcm" aria-label="Matching dataset cards">
      <div className="dcm-head">
        <span className="dcm-title">Matching dataset cards</span>
        <span className="dcm-rule" />
        <span className="dcm-meta">
          {state.cards.length} {state.cards.length === 1 ? 'card' : 'cards'}
        </span>
      </div>
      <div className="dcm-grid">
        {state.cards.map((c) => (
          <div key={c.id} className="dcm-item">
            <div className="dcm-from">
              <span className="dcm-from-label">From</span>
              <Link href={c.href} className="dcm-from-link">
                {c.dataset}
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
            {/* The From header above names the dataset, so the card's own tag is off. */}
            <ListCard {...c} dataset={null} />
          </div>
        ))}
      </div>
    </section>
  );
}
