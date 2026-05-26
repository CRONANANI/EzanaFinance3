/**
 * Mutable in-process pitch store (seeded from mock data).
 * Survives warm serverless instances; re-seeds on cold start.
 */

import {
  MOCK_PITCHES,
  MOCK_PITCH_DELIVERABLES,
  MOCK_PITCH_VOTES,
  MOCK_PITCH_DISCUSSION,
  MOCK_PITCH_STAGE_HISTORY,
  MOCK_PITCH_HINDSIGHT,
} from '@/lib/orgPitchMockData';

const GLOBAL_KEY = '__ezanaOrgPitchStore';

function initStore() {
  return {
    pitches: structuredClone(MOCK_PITCHES),
    deliverables: structuredClone(MOCK_PITCH_DELIVERABLES),
    votes: structuredClone(MOCK_PITCH_VOTES),
    discussion: structuredClone(MOCK_PITCH_DISCUSSION),
    history: structuredClone(MOCK_PITCH_STAGE_HISTORY),
    hindsight: structuredClone(MOCK_PITCH_HINDSIGHT),
  };
}

export function getPitchStore() {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = initStore();
  }
  return globalThis[GLOBAL_KEY];
}

export function resetPitchStore() {
  globalThis[GLOBAL_KEY] = initStore();
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listPitches() {
  return getPitchStore().pitches;
}

export function getPitchRaw(id) {
  return getPitchStore().pitches.find((p) => p.id === id) || null;
}

export function getDeliverablesForPitch(pitchId) {
  return getPitchStore().deliverables.filter((d) => d.pitch_id === pitchId);
}

export function getVotesForPitch(pitchId) {
  return getPitchStore().votes.filter((v) => v.pitch_id === pitchId);
}

export function getDiscussionForPitch(pitchId) {
  return getPitchStore().discussion.filter((d) => d.pitch_id === pitchId);
}

export function getHistoryForPitch(pitchId) {
  return getPitchStore().history.filter((h) => h.pitch_id === pitchId);
}

export function getHindsight(pitchId) {
  return getPitchStore().hindsight[pitchId] || null;
}

export function createPitch(payload) {
  const store = getPitchStore();
  const now = new Date().toISOString();
  const pitch = {
    id: uid('pitch'),
    org_id: payload.org_id || 'demo-org',
    team_id: payload.team_id,
    ticker: payload.ticker.toUpperCase(),
    company_name: payload.company_name || payload.ticker,
    pitch_type: payload.pitch_type,
    analyst_member_id: payload.analyst_member_id,
    approving_pm_member_id: null,
    stage: 'idea',
    status: 'active',
    thesis_short: payload.thesis_short,
    thesis_full: payload.thesis_full || '',
    why_now: payload.why_now || '',
    catalysts: payload.catalysts || [],
    risks: payload.risks || [],
    target_price: payload.target_price,
    current_price_at_submission: payload.current_price_at_submission,
    expected_return_pct: payload.expected_return_pct,
    time_horizon: payload.time_horizon,
    committee_meeting_at: null,
    committee_meeting_id: null,
    decision: null,
    decision_at: null,
    decision_rationale: null,
    vote_yes_count: 0,
    vote_no_count: 0,
    vote_abstain_count: 0,
    position_size_pct: null,
    monitor_member_id: null,
    research_due_at: null,
    created_at: now,
    updated_at: now,
    archived_at: null,
  };
  store.pitches.unshift(pitch);
  appendHistory(pitch.id, null, 'idea', payload.analyst_member_id, 'Pitch submitted');
  return pitch;
}

export function updatePitch(id, patch) {
  const store = getPitchStore();
  const idx = store.pitches.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  store.pitches[idx] = {
    ...store.pitches[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  return store.pitches[idx];
}

export function appendHistory(pitchId, fromStage, toStage, actorId, note) {
  const store = getPitchStore();
  const row = {
    id: uid('hist'),
    pitch_id: pitchId,
    from_stage: fromStage,
    to_stage: toStage,
    actor_member_id: actorId,
    note: note || null,
    created_at: new Date().toISOString(),
  };
  store.history.push(row);
  return row;
}

export function applyStageTransition(pitch, toStage, ctx) {
  const store = getPitchStore();
  const from = pitch.stage;
  const patch = {
    stage: toStage,
    updated_at: new Date().toISOString(),
  };

  if (toStage === 'research_approved') {
    patch.approving_pm_member_id = ctx.actorId;
    if (ctx.research_due_at) patch.research_due_at = ctx.research_due_at;
  }
  if (toStage === 'committee_scheduled' && ctx.committee_meeting_at) {
    patch.committee_meeting_at = ctx.committee_meeting_at;
  }
  if (toStage === 'committee_vote') {
    patch.vote_yes_count = 0;
    patch.vote_no_count = 0;
    patch.vote_abstain_count = 0;
    store.votes = store.votes.filter((v) => v.pitch_id !== pitch.id);
  }

  if (ctx.terminalStatus) {
    patch.status = ctx.terminalStatus;
    patch.decision = ctx.terminalStatus === 'rejected' ? 'rejected' : ctx.terminalStatus;
    patch.decision_at = new Date().toISOString();
    patch.decision_rationale = ctx.note || '';
    patch.stage = 'decision';
    patch.archived_at = patch.decision_at;
    if (ctx.position_size_pct) patch.position_size_pct = ctx.position_size_pct;
    if (ctx.monitor_member_id) patch.monitor_member_id = ctx.monitor_member_id;
  }

  const updated = updatePitch(pitch.id, patch);
  appendHistory(pitch.id, from, toStage, ctx.actorId, ctx.note);
  return updated;
}

export function addDeliverable(pitchId, payload) {
  const store = getPitchStore();
  const row = {
    id: uid('del'),
    pitch_id: pitchId,
    kind: payload.kind,
    title: payload.title,
    file_url: payload.file_url || null,
    file_type: payload.file_type || null,
    file_size: payload.file_size || null,
    uploaded_by_member_id: payload.uploaded_by_member_id,
    uploaded_at: new Date().toISOString(),
    pinned_attachment_ref: payload.pinned_attachment_ref || null,
  };
  store.deliverables.push(row);

  const pitch = getPitchRaw(pitchId);
  if (pitch?.stage === 'research_approved') {
    applyStageTransition(pitch, 'research_in_progress', {
      actorId: payload.uploaded_by_member_id,
      note: 'First deliverable uploaded',
    });
  }
  return row;
}

export function addDiscussionMessage(pitchId, payload) {
  const store = getPitchStore();
  const row = {
    id: uid('dm'),
    pitch_id: pitchId,
    author_member_id: payload.author_member_id,
    parent_message_id: payload.parent_message_id || null,
    body: payload.body,
    created_at: new Date().toISOString(),
  };
  store.discussion.push(row);
  return row;
}

export function castVote(pitchId, payload) {
  const store = getPitchStore();
  const existing = store.votes.find(
    (v) => v.pitch_id === pitchId && v.voter_member_id === payload.voter_member_id,
  );
  if (existing) return { error: 'Vote already cast' };

  const row = {
    id: uid('vote'),
    pitch_id: pitchId,
    voter_member_id: payload.voter_member_id,
    vote: payload.vote,
    rationale: payload.rationale,
    conviction_level: payload.conviction_level ?? null,
    recused: payload.recused || false,
    recusal_reason: payload.recusal_reason || null,
    created_at: new Date().toISOString(),
  };
  store.votes.push(row);
  recalcVoteTally(pitchId);
  return { vote: row };
}

function recalcVoteTally(pitchId) {
  const votes = getVotesForPitch(pitchId).filter((v) => !v.recused);
  updatePitch(pitchId, {
    vote_yes_count: votes.filter((v) => v.vote === 'yes').length,
    vote_no_count: votes.filter((v) => v.vote === 'no').length,
    vote_abstain_count: votes.filter((v) => v.vote === 'abstain').length,
  });
}

export function recordDecision(pitchId, payload) {
  const pitch = getPitchRaw(pitchId);
  if (!pitch) return null;

  const statusMap = {
    accepted: 'accepted',
    rejected: 'rejected',
    watchlist: 'watchlist',
    deferred: 'deferred',
  };
  const status = statusMap[payload.decision];
  if (!status) return null;

  const now = new Date().toISOString();
  const updated = updatePitch(pitchId, {
    stage: 'decision',
    status,
    decision: payload.decision,
    decision_at: now,
    decision_rationale: payload.decision_rationale || '',
    archived_at: now,
    position_size_pct: payload.position_size_pct ?? null,
    monitor_member_id: payload.monitor_member_id ?? null,
    updated_at: now,
  });

  appendHistory(pitchId, pitch.stage, 'decision', payload.actorId, payload.decision_rationale);
  return updated;
}

export function setHindsight(pitchId, data) {
  const store = getPitchStore();
  store.hindsight[pitchId] = {
    pitch_id: pitchId,
    computed_at: new Date().toISOString(),
    ...data,
  };
  return store.hindsight[pitchId];
}

export function withdrawPitch(pitchId, analystId) {
  const pitch = getPitchRaw(pitchId);
  if (!pitch || pitch.analyst_member_id !== analystId) return { error: 'Not authorized' };
  if (pitch.status !== 'active') return { error: 'Pitch not active' };
  return updatePitch(pitchId, { status: 'withdrawn', archived_at: new Date().toISOString() });
}
