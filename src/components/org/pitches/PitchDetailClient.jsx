'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PitchSupportingData } from './PitchSupportingData';
import { PitchStageActions } from './PitchStageActions';
import { PitchGatePanel } from './PitchGatePanel';
import {
  PitchDeliverablesPanel,
  PitchDiscussionPanel,
  PitchVotingPanel,
} from './PitchDetailPanels';

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

  const load = useCallback(() => {
    return fetch(`/api/org/pitches/${pitchId}`)
      .then((r) => r.json())
      .then((data) => {
        setPitch(data.pitch || null);
        return data.pitch;
      });
  }, [pitchId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = (p) => setPitch(p || pitch);

  if (loading) return <div className="op-loading">Loading pitch…</div>;
  if (!pitch) return <div className="op-empty">Pitch not found.</div>;

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'voting') return pitch.stage === 'ic_vote' || pitch.votes?.length > 0;
    if (t.id === 'decision')
      return pitch.status !== 'active' || pitch.stage === 'approved' || pitch.stage === 'rejected';
    return true;
  });

  // Deep-link a failing gate to the tab that fixes it (gate tab ids → modal tabs).
  const gateTabToModalTab = (gt) => {
    const map = {
      supporting_data: 'data',
      vote: 'voting',
      cross_desk: 'discussion',
      signoff: 'thesis',
      deep_dive: 'data',
    };
    const target = map[gt] || gt;
    if (TABS.some((t) => t.id === target)) setTab(target);
  };

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

      <PitchGatePanel pitch={pitch} onSelectTab={gateTabToModalTab} onAdvanced={onRefresh} />

      <PitchStageActions pitch={pitch} onRefresh={onRefresh} />

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

        {tab === 'data' && <PitchSupportingData pitchId={pitchId} />}

        {tab === 'deliverables' && <PitchDeliverablesPanel pitch={pitch} onRefresh={onRefresh} />}

        {tab === 'discussion' && <PitchDiscussionPanel pitch={pitch} onRefresh={onRefresh} />}

        {tab === 'voting' && <PitchVotingPanel pitch={pitch} onRefresh={onRefresh} />}

        {tab === 'decision' && (
          <>
            {pitch.decision ? (
              <>
                <h3>Outcome</h3>
                <p>
                  <strong>{pitch.status_label}</strong>
                  {pitch.decision_rationale && ` — ${pitch.decision_rationale}`}
                </p>
                {pitch.position_size_pct && <p>Position size: {pitch.position_size_pct}%</p>}
                {pitch.hindsight && (
                  <>
                    <h3>Hindsight</h3>
                    <p>
                      Return: {pitch.hindsight.return_pct >= 0 ? '+' : ''}
                      {pitch.hindsight.return_pct}% · Alpha vs SPY:{' '}
                      {pitch.hindsight.alpha_pct >= 0 ? '+' : ''}
                      {pitch.hindsight.alpha_pct}%
                    </p>
                    {!pitch.is_archived && (
                      <button
                        type="button"
                        className="op-btn op-btn--ghost"
                        onClick={() =>
                          fetch(`/api/org/archive/hindsight/${pitch.id}`).then(() => load())
                        }
                      >
                        Refresh hindsight
                      </button>
                    )}
                  </>
                )}
              </>
            ) : (
              <p>Decision pending.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
