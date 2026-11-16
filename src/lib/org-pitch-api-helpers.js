/**
 * Supabase data-access layer for the Pitch Pipeline (2a).
 *
 * This is the port target: the pitch API routes call these helpers directly.
 * Every read/write hits the real Supabase tables (org_pitches,
 * org_pitch_votes, org_pitch_deliverables,
 * org_pitch_stage_history, org_pitch_discussion_messages, org_pitch_hindsight,
 * org_ic_meetings). RLS scopes rows to the caller's org; the state machine
 * (org-pitch-state-machine.js) stays authoritative for transitions.
 */

import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { hasPitchPermission } from '@/lib/org-pitch-permissions';
import { designStageLabel } from '@/lib/org-pitch-state-machine';
import { FmpAPI } from '@/lib/services/fmp';
import { isBlindOpen, sealPitchDetail, sealPitchRows } from '@/lib/pitch/ballot-privacy';
import { boardRow } from '@/lib/pitch/board-rows';
import { buildGateContexts, countBallotsReceived } from '@/lib/pitch/gate-context';
import { loadSealedMeetingIds } from '@/lib/pitch/sealed-pitches';
import { isManager, reviewDueAt } from '@/lib/pitch/rules';

export { gateSummaryFor, viewerStateFor } from '@/lib/pitch/board-rows';

export { loadSealedMeetingIds, loadSealedPitchIds } from '@/lib/pitch/sealed-pitches';

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];
// IC committee eligibility is derived from org-chart roles, never a hardcoded list.
export const IC_VOTER_ROLES = ['executive', 'portfolio_manager'];
const AGING_DAYS = 30;

// ── Context ────────────────────────────────────────────────────────────────
export async function getPitchContext() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  const viewer = member
    ? {
        id: member.id,
        role: member.role,
        tier: member.tier || null,
        team_id: member.team_id || null,
        display_name: member.display_name || member.email || 'Member',
      }
    : null;
  return { supabase, member, viewer, orgId: member?.org_id || null };
}

export function requirePermission(viewer, key) {
  if (!hasPitchPermission(viewer, key)) {
    return { error: `Missing permission: ${key}`, status: 403 };
  }
  return null;
}

