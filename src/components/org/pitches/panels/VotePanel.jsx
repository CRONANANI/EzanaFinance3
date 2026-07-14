'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  X,
  MinusCircle,
  ThumbsUp,
  ThumbsDown,
  UserX,
  Users,
  Vote as VoteIcon,
} from 'lucide-react';

/**
 * VotePanel (spec §5.2) — the IC ballot at the `ic_vote` stage.
 *
 * Reuses the EXISTING vote endpoints:
 *   - GET  /api/org/pitches/[pitchId]/vote  → { votes, blind, quorum } (quorum needed)
 *   - POST /api/org/pitches/[pitchId]/vote  → cast a ballot { vote, rationale, ... }
 *
 * The votes list comes from the pitch detail object (pitch.votes[]), each row
 * already enriched with voter_name / voter_role by fetchPitchDetail.
 *
 * IC ballots are yes/no/abstain in the DB; surfaced here as Buy / Pass / Abstain.
 *
 * @param {object}   props
 * @param {object}   props.pitch      pitch detail incl. votes[] + permissions
 * @param {object}   props.viewer     { id, role } current member
 * @param {Function} [props.onRefresh] called with the refreshed pitch after a cast
 */

const CHOICES = [
  { value: 'yes', label: 'Buy', icon: ThumbsUp, cls: 'buy' },
  { value: 'no', label: 'Pass', icon: ThumbsDown, cls: 'pass' },
  { value: 'abstain', label: 'Abstain', icon: MinusCircle, cls: 'abstain' },
];

const VOTE_META = {
  yes: { label: 'Buy', cls: 'buy', Icon: Check },
  no: { label: 'Pass', cls: 'pass', Icon: X },
  abstain: { label: 'Abstain', cls: 'abstain', Icon: MinusCircle },
};

