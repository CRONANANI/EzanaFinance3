'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ArchiveCompare({ initialIds = [] }) {
  const [ids, setIds] = useState(initialIds.join(','));
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    const pitch_ids = ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (pitch_ids.length < 2) return alert('Enter at least 2 pitch IDs');
    setLoading(true);
    const res = await fetch('/api/org/archive/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pitch_ids }),
    });
    const data = await res.json();
    setPitches(data.pitches || []);
    setLoading(false);
  };

  return (
    <div className="op-compare">
      <p className="op-hint">Enter pitch IDs separated by commas (from archive cards or URLs).</p>
      <div className="op-inline-form">
        <input
          className="op-search"
          style={{ flex: 1 }}
          value={ids}
          onChange={(e) => setIds(e.target.value)}
          placeholder="pitch-nvda-arch-1, pitch-amd-arch-1"
        />
        <button type="button" className="op-btn" onClick={compare} disabled={loading}>
          Compare
        </button>
      </div>
      <div className="op-compare-grid">
        {pitches.map((p) => (
          <div key={p.id} className="op-compare-col">
            <h3>
              <Link href={`/org-team-hub/pitches/${p.id}`}>{p.ticker}</Link>
            </h3>
            <p className={`op-decision op-decision--${p.decision}`}>{p.decision}</p>
            <p className="op-archive-thesis">{p.thesis_short}</p>
            <p>
              Vote: {p.vote_yes_count}y / {p.vote_no_count}n
            </p>
            {p.hindsight && (
              <p className={p.hindsight.alpha_pct >= 0 ? 'op-hindsight--pos' : 'op-hindsight--neg'}>
                Alpha: {p.hindsight.alpha_pct}%
              </p>
            )}
            <p style={{ fontSize: '0.7rem' }}>{p.decision_rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