// ── Directory (member + team lookups for enrichment) ────────────────────────
export async function loadDirectory(supabase, orgId) {
  const [membersRes, teamsRes] = await Promise.all([
    supabase
      .from('org_members')
      .select('id, display_name, role, team_id, sub_role')
      .eq('org_id', orgId),
    supabase.from('org_teams').select('id, name, slug').eq('org_id', orgId),
  ]);
  const memberMap = new Map((membersRes.data || []).map((m) => [m.id, m]));
  const teamMap = new Map((teamsRes.data || []).map((t) => [t.id, t]));
  return { memberMap, teamMap };
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function daysSince(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function statusLabel(status) {
  return (
    {
      active: 'Active',
      accepted: 'Accepted',
      rejected: 'Rejected',
      watchlist: 'Watchlist',
      deferred: 'Deferred',
      withdrawn: 'Withdrawn',
    }[status] || status
  );
}

/**
 * Enrich a raw org_pitches row for the UI. days_in_stage is DERIVED from
 * stage_entered_at (falls back to created_at): never read from a column.
 */
export function enrichPitchRow(row, { memberMap, teamMap, deliverables = [] } = {}) {
  const analyst = memberMap?.get(row.analyst_member_id) || null;
  const pm = row.approving_pm_member_id ? memberMap?.get(row.approving_pm_member_id) : null;
  const team = row.team_id ? teamMap?.get(row.team_id) : null;
  const daysInStage = daysSince(row.stage_entered_at || row.created_at);

  const catalysts = Array.isArray(row.catalysts) ? row.catalysts : [];
  const risks = Array.isArray(row.risks) ? row.risks : [];

  return {
    ...row,
    catalysts,
    risks,
    analyst_name: analyst?.display_name || 'Unassigned',
    analyst_initials: initials(analyst?.display_name),
    pm_name: pm?.display_name || null,
    team_name: team?.name || null,
    team_slug: team?.slug || null,
    pitch_type_label: row.pitch_type
      ? row.pitch_type.charAt(0).toUpperCase() + row.pitch_type.slice(1)
      : null,
    horizon_label: row.time_horizon === 'long-term' ? 'long' : row.time_horizon || null,
    stage_label: designStageLabel(row.stage),
    status_label: statusLabel(row.status),
    days_in_stage: daysInStage,
    is_aging: row.status === 'active' && daysInStage > AGING_DAYS,
    deliverable_count: deliverables.length,
    deliverables,
  };
}

// ── Reads ───────────────────────────────────────────────────────────────────
export async function fetchPitches(supabase, orgId, { teamId, statuses } = {}) {
  let q = supabase.from('org_pitches').select('*').eq('org_id', orgId);
  if (teamId) q = q.eq('team_id', teamId);
  if (statuses?.length) q = q.in('status', statuses);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) return [];
  /* Rows from here go to the browser. A pitch in an open blind vote leaves
     without its running tally. */
  const rows = data || [];
  const sealed = await loadSealedMeetingIds(supabase, orgId, rows);
  return sealPitchRows(rows, sealed);
}

export async function fetchDeliverablesMap(supabase, pitchIds) {
  if (!pitchIds.length) return new Map();
  const { data } = await supabase
    .from('org_pitch_deliverables')
    .select('*')
    .in('pitch_id', pitchIds);
  const map = new Map();
  for (const d of data || []) {
    if (!map.has(d.pitch_id)) map.set(d.pitch_id, []);
    map.get(d.pitch_id).push(d);
  }
  return map;
}

export async function fetchPitchRaw(supabase, orgId, pitchId) {
  const { data } = await supabase
    .from('org_pitches')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', pitchId)
    .maybeSingle();
  return data || null;
}

/**
 * One pitch with its deliverables, ballots, discussion, history and
 * hindsight, as the browser may see it.
 *
 * `viewerMemberId` is the signed-in member. While the pitch's meeting is
 * blind and open the payload carries only that member's own ballot and the
 * participation count (see lib/pitch/ballot-privacy.js). A caller that does
 * not pass a viewer gets no ballot at all in that case.
 */
export async function fetchPitchDetail(supabase, orgId, pitchId, { viewerMemberId = null } = {}) {
  const raw = await fetchPitchRaw(supabase, orgId, pitchId);
  if (!raw) return null;
  const { memberMap, teamMap } = await loadDirectory(supabase, orgId);

  const [delRes, voteRes, discRes, histRes, hindRes, meetingRes, eligible] = await Promise.all([
    supabase
      .from('org_pitch_deliverables')
      .select('*')
      .eq('pitch_id', pitchId)
      .order('uploaded_at'),
    supabase.from('org_pitch_votes').select('*').eq('pitch_id', pitchId).order('created_at'),
    supabase
      .from('org_pitch_discussion_messages')
      .select('*')
      .eq('pitch_id', pitchId)
      .order('created_at'),
    supabase
      .from('org_pitch_stage_history')
      .select('*')
      .eq('pitch_id', pitchId)
      .order('created_at'),
    supabase.from('org_pitch_hindsight').select('*').eq('pitch_id', pitchId).maybeSingle(),
    raw.ic_meeting_id
      ? supabase
          .from('org_ic_meetings')
          .select('id, meets_at, ballot_type, threshold, quorum_pct, status')
          .eq('id', raw.ic_meeting_id)
          .eq('org_id', orgId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    icEligibleVoters(supabase, orgId),
  ]);

  const meeting = meetingRes?.data || null;
  /* A meeting that is attached but cannot be read is treated as sealed. */
  const sealed = meeting ? isBlindOpen(meeting) : Boolean(raw.ic_meeting_id);
  const received = sealed ? (await countBallotsReceived(supabase, [pitchId]))[pitchId] : null;

  const enriched = enrichPitchRow(raw, { memberMap, teamMap, deliverables: delRes.data || [] });
  const nameOf = (id) => memberMap.get(id)?.display_name || 'Member';

  const votes = (voteRes.data || []).map((v) => ({
    ...v,
    voter_name: nameOf(v.voter_member_id),
    voter_role: memberMap.get(v.voter_member_id)?.role || null,
  }));
  const discussion = (discRes.data || []).map((d) => ({
    ...d,
    author_name: nameOf(d.author_member_id),
  }));
  const history = (histRes.data || []).map((h) => ({
    ...h,
    actor_name: h.actor_member_id ? nameOf(h.actor_member_id) : 'System',
    to_stage_label: designStageLabel(h.to_stage),
    from_stage_label: h.from_stage ? designStageLabel(h.from_stage) : null,
  }));

  return sealPitchDetail(
    {
      ...enriched,
      hindsight: hindRes.data || null,
      votes,
      discussion,
      history,
      ic_meeting: meeting,
      review_due_at: reviewDueAt(raw),
      is_archived: raw.status !== 'active',
      permissions: buildPitchPermissions(raw),
    },
    {
      sealed,
      viewerMemberId,
      eligibleCount: eligible.length,
      quorumPct: meeting?.quorum_pct ?? 50,
      received,
    },
  );
}

export function buildPitchPermissions(pitch) {
  const active = pitch.status === 'active';
  return {
    can_edit_thesis: active && ['idea', 'screening', 'deep_dive'].includes(pitch.stage),
    can_upload_deliverable:
      active &&
      ['screening', 'deep_dive', 'cross_desk_review', 'pitch_scheduled'].includes(pitch.stage),
    can_discuss: active,
    can_vote: active && pitch.stage === 'ic_vote',
    can_decide: active && pitch.stage === 'ic_vote',
  };
}

// ── Writes ──────────────────────────────────────────────────────────────────
export async function insertPitch(supabase, orgId, viewer, payload) {
  const now = new Date().toISOString();
  const insert = {
    org_id: orgId,
    team_id: payload.team_id || viewer.team_id || null,
    ticker: (payload.ticker || '').toUpperCase(),
    company_name: payload.company_name || payload.ticker,
    pitch_type: payload.pitch_type,
    analyst_member_id: viewer.id,
    stage: 'idea',
    status: 'active',
    thesis_short: payload.thesis_short,
    thesis_full: payload.thesis_full || null,
    why_now: payload.why_now || null,
    variant_perception: payload.variant_perception || null,
    falsification: payload.falsification || null,
    sector: payload.sector || null,
    catalysts: Array.isArray(payload.catalysts) ? payload.catalysts : [],
    risks: Array.isArray(payload.risks) ? payload.risks : [],
    catalyst_date: payload.catalyst_date || null,
    target_price: payload.target_price ?? null,
    current_price_at_submission: payload.current_price_at_submission ?? null,
    pitch_price: payload.pitch_price ?? payload.current_price_at_submission ?? null,
    valuation_method: payload.valuation_method || null,
    valuation_bull: payload.valuation_bull ?? null,
    valuation_base: payload.valuation_base ?? null,
    valuation_bear: payload.valuation_bear ?? null,
    conviction_level: payload.conviction_level ?? null,
    expected_return_pct: payload.expected_return_pct ?? null,
    time_horizon: payload.time_horizon || null,
    position_size_pct: payload.position_size_pct ?? null,
    stage_entered_at: now,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase.from('org_pitches').insert(insert).select().single();
  if (error) return { error: error.message };
  await appendHistory(supabase, data.id, null, 'idea', viewer.id, 'Pitch submitted');
  return { pitch: data };
}

export async function patchPitch(supabase, orgId, pitchId, patch) {
  const { data, error } = await supabase
    .from('org_pitches')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', pitchId)
    .select()
    .single();
  if (error) return { error: error.message };
  return { pitch: data };
}

export async function appendHistory(supabase, pitchId, fromStage, toStage, actorId, note) {
  await supabase.from('org_pitch_stage_history').insert({
    pitch_id: pitchId,
    from_stage: fromStage,
    to_stage: toStage,
    actor_member_id: actorId,
    note: note || null,
  });
}

/**
 * Apply a validated stage transition to a real row. Sets stage_entered_at so
 * days_in_stage resets. Handles terminal (rejected) + post-approval states.
 */
export async function applyStageTransitionDb(supabase, orgId, pitch, toStage, ctx) {
  const now = new Date().toISOString();
  const from = pitch.stage;
  const patch = { stage: toStage, stage_entered_at: now };

  if (toStage === 'screening') {
    patch.approving_pm_member_id = ctx.actorId;
    if (ctx.research_due_at) patch.research_due_at = ctx.research_due_at;
  }
  if (toStage === 'pitch_scheduled' && ctx.committee_meeting_at) {
    patch.committee_meeting_at = ctx.committee_meeting_at;
    patch.ic_meeting_at = ctx.committee_meeting_at;
  }
  if (toStage === 'ic_vote') {
    patch.vote_yes_count = 0;
    patch.vote_no_count = 0;
    patch.vote_abstain_count = 0;
  }
  if (toStage === 'in_portfolio') {
    patch.status = 'accepted';
    if (ctx.position_size_pct != null) patch.position_size_pct = ctx.position_size_pct;
    if (ctx.monitor_member_id) patch.monitor_member_id = ctx.monitor_member_id;
  }
  if (toStage === 'exited') {
    patch.status = 'accepted';
    patch.archive_reason = ctx.note || null;
    patch.archived_at = now;
  }

  if (ctx.terminalStatus) {
    // rejected → terminal 'rejected' stage, archived.
    patch.status = ctx.terminalStatus;
    patch.decision = ctx.terminalStatus === 'rejected' ? 'rejected' : ctx.terminalStatus;
    patch.decision_at = now;
    patch.decision_rationale = ctx.note || '';
    patch.archive_reason = ctx.note || '';
    patch.stage = 'rejected';
    patch.archived_at = now;
  }

  const { data, error } = await supabase
    .from('org_pitches')
    .update({ ...patch, updated_at: now })
    .eq('org_id', orgId)
    .eq('id', pitch.id)
    .select()
    .single();
  if (error) return { error: error.message };
  await appendHistory(supabase, pitch.id, from, patch.stage, ctx.actorId, ctx.note);
  return { pitch: data };
}

export async function recordDecisionDb(supabase, orgId, pitch, payload) {
  const statusMap = {
    accepted: 'accepted',
    rejected: 'rejected',
    watchlist: 'watchlist',
    deferred: 'deferred',
  };
  const status = statusMap[payload.decision];
  if (!status) return { error: 'Invalid decision' };
  const now = new Date().toISOString();

  // An accepted decision lands on 'approved' and stays active: the trading desk
  // books the position and the gate engine moves it to in_portfolio. Anything
  // else is terminal and archives.
  const nextStage = status === 'accepted' ? 'approved' : 'rejected';

  const patch = {
    stage: nextStage,
    status: status === 'accepted' ? 'active' : status,
    decision: payload.decision,
    decision_at: now,
    decision_rationale: payload.decision_rationale || '',
    stage_entered_at: now,
    updated_at: now,
    position_size_pct: payload.position_size_pct ?? null,
    monitor_member_id: payload.monitor_member_id ?? null,
  };
  if (status !== 'accepted') {
    patch.archived_at = now;
    patch.archive_reason = payload.decision_rationale || '';
  }

  const { data, error } = await supabase
    .from('org_pitches')
    .update(patch)
    .eq('org_id', orgId)
    .eq('id', pitch.id)
    .select()
    .single();
  if (error) return { error: error.message };
  await appendHistory(
    supabase,
    pitch.id,
    pitch.stage,
    nextStage,
    payload.actorId,
    payload.decision_rationale,
  );
  return { pitch: data };
}

export async function addDeliverableDb(supabase, orgId, pitch, payload) {
  const { data, error } = await supabase
    .from('org_pitch_deliverables')
    .insert({
      pitch_id: pitch.id,
      kind: payload.kind,
      title: payload.title,
      file_url: payload.file_url || null,
      file_type: payload.file_type || null,
      file_size: payload.file_size || null,
      uploaded_by_member_id: payload.uploaded_by_member_id,
      pinned_attachment_ref: payload.pinned_attachment_ref || null,
    })
    .select()
    .single();
  if (error) return { error: error.message };

  return { deliverable: data };
}

export async function addDiscussionDb(supabase, pitch, payload) {
  const { data, error } = await supabase
    .from('org_pitch_discussion_messages')
    .insert({
      pitch_id: pitch.id,
      author_member_id: payload.author_member_id,
      parent_message_id: payload.parent_message_id || null,
      body: payload.body,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { message: data };
}

/**
 * Cast (or change) a member's ballot. The unique index on
 * (pitch_id, voter_member_id) plus the UPDATE RLS policy (members update own
 * votes) makes this an UPSERT: a member re-voting overwrites their prior ballot
 * rather than failing on the unique constraint. Tally is recomputed onto the
 * pitch row afterward.
 */
export async function castVoteDb(supabase, orgId, pitch, payload) {
  const { data, error } = await supabase
    .from('org_pitch_votes')
    .upsert(
      {
        pitch_id: pitch.id,
        voter_member_id: payload.voter_member_id,
        vote: payload.vote,
        rationale: payload.rationale,
        conviction_level: payload.conviction_level ?? null,
        recused: payload.recused || false,
        recusal_reason: payload.recusal_reason || null,
      },
      { onConflict: 'pitch_id,voter_member_id' },
    )
    .select()
    .single();
  if (error) return { error: error.message };

  /* The running tally is written onto the pitch row, which every member of
     the council can read. During a blind vote it is therefore not written at
     all: closing the meeting writes it (see the meeting route). */
  if (await isPitchSealed(supabase, orgId, pitch)) return { vote: data };
  await recalcVoteTally(supabase, orgId, pitch.id);
  return { vote: data };
}

/** Is this pitch attached to a blind meeting that has not closed? */
export async function isPitchSealed(supabase, orgId, pitch) {
  if (!pitch?.ic_meeting_id) return false;
  const sealed = await loadSealedMeetingIds(supabase, orgId, [pitch]);
  return sealed.has(pitch.ic_meeting_id);
}

export async function recalcVoteTally(supabase, orgId, pitchId) {
  const { data } = await supabase
    .from('org_pitch_votes')
    .select('vote, recused')
    .eq('pitch_id', pitchId);
  const active = (data || []).filter((v) => !v.recused);
  const { error } = await supabase
    .from('org_pitches')
    .update({
      vote_yes_count: active.filter((v) => v.vote === 'yes').length,
      vote_no_count: active.filter((v) => v.vote === 'no').length,
      vote_abstain_count: active.filter((v) => v.vote === 'abstain').length,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
    .eq('id', pitchId);
  if (error) console.error('[pitch-vote-tally]', error.message);
}

// ── Board assembly ──────────────────────────────────────────────────────────
/**
 * Fetch + enrich every pitch in the org and bucket by lifecycle:
 *  - active:    status='active' (the seven working stages)
 *  - portfolio: stage='in_portfolio' (live book → 1b tracker)
 *  - archived:  rejected / withdrawn / exited (archive lane, reasons preserved)
 */
export async function fetchBoardPitches(supabase, orgId, { teamId } = {}) {
  const rows = await fetchPitches(supabase, orgId, { teamId });
  const delMap = await fetchDeliverablesMap(
    supabase,
    rows.map((r) => r.id),
  );
  const { memberMap, teamMap } = await loadDirectory(supabase, orgId);

  const enriched = rows.map((r) =>
    enrichPitchRow(r, { memberMap, teamMap, deliverables: delMap.get(r.id) || [] }),
  );

  const active = enriched.filter((p) => p.status === 'active');
  const portfolio = enriched.filter((p) => p.stage === 'in_portfolio' || p.stage === 'exited');
  const archived = enriched.filter(
    (p) => ['rejected', 'withdrawn'].includes(p.status) || p.stage === 'exited',
  );
  return { active, portfolio, archived, all: enriched };
}

// ── IC committee eligibility + quorum (derived from org roles) ───────────────
export async function icEligibleVoters(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, display_name, role')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .in('role', IC_VOTER_ROLES);
  return data || [];
}

export function computeQuorum(eligibleCount, castCount, quorumPct = 50) {
  const needed = Math.ceil((quorumPct / 100) * eligibleCount);
  return { eligibleCount, castCount, needed, met: castCount >= needed && eligibleCount > 0 };
}

// ── IC meetings ──────────────────────────────────────────────────────────────
export async function listIcMeetings(supabase, orgId) {
  const { data } = await supabase
    .from('org_ic_meetings')
    .select('*')
    .eq('org_id', orgId)
    .order('meets_at', { ascending: true, nullsFirst: false });
  return data || [];
}

export async function createIcMeeting(supabase, orgId, viewer, payload) {
  const { data, error } = await supabase
    .from('org_ic_meetings')
    .insert({
      org_id: orgId,
      meets_at: payload.meets_at || null,
      ballot_type: payload.ballot_type === 'blind' ? 'blind' : 'open',
      threshold: payload.threshold === 'supermajority' ? 'supermajority' : 'simple',
      quorum_pct: payload.quorum_pct ?? 50,
      status: 'scheduled',
      created_by: viewer.user_id || null,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  return { meeting: data };
}

// ── Pipeline payload (shared by the API route and the page) ──────────────────
/** Current prices for a list of pitches. A failed lookup leaves them unset. */
async function attachQuotes(pitches) {
  const symbols = [...new Set(pitches.map((p) => p.ticker).filter(Boolean))];
  let quoteMap = new Map();
  let stale = false;
  if (symbols.length) {
    try {
      const quotes = await FmpAPI.getBatchQuote(symbols);
      quoteMap = new Map((quotes || []).map((q) => [q.symbol, q]));
    } catch {
      stale = true; // never invent a price: the page says prices are unavailable
    }
  }
  const decorated = pitches.map((p) => {
    const current = quoteMap.get(p.ticker)?.price ?? null;
    const upside =
      current != null && p.target_price != null && Number(current) !== 0
        ? ((Number(p.target_price) - current) / current) * 100
        : null;
    return { ...p, current_price: current, upside_pct: upside };
  });
  return { decorated, stale };
}

/**
 * The payload the Pitch Pipeline page draws from. Assumes orgId is present.
 * Shared by GET /api/org/pitches/board and the server page, so the first
 * paint and a refresh can never drift.
 *
 * @param {object} supabase the signed-in member's client
 * @param {string} orgId
 * @param {{ viewer: {id, role, tier, team_id}, teamId?: string }} opts
 */
export async function loadPitchBoard(supabase, orgId, { viewer, teamId } = {}) {
  const actor = viewer || { id: null, role: 'analyst', tier: null, team_id: null };
  const { all } = await fetchBoardPitches(supabase, orgId, { teamId });
  const { memberMap, teamMap } = await loadDirectory(supabase, orgId);

  /* Gates are computed for pitches that can still move, and for held ones. */
  const live = all.filter((p) => p.status === 'active' || p.stage === 'in_portfolio');
  const ids = all.map((p) => p.id);

  const [{ decorated, stale }, ctxById, meetings, eligible, hindRes, voteRes] = await Promise.all([
    attachQuotes(all),
    buildGateContexts(supabase, orgId, live),
    listIcMeetings(supabase, orgId),
    icEligibleVoters(supabase, orgId),
    ids.length
      ? supabase
          .from('org_pitch_hindsight')
          .select('pitch_id, return_pct, benchmark_return_pct, alpha_pct, current_state')
          .in('pitch_id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from('org_pitch_votes').select('pitch_id, voter_member_id').in('pitch_id', ids)
      : Promise.resolve({ data: [] }),
  ]);

  const known = new Map(meetings.map((m) => [m.id, m]));
  /* A pitch attached to a meeting this member cannot read is treated as
     sealed: hiding a tally by mistake is recoverable, showing one is not. */
  const meetingById = {
    get: (id) =>
      id
        ? known.get(id) || { id, ballot_type: 'blind', status: 'unknown', unreadable: true }
        : null,
  };
  const hindById = new Map((hindRes?.data || []).map((h) => [h.pitch_id, h]));
  const sealedPitchIds = new Set(
    all.filter((p) => isBlindOpen(meetingById.get(p.ic_meeting_id))).map((p) => p.id),
  );

  const pitches = decorated.map((p) =>
    boardRow(p, ctxById.get(p.id) || null, actor, {
      meeting: meetingById.get(p.ic_meeting_id) || null,
      eligibleCount: eligible.length,
      hindsight: hindById.get(p.id) || null,
    }),
  );

  /* Votes cast per member, for the analyst record. Ballots on a pitch whose
     blind vote is open are left out, so the column cannot show who has voted. */
  const votesCast = new Map();
  for (const v of voteRes?.data || []) {
    if (sealedPitchIds.has(v.pitch_id)) continue;
    votesCast.set(v.voter_member_id, (votesCast.get(v.voter_member_id) || 0) + 1);
  }

  return {
    view: 'pipeline',
    viewer: {
      id: actor.id,
      role: actor.role,
      tier: actor.tier || null,
      team_id: actor.team_id || null,
      is_manager: isManager(actor),
    },
    pitches,
    stale,
    meetings,
    eligible_voters: eligible.length,
    teams: [...teamMap.values()].map((t) => ({ id: t.id, name: t.name })),
    members: [...memberMap.values()].map((m) => ({
      id: m.id,
      display_name: m.display_name || 'Member',
      role: m.role,
      team_id: m.team_id || null,
    })),
    votes_cast: Object.fromEntries(votesCast),
  };
}
