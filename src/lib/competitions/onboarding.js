/**
 * Phase 2 onboarding helpers: config + join-request state machine + deliverables.
 * Loaders take an already-scoped Supabase client and return plain data / [] /
 * null (honest-empty). evaluateRegistration is a PURE function the join route
 * calls to enforce the host's config server-side — never trust the client.
 */

export const ADMISSION_MODES = ['invite_only', 'open_signup', 'request_approval', 'application'];

/** The config a competition falls back to before the host has saved one. */
export const DEFAULT_CONFIG = {
  admission_mode: 'invite_only',
  max_teams: null,
  max_teams_per_org: 1,
  registration_opens_at: null,
  registration_closes_at: null,
  requires_ticker_at_signup: false,
  ticker_assignment: 'team_choice',
  ticker_pool: [],
  side_constraint: 'either',
  application_requires_deck: false,
  application_requires_thesis: false,
  application_prompt: null,
  deliverable_deck: true,
  deliverable_thesis: false,
  deliverable_model: false,
  deliverable_notes: null,
  deliverable_due_at: null,
  eligibility_note: null,
  requires_host_approval_after_signup: false,
};

const CONFIG_COLUMNS =
  'competition_id, admission_mode, max_teams, max_teams_per_org, registration_opens_at, registration_closes_at, requires_ticker_at_signup, ticker_assignment, ticker_pool, side_constraint, application_requires_deck, application_requires_thesis, application_prompt, deliverable_deck, deliverable_thesis, deliverable_model, deliverable_notes, deliverable_due_at, eligibility_note, requires_host_approval_after_signup, updated_at';

/** Config for a competition, or DEFAULT_CONFIG merged when none saved yet. */
export async function loadConfig(supabase, competitionId) {
  const { data } = await supabase
    .from('pitch_competition_config')
    .select(CONFIG_COLUMNS)
    .eq('competition_id', competitionId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_CONFIG, competition_id: competitionId, _default: true };
  return data;
}

/** Join requests visible to the caller (RLS scopes host=all / org=own). */
export async function loadJoinRequests(supabase, competitionId) {
  const { data } = await supabase
    .from('pitch_join_requests')
    .select(
      'id, competition_id, org_id, team_name, contact_email, application_deck_url, application_thesis, application_note, status, decision_note, decided_at, created_at',
    )
    .eq('competition_id', competitionId)
    .order('created_at', { ascending: false });
  return data || [];
}

/** Deliverables for one team, newest first. */
export async function loadDeliverables(supabase, teamId) {
  const { data } = await supabase
    .from('pitch_deliverables')
    .select('id, team_id, kind, file_path, file_name, thesis_text, uploaded_at')
    .eq('team_id', teamId)
    .order('uploaded_at', { ascending: false });
  return data || [];
}

/** Which deliverable kinds the config requires. */
export function requiredDeliverableKinds(config) {
  const kinds = [];
  if (config.deliverable_deck) kinds.push('deck');
  if (config.deliverable_thesis) kinds.push('thesis');
  if (config.deliverable_model) kinds.push('model');
  return kinds;
}

/** True when a team has submitted every required deliverable kind. */
export function deliverablesComplete(config, deliverables) {
  const required = requiredDeliverableKinds(config);
  if (!required.length) return true;
  const present = new Set((deliverables || []).map((d) => d.kind));
  return required.every((k) => present.has(k));
}

/**
 * Enforce the host's registration rules. PURE — the join route passes the current
 * state (counts, side, now as an ISO string) and this returns { ok, error }.
 * @param config the competition config row
 * @param ctx { nowIso, teamCount, orgTeamCount, side }
 */
export function evaluateRegistration(config, ctx) {
  const { nowIso, teamCount = 0, orgTeamCount = 0, side = null } = ctx || {};
  const now = nowIso ? Date.parse(nowIso) : NaN;

  if (config.admission_mode === 'invite_only') {
    return { ok: false, error: 'This competition is invite-only — you can’t self-register.' };
  }

  if (config.registration_opens_at && Number.isFinite(now) && now < Date.parse(config.registration_opens_at)) {
    return { ok: false, error: 'Registration hasn’t opened yet.' };
  }
  if (config.registration_closes_at && Number.isFinite(now) && now > Date.parse(config.registration_closes_at)) {
    return { ok: false, error: 'Registration has closed.' };
  }
  if (config.max_teams != null && teamCount >= config.max_teams) {
    return { ok: false, error: 'This competition is full.' };
  }
  if (orgTeamCount >= (config.max_teams_per_org || 1)) {
    return { ok: false, error: 'Your organization has reached its team limit for this competition.' };
  }
  if (side) {
    if (config.side_constraint === 'long_only' && side !== 'long') {
      return { ok: false, error: 'This competition is long-only.' };
    }
    if (config.side_constraint === 'short_only' && side !== 'short') {
      return { ok: false, error: 'This competition is short-only.' };
    }
  }
  return { ok: true };
}

/**
 * The team status a successful registration should land in, given the mode and
 * the "require host approval even on open sign-up" flag.
 */
export function registrationOutcome(config) {
  if (config.admission_mode === 'open_signup') {
    return config.requires_host_approval_after_signup ? 'invited' : 'registered';
  }
  return 'invited';
}
