'use client';

import { useState } from 'react';
import Link from 'next/link';
import { orgRequest } from '@/lib/org-request';

export function ArchiveCompare({ initialIds = [] }) {
  const [ids, setIds] = useState(initialIds.join(','));
  const [pitches, setPitches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const compare = async () => {
    const pitch_ids = ids
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (pitch_ids.length < 2) {
      setError('Enter at least 2 pitch IDs to compare.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await orgRequest('/api/org/archive/compare', {
        method: 'POST',
        json: { pitch_ids },
      });
      setPitches(data.pitches || []);
    } catch (err) {
      setError(err.message || 'Could not compare those pitches.');
    } finally {
      setLoading(false);
    }
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
          placeholder="Pitch IDs (UUIDs), comma separated"
        />
        <button type="button" className="op-btn" onClick={compare} disabled={loading}>
          Compare
        </button>
      </div>
      {error ? (
        <p className="org-inline-error" role="alert">
          {error}
        </p>
      ) : null}
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
            {p.hindsight && p.hindsight.alpha_pct != null && (
              <p className={p.hindsight.alpha_pct >= 0 ? 'op-hindsight--pos' : 'op-hindsight--neg'}>
                Alpha vs SPY: {p.hindsight.alpha_pct}%
              </p>
            )}
            <p style={{ fontSize: '0.7rem' }}>{p.decision_rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
