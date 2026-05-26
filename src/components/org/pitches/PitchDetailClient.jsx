'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const TABS = [
  { id: 'thesis', label: 'Thesis' },
  { id: 'data', label: 'Supporting Data' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'discussion', label: 'Discussion' },
  { id: 'voting', label: 'Voting' },
  { id: 'decision', label: 'Decision' },
];

export function PitchDetailClient({ pitchId }) {
  const [pitch, setPitch] = useState(null);
  const [tab, setTab] = useState('thesis');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/org/pitches/${pitchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPitch(data.pitch || null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pitchId]);

  if (loading) return <div className="op-loading">Loading pitch…</div>;
  if (!pitch) return <div className="op-empty">Pitch not found.</div>;

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'voting') return pitch.stage === 'committee_vote' || pitch.votes?.length > 0;
    if (t.id === 'decision') return pitch.status !== 'active' || pitch.stage === 'decision';
    return true;
  });

  return (
    <div className="op-page">
      <Link
        href={pitch.is_archived ? '/org-team-hub/pitch-archive' : '/org-team-hub/pitches'}
        className="op-back"
      >
        <i className="bi bi-arrow-left" /> Back to {pitch.is_archived ? 'Archive' : 'Pipeline'}
      </Link>

      {pitch.is_archived && pitch.decision_at && (
        <div className="op-detail-banner">
          ARCHIVED — Decided{' '}
          {new Date(pitch.decision_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
          . Read-only institutional record.
        </div>
      )}

      <div className="op-hero">
        <div>
          <h1>
            {pitch.ticker} · {pitch.company_name}
          </h1>
          <p className="op-hero-sub">
            {pitch.team_name} · {pitch.pitch_type_label} · {pitch.horizon_label} ·{' '}
            {pitch.stage_label}
          </p>
        </div>
      </div>

      <div className="op-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`op-tab ${tab === t.id ? 'op-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="op-panel">
        {tab === 'thesis' && (
          <>
            <h3>Short thesis</h3>
            <p>{pitch.thesis_short}</p>
            {pitch.thesis_full && (
              <>
                <h3>Full thesis</h3>
                <p>{pitch.thesis_full}</p>
              </>
            )}
            {pitch.why_now && (
              <>
                <h3>Why now</h3>
                <p>{pitch.why_now}</p>
              </>
            )}
            <h3>Target</h3>
            <p>
              ${pitch.target_price} ({pitch.expected_return_pct}% expected) · Submitted at $
              {pitch.current_price_at_submission}
            </p>
            {pitch.catalysts?.length > 0 && (
              <>
                <h3>Catalysts</h3>
                <ul>
                  {pitch.catalysts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </>
            )}
            {pitch.risks?.length > 0 && (
              <>
                <h3>Risks</h3>
                <ul>
                  {pitch.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {tab === 'data' && (
          <p style={{ color: '#9ca3af' }}>
            Live FMP company snapshot (profile, quote, financials, DCF, ratings) will load here in a
            later phase. Thesis and deliverables are available now.
          </p>
        )}

        {tab === 'deliverables' && (
          <>
            {pitch.deliverables?.length === 0 ? (
              <p>No deliverables uploaded yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {pitch.deliverables.map((d) => (
                  <li
                    key={d.id}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <strong>{d.title}</strong>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>
                      {d.kind} · {d.file_type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'discussion' && (
          <>
            {pitch.discussion?.length === 0 ? (
              <p>No discussion yet.</p>
            ) : (
              pitch.discussion.map((m) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: '0.75rem',
                    paddingLeft: m.parent_message_id ? '1rem' : 0,
                    borderLeft: m.parent_message_id ? '2px solid rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  <strong>{m.author_name}</strong>
                  <p style={{ margin: '0.25rem 0 0' }}>{m.body}</p>
                </div>
              ))
            )}
          </>
        )}

        {tab === 'voting' && (
          <>
            <p>
              Tally: {pitch.vote_yes_count} yes · {pitch.vote_no_count} no ·{' '}
              {pitch.vote_abstain_count} abstain
            </p>
            {pitch.votes?.map((v) => (
              <div
                key={v.id}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.65rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 8,
                }}
              >
                <strong>
                  {v.voter_name} — {v.vote.toUpperCase()}
                </strong>
                {v.conviction_level && (
                  <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                    {'★'.repeat(v.conviction_level)}
                  </span>
                )}
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem' }}>{v.rationale}</p>
              </div>
            ))}
          </>
        )}

        {tab === 'decision' && (
          <>
            {pitch.decision ? (
              <>
                <h3>Outcome</h3>
                <p>
                  <strong>{pitch.status_label}</strong>
                  {pitch.decision_rationale && ` — ${pitch.decision_rationale}`}
                </p>
                {pitch.position_size_pct && (
                  <p>Position size: {pitch.position_size_pct}% of portfolio</p>
                )}
                {pitch.hindsight && (
                  <>
                    <h3>Hindsight</h3>
                    <p>
                      Return since decision: {pitch.hindsight.return_pct >= 0 ? '+' : ''}
                      {pitch.hindsight.return_pct?.toFixed(1)}% · Alpha vs SPY:{' '}
                      {pitch.hindsight.alpha_pct >= 0 ? '+' : ''}
                      {pitch.hindsight.alpha_pct?.toFixed(1)}%
                    </p>
                  </>
                )}
              </>
            ) : (
              <p>Decision pending — committee vote in progress or not yet scheduled.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