export function VotePanel({ pitch, viewer, onRefresh }) {
  const votes = useMemo(() => (Array.isArray(pitch?.votes) ? pitch.votes : []), [pitch?.votes]);

  const [choice, setChoice] = useState(null);
  const [rationale, setRationale] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [quorum, setQuorum] = useState(null);

  // Pull quorum (needed vs cast, eligible count) from the existing GET endpoint.
  const loadQuorum = useCallback(() => {
    if (!pitch?.id) return;
    fetch(`/api/org/pitches/${pitch.id}/vote`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setQuorum(d?.quorum || null))
      .catch(() => setQuorum(null));
  }, [pitch?.id]);

  useEffect(() => {
    loadQuorum();
  }, [loadQuorum, votes.length]);

  const votingOpen = pitch?.permissions?.can_vote ?? pitch?.stage === 'ic_vote';
  const isEligibleRole = ['executive', 'portfolio_manager'].includes(viewer?.role);
  const myVote = votes.find((v) => v.voter_member_id === viewer?.id) || null;
  const canCast = votingOpen && isEligibleRole && !myVote;

  const recused = votes.filter((v) => v.recused);
  const cast = quorum?.castCount ?? votes.filter((v) => !v.recused).length;
  const needed = quorum?.needed ?? null;
  const eligibleCount = quorum?.eligibleCount ?? null;
  const quorumMet = quorum?.met ?? (needed != null ? cast >= needed : false);

  const submit = async () => {
    setError(null);
    if (!choice) {
      setError('Select Buy, Pass, or Abstain.');
      return;
    }
    if (!rationale.trim()) {
      setError('A written rationale is required.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: choice, rationale: rationale.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setChoice(null);
      setRationale('');
      onRefresh?.(data.pitch);
      loadQuorum();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pvote" aria-label="IC vote">
      {/* Quorum progress */}
      <header className="pvote-quorum">
        <div className="pvote-quorum-head">
          <Users size={14} aria-hidden />
          <span className="pvote-quorum-title">Quorum</span>
          <span className={`pvote-quorum-state ${quorumMet ? 'is-met' : 'is-short'}`}>
            {quorumMet ? 'met' : 'not yet met'}
          </span>
        </div>
        <div className="pvote-quorum-count">
          <span className="pvote-num">{cast}</span>
          <span className="pvote-quorum-sep">of</span>
          <span className="pvote-num">{needed ?? '—'}</span>
          <span className="pvote-quorum-label">votes needed</span>
        </div>
        <div
          className="pvote-quorum-bar"
          role="progressbar"
          aria-valuenow={cast}
          aria-valuemin={0}
          aria-valuemax={needed ?? cast}
          aria-label="Quorum progress"
        >
          <span
            className={`pvote-quorum-fill ${quorumMet ? 'is-met' : ''}`}
            style={{ width: needed ? `${Math.min(100, (cast / needed) * 100)}%` : '0%' }}
          />
        </div>
        {eligibleCount != null && (
          <p className="pvote-quorum-note">
            <span className="pvote-num">{eligibleCount}</span> eligible IC voter
            {eligibleCount === 1 ? '' : 's'}
          </p>
        )}
      </header>

      {/* Recusal list */}
      {recused.length > 0 ? (
        <div className="pvote-recusal">
          <div className="pvote-recusal-head">
            <UserX size={13} aria-hidden />
            <span>Recused — excluded from quorum</span>
          </div>
          <ul className="pvote-recusal-list">
            {recused.map((v) => (
              <li key={v.id || v.voter_member_id}>
                <span className="pvote-recusal-name">{v.voter_name}</span>
                {v.recusal_reason && (
                  <span className="pvote-recusal-reason">{v.recusal_reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="pvote-recusal-none">No recusals disclosed.</p>
      )}

      {/* Ballots cast */}
      <div className="pvote-list-wrap">
        <h4 className="pvote-subhead">Ballots</h4>
        {votes.length === 0 ? (
          <div className="pvote-empty">
            <VoteIcon size={20} aria-hidden />
            <p>No votes cast yet.</p>
            <span>The IC ballot opens when the pitch reaches committee vote.</span>
          </div>
        ) : (
          <ul className="pvote-list">
            {votes.map((v) => {
              const meta = VOTE_META[v.vote] || null;
              return (
                <li key={v.id || v.voter_member_id} className="pvote-row">
                  <div className="pvote-row-top">
                    <span className="pvote-voter">
                      {v.voter_name}
                      {v.voter_role && <span className="pvote-voter-role">{v.voter_role}</span>}
                    </span>
                    {v.recused ? (
                      <span className="pvote-badge recused">Recused</span>
                    ) : meta ? (
                      <span className={`pvote-badge ${meta.cls}`}>
                        <meta.Icon size={12} aria-hidden /> {meta.label}
                      </span>
                    ) : (
                      <span className="pvote-badge sealed">Sealed</span>
                    )}
                  </div>
                  {!v.recused && v.rationale && <p className="pvote-rationale">{v.rationale}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cast form (eligible, not yet voted) */}
      {canCast && (
        <div className="pvote-cast">
          <h4 className="pvote-subhead">Cast your ballot</h4>
          <div className="pvote-choices" role="radiogroup" aria-label="Your vote">
            {CHOICES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={choice === c.value}
                className={`pvote-choice ${c.cls} ${choice === c.value ? 'is-active' : ''}`}
                onClick={() => setChoice(c.value)}
              >
                <c.icon size={15} aria-hidden />
                {c.label}
              </button>
            ))}
          </div>
          <label className="pvote-rationale-label" htmlFor="pvote-rationale">
            Written rationale <span className="pvote-req">required</span>
          </label>
          <textarea
            id="pvote-rationale"
            className="pvote-rationale-input"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Why you are voting this way — recorded on your ballot."
          />
          {error && <div className="pvote-error">{error}</div>}
          <div className="pvote-cast-actions">
            <button
              type="button"
              className="pvote-submit"
              disabled={busy || !choice || !rationale.trim()}
              onClick={submit}
            >
              Submit ballot
            </button>
          </div>
        </div>
      )}

      {votingOpen && isEligibleRole && myVote && (
        <p className="pvote-voted-note">
          <Check size={13} aria-hidden /> Your ballot is recorded. Re-submitting overwrites it.
        </p>
      )}
      {!votingOpen && <p className="pvote-closed-note">Voting is closed for this pitch.</p>}
      {votingOpen && !isEligibleRole && (
        <p className="pvote-closed-note">You are not on the IC — viewing only.</p>
      )}
    </section>
  );
}
