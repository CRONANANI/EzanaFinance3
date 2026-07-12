'use client';

import { useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';

export function PitchDeliverablesPanel({ pitch, onRefresh }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('memo');

  const upload = async () => {
    if (!title.trim()) return;
    const res = await fetch(`/api/org/pitches/${pitch.id}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, title, file_type: kind === 'model' ? 'xlsx' : 'pdf' }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setTitle('');
    onRefresh(data.pitch);
  };

  return (
    <>
      {!pitch.is_archived && pitch.permissions?.can_upload_deliverable && (
        <div className="op-inline-form">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="model">Model</option>
            <option value="memo">Memo</option>
            <option value="deck">Deck</option>
            <option value="one_pager">One-pager</option>
            <option value="supporting">Supporting</option>
          </select>
          <input
            placeholder="File title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="button" className="op-btn" onClick={upload}>
            Add
          </button>
        </div>
      )}
      <ul className="op-deliverable-list">
        {(pitch.deliverables || []).map((d) => (
          <li key={d.id}>
            <strong>{d.title}</strong> · {d.kind}
          </li>
        ))}
      </ul>
    </>
  );
}

export function PitchDiscussionPanel({ pitch, onRefresh }) {
  const [body, setBody] = useState('');

  const post = async () => {
    const res = await fetch(`/api/org/pitches/${pitch.id}/discussion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    setBody('');
    onRefresh(data.pitch);
  };

  return (
    <>
      {(pitch.discussion || []).map((m) => (
        <div key={m.id} className="op-discussion-msg">
          <strong>{m.author_name}</strong>
          <p>{m.body}</p>
        </div>
      ))}
      {!pitch.is_archived && (
        <div className="op-inline-form">
          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ask or respond…"
          />
          <button type="button" className="op-btn" onClick={post}>
            Post
          </button>
        </div>
      )}
    </>
  );
}

export function PitchVotingPanel({ pitch, onRefresh }) {
  const { orgData } = useOrg();
  const myId = orgData?.member?.id || null;
  const myVote = pitch.votes?.find((v) => v.voter_member_id === myId);
  const [vote, setVote] = useState('yes');
  const [rationale, setRationale] = useState('');
  const [conviction, setConviction] = useState(3);

  const submitVote = async () => {
    const res = await fetch(`/api/org/pitches/${pitch.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote, rationale, conviction_level: conviction }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    onRefresh(data.pitch);
  };

  return (
    <>
      <p>
        {pitch.vote_yes_count} yes · {pitch.vote_no_count} no · {pitch.vote_abstain_count} abstain
      </p>
      {pitch.votes?.map((v) => (
        <div key={v.id} className="op-vote-row">
          <strong>
            {v.voter_name} — {v.vote}
          </strong>
          {v.conviction_level && <span>{'★'.repeat(v.conviction_level)}</span>}
          <p>{v.rationale}</p>
        </div>
      ))}
      {pitch.stage === 'committee_vote' && !myVote && !pitch.is_archived && (
        <div className="op-vote-form">
          <select value={vote} onChange={(e) => setVote(e.target.value)}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="abstain">Abstain</option>
          </select>
          <label>
            Conviction
            <input
              type="range"
              min={1}
              max={5}
              value={conviction}
              onChange={(e) => setConviction(Number(e.target.value))}
            />
            {conviction}/5
          </label>
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Required rationale"
          />
          <button type="button" className="op-btn" onClick={submitVote}>
            Cast vote (final)
          </button>
        </div>
      )}
    </>
  );
}
